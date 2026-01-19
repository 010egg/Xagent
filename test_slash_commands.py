"""
测试斜杠命令功能
"""
import sys
from pathlib import Path
import yaml

# 测试命令加载
commands_dir = Path("/Users/xionghaoqiang/Xagent/.claude/commands")

print("=" * 60)
print("测试斜杠命令加载")
print("=" * 60)

if not commands_dir.exists():
    print(f"❌ 命令目录不存在: {commands_dir}")
    sys.exit(1)

print(f"✅ 命令目录存在: {commands_dir}\n")

# 加载所有命令
commands = {}
for md_file in commands_dir.rglob("*.md"):
    try:
        command_name = md_file.stem
        content = md_file.read_text(encoding="utf-8")

        # 解析 YAML 前言
        metadata = {}
        command_content = content

        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    metadata = yaml.safe_load(parts[1]) or {}
                    command_content = parts[2].strip()
                except Exception as e:
                    print(f"⚠️  YAML 解析警告 ({md_file.name}): {e}")

        commands[command_name] = {
            "name": command_name,
            "content": command_content,
            "metadata": metadata,
            "file_path": str(md_file)
        }

        print(f"✅ 加载命令: /{command_name}")
        print(f"   描述: {metadata.get('description', '无')}")
        print(f"   文件: {md_file.name}")
        print()

    except Exception as e:
        print(f"❌ 加载失败 ({md_file.name}): {e}\n")

print("=" * 60)
print(f"总计加载 {len(commands)} 个自定义命令")
print("=" * 60)

# 列出所有可用命令
print("\n可用的斜杠命令:")
print("-" * 60)

built_in_commands = [
    ("/help", "显示所有可用的斜杠命令"),
    ("/clear", "清除当前对话历史"),
    ("/compact", "压缩对话历史以减少 token 使用")
]

print("\n内置命令:")
for cmd_name, desc in built_in_commands:
    print(f"  {cmd_name:<20} - {desc}")

if commands:
    print("\n自定义命令:")
    for cmd_name, cmd_data in commands.items():
        desc = cmd_data["metadata"].get("description", "自定义命令")
        print(f"  /{cmd_name:<19} - {desc}")

print("\n" + "=" * 60)
print("测试完成 ✅")
print("=" * 60)
