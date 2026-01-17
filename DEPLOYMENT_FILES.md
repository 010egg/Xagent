# 部署文件清单

本项目包含完整的部署配置文件，支持多种部署方式。

---

## 📦 核心应用文件

| 文件 | 说明 | 必需 |
|------|------|:----:|
| `webui_server.py` | FastAPI 主应用服务器 | ✅ |
| `static/index.html` | 前端主页面 | ✅ |
| `static/styles.css` | Manus 风格样式表 | ✅ |
| `static/app.js` | 前端交互逻辑 | ✅ |
| `requirements.txt` | Python 依赖清单 | ✅ |

---

## 🐳 Docker 部署文件

| 文件 | 说明 | 用途 |
|------|------|------|
| `Dockerfile` | Docker 镜像构建文件 | 构建容器镜像 |
| `docker-compose.yml` | Docker Compose 配置 | 一键启动服务 |
| `.dockerignore` | Docker 忽略文件 | 优化镜像大小 |

**使用方法**：
```bash
docker-compose up -d
```

---

## 🔧 配置文件

| 文件 | 说明 | 是否敏感 |
|------|------|:--------:|
| `.env.example` | 环境变量模板 | ❌ |
| `.env` | 实际环境变量（运行时创建） | ✅ |
| `nginx.conf` | Nginx 反向代理配置 | ❌ |

**配置步骤**：
```bash
cp .env.example .env
vim .env  # 编辑配置
```

---

## 🚀 部署脚本

| 文件 | 说明 | 用途 |
|------|------|------|
| `deploy.sh` | 自动化部署脚本 | Docker/传统部署 |
| `pack_for_deployment.sh` | 打包脚本 | 生成部署包 |
| `start_webui.sh` | 快速启动脚本 | 本地开发 |

**可执行权限**：
```bash
chmod +x deploy.sh
chmod +x pack_for_deployment.sh
chmod +x start_webui.sh
```

### deploy.sh 功能

```bash
./deploy.sh docker      # Docker 部署
./deploy.sh standalone  # 传统部署
./deploy.sh update      # 更新
./deploy.sh stop        # 停止
./deploy.sh restart     # 重启
./deploy.sh logs        # 查看日志
```

---

## 📚 文档文件

### 使用文档

| 文件 | 内容 | 适用对象 |
|------|------|----------|
| `README_WEBUI.md` | WebUI 功能和使用说明 | 所有用户 |
| `MCP_USAGE.md` | MCP 工具使用指南 | 数据分析师 |
| `SETUP_SUMMARY.md` | 项目集成总结 | 开发者 |

### 部署文档

| 文件 | 内容 | 适用对象 |
|------|------|----------|
| `QUICK_START.md` | **3 分钟快速部署** | ⭐ 新手推荐 |
| `DEPLOYMENT.md` | **完整部署指南**（100+ 页） | 运维工程师 |
| `DEPLOYMENT_CHECKLIST.md` | 部署清单 | 项目经理 |
| `DEPLOYMENT_FILES.md` | 本文件 | 所有人 |

---

## 🧪 测试文件

| 文件 | 说明 | 用途 |
|------|------|------|
| `test_mcp.py` | MCP 集成测试 | 验证 MCP 功能 |
| `claude_client_demo.py` | SDK 命令行 Demo | 学习 SDK 用法 |

**运行测试**：
```bash
python test_mcp.py
python claude_client_demo.py
```

---

## 📁 目录结构

```
claude-webui/
├── 📄 核心应用
│   ├── webui_server.py
│   ├── static/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── requirements.txt
│
├── 🐳 Docker
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
│
├── ⚙️ 配置
│   ├── .env.example
│   ├── nginx.conf
│   └── .env (运行时创建)
│
├── 🚀 部署脚本
│   ├── deploy.sh
│   ├── pack_for_deployment.sh
│   └── start_webui.sh
│
├── 📚 文档
│   ├── 使用文档/
│   │   ├── README_WEBUI.md
│   │   ├── MCP_USAGE.md
│   │   └── SETUP_SUMMARY.md
│   │
│   └── 部署文档/
│       ├── QUICK_START.md          ⭐ 推荐阅读
│       ├── DEPLOYMENT.md
│       ├── DEPLOYMENT_CHECKLIST.md
│       └── DEPLOYMENT_FILES.md     (本文)
│
├── 🧪 测试
│   ├── test_mcp.py
│   └── claude_client_demo.py
│
└── 📂 运行时目录 (自动创建)
    ├── workspace/  # 工作空间
    ├── logs/       # 日志文件
    └── venv/       # Python 虚拟环境 (传统部署)
```

