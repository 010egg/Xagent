# Claude WebUI 部署清单

快速部署参考清单，确保不遗漏关键步骤。

---

## 📦 部署前准备

### 开发环境（打包）

- [ ] 测试应用正常运行
  ```bash
  python webui_server.py
  curl http://localhost:8000
  ```

- [ ] 打包部署文件
  ```bash
  ./pack_for_deployment.sh
  ```

- [ ] 验证部署包
  ```bash
  tar -tzf claude-webui-*.tar.gz | head
  ```

### 生产服务器（准备）

- [ ] 确认服务器配置
  - CPU: 2 核心+
  - 内存: 4GB+
  - 磁盘: 20GB+

- [ ] 检查网络访问
  ```bash
  ping cm-mng.bilibili.co
  curl http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata
  ```

- [ ] 安装必要软件
  ```bash
  # Docker 方式
  docker --version
  docker-compose --version

  # 传统方式
  python3 --version
  ```

---

## 🚀 Docker 部署清单

### 1. 上传文件

- [ ] 传输部署包到服务器
  ```bash
  scp claude-webui-*.tar.gz user@server:/opt/
  ```

### 2. 解压和配置

- [ ] SSH 登录服务器
  ```bash
  ssh user@server
  ```

- [ ] 解压部署包
  ```bash
  cd /opt
  tar -xzf claude-webui-*.tar.gz
  cd claude-webui
  ```

- [ ] 配置环境变量
  ```bash
  cp .env.example .env
  vim .env
  ```

  **必填项**：
  - [ ] `PORT` (默认 8000)
  - [ ] `MCP_BERSERKER_URL` (已有默认值，确认可访问)

### 3. 部署应用

- [ ] 运行部署脚本
  ```bash
  chmod +x deploy.sh
  ./deploy.sh docker
  ```

- [ ] 检查容器状态
  ```bash
  docker-compose ps
  ```

### 4. 验证部署

- [ ] 测试 HTTP 访问
  ```bash
  curl http://localhost:8000
  ```

- [ ] 测试 WebSocket
  ```bash
  curl -i -N -H "Connection: Upgrade" \
       -H "Upgrade: websocket" \
       http://localhost:8000/ws
  ```

- [ ] 浏览器访问测试
  - 打开: `http://服务器IP:8000`
  - 发送测试消息
  - 验证 MCP 工具调用

---

## 🔧 传统部署清单

### 1. 上传和解压

- [ ] 同 Docker 部署步骤 1-2

### 2. 安装依赖

- [ ] 运行部署脚本
  ```bash
  chmod +x deploy.sh
  ./deploy.sh standalone
  ```

- [ ] 创建 systemd 服务（提示时选择 y）

### 3. 启动服务

- [ ] 启动 systemd 服务
  ```bash
  sudo systemctl start claude-webui
  sudo systemctl status claude-webui
  ```

### 4. 验证部署

- [ ] 同 Docker 部署步骤 4

---

## 🌐 Nginx 配置清单

### 1. 安装 Nginx

- [ ] 安装 Nginx
  ```bash
  sudo apt install nginx  # Ubuntu/Debian
  # 或
  sudo yum install nginx  # CentOS/RHEL
  ```

### 2. 配置反向代理

- [ ] 复制配置文件
  ```bash
  sudo cp nginx.conf /etc/nginx/sites-available/claude-webui
  ```

- [ ] 修改域名
  ```bash
  sudo vim /etc/nginx/sites-available/claude-webui
  # 替换 your-domain.com 为实际域名
  ```

- [ ] 启用配置
  ```bash
  sudo ln -s /etc/nginx/sites-available/claude-webui \
             /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```

### 3. 配置 SSL（可选）

- [ ] 安装 Certbot
  ```bash
  sudo apt install certbot python3-certbot-nginx
  ```

- [ ] 获取证书
  ```bash
  sudo certbot --nginx -d your-domain.com
  ```

- [ ] 测试续期
  ```bash
  sudo certbot renew --dry-run
  ```

---

## 🔐 安全配置清单

### 防火墙

- [ ] 配置防火墙规则
  ```bash
  sudo ufw allow 22/tcp   # SSH
  sudo ufw allow 80/tcp   # HTTP
  sudo ufw allow 443/tcp  # HTTPS
  sudo ufw enable
  ```

### 文件权限

- [ ] 设置敏感文件权限
  ```bash
  chmod 600 .env
  chmod 700 deploy.sh
  ```

### 日志轮转

- [ ] 配置日志轮转
  ```bash
  sudo vim /etc/logrotate.d/claude-webui
  # 添加轮转配置（见 DEPLOYMENT.md）
  ```

---

## 📊 监控配置清单

### 健康检查

- [ ] 创建健康检查脚本
  ```bash
  vim healthcheck.sh
  chmod +x healthcheck.sh
  ```

- [ ] 添加到 crontab
  ```bash
  crontab -e
  # 添加: */5 * * * * /opt/claude-webui/healthcheck.sh
  ```

### 日志监控

- [ ] 配置日志查看
  ```bash
  # Docker
  docker-compose logs -f

  # 传统部署
  tail -f /opt/claude-webui/logs/webui.log
  ```

---

## ✅ 最终验证清单

### 功能测试

- [ ] HTTP 访问正常
- [ ] WebSocket 连接正常
- [ ] MCP 工具调用正常
- [ ] 持续对话功能正常
- [ ] 文件上传/下载正常（如有）

### 性能测试

- [ ] 响应时间 < 2s
- [ ] 并发连接 > 100
- [ ] 内存使用稳定

### 安全测试

- [ ] HTTPS 配置正确（如有）
- [ ] 防火墙规则正确
- [ ] 敏感信息无泄露
- [ ] 日志记录正常

---

## 🆘 故障排查清单

### 常见问题检查

- [ ] 端口是否被占用
  ```bash
  lsof -i:8000
  ```

- [ ] MCP 服务器是否可访问
  ```bash
  curl http://cm-mng.bilibili.co/...
  ```

- [ ] Docker 容器是否运行
  ```bash
  docker-compose ps
  ```

- [ ] systemd 服务是否运行
  ```bash
  sudo systemctl status claude-webui
  ```

- [ ] 日志是否有错误
  ```bash
  docker-compose logs --tail=100
  # 或
  sudo journalctl -u claude-webui -n 100
  ```

---

## 📝 部署记录

部署完成后填写：

| 项目 | 信息 |
|------|------|
| 部署日期 | ____________ |
| 服务器 IP | ____________ |
| 域名 | ____________ |
| 部署方式 | Docker / 传统 |
| 端口 | ____________ |
| 负责人 | ____________ |
| 备注 | ____________ |

---

## 🔄 维护清单

### 日常维护

- [ ] 每周检查日志
- [ ] 每月更新依赖
- [ ] 每季度备份配置

### 更新流程

- [ ] 备份当前配置
  ```bash
  tar -czf backup-$(date +%Y%m%d).tar.gz .env workspace/
  ```

- [ ] 执行更新
  ```bash
  ./deploy.sh update
  ```

- [ ] 验证功能正常

---

## 📞 联系方式

技术支持：____________

紧急联系：____________

文档地址：____________

---

**完成所有清单项目后，部署即告完成！** ✅
