#!/bin/bash

# 启动 Claude WebUI 并显示斜杠命令信息

echo "======================================================"
echo "      Claude WebUI - 启动中..."
echo "======================================================"
echo ""

# 进入虚拟环境
source venv/bin/activate

# 显示已加载的自定义命令
echo "📋 检查自定义斜杠命令..."
python test_slash_commands.py
echo ""

echo "======================================================"
echo "🚀 启动 WebUI 服务器..."
echo "======================================================"
echo ""
echo "访问地址: http://localhost:8000"
echo ""
echo "可用的斜杠命令:"
echo "  /help          - 显示所有命令"
echo "  /clear         - 清除对话历史"
echo "  /about         - 关于项目"
echo "  /table-info    - 查询表信息"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动服务器
python webui_server.py