---

## 📦 部署包内容

运行 `./pack_for_deployment.sh` 后生成的部署包包含：

### 必需文件
- ✅ webui_server.py
- ✅ static/ (完整目录)
- ✅ requirements.txt
- ✅ Dockerfile
- ✅ docker-compose.yml
- ✅ .env.example
- ✅ .dockerignore
- ✅ deploy.sh
- ✅ nginx.conf

### 文档文件
- 📄 README_FIRST.txt (快速开始)
- 📄 README_WEBUI.md
- 📄 MCP_USAGE.md
- 📄 DEPLOYMENT.md

### 排除文件
- ❌ venv/ (虚拟环境)
- ❌ __pycache__/ (缓存)
- ❌ .git/ (版本控制)
- ❌ logs/ (日志)
- ❌ workspace/ (工作目录)
- ❌ test_*.py (测试文件)
- ❌ *_test.py (测试文件)
- ❌ AgentSdkDocs/ (开发文档)

---

## 🎯 不同角色推荐文件

### 👨‍💻 开发者
**必读**：
1. `README_WEBUI.md` - 了解功能
2. `MCP_USAGE.md` - MCP 工具使用
3. `SETUP_SUMMARY.md` - 项目架构

**参考**：
- `claude_client_demo.py` - SDK 示例
- `test_mcp.py` - 测试代码

### 🔧 运维工程师
**必读**：
1. `QUICK_START.md` - 快速开始 ⭐
2. `DEPLOYMENT.md` - 完整部署指南
3. `DEPLOYMENT_CHECKLIST.md` - 部署清单

**参考**：
- `nginx.conf` - 反向代理配置
- `docker-compose.yml` - 容器编排

### 📊 数据分析师
**必读**：
1. `README_WEBUI.md` - 界面使用
2. `MCP_USAGE.md` - 数据查询工具

### 👔 项目经理
**必读**：
1. `QUICK_START.md` - 部署概览
2. `DEPLOYMENT_CHECKLIST.md` - 项目跟踪
3. `SETUP_SUMMARY.md` - 功能总结

---

## 🔄 文件版本控制建议

### 应提交到 Git
- ✅ 所有源代码文件
- ✅ 配置模板（.env.example）
- ✅ 部署脚本
- ✅ 文档文件
- ✅ Dockerfile 和 docker-compose.yml

### 不应提交（.gitignore）
- ❌ .env (包含敏感信息)
- ❌ venv/ (虚拟环境)
- ❌ __pycache__/
- ❌ *.pyc
- ❌ logs/
- ❌ workspace/
- ❌ *.tar.gz (部署包)

---

## 📋 快速文件查找

### 我想...

**快速部署**
→ 阅读 `QUICK_START.md`

**详细部署**
→ 阅读 `DEPLOYMENT.md`

**了解功能**
→ 阅读 `README_WEBUI.md`

**学习 MCP 工具**
→ 阅读 `MCP_USAGE.md`

**配置环境**
→ 复制并编辑 `.env.example`

**配置 Nginx**
→ 使用 `nginx.conf`

**一键部署**
→ 运行 `./deploy.sh docker`

**打包项目**
→ 运行 `./pack_for_deployment.sh`

**测试功能**
→ 运行 `python test_mcp.py`

---

## 🆘 遇到问题？

1. **部署问题** → 查看 `DEPLOYMENT.md` 故障排除章节
2. **配置问题** → 检查 `.env` 文件
3. **MCP 问题** → 查看 `MCP_USAGE.md`
4. **功能问题** → 查看 `README_WEBUI.md`
5. **其他问题** → 查看 `DEPLOYMENT_CHECKLIST.md`

---

## 📊 文件统计

| 类型 | 数量 |
|------|:----:|
| 核心代码 | 4 |
| 配置文件 | 4 |
| 部署脚本 | 3 |
| 文档文件 | 8 |
| 测试文件 | 2 |
| **总计** | **21** |

---

**所有文件就绪，随时可以部署！** 🚀
