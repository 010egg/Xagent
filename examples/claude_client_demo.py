"""
ClaudeSDKClient Demo - 展示持续对话功能

这个 demo 展示了 ClaudeSDKClient 的主要特性:
1. 持续对话 - Claude 记住上下文
2. 多轮交互 - 在同一会话中进行多次查询
3. 工具使用 - 自动使用 Read/Write 等工具
"""

import asyncio
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ResultMessage
)


async def demo_continuous_conversation():
    """演示持续对话功能 - Claude 记住之前的上下文"""
    print("=" * 60)
    print("Demo 1: 持续对话 - Claude 记住上下文")
    print("=" * 60)

    # 配置选项 - 允许基本的读写工具
    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Write", "Glob"],
        permission_mode="acceptEdits",  # 自动批准文件编辑
        cwd="/Users/xionghaoqiang/Xagent"
    )

    async with ClaudeSDKClient(options=options) as client:
        # 第一轮对话：问一个问题
        print("\n[第 1 轮] 用户: 创建一个名为 test_data.txt 的文件，内容是 'Hello from Claude SDK'")
        await client.query("创建一个名为 test_data.txt 的文件，内容是 'Hello from Claude SDK'")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"  🔧 使用工具: {block.name}")
            elif isinstance(message, ResultMessage):
                print(f"  ✅ 完成 (耗时: {message.duration_ms}ms)")

        # 第二轮对话：后续问题 - Claude 记得刚才创建的文件
        print("\n[第 2 轮] 用户: 刚才那个文件的内容是什么？")
        await client.query("刚才那个文件的内容是什么？")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"  🔧 使用工具: {block.name}")
            elif isinstance(message, ResultMessage):
                print(f"  ✅ 完成")

        # 第三轮对话：再次后续 - 测试记忆
        print("\n[第 3 轮] 用户: 在那个文件末尾添加一行 'SDK Demo Complete'")
        await client.query("在那个文件末尾添加一行 'SDK Demo Complete'")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"  🔧 使用工具: {block.name}")
            elif isinstance(message, ResultMessage):
                print(f"  ✅ 完成")


async def demo_simple_query():
    """演示简单的单轮查询"""
    print("\n" + "=" * 60)
    print("Demo 2: 简单查询 - 分析文件")
    print("=" * 60)

    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Glob"],
        cwd="/Users/xionghaoqiang/Xagent"
    )

    async with ClaudeSDKClient(options=options) as client:
        print("\n用户: 读取 test_data.txt 并总结内容")
        await client.query("读取 test_data.txt 并总结内容")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
                    elif isinstance(block, ToolUseBlock):
                        print(f"  🔧 使用工具: {block.name}")
            elif isinstance(message, ResultMessage):
                print(f"  ✅ 完成")


async def demo_session_info():
    """演示会话信息和成本统计"""
    print("\n" + "=" * 60)
    print("Demo 3: 会话信息和成本统计")
    print("=" * 60)

    options = ClaudeAgentOptions(
        allowed_tools=["Read"],
        cwd="/Users/xionghaoqiang/Xagent"
    )

    async with ClaudeSDKClient(options=options) as client:
        print("\n用户: 列出当前目录下的 .py 文件")
        await client.query("列出当前目录下的 .py 文件")

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(f"Claude: {block.text}")
            elif isinstance(message, ResultMessage):
                print(f"\n📊 会话统计:")
                print(f"  - 会话 ID: {message.session_id}")
                print(f"  - 总轮数: {message.num_turns}")
                print(f"  - 总耗时: {message.duration_ms}ms")
                print(f"  - API 耗时: {message.duration_api_ms}ms")
                if message.total_cost_usd:
                    print(f"  - 总成本: ${message.total_cost_usd:.6f}")
                if message.usage:
                    print(f"  - Token 使用: {message.usage}")


async def main():
    """运行所有 demo"""
    print("\n🚀 ClaudeSDKClient Demo 开始")
    print("=" * 60)

    try:
        # Demo 1: 持续对话
        await demo_continuous_conversation()

        # Demo 2: 简单查询
        await demo_simple_query()

        # Demo 3: 会话信息
        await demo_session_info()

        print("\n" + "=" * 60)
        print("✅ 所有 Demo 运行完成!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
