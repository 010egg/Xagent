// Claude WebUI - JavaScript

let ws = null;
let isConnected = false;
let currentSessionId = null;
let turnCount = 0;
let totalCost = 0;
let isProcessing = false;
let isInterrupting = false;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    autoResizeTextarea();
    setupGlobalKeyboardShortcuts();
});

// 连接 WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected = true;
        updateConnectionStatus('Connected', 'success');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('Error', 'error');
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected = false;
        updateConnectionStatus('Disconnected', 'error');
        // 尝试重连
        setTimeout(connectWebSocket, 3000);
    };
}

// 处理消息
function handleMessage(data) {
    const messagesContainer = document.getElementById('messages');

    // 如果正在中断，只处理 interrupted 和 error 消息，忽略其他消息
    if (isInterrupting && data.type !== 'interrupted' && data.type !== 'error') {
        console.log('Ignoring message during interrupt:', data.type);
        return;
    }

    switch (data.type) {
        case 'system':
            console.log('System:', data.content || data);
            break;

        case 'user_message':
            addUserMessage(data.content);
            break;

        case 'assistant_text':
            addOrUpdateAssistantMessage(data.content);
            break;

        case 'thinking':
            addThinkingBlock(data.content);
            break;

        case 'tool_use':
            addToolUse(data.tool_name, data.tool_input);
            break;

        case 'tool_result':
            // 工具结果可以选择显示或不显示
            console.log('Tool result:', data.content);
            break;

        case 'result':
            addResultInfo(data);
            isProcessing = false;
            updateUIState();
            break;

        case 'error':
            addErrorMessage(data.content);
            isProcessing = false;
            isInterrupting = false;
            updateUIState();
            break;

        case 'interrupted':
            addInterruptedMessage();
            isProcessing = false;
            isInterrupting = false;
            updateUIState();
            break;
    }

    scrollToBottom();
}

// 添加用户消息
function addUserMessage(content) {
    const messagesContainer = document.getElementById('messages');

    // 移除欢迎消息
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="message-avatar user-avatar">U</div>
            <div class="message-role">You</div>
        </div>
        <div class="message-content">${escapeHtml(content)}</div>
    `;

    messagesContainer.appendChild(messageDiv);
}

// 添加或更新助手消息
let currentAssistantMessage = null;

function addOrUpdateAssistantMessage(content) {
    const messagesContainer = document.getElementById('messages');

    if (!currentAssistantMessage) {
        currentAssistantMessage = document.createElement('div');
        currentAssistantMessage.className = 'message assistant';
        currentAssistantMessage.innerHTML = `
            <div class="message-header">
                <div class="message-avatar assistant-avatar">C</div>
                <div class="message-role">Claude</div>
            </div>
            <div class="message-content"></div>
        `;
        messagesContainer.appendChild(currentAssistantMessage);
    }

    const contentDiv = currentAssistantMessage.querySelector('.message-content');
    contentDiv.innerHTML = formatMarkdown(content);
}

// 添加思考块
function addThinkingBlock(content) {
    const messagesContainer = document.getElementById('messages');

    if (!currentAssistantMessage) {
        addOrUpdateAssistantMessage('');
    }

    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking';
    thinkingDiv.innerHTML = `
        <div style="color: var(--thinking-color); font-weight: 600; margin-bottom: 6px;">💭 Thinking...</div>
        ${escapeHtml(content)}
    `;

    currentAssistantMessage.appendChild(thinkingDiv);
}

// 添加工具使用
function addToolUse(toolName, toolInput) {
    const messagesContainer = document.getElementById('messages');

    if (!currentAssistantMessage) {
        addOrUpdateAssistantMessage('');
    }

    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-use';

    const inputStr = typeof toolInput === 'object'
        ? JSON.stringify(toolInput, null, 2)
        : toolInput;

    toolDiv.innerHTML = `
        <div class="tool-header">
            <svg class="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            <span>Using tool: ${escapeHtml(toolName)}</span>
        </div>
        <div class="tool-input">${escapeHtml(inputStr)}</div>
    `;

    currentAssistantMessage.appendChild(toolDiv);
}

// 添加结果信息
function addResultInfo(data) {
    const messagesContainer = document.getElementById('messages');

    if (currentAssistantMessage) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-info';
        resultDiv.innerHTML = `
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${(data.duration_ms / 1000).toFixed(2)}s</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Turns:</span>
                    <span class="stat-value">${data.num_turns}</span>
                </div>
                ${data.total_cost_usd ? `
                <div class="stat-item">
                    <span class="stat-label">Cost:</span>
                    <span class="stat-value">$${data.total_cost_usd.toFixed(6)}</span>
                </div>
                ` : ''}
            </div>
        `;

        currentAssistantMessage.appendChild(resultDiv);
    }

    // 更新会话信息
    if (data.session_id) {
        currentSessionId = data.session_id;
        document.getElementById('session-id').textContent = data.session_id.substring(0, 8);
    }

    if (data.num_turns) {
        turnCount = data.num_turns;
        document.getElementById('turn-count').textContent = turnCount;
    }

    if (data.total_cost_usd) {
        totalCost = data.total_cost_usd;
        document.getElementById('cost-display').textContent = `$${totalCost.toFixed(6)}`;
    }

    // 重置当前消息
    currentAssistantMessage = null;
}

// 添加错误消息
function addErrorMessage(content) {
    const messagesContainer = document.getElementById('messages');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'message assistant';
    errorDiv.innerHTML = `
        <div class="message-header">
            <div class="message-avatar assistant-avatar">❌</div>
            <div class="message-role">Error</div>
        </div>
        <div class="message-content" style="border-color: var(--error-color);">
            ${escapeHtml(content)}
        </div>
    `;

    messagesContainer.appendChild(errorDiv);
    currentAssistantMessage = null;
}

// 发送消息
function sendMessage() {
    // 中断期间不允许发送新消息
    if (!isConnected || isProcessing || isInterrupting) return;

    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message) return;

    // 发送消息
    ws.send(JSON.stringify({
        type: 'message',
        content: message
    }));

    // 清空输入
    input.value = '';
    input.style.height = 'auto';

    isProcessing = true;
    updateUIState();
}

// 中断请求
function interruptRequest() {
    if (!isConnected || !isProcessing) return;

    console.log('Sending interrupt request...');

    // 设置中断标志，忽略后续响应消息
    isInterrupting = true;

    // 发送中断消息
    ws.send(JSON.stringify({
        type: 'interrupt'
    }));

    // 立即更新 UI 状态和重置消息
    isProcessing = false;
    currentAssistantMessage = null;
    updateUIState();

    // 显示中断提示
    addInterruptMessage();
}

// 新建聊天
function newChat() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">👋</div>
            <h3>Welcome to Claude WebUI</h3>
            <p>Start a conversation with Claude using the input below.</p>
        </div>
    `;

    currentAssistantMessage = null;
    isInterrupting = false;
    turnCount = 0;
    totalCost = 0;

    document.getElementById('turn-count').textContent = '0';
    document.getElementById('cost-display').textContent = '$0.00';
}

