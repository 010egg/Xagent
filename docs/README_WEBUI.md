# Claude WebUI - Manus Style

一个现代化的 Claude Code SDK WebUI 界面，采用 Manus 风格设计。

## 功能特性

✨ **核心功能**
- 🎨 Manus 风格的现代化 UI 设计
- 💬 实时流式对话
- 🔄 持续对话记忆（Claude 记住上下文）
- 🛠️ 工具使用可视化
- 💭 思考过程显示
- 📊 会话统计信息（成本、耗时、轮数）
- 🔌 WebSocket 实时通信
- ⚡ 斜杠命令系统（内置 + 自定义命令）
- 🔧 MCP 服务器集成
- ⏸️ 请求中断功能

## 项目结构

```
Xagent/
├── webui_server.py          # FastAPI 后端服务器
├── static/
│   ├── index.html           # 主页面
│   ├── styles.css           # Manus 风格样式
│   └── app.js              # 前端交互逻辑
├── .claude/
│   └── commands/            # 自定义斜杠命令
│       ├── about.md         # 关于项目命令
│       └── table-info.md    # 表信息查询命令
├── claude_client_demo.py    # ClaudeSDKClient 命令行 demo
├── SLASH_COMMANDS.md        # 斜杠命令使用指南
└── venv/                    # Python 虚拟环境
```

## 安装依赖

已安装的依赖：
- `claude-agent-sdk` - Claude Code SDK
- `fastapi` - Web 框架
- `uvicorn` - ASGI 服务器
- `websockets` - WebSocket 支持
- `pyyaml` - YAML 解析（用于自定义命令）

## 运行 WebUI

### 1. 启动服务器

```bash
cd /Users/xionghaoqiang/Xagent
source venv/bin/activate
python webui_server.py
```

### 2. 访问界面

打开浏览器访问：
```
http://localhost:8000
```

### 3. 开始对话

在输入框中输入消息，按 Enter 或点击发送按钮即可开始与 Claude 对话。

### 4. 使用斜杠命令

输入以 `/` 开头的命令来执行特殊操作：

```
/help                    # 显示所有可用命令
/clear                   # 清除对话历史
/about                   # 关于项目
/table-info [表名]       # 查询表信息
```

详细命令文档请参阅 [SLASH_COMMANDS.md](SLASH_COMMANDS.md)

## UI 功能说明

### 侧边栏
- **New Chat** - 清空当前对话，开始新的聊天
- **Session Info** - 显示会话状态、ID、轮数和成本
- **Status** - 连接状态指示器

### 聊天区域
- **消息显示** - 用户和 Claude 的对话消息
- **工具使用** - 显示 Claude 使用的工具（Read、Write、Bash 等）
- **思考过程** - 显示 Claude 的思考过程（如果可用）
- **统计信息** - 每次响应后显示耗时和成本

### 输入区域
- 支持多行输入（Shift + Enter 换行）
- Enter 发送消息
- 自动调整高度（最大 200px）

## 技术栈

### 后端
- **FastAPI** - 现代化的 Python Web 框架
- **WebSocket** - 实时双向通信
- **Claude Agent SDK** - Claude Code 官方 SDK

### 前端
- **原生 JavaScript** - 无框架，轻量高效
- **WebSocket API** - 实时通信
- **CSS Variables** - 主题管理
- **Flexbox/Grid** - 响应式布局

## 配置选项

编辑 `webui_server.py` 中的配置：

```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    permission_mode="acceptEdits",  # 自动批准编辑
    cwd="/Users/xionghaoqiang/Xagent"  # 工作目录
)
```

### 可配置项

- `allowed_tools` - 允许使用的工具列表
- `permission_mode` - 权限模式
  - `"default"` - 默认提示
  - `"acceptEdits"` - 自动批准编辑
  - `"bypassPermissions"` - 绕过所有权限检查
- `cwd` - Claude 的工作目录
- `model` - 使用的模型（sonnet/opus/haiku）

## API 端点

### WebSocket
- **路径**: `/ws`
- **协议**: WebSocket
- **消息格式**: JSON

#### 发送消息格式
```json
{
  "type": "message",
  "content": "你的消息内容"
}
```

#### 接收消息类型
- `user_message` - 用户消息
- `assistant_text` - Claude 的文本回复
- `thinking` - Claude 的思考过程
- `tool_use` - 工具使用信息
- `tool_result` - 工具执行结果
- `result` - 完成信息和统计
- `error` - 错误消息

## 样式自定义

编辑 `static/styles.css` 中的 CSS 变量：

```css
:root {
    --primary-color: #10a37f;      /* 主色调 */
    --bg-primary: #0f0f0f;         /* 主背景色 */
    --bg-secondary: #1a1a1a;       /* 次要背景色 */
    --text-primary: #ececf1;       /* 主文本色 */
    /* ... 更多变量 */
}
```

## 故障排除

### 端口被占用
```bash
# 杀掉占用 8000 端口的进程
lsof -ti:8000 | xargs kill -9
```

### WebSocket 连接失败
- 检查服务器是否正常运行
- 检查防火墙设置
- 查看浏览器控制台错误信息

### Claude SDK 错误
- 确保 `claude-agent-sdk` 已正确安装
- 检查 API 密钥配置（如果需要）
- 查看服务器日志

## 特性展示

### 持续对话
Claude 会记住整个会话的上下文：
```
用户: 创建一个文件 test.txt
Claude: [创建文件]

用户: 在刚才那个文件里写入 "Hello"
Claude: [记住是 test.txt，进行写入]
```

### 工具可视化
实时显示 Claude 使用的工具：
- 📝 Write - 创建文件
- 📖 Read - 读取文件
- ✏️ Edit - 编辑文件
- 🔧 Bash - 执行命令
- 🔍 Glob/Grep - 搜索文件

### 成本追踪
自动计算和显示每次对话的成本：
- Token 使用量
- API 调用时间
- 总成本（USD）

## 开发说明

### 添加新功能

1. **后端**: 在 `webui_server.py` 中修改 WebSocket 处理逻辑
2. **前端**: 在 `static/app.js` 中添加处理函数
3. **样式**: 在 `static/styles.css` 中添加样式

### 调试模式

启用调试日志：
```python
logging.basicConfig(level=logging.DEBUG)
```

## 许可证

本项目基于 Claude Code SDK 构建。

## 联系方式

如有问题或建议，请查阅 Claude Code 官方文档：
- https://docs.anthropic.com/claude/docs
