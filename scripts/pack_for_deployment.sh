#!/bin/bash

# Claude WebUI 部署包打包脚本
# 用于打包项目以便传输到生产服务器

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================"
echo "  Claude WebUI 部署包打包工具"
echo "======================================${NC}"
echo ""

# 版本号
VERSION=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="claude-webui-${VERSION}.tar.gz"

echo -e "${GREEN}[1/4]${NC} 准备打包目录..."

# 创建临时目录
TMP_DIR=$(mktemp -d)
PACKAGE_DIR="${TMP_DIR}/claude-webui"
mkdir -p "${PACKAGE_DIR}"

echo -e "${GREEN}[2/4]${NC} 复制文件..."

# 复制必要文件
cp webui_server.py "${PACKAGE_DIR}/"
cp -r static/ "${PACKAGE_DIR}/"
cp requirements.txt "${PACKAGE_DIR}/"
cp Dockerfile "${PACKAGE_DIR}/"
cp docker-compose.yml "${PACKAGE_DIR}/"
cp .env.example "${PACKAGE_DIR}/"
cp .dockerignore "${PACKAGE_DIR}/"
cp deploy.sh "${PACKAGE_DIR}/"
cp nginx.conf "${PACKAGE_DIR}/"

# 复制文档
cp README_WEBUI.md "${PACKAGE_DIR}/" 2>/dev/null || true
cp MCP_USAGE.md "${PACKAGE_DIR}/" 2>/dev/null || true
cp DEPLOYMENT.md "${PACKAGE_DIR}/" 2>/dev/null || true

# 创建 README
cat > "${PACKAGE_DIR}/README_FIRST.txt" <<'EOF'
Claude WebUI 部署包
==================

快速开始：

1. Docker 部署（推荐）：
   chmod +x deploy.sh
   ./deploy.sh docker

2. 传统部署：
   chmod +x deploy.sh
   ./deploy.sh standalone

详细文档：
- DEPLOYMENT.md - 完整部署指南
- README_WEBUI.md - WebUI 使用文档
- MCP_USAGE.md - MCP 工具指南

环境配置：
1. 复制 .env.example 为 .env
2. 编辑 .env 配置环境变量
3. 运行部署脚本

技术支持：
查看 DEPLOYMENT.md 中的故障排除章节
EOF

echo -e "${GREEN}[3/4]${NC} 创建部署包..."

# 打包
cd "${TMP_DIR}"
tar -czf "${PACKAGE_NAME}" claude-webui/

# 移动到当前目录
mv "${PACKAGE_NAME}" "${OLDPWD}/"

echo -e "${GREEN}[4/4]${NC} 清理临时文件..."

# 清理
rm -rf "${TMP_DIR}"

echo ""
echo -e "${GREEN}✅ 打包完成！${NC}"
echo ""
echo "部署包: ${PACKAGE_NAME}"
echo "文件大小: $(du -h "${PACKAGE_NAME}" | cut -f1)"
echo ""
echo "传输到服务器："
echo "  scp ${PACKAGE_NAME} user@server:/opt/"
echo ""
echo "服务器端部署："
echo "  tar -xzf ${PACKAGE_NAME}"
echo "  cd claude-webui"
echo "  ./deploy.sh docker"
echo ""
