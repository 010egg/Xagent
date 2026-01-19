#!/bin/bash

# Claude WebUI 启动脚本

echo "🚀 Starting Claude WebUI..."
echo ""

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: python3 -m venv venv"
    exit 1
fi

# 激活虚拟环境
source venv/bin/activate

# 检查依赖
echo "📦 Checking dependencies..."
if ! python -c "import claude_agent_sdk" 2>/dev/null; then
    echo "❌ claude-agent-sdk not found!"
    echo "Installing dependencies..."
    pip install claude-agent-sdk fastapi uvicorn websockets
fi

# 杀掉可能占用端口的进程
echo "🧹 Cleaning up port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# 启动服务器
echo "✅ Starting server..."
echo ""
echo "🌐 WebUI will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

python webui_server.py
