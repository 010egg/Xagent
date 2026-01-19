# 项目目录结构

本文档描述了 Claude WebUI 项目的目录组织结构。

## 📁 根目录结构

```
Xagent/
├── .claude/                # Claude Code 配置
│   └── commands/          # 自定义斜杠命令定义
├── deployment/            # 部署相关配置
│   ├── Dockerfile         # Docker 镜像配置
│   ├── docker-compose.yml # Docker Compose 配置
│   └── nginx.conf         # Nginx 配置
├── docs/                  # 项目文档
│   ├── AgentSdkDocs/     # Agent SDK 文档
│   ├── DesignDocs/       # 设计文档
│   └── *.md              # 各种说明文档
├── examples/              # 示例代码
│   └── claude_client_demo.py
├── logs/                  # 日志文件（运行时生成）
│   └── webui_server.log
├── scripts/               # 启动和部署脚本
│   ├── start_with_logs.sh
│   ├── start_with_slash_commands.sh
│   ├── start_webui.sh
│   ├── deploy.sh
│   └── pack_for_deployment.sh
├── static/                # 静态资源文件
│   ├── index.html        # 主页面
│   ├── app.js            # 前端 JavaScript
│   └── styles.css        # 样式表
├── tests/                 # 测试文件
│   ├── test_*.py         # Python 测试脚本
│   └── test_*.html       # HTML 测试页面
├── venv/                  # Python 虚拟环境
├── .env                   # 环境变量配置（不提交到 Git）
├── .env.example           # 环境变量配置示例
├── .gitignore             # Git 忽略规则
├── README.md              # 项目说明
├── requirements.txt       # Python 依赖
└── webui_server.py        # 主服务器程序
```

## 📝 目录说明

### `.claude/`
Claude Code CLI 的配置目录。

- **`commands/`**: 存放自定义斜杠命令的 Markdown 文件
  - 每个 `.md` 文件定义一个斜杠命令
  - 文件名即为命令名（如 `dqcsql.md` → `/dqcsql`）
  - 详见 [HOW_TO_ADD_SLASH_COMMAND.md](./HOW_TO_ADD_SLASH_COMMAND.md)

### `deployment/`
部署相关的配置文件。

- **`Dockerfile`**: Docker 镜像构建配置
- **`docker-compose.yml`**: Docker Compose 服务编排
- **`nginx.conf`**: Nginx 反向代理配置

### `docs/`
项目文档集合。

- **`AgentSdkDocs/`**: Claude Agent SDK 官方文档
- **`DesignDocs/`**: 项目设计文档
- **`DEPLOYMENT*.md`**: 部署相关文档
- **`HOW_TO_ADD_SLASH_COMMAND.md`**: 斜杠命令创建指南
- **`INTERRUPT_FEATURE.md`**: 中断功能文档
- **`MCP_USAGE.md`**: MCP 工具使用说明
- **`QUICK_START.md`**: 快速开始指南
- **`README_WEBUI.md`**: WebUI 详细说明
- **`SETUP_SUMMARY.md`**: 环境配置总结
- **`SLASH_COMMANDS.md`**: 斜杠命令功能说明
- **`PROJECT_STRUCTURE.md`**: 本文档

### `examples/`
示例代码和演示脚本。

- **`claude_client_demo.py`**: Claude SDK 客户端示例

### `logs/`
运行时日志文件存储目录（自动创建）。

- **`webui_server.log`**: WebUI 服务器日志
- 此目录不提交到 Git

### `scripts/`
各种启动和部署脚本。

#### 启动脚本
- **`start_webui.sh`**: 标准启动（前台运行）
- **`start_with_logs.sh`**: 带日志输出的启动（推荐）
- **`start_with_slash_commands.sh`**: 启动前显示命令列表

#### 部署脚本
- **`deploy.sh`**: 一键部署到生产环境
- **`pack_for_deployment.sh`**: 打包部署文件

**使用方法：**
```bash
cd /Users/xionghaoqiang/Xagent
./scripts/start_with_logs.sh
```