// 重置会话
function resetSession() {
    if (!isConnected) return;

    if (confirm('Are you sure you want to reset the session? This will clear the conversation history.')) {
        ws.send(JSON.stringify({
            type: 'reset'
        }));

        newChat();
    }
}

// 更新连接状态
function updateConnectionStatus(status, type) {
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = status;

    if (type === 'success') {
        statusElement.style.color = 'var(--success-color)';
    } else if (type === 'error') {
        statusElement.style.color = 'var(--error-color)';
    }
}

// 更新 UI 状态（按钮）
function updateUIState() {
    const sendBtn = document.getElementById('send-btn');
    const interruptBtn = document.getElementById('interrupt-btn');

    // 发送按钮状态：连接断开、正在处理或正在中断时禁用
    sendBtn.disabled = isProcessing || !isConnected || isInterrupting;

    // 中断按钮的显示/隐藏
    if (isProcessing) {
        // 正在处理：显示中断按钮
        interruptBtn.style.display = 'flex';
        sendBtn.style.display = 'none';
    } else {
        // 空闲：显示发送按钮，隐藏中断
        interruptBtn.style.display = 'none';
        sendBtn.style.display = 'flex';
    }
}

// 处理按键
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// 自动调整文本框高度
function autoResizeTextarea() {
    const textarea = document.getElementById('message-input');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
}

// 滚动到底部
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 简单的 Markdown 格式化
function formatMarkdown(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// 设置全局键盘快捷键
function setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // ESC 键：中断请求
        if (event.key === 'Escape' && isProcessing) {
            event.preventDefault();
            interruptRequest();
        }
    });
}

// 添加中断提示消息（用户触发中断时）
function addInterruptMessage() {
    const messagesContainer = document.getElementById('messages');

    const interruptDiv = document.createElement('div');
    interruptDiv.className = 'message system';
    interruptDiv.innerHTML = `
        <div class="message-header">
            <div class="message-avatar assistant-avatar">⏹️</div>
            <div class="message-role">System</div>
        </div>
        <div class="message-content" style="border-color: var(--error-color); background: rgba(239, 68, 68, 0.1);">
            ⏸️ Interrupt signal sent. Waiting for Claude to stop...
        </div>
    `;

    messagesContainer.appendChild(interruptDiv);
    scrollToBottom();
}

// 添加中断完成消息（收到服务器确认）
function addInterruptedMessage() {
    const messagesContainer = document.getElementById('messages');

    const interruptedDiv = document.createElement('div');
    interruptedDiv.className = 'message system';
    interruptedDiv.innerHTML = `
        <div class="message-header">
            <div class="message-avatar assistant-avatar">✋</div>
            <div class="message-role">System</div>
        </div>
        <div class="message-content" style="border-color: var(--error-color); background: rgba(239, 68, 68, 0.1);">
            ⏹️ <strong>Request interrupted</strong><br>
            Claude has stopped processing. You can now send a new message.
        </div>
    `;

    messagesContainer.appendChild(interruptedDiv);
    currentAssistantMessage = null;
    scrollToBottom();
}
