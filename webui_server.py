"""
Claude WebUI Server - Manus Style
FastAPI + WebSocket 实现的实时聊天服务器
"""

import asyncio
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging
import yaml
from typing import Dict, List, Optional
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ThinkingBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
    SystemMessage
)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(title="Claude WebUI", version="1.0.0")


class ConversationManager:
    """管理 Claude 对话会话"""

    def __init__(self):
        self.client = None
        self.is_interrupted = False
        self.current_task = None
        self.custom_commands: Dict[str, Dict] = {}

        # 配置 MCP 服务器
        mcp_servers = {
            "berserker-metadata": {
                "type": "http",
                "url": "http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata"
            }
        }

        # 配置允许的工具（包含基础工具和 MCP 工具）
        allowed_tools = [
            # 基础工具
            "Read", "Write", "Edit", "Bash", "Glob", "Grep",
            # berserker-metadata MCP 工具
            "mcp__berserker-metadata__getInfo",
            "mcp__berserker-metadata__getTableUpstreamLineage",
            "mcp__berserker-metadata__getTableDownstreamLineage",
            "mcp__berserker-metadata__getTableDataDemo",
            "mcp__berserker-metadata__getFieldEnumDistribution",
            "mcp__berserker-metadata__getHiveTableSchema",
            "mcp__berserker-metadata__getFieldEnumValues",
            "mcp__berserker-metadata__getJobUpstreamLineage",
            "mcp__berserker-metadata__getTableGenerationSql",
            "mcp__berserker-metadata__getJobDownstreamLineage"
        ]

        self.options = ClaudeAgentOptions(
            allowed_tools=allowed_tools,
            mcp_servers=mcp_servers,
            permission_mode="acceptEdits",
            cwd="/Users/xionghaoqiang/Xagent"
        )

        # 加载自定义命令
        self._load_custom_commands()

    async def initialize(self):
        """初始化客户端"""
        if self.client is None:
            self.client = ClaudeSDKClient(options=self.options)
            await self.client.connect()
            logger.info("Claude client initialized")

    async def send_message(self, message: str, websocket: WebSocket):
        """发送消息并流式返回响应"""
        try:
            # 重置中断标志
            self.is_interrupted = False

            # 确保客户端已初始化
            await self.initialize()

            # 发送用户消息到前端
            await websocket.send_json({
                "type": "user_message",
                "content": message
            })

            # 检查是否是斜杠命令
            if self._is_slash_command(message):
                logger.info(f"Detected slash command: {message}")
                parts = message.split(maxsplit=1)
                command = parts[0][1:]  # 移除开头的 /
                args = parts[1] if len(parts) > 1 else ""

                # 自定义命令优先（可以覆盖内置命令）
                if command in self.custom_commands:
                    logger.info(f"Expanding custom command: /{command}")
                    cmd_data = self.custom_commands[command]

                    # 替换参数占位符
                    content = cmd_data["content"]
                    if args:
                        arg_list = args.split()
                        for i, arg in enumerate(arg_list, 1):
                            content = content.replace(f"${i}", arg)
                    content = content.replace("$ARGUMENTS", args)

                    # 发送展开后的内容给 Claude
                    message = content
                    logger.info(f"Expanded to: {content[:100]}...")

                # 处理内置命令
                elif command in ["help", "clear", "compact"]:
                    logger.info(f"Handling built-in command: /{command}")
                    await self._handle_builtin_command(command, websocket)
                    return  # 内置命令处理完成，不发送给 Claude

            # 发送查询到 Claude
            await self.client.query(message)

            # 流式接收响应
            async for msg in self.client.receive_response():
                # 如果被中断，停止处理后续消息
                if self.is_interrupted:
                    logger.info("Message processing interrupted, stopping...")
                    break

                if isinstance(msg, AssistantMessage):
                    for block in msg.content:
                        if isinstance(block, TextBlock):
                            # 发送文本消息
                            await websocket.send_json({
                                "type": "assistant_text",
                                "content": block.text
                            })

                        elif isinstance(block, ThinkingBlock):
                            # 发送思考过程
                            await websocket.send_json({
                                "type": "thinking",
                                "content": block.thinking
                            })

                        elif isinstance(block, ToolUseBlock):
                            # 发送工具使用信息
                            await websocket.send_json({
                                "type": "tool_use",
                                "tool_name": block.name,
                                "tool_input": block.input
                            })

                        elif isinstance(block, ToolResultBlock):
                            # 发送工具结果
                            await websocket.send_json({
                                "type": "tool_result",
                                "content": block.content if isinstance(block.content, str) else str(block.content)
                            })

                elif isinstance(msg, ResultMessage):
                    # 发送完成消息
                    await websocket.send_json({
                        "type": "result",
                        "subtype": msg.subtype,
                        "duration_ms": msg.duration_ms,
                        "num_turns": msg.num_turns,
                        "session_id": msg.session_id,
                        "total_cost_usd": msg.total_cost_usd,
                        "usage": msg.usage
                    })

                elif isinstance(msg, SystemMessage):
                    # 发送系统消息
                    await websocket.send_json({
                        "type": "system",
                        "subtype": msg.subtype,
                        "data": msg.data
                    })

        except asyncio.CancelledError:
            logger.info("Task was cancelled")
            raise  # 重新抛出以正确处理取消
        except Exception as e:
            logger.error(f"Error in send_message: {e}")
            await websocket.send_json({
                "type": "error",
                "content": str(e)
            })

    async def interrupt(self, websocket: WebSocket):
        """中断当前请求"""
        try:
            logger.info("Setting interrupt flag")
            # 立即设置中断标志
            self.is_interrupted = True

            # 取消当前任务
            if self.current_task and not self.current_task.done():
                logger.info("Cancelling current task")
                self.current_task.cancel()

            # 立即发送中断确认消息给前端
            await websocket.send_json({
                "type": "interrupted",
                "content": "Request interrupted successfully"
            })
            logger.info("Interrupt response sent to frontend")

            # 在后台调用 SDK 的中断方法并重新初始化客户端
            if self.client:
                try:
                    logger.info("Calling client.interrupt() and reinitializing")
                    await self.client.interrupt()
                    logger.info("Disconnecting and reinitializing client")
                    await self.client.disconnect()
                    self.client = None
                    await self.initialize()
                    logger.info("Client reinitialized successfully")
                except Exception as e:
                    logger.warning(f"Error during interrupt cleanup, forcing reinitialization: {e}")
                    try:
                        self.client = None
                        await self.initialize()
                        logger.info("Forced reinitialization succeeded")
                    except Exception as e2:
                        logger.error(f"Forced reinitialization failed: {e2}")

        except Exception as e:
            logger.error(f"Error in interrupt: {e}")
            # 设置中断标志即使出错也要停止处理
            self.is_interrupted = True
            await websocket.send_json({
                "type": "interrupted",
                "content": "Request interrupted"
            })

    async def close(self):
        """关闭客户端"""
        if self.client:
            await self.client.disconnect()
            self.client = None
            logger.info("Claude client closed")

    def _load_custom_commands(self):
        """从 .claude/commands/ 目录加载自定义命令"""
        commands_dir = Path(self.options.cwd) / ".claude" / "commands"

        if not commands_dir.exists():
            logger.info("No custom commands directory found")
            return

        # 递归查找所有 .md 文件
        for md_file in commands_dir.rglob("*.md"):
            try:
                # 命令名称是文件名（不含 .md）
                command_name = md_file.stem

                # 读取文件内容
                content = md_file.read_text(encoding="utf-8")

                # 解析 YAML 前言（如果有）
                metadata = {}
                command_content = content

                if content.startswith("---"):
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        try:
                            metadata = yaml.safe_load(parts[1]) or {}
                            command_content = parts[2].strip()
                        except Exception as e:
                            logger.warning(f"Failed to parse YAML in {md_file}: {e}")

                # 存储命令
                self.custom_commands[command_name] = {
                    "name": command_name,
                    "content": command_content,
                    "metadata": metadata,
                    "file_path": str(md_file)
                }

                logger.info(f"Loaded custom command: /{command_name}")

            except Exception as e:
                logger.error(f"Failed to load command from {md_file}: {e}")

    def _is_slash_command(self, message: str) -> bool:
        """检测消息是否是斜杠命令"""
        return message.strip().startswith("/")

    async def _handle_builtin_command(self, command: str, websocket: WebSocket):
        """处理内置斜杠命令"""
        if command == "help":
            await self._handle_help_command(websocket)
        elif command == "clear":
            await self._handle_clear_command(websocket)
        elif command == "compact":
            await self._handle_compact_command(websocket)

    async def _handle_help_command(self, websocket: WebSocket):
        """处理 /help 命令"""
        logger.info("Handling /help command")

        # 构建帮助文本
        help_text = "## 可用的斜杠命令\n\n"
        help_text += "### 内置命令\n\n"
        help_text += "**`/help`**\n  显示所有可用的斜杠命令\n\n"
        help_text += "**`/clear`**\n  清除当前对话历史\n\n"
        help_text += "**`/compact`**\n  压缩对话历史以减少 token 使用（即将推出）\n\n"

        # 添加自定义命令
        if self.custom_commands:
            help_text += "### 自定义命令\n\n"
            for cmd_name, cmd_data in self.custom_commands.items():
                desc = cmd_data["metadata"].get("description", "自定义命令")
                arg_hint = cmd_data["metadata"].get("argument-hint", "")
                help_text += f"**`/{cmd_name}`** {arg_hint}\n  {desc}\n\n"

        help_text += "---\n\n"
        help_text += "💡 **提示**: 斜杠命令以 `/` 开头，可以用来控制会话或执行特定操作。"

        # 发送响应
        await websocket.send_json({
            "type": "assistant_text",
            "content": help_text
        })

        await websocket.send_json({
            "type": "result",
            "subtype": "slash_command",
            "duration_ms": 0,
            "num_turns": 1,
            "session_id": "",
            "total_cost_usd": 0,
            "usage": {}
        })
        logger.info("/help command completed")

    async def _handle_clear_command(self, websocket: WebSocket):
        """处理 /clear 命令"""
        try:
            logger.info("Handling /clear command")
            # 关闭并重新初始化客户端
            await self.close()
            await self.initialize()

            await websocket.send_json({
                "type": "assistant_text",
                "content": "✅ **对话历史已清除**\n\n开始新的会话。之前的对话上下文已被清空。"
            })

            await websocket.send_json({
                "type": "result",
                "subtype": "slash_command",
                "duration_ms": 0,
                "num_turns": 1,
                "session_id": "",
                "total_cost_usd": 0,
                "usage": {}
            })
            logger.info("/clear command completed")

        except Exception as e:
            logger.error(f"Failed to clear conversation: {e}")
            await websocket.send_json({
                "type": "error",
                "content": f"❌ 清除对话失败: {str(e)}"
            })

    async def _handle_compact_command(self, websocket: WebSocket):
        """处理 /compact 命令"""
        logger.info("Handling /compact command")
        await websocket.send_json({
            "type": "assistant_text",
            "content": "ℹ️ **`/compact` 命令**\n\n此命令将在未来版本中实现。\n\n该命令将压缩对话历史以减少 token 使用，同时保留重要的上下文信息。"
        })

        await websocket.send_json({
            "type": "result",
            "subtype": "slash_command",
            "duration_ms": 0,
            "num_turns": 1,
            "session_id": "",
            "total_cost_usd": 0,
            "usage": {}
        })
        logger.info("/compact command completed")


