# Claude WebUI 快速部署指南

**3 分钟完成部署！**

---

## 🚀 方式一：Docker 部署（推荐）

### 步骤 1: 准备部署包

**在开发机上：**
```bash
cd /Users/xionghaoqiang/Xagent
./pack_for_deployment.sh
```

生成文件：`claude-webui-YYYYMMDD-HHMMSS.tar.gz`

### 步骤 2: 上传到服务器

```bash
scp claude-webui-*.tar.gz user@your-server:/opt/
```

### 步骤 3: 服务器部署

```bash
# SSH 登录
ssh user@your-server

# 解压
cd /opt
tar -xzf claude-webui-*.tar.gz
cd claude-webui

# 一键部署
./deploy.sh docker
```

### 步骤 4: 访问验证

浏览器打开：`http://服务器IP:8000`

**完成！** 🎉

---

## 💻 方式二：传统部署

### 快速命令

```bash
# 上传和解压（同上）
ssh user@your-server
cd /opt
tar -xzf claude-webui-*.tar.gz
cd claude-webui

# 一键部署
./deploy.sh standalone

# 启动服务
sudo systemctl start claude-webui
```

---

## 🌐 添加 Nginx 反向代理（可选）

```bash
# 安装 Nginx
sudo apt install nginx

# 配置
sudo cp nginx.conf /etc/nginx/sites-available/claude-webui
sudo vim /etc/nginx/sites-available/claude-webui  # 修改域名

# 启用
sudo ln -s /etc/nginx/sites-available/claude-webui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 添加 HTTPS（可选）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

---

## 📊 常用命令

### Docker 方式

```bash
# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启
docker-compose restart

# 停止
docker-compose down

# 更新
./deploy.sh update
```

### 传统方式

```bash
# 查看状态
sudo systemctl status claude-webui

# 查看日志
sudo journalctl -u claude-webui -f

# 重启
sudo systemctl restart claude-webui

# 停止
sudo systemctl stop claude-webui
```

---

## ⚙️ 环境配置

编辑 `.env` 文件：

```bash
# 复制模板
cp .env.example .env

# 编辑配置
vim .env
```

**关键配置**：
```bash
PORT=8000
MCP_BERSERKER_URL=http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata
LOG_LEVEL=INFO
```

---

## 🧪 测试 MCP 功能

浏览器访问 http://服务器IP:8000，输入：

```
查询表 bi_sycpb.dws_dmp_group_people_group_1d_d 有哪些字段？
```

Claude 会调用 MCP 工具返回表结构信息。

---

## 🆘 故障排除

### 端口被占用

```bash
sudo lsof -ti:8000 | xargs kill -9
./deploy.sh restart
```

### MCP 无法连接

```bash
# 测试连通性
curl http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata

# 检查网络
ping cm-mng.bilibili.co
```

### 查看详细日志

```bash
# Docker
docker-compose logs --tail=100

# 传统
sudo journalctl -u claude-webui -n 100
```

---

## 📚 详细文档

- **DEPLOYMENT.md** - 完整部署指南（100+ 页）
- **DEPLOYMENT_CHECKLIST.md** - 部署清单
- **README_WEBUI.md** - WebUI 使用文档
- **MCP_USAGE.md** - MCP 工具使用指南

---

## 🎯 部署架构

### 最简架构（开发/测试）
```
浏览器 → Claude WebUI (Port 8000)
```

### 推荐架构（生产）
```
浏览器 → Nginx (80/443) → Claude WebUI (8000)
```

### 高可用架构（大规模）
```
浏览器 → Load Balancer → Nginx集群 → Claude WebUI集群
```

---

## ✅ 部署完成检查

- [ ] HTTP 访问正常
- [ ] WebSocket 连接正常
- [ ] MCP 工具调用正常
- [ ] 日志记录正常
- [ ] 自动重启配置

---

## 📞 获取帮助

1. 查看详细文档：`DEPLOYMENT.md`
2. 检查部署清单：`DEPLOYMENT_CHECKLIST.md`
3. 运行健康检查：`./deploy.sh logs`

---

**就这么简单！现在开始使用 Claude WebUI 吧！** 🚀
