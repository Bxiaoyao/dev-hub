#!/usr/bin/env bash
# PM2 开机自启配置（供 install.sh / devhub-start.sh source 使用）
# 调用方需已定义 log_info / log_ok / log_warn

is_pm2_startup_configured() {
  if ! command -v pm2 &>/dev/null; then
    return 1
  fi

  local uname_s
  uname_s="$(uname -s 2>/dev/null || true)"

  if [[ "$uname_s" == "Darwin" ]]; then
    if launchctl list 2>/dev/null | grep -qi pm2; then
      return 0
    fi
    local plist
    for plist in /Library/LaunchDaemons/pm2.*.plist "$HOME/Library/LaunchAgents"/pm2.*.plist; do
      [[ -f "$plist" ]] && return 0
    done
    return 1
  fi

  if [[ "$uname_s" == "Linux" ]] && command -v systemctl &>/dev/null; then
    if systemctl is-enabled "pm2-${USER}.service" &>/dev/null; then
      return 0
    fi
    if systemctl is-enabled "pm2-${USER}" &>/dev/null; then
      return 0
    fi
    [[ -f "/etc/systemd/system/pm2-${USER}.service" ]] && return 0
  fi

  return 1
}

# 配置 PM2 开机自启；成功返回 0，需手动 sudo 时返回 1
setup_pm2_startup() {
  if ! command -v pm2 &>/dev/null; then
    log_warn "未检测到 PM2，跳过开机自启配置"
    return 1
  fi

  if is_pm2_startup_configured; then
    pm2 save &>/dev/null || true
    log_ok "PM2 开机自启已配置"
    return 0
  fi

  log_info "配置 PM2 开机自启（系统重启后自动恢复服务）..."
  local output
  output="$(pm2 startup 2>&1)" || true

  if echo "$output" | grep -qiE 'already|已设置|already setup'; then
    pm2 save &>/dev/null || true
    log_ok "PM2 开机自启已配置"
    return 0
  fi

  local sudo_cmd
  sudo_cmd="$(echo "$output" | grep -E '^sudo ' | tail -1)"
  if [[ -n "$sudo_cmd" ]]; then
    if sudo -n true 2>/dev/null; then
      if eval "$sudo_cmd" &>/dev/null; then
        pm2 save &>/dev/null || true
        log_ok "开机自启已配置"
        return 0
      fi
    fi
    log_warn "需要管理员权限以完成开机自启，请执行："
    echo ""
    echo "  $sudo_cmd"
    echo "  pm2 save"
    echo ""
    log_warn "完成后可运行: ./scripts/install.sh startup  验证"
    return 1
  fi

  pm2 save &>/dev/null || true
  log_ok "开机自启已配置"
  return 0
}
