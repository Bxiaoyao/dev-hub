# SSH 密钥配置完成

## 问题已解决

✅ SSH 密钥已成功添加到 SSH Agent
✅ macOS Keychain 已配置自动加载密钥
✅ SSH 连接到 git.qingteng.cn 测试成功
✅ Git 克隆操作测试成功

## 当前配置

### SSH 密钥状态
```
密钥指纹: SHA256:xbsNJY4CKzxyfPpj+yiad0tnxdnlFSy1ZyII0HlwX8g
用户: bsxiaoyao316@qq.com
状态: 已添加到 SSH Agent
```

### SSH 配置文件 (~/.ssh/config)

```ssh
Host github.com
User bsxiaoyao316@qq.com
Hostname ssh.github.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_rsa
Port 443
UseKeychain yes
AddKeysToAgent yes

Host git.qingteng.cn
User git
Hostname git.qingteng.cn
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_rsa
UseKeychain yes
AddKeysToAgent yes
```

关键配置说明：
- `UseKeychain yes` - 使用 macOS Keychain 存储 passphrase
- `AddKeysToAgent yes` - 自动将密钥添加到 SSH Agent

## 在 DevHub 中配置

现在你需要在 DevHub Web UI 中配置 Git 凭据：

### 步骤

1. 打开 DevHub Web UI（通常是 http://localhost:3200）
2. 点击右上角的"设置"按钮（齿轮图标）
3. 滚动到"Git 凭据配置"部分
4. 进行以下配置：
   - ✅ **勾选**"使用 SSH 密钥认证"
   - ✅ **勾选**"记住凭据"
   - 点击"保存设置"

### 配置效果

配置完成后，所有通过 DevHub 执行的 Git 操作都会：
- 自动使用 SSH Agent 中缓存的密钥
- 不会再弹出密码或 passphrase 输入提示
- 支持所有使用 SSH 地址的仓库（git.qingteng.cn、github.com 等）

## 测试验证

### 1. 测试 SSH 连接
```bash
ssh -T git@git.qingteng.cn
# 应该显示: Welcome to GitLab, @shun.bian!

ssh -T git@github.com
# 应该显示: Hi username! You've successfully authenticated...
```

### 2. 测试 Git 操作
```bash
# 克隆仓库（不应该提示输入密码）
git clone git@git.qingteng.cn:frontend-v4/product/apps/outgoing.git

# 进入仓库
cd outgoing

# 拉取最新代码（不应该提示输入密码）
git pull
```

### 3. 在 DevHub 中测试

1. 刷新 DevHub 页面
2. 找到任意使用 git.qingteng.cn 的项目
3. 点击"Git 操作" → "Pull"
4. 应该成功拉取，不弹出任何密码提示

## 重启后的行为

由于我们配置了 `UseKeychain yes` 和 `AddKeysToAgent yes`：

- ✅ 重启终端后，第一次使用 SSH 时会自动从 Keychain 加载密钥
- ✅ 不需要手动执行 `ssh-add`
- ✅ passphrase 存储在 macOS Keychain 中，安全且方便

如果重启后发现还是需要输入密码，执行：
```bash
ssh-add --apple-use-keychain ~/.ssh/id_rsa
```

## 工作原理

### 为什么现在不会弹出密码提示了？

1. **之前的问题**：
   - SSH 私钥有 passphrase 保护
   - SSH Agent 中没有缓存密钥
   - Git 操作时尝试使用密钥，需要输入 passphrase
   - 但 `GIT_TERMINAL_PROMPT: '0'` 禁用了交互式提示
   - 导致认证失败，系统可能弹出图形界面的密码对话框

2. **现在的解决方案**：
   - 密钥已添加到 SSH Agent（内存中缓存）
   - Passphrase 存储在 macOS Keychain（加密存储）
   - SSH Agent 可以直接使用缓存的密钥
   - 不需要再输入 passphrase
   - DevHub 的环境变量配置确保使用 SSH 方式

### DevHub 的作用

DevHub 的 Git 凭据配置主要做以下事情：

1. **环境变量配置**：
   - `GIT_SSH_COMMAND` - 配置 SSH 参数
   - `GIT_TERMINAL_PROMPT: '0'` - 禁用交互式密码提示
   - 确保使用 SSH Agent 中缓存的密钥

2. **HTTPS 认证**（如果不用 SSH）：
   - 临时将 Token 嵌入 HTTPS URL
   - 完成操作后移除

## 故障排除

### 问题：重启后又要输入密码

**解决方案**：
```bash
# 检查密钥是否在 Agent 中
ssh-add -l

# 如果没有，重新添加
ssh-add --apple-use-keychain ~/.ssh/id_rsa
```

### 问题：还是弹出密码对话框

**检查清单**：
1. 确认密钥已添加：`ssh-add -l`
2. 确认 SSH 连接正常：`ssh -T git@git.qingteng.cn`
3. 确认 DevHub 设置中勾选了"使用 SSH 密钥认证"
4. 确认仓库使用的是 SSH 地址（git@git.qingteng.cn:...），不是 HTTPS

### 问题：Keychain 中没有存储 passphrase

**手动添加**：
```bash
# 打开"钥匙串访问"应用
open "/Applications/Utilities/Keychain Access.app"

# 或在终端添加
ssh-add --apple-use-keychain ~/.ssh/id_rsa
```

## 其他 Git 服务配置

如果需要连接其他 Git 服务（如公司内部的 GitLab），按相同方式配置：

```ssh
# ~/.ssh/config
Host git.your-company.com
User git
Hostname git.your-company.com
PreferredAuthentications publickey
IdentityFile ~/.ssh/id_rsa
UseKeychain yes
AddKeysToAgent yes
```

## 安全建议

1. **Passphrase 安全**：
   - 你的私钥有 passphrase 保护，很好！
   - passphrase 存储在 macOS Keychain 中，系统登录密码保护
   - 不用担心明文存储

2. **密钥管理**：
   - 不要分享私钥文件（~/.ssh/id_rsa）
   - 只分享公钥（~/.ssh/id_rsa.pub）
   - 定期检查 GitLab 中的 SSH Keys 列表

3. **备份**：
   - 备份私钥和 passphrase 到安全位置
   - 如果丢失，需要重新生成密钥并添加到所有服务

## 相关文档

- [Git 凭据配置原理](git-credentials.md)
- [Git 凭据配置示例](git-credentials-example.md)
- [功能说明](FEATURES.md)
