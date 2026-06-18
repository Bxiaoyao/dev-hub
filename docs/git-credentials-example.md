# Git 凭据配置示例

## 方法一：SSH 密钥认证（推荐）

### 1. 生成 SSH 密钥
```bash
# 生成新的 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

### 2. 添加到 GitHub/GitLab
- GitHub: Settings → SSH and GPG keys → New SSH key
- GitLab: Preferences → SSH Keys
- 粘贴公钥内容

### 3. 测试连接
```bash
ssh -T git@github.com
```

### 4. 在 DevHub 配置
打开 DevHub Web UI → 设置 → Git 凭据配置：
- ✅ 勾选"使用 SSH 密钥认证"
- ✅ 勾选"记住凭据"
- 点击"保存设置"

### 5. 将仓库改为 SSH 地址
```bash
# 查看当前远程地址
git remote -v

# 修改为 SSH 地址
git remote set-url origin git@github.com:username/repo.git
```

## 方法二：Personal Access Token

### 1. 创建 GitHub Token
1. 访问 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 勾选权限：
   - ✅ repo (完整仓库访问)
   - ✅ workflow (如果需要)
4. 点击 "Generate token"
5. **复制 Token**（只显示一次！）

### 2. 在 DevHub 配置
打开 DevHub Web UI → 设置 → Git 凭据配置：
- ❌ 取消勾选"使用 SSH 密钥认证"
- Git 用户名：你的 GitHub 用户名
- 密码/Token：粘贴刚才复制的 Token
- ✅ 勾选"记住凭据"
- 点击"保存设置"

## 方法三：系统凭据助手

### macOS
```bash
# 配置使用 macOS Keychain
git config --global credential.helper osxkeychain

# 第一次输入后会被缓存
git pull  # 输入用户名和 Token
git pull  # 不需要再输入
```

### Windows
```bash
# 配置使用 Windows Credential Manager
git config --global credential.helper manager

# 第一次会弹出对话框输入
# 之后会自动使用缓存的凭据
```

### Linux
```bash
# 缓存凭据 1 小时（3600 秒）
git config --global credential.helper 'cache --timeout=3600'

# 或永久存储（明文存储在 ~/.git-credentials）
git config --global credential.helper store
```

## 配置文件格式

配置保存在 `~/.devhub/config.yaml`：

```yaml
git:
  credentials:
    # SSH 方式（推荐）
    useSSH: true

    # HTTPS 方式
    useSSH: false
    username: your-username
    password: ghp_xxxxxxxxxxxx  # GitHub Token

    # 或使用 token 字段
    token: ghp_xxxxxxxxxxxx

  # 记住凭据
  rememberCredentials: true
```

## 工作原理

### HTTPS 认证流程
1. DevHub 检测到需要认证的 HTTPS 远程地址
2. 临时修改 remote URL，嵌入认证信息：
   ```
   https://github.com/user/repo.git
   → https://token@github.com/user/repo.git
   ```
3. 执行 Git 操作（pull/fetch/push）
4. 操作完成后，恢复原始 URL（移除认证信息）

### SSH 认证流程
1. 通过环境变量 `GIT_SSH_COMMAND` 配置 SSH 参数
2. 使用 BatchMode 避免交互式提示
3. SSH 客户端自动使用 `~/.ssh/id_ed25519` 等密钥文件

## 安全建议

### ✅ 推荐做法
1. **优先使用 SSH**：密钥不通过网络传输，最安全
2. **使用 Token**：比密码更安全，可设置权限和过期时间
3. **定期更换 Token**：建议每 3-6 个月更换一次
4. **使用系统凭据助手**：macOS Keychain 和 Windows Credential Manager 提供加密存储

### ❌ 不推荐做法
1. **明文存储密码**：配置文件中的密码是明文的
2. **使用账号密码**：GitHub 已不支持密码认证
3. **长期不更换 Token**：增加泄露风险

## 常见问题

### Q: 配置后仍然需要输入密码？
**A:** 检查以下几点：
1. 是否勾选了"记住凭据"并保存
2. 远程地址是否为 HTTPS（SSH 方式不需要在 DevHub 配置）
3. Token 权限是否足够（至少需要 `repo` 权限）
4. 尝试在终端执行 `git pull` 看是否正常

### Q: Token 在哪里查看？
**A:** Token 只在创建时显示一次，无法再次查看。如果忘记了：
1. 删除旧 Token
2. 重新生成新 Token
3. 在 DevHub 中更新

### Q: 如何查看当前使用的认证方式？
**A:**
```bash
# 查看远程地址
git remote -v

# SSH 地址格式：git@github.com:user/repo.git
# HTTPS 地址格式：https://github.com/user/repo.git
```

### Q: 多个仓库使用不同账号？
**A:**
1. 推荐使用 SSH，配置多个 SSH 密钥
2. 或使用 Git 的 conditional includes 功能：
   ```bash
   # ~/.gitconfig
   [includeIf "gitdir:~/work/"]
       path = ~/.gitconfig-work

   # ~/.gitconfig-work
   [user]
       email = work@example.com
   ```

### Q: 认证失败怎么办？
**A:** 查看错误信息：
1. `Permission denied (publickey)` → SSH 密钥未正确配置
2. `Authentication failed` → Token 过期或权限不足
3. `could not read Username` → 凭据未正确提供

解决方法：
```bash
# 测试 SSH 连接
ssh -T git@github.com

# 测试 HTTPS 认证
git ls-remote https://github.com/user/repo.git

# 查看详细错误
GIT_TRACE=1 git pull
```

## 调试技巧

### 查看 Git 使用的凭据
```bash
# macOS
git credential-osxkeychain get
host=github.com
protocol=https
# 按 Ctrl+D

# 会显示存储的用户名和密码
```

### 清除缓存的凭据
```bash
# macOS
git credential-osxkeychain erase
host=github.com
protocol=https
# 按 Ctrl+D

# Windows - 打开"凭据管理器" → Windows 凭据 → 删除 GitHub 相关条目
```

### 查看详细的 Git 操作日志
```bash
# 启用详细日志
export GIT_TRACE=1
export GIT_CURL_VERBOSE=1

# 执行操作
git pull
```
