# 账号密码后台 · Cloudflare Worker 部署指南

朋友没有 GitHub 账号也没关系：本方案在 Cloudflare（免费、邮箱注册、无需实名、无需信用卡）上部署一个小后端，
负责**校验账号密码**并把歌单**写回你的 GitHub 仓库**。后台页登录后点"保存歌单"，前台约 1 分钟后自动更新。

```
主播朋友浏览器 ── 后台页(admin.html, GitHub Pages) ──> Cloudflare Worker ──> GitHub 仓库 data/songs.json ──> 前台自动更新
       账号密码只在 Worker 里校验（密码不在网页代码里）
```

## 一、注册 Cloudflare（约 2 分钟）

1. 打开 https://dash.cloudflare.com/sign-up ，用邮箱注册（不需要手机号、信用卡）。
2. 登录后进入控制台。

## 二、创建 Worker 并部署

1. 左侧菜单选 **Workers & Pages** → 点 **Create** → **Create Worker**。
2. 名称填 `songbook-api`（可自取）→ **Deploy**（先不管默认的 hello 代码）。
3. 部署完成后点 **Edit code**，把项目里 **`cloudflare-worker.js`** 的全部内容粘贴进去（全选替换），点右上角 **Deploy** 保存。

## 三、设置环境变量（账号密码就在这一步配置）

1. 回到 Worker 页面，点 **Settings** → **Variables and Secrets**。
2. 点 **Add**，依次添加 5 个变量（"Secret" 类型选加密项更好）：

| 名称 | 值 | 示例 |
| --- | --- | --- |
| ADMIN_USER | 你给朋友用的管理账号 | `dianzhuguanli` |
| ADMIN_PASS | 管理密码（自己定，别太简单） | `Abc@2026` |
| SESSION_SECRET | 任意长随机字符串（签名用） | 用下面命令生成 |
| GITHUB_REPO | 你的仓库 | `Bili-Yuka/diange` |
| GITHUB_TOKEN | GitHub 令牌（见第四步） | `github_pat_...` |

> SESSION_SECRET 生成方法（本机 PowerShell 执行）：
> ```powershell
> -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
> ```

3. 添加完成后点 **Deploy** 让变量生效。

## 四、生成 GitHub 令牌 GITHUB_TOKEN（最小权限）

1. 打开 https://github.com/settings/tokens?type=beta （Personal access tokens → Fine-grained）。
2. **Generate new token**：
   - Token name：`songbook-worker`
   - Expiration：随便（建议 90 天或自定义，到期后可续）
   - **Repository access**：选 **Only select repositories** → 勾选 **diange**
   - **Permissions** → **Repository permissions → Contents**：选 **Read and write**
   - 其余保持默认 → **Generate token**
3. 复制生成的 `github_pat_...`（只显示这一次），粘贴到 Worker 的 GITHUB_TOKEN 变量里。

## 五、测试后端

浏览器打开 `<你的Worker地址>/api/login` 会返回 Not Found（正常）。测试登录：

```powershell
curl.exe --proxy http://127.0.0.1:7890 -X POST "https://songbook-api.你的子域.workers.dev/api/login" -H "Content-Type: application/json" -d '{\"username\":\"你的账号\",\"password\":\"你的密码\"}'
```

返回 `{"token":"..."}` 即成功；返回 `{"error":"账号或密码错误"}` 说明账号密码变量没生效（检查后重新 Deploy）。

## 六、配置后台页

1. 打开后台页 https://Bili-Yuka.github.io/diange/admin.html
2. "后台服务地址"填：`https://songbook-api.你的子域.workers.dev`
3. 输入账号密码 → **登录** → **拉取线上歌单** → 改歌单 → **保存歌单**
4. 打开前台 https://Bili-Yuka.github.io/diange/ 验证已更新（保存后约 1 分钟）

## 七、国内访问说明（重要）

- `workers.dev` 域名在国内**可能无法直接访问**（部分网络环境被墙）。
- 如果朋友访问不了后台，二选一：
  a. **给 Worker 绑定自己的域名**（需一个域名，约几十元/年）：Worker → Settings → Domains & Routes → Add Custom Domain，把域名 NS 托管到 Cloudflare 即可，免费代理，无需备案（域名走 Cloudflare 海外节点）。绑定后把新域名填到后台页地址。
  b. **改用国内平台**（腾讯云云函数 / 阿里云函数计算，需实名认证）：把 `cloudflare-worker.js` 的代码按其平台格式适配，原理相同。

## 八、日常管理与安全

- **改账号密码**：改 Worker 的 ADMIN_USER / ADMIN_PASS 变量后重新 Deploy 即生效。
- **撤销朋友权限**：改掉 ADMIN_PASS 即可（已发出的登录令牌 12 小时自动过期，修改密码前建议让朋友退出登录）。
- **GITHUB_TOKEN 泄露风险**：token 只存在 Cloudflare 的加密环境变量里，任何人（包括看网页源码的人）都看不到；定期到 GitHub 里撤销/轮换即可。
- **回滚**：每次保存都在 GitHub 生成一条提交记录（"更新歌单（账号密码后台）"），可在仓库 Commits 里查看和回滚。

## 九、费用

Cloudflare Workers 免费档：每天 10 万次请求，对单主播点歌后台完全够用。GitHub 公开仓库 + Pages 免费。全程 0 元。
