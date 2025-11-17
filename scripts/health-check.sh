#!/bin/bash

# YouTube爆款视频采集工具 - 健康检查脚本
# 定期检查服务健康状态，异常时发送告警

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/health-check.log"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"  # 默认5分钟检查一次
MAX_FAILURES="${MAX_FAILURES:-3}"        # 连续失败3次触发告警
ALERT_EMAIL="${ALERT_EMAIL:-}"           # 告警邮箱（可选）

# 状态文件
STATE_DIR="$PROJECT_ROOT/pids"
FAILURE_COUNT_FILE="$STATE_DIR/health-check-failures"

# 确保目录存在
mkdir -p "$STATE_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 获取失败次数
get_failure_count() {
    if [ -f "$FAILURE_COUNT_FILE" ]; then
        cat "$FAILURE_COUNT_FILE"
    else
        echo 0
    fi
}

# 设置失败次数
set_failure_count() {
    echo "$1" > "$FAILURE_COUNT_FILE"
}

# 重置失败次数
reset_failure_count() {
    rm -f "$FAILURE_COUNT_FILE"
}

# 发送告警
send_alert() {
    local MESSAGE="$1"

    log "⚠️  告警: $MESSAGE"

    # 如果配置了邮箱，发送邮件（需要安装 mailx 或 sendmail）
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$MESSAGE" | mail -s "[YouTube Scrawler] 服务健康检查告警" "$ALERT_EMAIL"
        log "已发送告警邮件到: $ALERT_EMAIL"
    fi

    # 可以在这里添加其他告警方式：
    # - Slack webhook
    # - 企业微信
    # - 钉钉机器人
    # - SMS 短信
}

# 检查后端服务
check_backend() {
    local START_TIME=$(date +%s)

    # 检查 HTTP 响应
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL/api/settings" 2>/dev/null)
    local END_TIME=$(date +%s)
    local RESPONSE_TIME=$((END_TIME - START_TIME))

    if [ "$HTTP_CODE" = "200" ]; then
        log "✓ 后端服务正常 (HTTP $HTTP_CODE, 响应时间: ${RESPONSE_TIME}s)"
        reset_failure_count
        return 0
    else
        log "✗ 后端服务异常 (HTTP $HTTP_CODE)"

        # 增加失败计数
        FAILURE_COUNT=$(get_failure_count)
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        set_failure_count "$FAILURE_COUNT"

        log "连续失败次数: $FAILURE_COUNT/$MAX_FAILURES"

        # 达到阈值，发送告警
        if [ "$FAILURE_COUNT" -ge "$MAX_FAILURES" ]; then
            send_alert "后端服务连续 $FAILURE_COUNT 次健康检查失败！请立即检查。URL: $BACKEND_URL"
        fi

        return 1
    fi
}

# 检查进程
check_process() {
    PID_FILE="$PROJECT_ROOT/pids/server.pid"

    if [ ! -f "$PID_FILE" ]; then
        log "⚠️  未找到 PID 文件: $PID_FILE"
        return 1
    fi

    PID=$(cat "$PID_FILE")

    if kill -0 "$PID" 2>/dev/null; then
        # 检查内存使用
        MEM_USAGE=$(ps -p "$PID" -o rss= 2>/dev/null | awk '{printf "%.2f", $1/1024}')
        CPU_USAGE=$(ps -p "$PID" -o %cpu= 2>/dev/null)

        log "进程状态: PID=$PID, 内存=${MEM_USAGE}MB, CPU=${CPU_USAGE}%"

        # 内存使用超过1GB，发出警告
        if [ $(echo "$MEM_USAGE > 1024" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
            log "⚠️  内存使用过高: ${MEM_USAGE}MB"
        fi

        return 0
    else
        log "✗ 进程不存在 (PID: $PID)"
        return 1
    fi
}

# 检查磁盘空间
check_disk_space() {
    DISK_USAGE=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')

    log "磁盘使用率: ${DISK_USAGE}%"

    if [ "$DISK_USAGE" -gt 90 ]; then
        send_alert "磁盘空间不足！使用率: ${DISK_USAGE}%"
    elif [ "$DISK_USAGE" -gt 80 ]; then
        log "⚠️  磁盘使用率较高: ${DISK_USAGE}%"
    fi
}

# 检查日志文件大小
check_log_size() {
    LOG_DIR="$PROJECT_ROOT/logs"

    # 检查日志文件大小（超过100MB警告）
    for log_file in "$LOG_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            SIZE=$(du -m "$log_file" | cut -f1)
            if [ "$SIZE" -gt 100 ]; then
                log "⚠️  日志文件过大: $(basename "$log_file") (${SIZE}MB)"
            fi
        fi
    done
}

# 单次检查
run_single_check() {
    log "=========================================="
    log "开始健康检查"
    log "=========================================="

    check_backend
    BACKEND_STATUS=$?

    check_process
    PROCESS_STATUS=$?

    check_disk_space
    check_log_size

    log "=========================================="

    if [ $BACKEND_STATUS -eq 0 ] && [ $PROCESS_STATUS -eq 0 ]; then
        log "✓ 所有检查通过"
        return 0
    else
        log "✗ 部分检查失败"
        return 1
    fi
}

# 循环检查模式
run_loop_check() {
    log "启动健康检查守护进程（检查间隔: ${CHECK_INTERVAL}秒）"

    while true; do
        run_single_check
        sleep "$CHECK_INTERVAL"
    done
}

# 主函数
main() {
    local MODE="${1:-single}"

    case "$MODE" in
        single)
            run_single_check
            ;;
        loop)
            run_loop_check
            ;;
        *)
            echo "用法: $0 [single|loop]"
            echo "  single - 执行一次健康检查（默认）"
            echo "  loop   - 循环执行健康检查"
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