# 全局会话管理器
conversation_manager = ConversationManager()


@app.get("/")
async def get():
    """返回主页面"""
    html_path = Path(__file__).parent / "static" / "index.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(), status_code=200)
    else:
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Claude WebUI</title>
        </head>
        <body>
            <h1>Claude WebUI</h1>
            <p>Static files not found. Please create static/index.html</p>
        </body>
        </html>
        """, status_code=200)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 端点"""
    await websocket.accept()
    logger.info("WebSocket connection established")

    try:
        # 发送欢迎消息
        await websocket.send_json({
            "type": "system",
            "content": "Connected to Claude WebUI"
        })

        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data.get("type") == "message":
                user_message = message_data.get("content", "")
                logger.info(f"Received message: {user_message}")

                # 如果有正在运行的任务，先取消它
                if conversation_manager.current_task and not conversation_manager.current_task.done():
                    logger.info("Cancelling previous task before starting new one")
                    conversation_manager.current_task.cancel()
                    try:
                        await conversation_manager.current_task
                    except asyncio.CancelledError:
                        logger.info("Previous task cancelled successfully")
                    except Exception as e:
                        logger.error(f"Error waiting for task cancellation: {e}")
                else:
                    logger.info("No previous task to cancel or task already done")

                # 在后台任务中处理消息，不阻塞 WebSocket
                logger.info("Creating new task for message processing")
                conversation_manager.current_task = asyncio.create_task(
                    conversation_manager.send_message(user_message, websocket)
                )
                logger.info(f"Task created: {conversation_manager.current_task}")

            elif message_data.get("type") == "interrupt":
                # 中断请求
                logger.info("Interrupt request received")
                # 立即发送中断确认，并取消当前任务
                await conversation_manager.interrupt(websocket)

            elif message_data.get("type") == "reset":
                # 重置会话
                await conversation_manager.close()
                await conversation_manager.initialize()
                await websocket.send_json({
                    "type": "system",
                    "content": "Session reset"
                })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # 不关闭会话管理器，保持持续对话
        pass


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("Starting Claude WebUI Server")
    # 创建 static 目录
    static_dir = Path(__file__).parent / "static"
    static_dir.mkdir(exist_ok=True)


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("Shutting down Claude WebUI Server")
    await conversation_manager.close()


# 挂载静态文件
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