### `static/`
Web 前端的静态资源文件。

- **`index.html`**: 主页面 HTML
- **`app.js`**: 前端 JavaScript 逻辑
- **`styles.css`**: 样式表

### `tests/`
测试文件集合。

- **`test_mcp.py`**: MCP 工具测试
- **`test_slash_commands.py`**: 斜杠命令加载测试
- **`test_sdk_slash_command.py`**: SDK 斜杠命令测试
- **`test_websocket.py`**: WebSocket 连接测试
- **`test_commands_frontend.html`**: 前端命令列表测试页面
- **`test_data.txt`**: 测试数据

### `venv/`
Python 虚拟环境（不提交到 Git）。

## 🚀 核心文件

### `webui_server.py`
主服务器程序，包含：
- FastAPI Web 服务器
- WebSocket 通信处理
- Claude SDK 客户端集成
- 斜杠命令系统
- MCP 工具集成

### `requirements.txt`
Python 依赖包列表：
- `fastapi`: Web 框架
- `uvicorn`: ASGI 服务器
- `websockets`: WebSocket 支持
- `claude-agent-sdk`: Claude Agent SDK
- 其他依赖...

### `.env`
环境变量配置（不提交到 Git）：
- `ANTHROPIC_API_KEY`: Claude API 密钥
- 其他敏感配置...

### `README.md`
项目主要说明文档。

## 🔧 配置文件

### `.gitignore`
Git 忽略规则，包括：
- Python 缓存和虚拟环境
- 日志文件和 logs 目录
- 环境变量文件
- IDE 配置文件
- 操作系统临时文件
- 测试临时数据

### `.env.example`
环境变量配置模板，包含：
- 所有需要配置的环境变量
- 变量说明和示例值
- 不包含真实的敏感信息

## 📊 工作流程

### 开发流程
1. **启动开发环境**:
   ```bash
   ./scripts/start_with_logs.sh
   ```

2. **创建新的斜杠命令**:
   - 在 `.claude/commands/` 创建 `.md` 文件
   - 重启服务器使命令生效
   - 详见 [HOW_TO_ADD_SLASH_COMMAND.md](./HOW_TO_ADD_SLASH_COMMAND.md)

3. **修改前端代码**:
   - 编辑 `static/` 目录下的文件
   - 刷新浏览器即可看到变化

4. **查看日志**:
   ```bash
   tail -f logs/webui_server.log
   ```

### 部署流程
1. **打包代码**:
   ```bash
   ./scripts/pack_for_deployment.sh
   ```

2. **部署到服务器**:
   ```bash
   ./scripts/deploy.sh
   ```

3. **使用 Docker**:
   ```bash
   cd deployment
   docker-compose up -d
   ```

## 📝 注意事项

### 路径规范
- 所有启动脚本使用绝对路径 `/Users/xionghaoqiang/Xagent`
- 相对路径从项目根目录开始
- 日志文件统一存放在 `logs/` 目录

### 命名规范
- 测试文件: `test_*.py` 或 `test_*.html`
- 启动脚本: `start_*.sh`
- 文档文件: `*.md` (大写)
- 命令文件: `*.md` (小写，存放在 `.claude/commands/`)

### Git 提交
- **不提交**: logs/, .env, venv/, __pycache__, *.pyc
- **提交**: .claude/commands/, 所有文档和脚本
- **示例文件**: .env.example 需要提交

## 🔄 维护建议

### 定期清理
```bash
# 清理日志
rm -rf logs/*.log

# 清理 Python 缓存
find . -type d -name __pycache__ -exec rm -rf {} +

# 清理临时文件
rm -rf *.pyc *.pyo
```

### 更新依赖
```bash
source venv/bin/activate
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt
```

### 备份重要文件
- `.claude/commands/` - 自定义命令
- `.env` - 环境配置
- `docs/` - 文档
- `static/` - 前端代码

---

**最后更新**: 2025-01-19
**维护者**: Claude Code Team
