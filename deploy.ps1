# 一键部署到 GitHub Pages
# 用法：powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -UserName "你的GitHub用户名"
# 可选：-RepoName "singer-songlist"（默认），-Branch "main"
param(
  [Parameter(Mandatory = $true)][string]$UserName,
  [string]$RepoName = "singer-songlist",
  [string]$Branch = "main"
)
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $Root

Write-Host "== 1/5 检查本地 git 仓库 ==" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath ".git")) {
  git init -b $Branch
  git add .
  git commit -m "init: 主播点歌歌单"
  Write-Host "已创建 git 仓库并提交"
} else {
  git add .
  git status --short | Select-Object -First 5
  if ((git status --porcelain) -ne "") {
    git commit -m "update: 歌单内容更新"
    Write-Host "已提交本地改动"
  } else {
    Write-Host "没有需要提交的改动"
  }
}

Write-Host "== 2/5 输入 GitHub 访问令牌 ==" -ForegroundColor Cyan
Write-Host "（在 GitHub Settings -> Developer settings -> Personal access tokens 生成，勾选 repo 权限；仅本次使用）"
$secure = Read-Host -Prompt "Personal Access Token" -AsSecureString
$Ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $Pat = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($Ptr)
} finally {
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)
}
if ([string]::IsNullOrWhiteSpace($Pat)) { Write-Host "未输入令牌，已取消" -ForegroundColor Red; exit 1 }
$Headers = @{ Authorization = "Bearer $Pat"; "User-Agent" = "deploy-script"; Accept = "application/vnd.github+json" }

Write-Host "== 3/5 校验令牌并准备远程仓库 ==" -ForegroundColor Cyan
$userInfo = Invoke-RestMethod -Method Get -Uri "https://api.github.com/user" -Headers $Headers
Write-Host "登录账号：$($userInfo.login)"

$repoExists = $false
try {
  Invoke-RestMethod -Method Get -Uri "https://api.github.com/repos/$UserName/$RepoName" -Headers $Headers | Out-Null
  $repoExists = $true
} catch {
  if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 404) { $repoExists = $false }
  else { throw }
}

if (-not $repoExists) {
  $body = @{ name = $RepoName; description = "主播点歌歌单"; private = $false } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "https://api.github.com/user/repos" -Headers $Headers -ContentType "application/json" -Body $body | Out-Null
  Write-Host "已创建公开仓库 $UserName/$RepoName"
} else {
  Write-Host "仓库 $UserName/$RepoName 已存在，跳过创建"
}

Write-Host "== 4/5 推送到 GitHub ==" -ForegroundColor Cyan
git remote remove github 2>$null | Out-Null
$AuthUrl = "https://$UserName`:$Pat@github.com/$UserName/$RepoName.git"
git push "$AuthUrl" "HEAD:$Branch" 2>&1 | Out-Null
git remote add github "https://github.com/$UserName/$RepoName.git"
Write-Host "已推送 $Branch 分支；远程地址已改为不带令牌的形式"

Write-Host "== 5/5 开启 GitHub Pages ==" -ForegroundColor Cyan
try {
  $pagesBody = @{ source = @{ branch = $Branch; path = "/" } } | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$UserName/$RepoName/pages" -Headers $Headers -ContentType "application/json" -Body $pagesBody | Out-Null
  Write-Host "Pages 已开启" -ForegroundColor Green
} catch {
  $code = 0
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  if ($code -eq 409) { Write-Host "Pages 已存在，无需重复开启" -ForegroundColor Yellow }
  else { Write-Host "自动开启 Pages 未成功（HTTP $code），请手动到仓库 Settings -> Pages 选择 Deploy from a branch -> $Branch / (root)" -ForegroundColor Yellow }
}

$SiteUrl = "https://$UserName.github.io/$RepoName/"
Write-Host ""
Write-Host "部署完成，站点地址：" -ForegroundColor Green
Write-Host $SiteUrl
Write-Host ""
Write-Host "提示：首次开启 Pages 后约 1-2 分钟可访问；以后每次 push 都会自动更新。"
Write-Host "后续更新歌单：后台管理页导出 songs.json -> 覆盖 data/songs.json -> git add . & git commit & git push"
