"""
Claude WebUI Server - Manus Style
FastAPI + WebSocket 实现的实时聊天服务器
"""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

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
            cwd="/Users/xionghaoqiang/BBA/Xagent"
        )

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
