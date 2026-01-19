"""
测试 Berserker-Metadata MCP 服务器集成
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


async def test_mcp_integration():
    """测试 MCP 服务器集成"""

    print("🧪 Testing Berserker-Metadata MCP Integration")
    print("=" * 60)

    # 配置 MCP 服务器
    mcp_servers = {
        "berserker-metadata": {
            "type": "http",
            "url": "http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata"
        }
    }

    # 配置选项
    options = ClaudeAgentOptions(
        mcp_servers=mcp_servers,
        allowed_tools=[
            "mcp__berserker-metadata__getInfo",
            "mcp__berserker-metadata__getHiveTableSchema",
            "mcp__berserker-metadata__getTableDataDemo",
        ],
        permission_mode="acceptEdits",
        cwd="/Users/xionghaoqiang/Xagent"
    )

    # 测试查询
    test_query = "查询表 bi_sycpb.dws_dmp_group_people_group_1d_d 有哪些字段"

    print(f"\n📝 Test Query: {test_query}")
    print("-" * 60)

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(test_query)

            # 接收响应
            async for message in client.receive_response():
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            print(f"\n💬 Claude: {block.text}")
                        elif isinstance(block, ToolUseBlock):
                            print(f"\n🔧 Using Tool: {block.name}")
                            print(f"   Input: {block.input}")

                elif isinstance(message, ResultMessage):
                    print(f"\n✅ Test Completed!")
                    print(f"   - Duration: {message.duration_ms}ms")
                    print(f"   - Turns: {message.num_turns}")
                    if message.total_cost_usd:
                        print(f"   - Cost: ${message.total_cost_usd:.6f}")

        print("\n" + "=" * 60)
        print("✅ MCP Integration Test PASSED")

    except Exception as e:
        print(f"\n❌ Test Failed: {e}")
        import traceback
        traceback.print_exc()
        print("\n" + "=" * 60)
        print("❌ MCP Integration Test FAILED")


if __name__ == "__main__":
    asyncio.run(test_mcp_integration())
