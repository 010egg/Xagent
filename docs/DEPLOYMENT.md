# Claude WebUI 生产环境部署指南

本指南提供 Claude WebUI 的完整部署方案，包括 Docker 容器化部署和传统部署两种方式。

---

## 📋 目录

- [系统要求](#系统要求)
- [方式一：Docker 部署（推荐）](#方式一docker-部署推荐)
- [方式二：传统部署](#方式二传统部署)
- [Nginx 反向代理配置](#nginx-反向代理配置)
- [SSL/HTTPS 配置](#sslhttps-配置)
- [监控和日志](#监控和日志)
- [故障排除](#故障排除)
- [安全建议](#安全建议)

---

## 系统要求

### 硬件要求
- **CPU**: 2 核心或以上
- **内存**: 4GB RAM 或以上
- **磁盘**: 20GB 可用空间

### 软件要求
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+) 或 macOS
- **Docker**: 20.10+ (如果使用 Docker 部署)
- **Docker Compose**: 2.0+ (如果使用 Docker 部署)
- **Python**: 3.11+ (如果使用传统部署)
- **Nginx**: 1.18+ (可选，用于反向代理)

### 网络要求
- 可访问 Bilibili 内网 MCP 服务器：`http://cm-mng.bilibili.co`
- 开放端口 8000（或自定义端口）

---

## 方式一：Docker 部署（推荐）

### 优势
- ✅ 环境隔离，无依赖冲突
- ✅ 一键部署，易于维护
- ✅ 便于扩展和负载均衡
- ✅ 统一的运行环境

### 快速开始

#### 1. 准备部署包

```bash
# 打包项目（在开发机上执行）
cd /Users/xionghaoqiang/Xagent
tar -czf claude-webui.tar.gz \
    webui_server.py \
    static/ \
    requirements.txt \
    Dockerfile \
    docker-compose.yml \
    .env.example \
    .dockerignore \
    deploy.sh

# 传输到服务器
scp claude-webui.tar.gz user@your-server:/opt/
```

#### 2. 服务器端部署

```bash
# 登录服务器
ssh user@your-server

# 解压
cd /opt
tar -xzf claude-webui.tar.gz
cd claude-webui

# 配置环境变量
cp .env.example .env
vim .env  # 编辑配置

# 一键部署
chmod +x deploy.sh
./deploy.sh docker
```

#### 3. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试访问
curl http://localhost:8000
```

### Docker Compose 配置说明

```yaml
# docker-compose.yml
services:
  claude-webui:
    build: .
    ports:
      - "8000:8000"    # 端口映射
    environment:
      - MCP_BERSERKER_URL=http://cm-mng.bilibili.co/...
    volumes:
      - ./workspace:/workspace  # 工作目录
      - ./logs:/logs            # 日志目录
    restart: unless-stopped     # 自动重启
```

### Docker 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps

# 更新部署
./deploy.sh update

# 进入容器
docker-compose exec claude-webui /bin/bash
```

---

## 方式二：传统部署

### 适用场景
- 无法使用 Docker 的环境
- 需要直接访问宿主机资源
- 已有 Python 环境管理方案

### 部署步骤

#### 1. 准备环境

```bash
# 安装 Python 3.11+
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# 安装系统依赖
sudo apt install curl git
```

#### 2. 部署应用

```bash
# 上传代码到服务器
scp -r /Users/xionghaoqiang/Xagent user@your-server:/opt/claude-webui

# 登录服务器
ssh user@your-server
cd /opt/claude-webui

# 使用部署脚本
chmod +x deploy.sh
./deploy.sh standalone
```

#### 3. 配置 systemd 服务

部署脚本会提示是否创建 systemd 服务，选择 `y` 即可自动配置。

手动配置方式：

```bash
# 创建服务文件
sudo vim /etc/systemd/system/claude-webui.service
```

内容：
```ini
[Unit]
Description=Claude WebUI Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/opt/claude-webui
ExecStart=/opt/claude-webui/venv/bin/python /opt/claude-webui/webui_server.py
Restart=on-failure
RestartSec=10
StandardOutput=append:/opt/claude-webui/logs/webui.log
StandardError=append:/opt/claude-webui/logs/webui.error.log

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-webui
sudo systemctl start claude-webui
```

#### 4. 管理服务

```bash
# 查看状态
sudo systemctl status claude-webui

# 启动服务
sudo systemctl start claude-webui

# 停止服务
sudo systemctl stop claude-webui

# 重启服务
sudo systemctl restart claude-webui

# 查看日志
sudo journalctl -u claude-webui -f
```

---

## Nginx 反向代理配置

### 为什么需要 Nginx？
- 🔒 SSL/TLS 终止
- 🚀 静态文件缓存
- 🔄 负载均衡
- 🛡️ 安全防护
- 📊 访问日志

### 配置步骤

#### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

#### 2. 配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/claude-webui

# 修改域名
sudo vim /etc/nginx/sites-available/claude-webui
# 替换 your-domain.com 为实际域名

# 创建软链接
sudo ln -s /etc/nginx/sites-available/claude-webui /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

#### 3. 验证配置

```bash
# 测试 HTTP 访问
curl http://your-domain.com

# 测试 WebSocket（如果配置了 HTTPS）
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     http://your-domain.com/ws
```

---

## SSL/HTTPS 配置

### 使用 Let's Encrypt 免费证书

#### 1. 安装 Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

#### 2. 获取证书

```bash
# 自动配置 Nginx
sudo certbot --nginx -d your-domain.com

# 或手动获取证书
sudo certbot certonly --nginx -d your-domain.com
```

#### 3. 自动续期

```bash
# 测试续期
sudo certbot renew --dry-run

# Certbot 会自动添加 cron 任务
# 查看定时任务
sudo systemctl list-timers | grep certbot
```

### 使用自签名证书（测试环境）

```bash
# 生成自签名证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx-selfsigned.key \
    -out /etc/ssl/certs/nginx-selfsigned.crt

# 修改 nginx.conf 中的证书路径
ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
```

---

## 监控和日志

### 日志位置

#### Docker 部署
```bash
# 应用日志
docker-compose logs -f

# 导出日志
docker-compose logs > logs/docker.log
```

#### 传统部署
```bash
# 应用日志
tail -f /opt/claude-webui/logs/webui.log
tail -f /opt/claude-webui/logs/webui.error.log

# systemd 日志
sudo journalctl -u claude-webui -f
```

#### Nginx 日志
```bash
# 访问日志
tail -f /var/log/nginx/claude-webui-access.log

# 错误日志
tail -f /var/log/nginx/claude-webui-error.log
```

### 日志轮转

创建 `/etc/logrotate.d/claude-webui`:

```bash
/opt/claude-webui/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 your-user your-group
    sharedscripts
    postrotate
        systemctl reload claude-webui > /dev/null 2>&1 || true
    endscript
}
```

### 健康检查

```bash
# HTTP 健康检查
curl -f http://localhost:8000/ || echo "Service down"

# 创建监控脚本
cat > /opt/claude-webui/healthcheck.sh <<'EOF'
#!/bin/bash
if ! curl -sf http://localhost:8000/ > /dev/null; then
    echo "Service down, restarting..."
    systemctl restart claude-webui
fi
EOF

chmod +x /opt/claude-webui/healthcheck.sh

# 添加到 crontab（每 5 分钟检查）
crontab -e
# 添加：*/5 * * * * /opt/claude-webui/healthcheck.sh
```

---

## 故障排除

### 常见问题

#### 1. 端口被占用

```bash
# 查看占用端口的进程
sudo lsof -i:8000

# 杀掉进程
sudo lsof -ti:8000 | xargs kill -9

# 或使用部署脚本
./deploy.sh stop
```

#### 2. MCP 连接失败

```bash
# 测试 MCP 服务器连通性
curl http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata

# 检查网络配置
ping cm-mng.bilibili.co

# 检查防火墙
sudo iptables -L -n
```

#### 3. WebSocket 连接断开

检查 Nginx 配置：
```nginx
# 确保有这些配置
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 7d;
```

#### 4. 内存不足

```bash
# 查看内存使用
free -h

# 查看进程内存
docker stats  # Docker 部署
ps aux --sort=-%mem | head  # 传统部署

# 优化：限制 Docker 内存
# 在 docker-compose.yml 中添加：
deploy:
  resources:
    limits:
      memory: 2G
```

#### 5. 日志文件过大

```bash
# 清理日志
sudo truncate -s 0 /var/log/nginx/claude-webui-access.log

# 启用日志轮转（见上文）
```

### 调试技巧

```bash
# 1. 检查服务状态
./deploy.sh logs

# 2. 进入容器调试（Docker）
docker-compose exec claude-webui /bin/bash

# 3. 查看环境变量
docker-compose exec claude-webui env  # Docker
printenv  # 传统部署

# 4. 测试 Python 依赖
docker-compose exec claude-webui python -c "import claude_agent_sdk; print('OK')"

# 5. 端口测试
nc -zv localhost 8000
```

---

## 安全建议

### 1. 网络安全

```bash
# 配置防火墙（仅开放必要端口）
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 限制源 IP（如果可能）
sudo ufw allow from 192.168.1.0/24 to any port 8000
```

### 2. 应用安全

```python
# 在 webui_server.py 中添加：
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],  # 限制来源
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### 3. 数据安全

```bash
# 敏感文件权限
chmod 600 .env
chmod 600 /opt/claude-webui/logs/*.log

# 使用专用用户运行
sudo useradd -r -s /bin/false claude
sudo chown -R claude:claude /opt/claude-webui
```

### 4. 更新和备份

```bash
# 定期更新
./deploy.sh update

# 备份配置
tar -czf backup-$(date +%Y%m%d).tar.gz \
    .env docker-compose.yml workspace/

# 定期备份（crontab）
0 2 * * * cd /opt/claude-webui && tar -czf /backups/claude-webui-$(date +\%Y\%m\%d).tar.gz .env workspace/
```

---

## 性能优化

### 1. Docker 优化

```yaml
# docker-compose.yml
services:
  claude-webui:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 1G
```

### 2. Nginx 优化

```nginx
# nginx.conf
worker_processes auto;
worker_connections 1024;

# 启用 gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 连接池
keepalive_timeout 65;
keepalive_requests 100;
```

### 3. 应用优化

```python
# webui_server.py
# 使用多个 worker
if __name__ == "__main__":
    import uvicorn
    import multiprocessing

    workers = multiprocessing.cpu_count()
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        workers=workers  # 多进程
    )
```

---

## 扩展部署

### 负载均衡

#### Docker Swarm
```bash
# 初始化 Swarm
docker swarm init

# 部署服务（3 个副本）
docker stack deploy -c docker-compose.yml claude

# 扩展
docker service scale claude_claude-webui=5
```

#### Kubernetes
创建 `k8s-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-webui
spec:
  replicas: 3
  selector:
    matchLabels:
      app: claude-webui
  template:
    metadata:
      labels:
        app: claude-webui
    spec:
      containers:
      - name: claude-webui
        image: claude-webui:latest
        ports:
        - containerPort: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: claude-webui-service
spec:
  selector:
    app: claude-webui
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

---

## 快速命令参考

```bash
# 部署
./deploy.sh docker          # Docker 部署
./deploy.sh standalone      # 传统部署

# 管理
./deploy.sh start          # 启动
./deploy.sh stop           # 停止
./deploy.sh restart        # 重启
./deploy.sh logs           # 查看日志
./deploy.sh update         # 更新

# Docker
docker-compose up -d       # 启动
docker-compose down        # 停止
docker-compose logs -f     # 日志
docker-compose ps          # 状态

# systemd
sudo systemctl start claude-webui
sudo systemctl stop claude-webui
sudo systemctl status claude-webui
sudo journalctl -u claude-webui -f
```

---

## 附录

### A. 完整文件清单

```
claude-webui/
├── webui_server.py          # 主应用
├── static/                  # 前端资源
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── requirements.txt         # Python 依赖
├── Dockerfile              # Docker 镜像
├── docker-compose.yml      # Docker Compose 配置
├── .env.example            # 环境变量模板
├── .dockerignore           # Docker 忽略文件
├── deploy.sh               # 部署脚本
├── nginx.conf              # Nginx 配置
└── DEPLOYMENT.md           # 本文档
```

### B. 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 8000 | 服务端口 |
| LOG_LEVEL | INFO | 日志级别 |
| MCP_BERSERKER_URL | http://... | MCP 服务器地址 |
| WORK_DIR | /app | 工作目录 |

### C. 常用端口

- 8000: WebUI 服务
- 80: HTTP (Nginx)
- 443: HTTPS (Nginx)

---

## 支持

如有问题，请查阅：
- [WebUI 使用文档](./README_WEBUI.md)
- [MCP 工具指南](./MCP_USAGE.md)
- [项目总结](./SETUP_SUMMARY.md)

或联系技术支持团队。
