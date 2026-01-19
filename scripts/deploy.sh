#!/bin/bash

# Claude WebUI 快速部署脚本
# 使用方法: ./deploy.sh [docker|standalone|update|stop|restart|logs]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Docker 部署
deploy_docker() {
    log_info "开始 Docker 部署..."

    # 检查 Docker
    if ! command_exists docker; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    # 检查 docker-compose
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        log_error "docker-compose 未安装，请先安装 docker-compose"
        exit 1
    fi

    # 创建 .env 文件
    if [ ! -f .env ]; then
        log_warn ".env 文件不存在，从模板创建..."
        cp .env.example .env
        log_info "请编辑 .env 文件配置环境变量"
        read -p "是否现在编辑 .env? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-vi} .env
        fi
    fi

    # 创建必要的目录
    log_info "创建工作目录..."
    mkdir -p workspace logs

    # 构建镜像
    log_info "构建 Docker 镜像..."
    docker-compose build

    # 启动服务
    log_info "启动服务..."
    docker-compose up -d

    # 等待服务启动
    log_info "等待服务启动..."
    sleep 5

    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        log_success "✅ Docker 部署成功！"
        log_info "访问地址: http://localhost:8000"
        log_info "查看日志: docker-compose logs -f"
        log_info "停止服务: docker-compose down"
    else
        log_error "服务启动失败，请检查日志: docker-compose logs"
        exit 1
    fi
}

# 独立部署（非 Docker）
deploy_standalone() {
    log_info "开始独立部署..."

    # 检查 Python
    if ! command_exists python3; then
        log_error "Python3 未安装，请先安装 Python 3.11+"
        exit 1
    fi

    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        log_info "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi

    # 激活虚拟环境
    log_info "激活虚拟环境..."
    source venv/bin/activate

    # 安装依赖
    log_info "安装 Python 依赖..."
    pip install --upgrade pip
    pip install -r requirements.txt

    # 创建工作目录
    mkdir -p workspace logs

    # 创建 systemd 服务文件
    log_info "是否创建 systemd 服务? (需要 sudo 权限)"
    read -p "(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_systemd_service
    fi

    log_success "✅ 独立部署准备完成！"
    log_info "启动服务: ./start_webui.sh"
    log_info "或者: source venv/bin/activate && python webui_server.py"
}

# 创建 systemd 服务
create_systemd_service() {
    SERVICE_FILE="/etc/systemd/system/claude-webui.service"
    CURRENT_DIR=$(pwd)
    CURRENT_USER=$(whoami)

    log_info "创建 systemd 服务文件..."

    sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Claude WebUI Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=$CURRENT_DIR/venv/bin/python $CURRENT_DIR/webui_server.py
Restart=on-failure
RestartSec=10
StandardOutput=append:$CURRENT_DIR/logs/webui.log
StandardError=append:$CURRENT_DIR/logs/webui.error.log

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable claude-webui

    log_success "systemd 服务创建成功！"
    log_info "启动服务: sudo systemctl start claude-webui"
    log_info "查看状态: sudo systemctl status claude-webui"
    log_info "查看日志: sudo journalctl -u claude-webui -f"
}

# 更新部署
update_deployment() {
    log_info "更新部署..."

    if [ -f "docker-compose.yml" ] && docker-compose ps >/dev/null 2>&1; then
        log_info "检测到 Docker 部署，执行更新..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        log_success "✅ Docker 部署更新完成！"
    else
        log_info "检测到独立部署，执行更新..."
        if [ -d "venv" ]; then
            source venv/bin/activate
            pip install -r requirements.txt --upgrade
            log_success "✅ 依赖更新完成！"
            log_info "请重启服务"
        else
            log_error "未找到虚拟环境"
        fi
    fi
}

# 停止服务
stop_service() {
    log_info "停止服务..."

    if docker-compose ps >/dev/null 2>&1; then
        docker-compose down
        log_success "✅ Docker 服务已停止"
    fi

    if systemctl is-active --quiet claude-webui; then
        sudo systemctl stop claude-webui
        log_success "✅ systemd 服务已停止"
    fi

    # 杀掉可能的进程
    if lsof -ti:8000 >/dev/null 2>&1; then
        lsof -ti:8000 | xargs kill -9
        log_success "✅ 端口 8000 已释放"
    fi
}

# 重启服务
restart_service() {
    log_info "重启服务..."
    stop_service
    sleep 2

    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        log_success "✅ Docker 服务已重启"
    elif systemctl list-unit-files | grep -q claude-webui; then
        sudo systemctl start claude-webui
        log_success "✅ systemd 服务已重启"
    else
        log_warn "未找到服务配置，请手动启动"
    fi
}

# 查看日志
view_logs() {
    if docker-compose ps >/dev/null 2>&1; then
        log_info "查看 Docker 日志..."
        docker-compose logs -f
    elif [ -f "logs/webui.log" ]; then
        log_info "查看应用日志..."
        tail -f logs/webui.log
    else
        log_warn "未找到日志文件"
    fi
}

# 主函数
main() {
    echo ""
    echo "======================================"
    echo "  Claude WebUI 部署脚本"
    echo "======================================"
    echo ""

    case "${1:-help}" in
        docker)
            deploy_docker
            ;;
        standalone)
            deploy_standalone
            ;;
        update)
            update_deployment
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        logs)
            view_logs
            ;;
        help|*)
            echo "使用方法: $0 [command]"
            echo ""
            echo "可用命令:"
            echo "  docker      - Docker 容器化部署（推荐）"
            echo "  standalone  - 独立部署（非 Docker）"
            echo "  update      - 更新部署"
            echo "  stop        - 停止服务"
            echo "  restart     - 重启服务"
            echo "  logs        - 查看日志"
            echo "  help        - 显示此帮助信息"
            echo ""
            echo "示例:"
            echo "  $0 docker        # Docker 部署"
            echo "  $0 standalone    # 独立部署"
            echo "  $0 update        # 更新"
            echo ""
            ;;
    esac
}

main "$@"
