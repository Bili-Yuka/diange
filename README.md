# 主播点歌歌单

一个部署在 GitHub Pages 上的静态歌单展示站：粉丝打开网址即可翻页、搜索、点歌（复制歌名）；只需要维护一个 Excel（xlsx），通过后台管理页导入导出即可更新歌单内容。

## 目录结构

```
点歌歌单/
├── index.html        # 前台：歌单展示（翻页 / 搜索 / 筛选 / 随机点歌）
├── admin.html        # 后台：账号密码登录 -> 导入 xlsx -> 预览编辑 -> 在线保存 / 导出 songs.json
├── cloudflare-worker.js   # 账号密码后台的免费后端（部署见 CLOUDFLARE_DEPLOY.md）
├── CLOUDFLARE_DEPLOY.md   # 让主播朋友用"账号密码"管理歌单的部署指南
├── data/
│   ├── songs.json    # 前台实际读取的数据（后台导出后覆盖此文件）
│   └── songs.xlsx    # 示例歌单（40 首），也是 xlsx 模板
├── tools/
│   └── make_sample_songs.py  # 重新生成示例 xlsx/json 的脚本
└── deploy.ps1        # 一键部署脚本（建仓 + 推送 + 开启 Pages）
```

## 本地预览

```powershell
cd 点歌歌单
python -m http.server 8000
# 浏览器打开 http://localhost:8000/
```

直接用浏览器双击 index.html 也能看（显示内置示例数据），但要体验"读 data/songs.json 更新"需要用本地服务器。

## 部署到 GitHub Pages

1. 确保本机装了 Git和 Python。
2. 在 GitHub 生成 Personal Access Token：`Settings → Developer settings → Personal access tokens → Generate new token`，勾选 `repo` 权限。
3. 运行：

```powershell
cd 点歌歌单
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -UserName "你的GitHub用户名"
```

脚本会：创建（或复用）公开仓库 → 推送代码 → 自动开启 Pages → 输出网址 `https://你的用户名.github.io/仓库名/`。

如果自动开启 Pages 失败，手动到仓库 `Settings → Pages`，Source 选 `Deploy from a branch`，Branch 选 `main`，目录 `/(root)`，保存即可。

## 更新歌单（日常维护）

1. 打开网站里的 `admin.html`（或本地 `点歌歌单/admin.html`）。
2. **第 1 步**：拖入你的 xlsx（第一行是表头；列建议：曲名、原唱、语种、SC点歌、标签、歌切、备注）。
3. **第 2 步**：核对字段映射（自动识别，可手动调整）。
4. **第 3 步**：预览并编辑——增删行、改属性都可以。
5. **第 4 步**：导出 `songs.json`，覆盖仓库里的 `data/songs.json`，然后推送：

```powershell
cd 点歌歌单
git add .
git commit -m "更新歌单"
git push github
```

> 提示：如果直连 GitHub 超时（国内网络），推送时走系统代理：`git -c http.proxy=http://127.0.0.1:7890 push github`（端口按你本机代理实际端口改）。

约 1 分钟后 GitHub Pages 自动发布，前台即更新。

## 让主播用"账号密码"管理（无需 GitHub 账号）

后台页已支持账号密码登录：部署一个免费的 Cloudflare Worker（见 `CLOUDFLARE_DEPLOY.md`，含注册、粘贴代码、设置账号密码、生成 GitHub 令牌的全部步骤）后，朋友打开 `admin.html` → 输入你给的账号密码 → 拉取线上歌单 → 修改 → **保存歌单**，前台约 1 分钟自动更新，全程不碰 git、不需要 GitHub 账号。

## 字段说明

| 列 | 说明 | 示例 |
|---|---|---|
| 曲名 | 必填 | 大鱼 |
| 原唱 | 歌手名 | 周深 |
| 语种 | 国语 / 粤语 / 日语 / 外语 | 国语 |
| SC点歌 | `免费` 或价格数字 | 免费 / 50 |
| 标签 | 风格，多个用 `\|` 分隔 | 古风\|高音 |
| 歌切 | 有 / 无 | 有 |
| 备注 | 任意说明 | 高音 |

## 注意事项

- GitHub Pages 免费（公开仓库），国内访问可能不稳定，详见聊天记录里的加速方案（jsDelivr / Cloudflare 反代）。
- 不想用 Excel 时，可以直接编辑 `data/songs.json` 的 `songs` 数组，结构照抄即可。
