#!/usr/bin/env python3
"""
测试 WebSocket 斜杠命令
"""
import asyncio
import websockets
import json

async def test_slash_command():
    uri = "ws://localhost:8000/ws"

    print("连接到 WebSocket...")
    async with websockets.connect(uri) as websocket:
        # 接收欢迎消息
        welcome = await websocket.recv()
        print(f"✅ 收到欢迎消息: {welcome}\n")

        # 发送 /help 命令
        print("发送 /help 命令...")
        await websocket.send(json.dumps({
            "type": "message",
            "content": "/help"
        }))

        # 接收响应
        print("\n接收响应:")
        print("=" * 60)

        response_count = 0
        while response_count < 10:  # 最多接收 10 条消息
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                response_count += 1

                print(f"\n消息 {response_count}:")
                print(f"  类型: {data.get('type')}")

                if data.get('type') == 'user_message':
                    print(f"  内容: {data.get('content')}")

                elif data.get('type') == 'assistant_text':
                    content = data.get('content', '')
                    print(f"  内容长度: {len(content)} 字符")
                    print(f"  内容预览: {content[:100]}...")

                elif data.get('type') == 'result':
                    print(f"  子类型: {data.get('subtype')}")
                    print(f"  ✅ 命令执行完成")
                    break

                elif data.get('type') == 'error':
                    print(f"  ❌ 错误: {data.get('content')}")
                    break

            except asyncio.TimeoutError:
                print("\n⏱️ 超时，未收到更多消息")
                break

        print("\n" + "=" * 60)
        print("测试完成")

if __name__ == "__main__":
    print("WebSocket 斜杠命令测试")
    print("=" * 60)
    print("确保服务器正在运行: python webui_server.py")
    print("=" * 60 + "\n")

    try:
        asyncio.run(test_slash_command())
    except ConnectionRefusedError:
        print("\n❌ 连接失败：服务器未运行")
        print("请先启动服务器: python webui_server.py")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
