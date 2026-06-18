# Git 凭据配置指南

## 问题背景

在使用 HTTPS 方式克隆或拉取 Git 仓库时，每次操作都可能需要输入用户名和密码，这非常不便。DevHub 现已支持在配置页面保存 Git 凭据，避免重复输入。

## 实现原理

DevHub 使用以下机制提供 Git 凭据：

### HTTPS 方式
1. **临时修改 Remote URL**：在执行 Git 操作前，将认证信息嵌入到远程 URL 中
   - 原始 URL：`https://github.com/user/repo.git`
   - 带认证的 URL：`https://token@github.com/user/repo.git` 或 `https://user:password@github.com/user/repo.git`
2. **操作完成后恢复**：Git 操作完成后，自动恢复原始 URL（不包含认证信息）

### SSH 方式
- 通过 `GIT_SSH_COMMAND` 环境变量配置 SSH 连接参数
- 使用 BatchMode 避免交互式密码提示

## 配置方法

### 1. 推荐方式：使用 SSH 密钥认证

**这是最安全推荐的方式**，不需要在 DevHub 中存储任何密码。

#### 设置 SSH 密钥

1. 生成 SSH 密钥（如果还没有）：
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. 将公钥添加到 GitHub/GitLab：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # 复制输出内容，添加到 GitHub Settings > SSH and GPG keys
   ```

3. 测试连接：
   ```bash
   ssh -T git@github.com
   ```

4. 将仓库远程地址改为 SSH：
   ```bash
   git remote set-url origin git@github.com:username/repo.git
   ```

5. 在 DevHub 设置页面勾选"使用 SSH 密钥认证"

### 2. HTTPS 方式：使用 Personal Access Token

如果你必须使用 HTTPS 方式，推荐使用 Token 而不是密码：

#### GitHub Personal Access Token

1. 访问 GitHub Settings > Developer settings > Personal access tokens
2. 创建新 Token，选择需要的权限（至少包含 `repo` 权限）
3. 在 DevHub 设置页面：
   - 取消勾选"使用 SSH 密钥认证"
   - 填写用户名（GitHub 用户名）
   - 在密码字段填写生成的 Token

### 3. 使用系统 Git 凭据助手

macOS 和 Windows 都内置了 Git 凭据缓存功能：

#### macOS

```bash
# 使用 macOS Keychain 缓存凭据
git config --global credential.helper osxkeychain
```

#### Windows

```bash
# 使用 Windows Credential Manager
git config --global credential.helper manager
```

#### Linux

```bash
# 缓存凭据 1 小时
git config --global credential.helper 'cache --timeout=3600'
```

设置后，第一次输入密码会被缓存，后续操作不需要重复输入。

## 安全建议

1. **优先使用 SSH**：SSH 密钥认证是最安全的方式，密码不会在网络上传输
2. **使用 Token 代替密码**：Token 可以设置过期时间和权限范围，比密码更安全
3. **启用"记住凭据"选项**：勾选后凭据会保存在 `~/.devhub/config.yaml`，但请注意这是明文存储
4. **定期更新 Token**：如果使用 Token，建议定期更换

## 配置文件位置

Git 凭据配置保存在：
```
~/.devhub/config.yaml
```

配置示例：
```yaml
git:
  credentials:
    useSSH: true  # 推荐设置为 true
    username: your-username
    password: your-token-or-password
    token: your-personal-access-token
  rememberCredentials: true
```

## 常见问题

### Q: 为什么还是需要输入密码？

检查以下几点：
1. 是否在 DevHub 设置中勾选了"记住凭据"
2. 远程仓库地址是否使用 HTTPS（需要改用 SSH）
3. 系统是否配置了 Git 凭据助手

### Q: 配置后仍然认证失败？

1. 检查 SSH 密钥是否正确添加到 GitHub/GitLab
2. 测试 SSH 连接：`ssh -T git@github.com`
3. 如果使用 Token，确认 Token 权限是否足够
4. 尝试在终端手动执行 `git pull`，看是否需要密码

### Q: 如何删除已保存的凭据？

1. 打开 DevHub 设置页面
2. 清空用户名和密码字段
3. 点击"保存设置"

或直接编辑配置文件：
```bash
nano ~/.devhub/config.yaml
# 删除 git.credentials 部分
```

## 技术实现

DevHub 通过以下方式处理认证：

1. **SSH 方式**：设置 `GIT_SSH_COMMAND` 环境变量，启用 BatchMode
2. **HTTPS 方式**：通过 `GIT_ASKPASS` 环境变量提供凭据
3. **错误处理**：认证失败时会显示友好提示，引导用户配置凭据