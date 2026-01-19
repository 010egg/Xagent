#!/bin/bash

# 启动服务器并记录日志到文件

cd /Users/xionghaoqiang/Xagent
source venv/bin/activate

LOG_FILE="webui_server.log"

echo "======================================================"
echo "      Claude WebUI - 启动中（日志模式）"
echo "======================================================"
echo ""
echo "日志将同时输出到终端和文件: $LOG_FILE"
echo "访问地址: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "======================================================"
echo ""

# 启动服务器，同时输出到终端和日志文件
python webui_server.py 2>&1 | tee $LOG_FILE
