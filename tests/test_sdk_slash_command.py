#!/usr/bin/env python3
"""
测试 Claude SDK 是否支持斜杠命令
"""
import asyncio
import os
from dotenv import load_dotenv
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

# 加载环境变量
load_dotenv()

async def test_slash_command():
    print("=" * 60)
    print("测试 Claude SDK 斜杠命令")
    print("=" * 60)
    print()

    # 创建配置
    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        permission_mode="acceptEdits",
        cwd="/Users/xionghaoqiang/Xagent"
    )

    # 创建客户端
    print("初始化客户端...")
    client = ClaudeSDKClient(options=options)
    await client.connect()
    print("✅ 客户端已连接")
    print()

    # 测试普通消息
    print("测试 1: 发送普通消息")
    print("-" * 60)
    await client.query("Hello, respond with just 'Hi!'")

    response_count = 0
    async for msg in client.receive_response():
        print(f"收到消息 {response_count + 1}: {type(msg).__name__}")
        response_count += 1
        if hasattr(msg, 'content'):
            if hasattr(msg.content, '__iter__') and not isinstance(msg.content, str):
                for block in msg.content:
                    if hasattr(block, 'text'):
                        print(f"  内容: {block.text[:100]}")
            elif isinstance(msg.content, str):
                print(f"  内容: {msg.content[:100]}")

        if msg.__class__.__name__ == 'ResultMessage':
            break

    print(f"✅ 普通消息测试完成，收到 {response_count} 条消息")
    print()

    # 测试斜杠命令
    print("测试 2: 发送 /help 命令")
    print("-" * 60)
    await client.query("/help")

    response_count = 0
    async for msg in client.receive_response():
        print(f"收到消息 {response_count + 1}: {type(msg).__name__}")
        response_count += 1
        if hasattr(msg, 'content'):
            if hasattr(msg.content, '__iter__') and not isinstance(msg.content, str):
                for block in msg.content:
                    if hasattr(block, 'text'):
                        print(f"  内容: {block.text[:200]}")
            elif isinstance(msg.content, str):
                print(f"  内容: {msg.content[:200]}")

        if msg.__class__.__name__ == 'ResultMessage':
            break

    print(f"✅ 斜杠命令测试完成，收到 {response_count} 条消息")
    print()

    # 断开连接
    await client.disconnect()
    print("✅ 客户端已断开")
    print()
    print("=" * 60)
    print("所有测试完成")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_slash_command())
