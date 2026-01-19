// XAgent - JavaScript

let ws = null;
let isConnected = false;
let currentSessionId = null;
let turnCount = 0;
let totalCost = 0;
let isProcessing = false;
let isInterrupting = false;

// 斜杠命令相关
let availableCommands = [];  // 从服务器动态加载
let commandDescriptions = {};  // 命令描述映射
let commandSuggestions = null;

// 工具调用追踪
let toolCounter = 0;  // 工具计数器
let pendingTools = [];  // 待完成的工具ID队列

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    autoResizeTextarea();
    setupGlobalKeyboardShortcuts();
    setupSlashCommands();
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

        case 'commands_list':
            // 更新可用命令列表
            if (data.commands && Array.isArray(data.commands)) {
                availableCommands = data.commands.map(cmd => cmd.name);
                commandDescriptions = {};
                data.commands.forEach(cmd => {
                    commandDescriptions[cmd.name] = cmd.description;
                });
                console.log('✅ 已加载命令列表:', availableCommands);
            }
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
            addProcessingIndicator(data.tool_name);
            break;

        case 'tool_result':
            // 工具结果可以选择显示或不显示
            console.log('Tool result:', data.content);
            markToolAsCompleted();
            removeProcessingIndicator();
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
                <div class="message-avatar assistant-avatar">X</div>
                <div class="message-role">XAgent</div>
            </div>
            <div class="tools-container"></div>
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

    // 生成唯一工具ID
    const toolId = `tool-${++toolCounter}`;
    pendingTools.push(toolId);

    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-use loading';
    toolDiv.setAttribute('data-tool-id', toolId);

    const inputStr = typeof toolInput === 'object'
        ? JSON.stringify(toolInput, null, 2)
        : toolInput;

    // 获取友好的工具名称
    let friendlyName = toolName;
    let icon = '⚡';
    if (toolName.includes('getTableGenerationSql')) {
        friendlyName = '获取生产SQL代码';
        icon = '🔍';
    } else if (toolName.includes('getHiveTableSchema')) {
        friendlyName = '获取表结构信息';
        icon = '📊';
    } else if (toolName.includes('getTableUpstreamLineage')) {
        friendlyName = '分析上游血缘关系';
        icon = '🔗';
    } else if (toolName.includes('getTableDataDemo')) {
        friendlyName = '获取数据示例';
        icon = '📋';
    } else if (toolName.includes('getFieldEnumDistribution')) {
        friendlyName = '分析字段分布';
        icon = '📈';
    }

    toolDiv.innerHTML = `
        <div class="tool-header">
            <span class="tool-icon">${icon}</span>
            <span class="tool-title">${friendlyName}</span>
            <div style="display: flex; align-items: center; gap: 4px;">
                <span class="tool-status">
                    <span class="status-dot"></span>
                    <span class="status-text">执行中</span>
                </span>
                <span class="tool-expand-icon">▼</span>
            </div>
        </div>
        <div class="tool-input">${escapeHtml(inputStr)}</div>
    `;

    // 添加点击事件切换展开/折叠
    toolDiv.addEventListener('click', function(e) {
        // 防止事件冒泡
        e.stopPropagation();
        this.classList.toggle('expanded');
    });

    // 将工具块添加到工具容器中（在消息内容上方）
    const toolsContainer = currentAssistantMessage.querySelector('.tools-container');
    if (toolsContainer) {
        toolsContainer.appendChild(toolDiv);
    } else {
        // 兼容旧结构
        currentAssistantMessage.appendChild(toolDiv);
    }
}

// 添加结果信息
function addResultInfo(data) {
    const messagesContainer = document.getElementById('messages');

    if (currentAssistantMessage) {
        // 确保所有工具都标记为完成状态
        markAllToolsAsCompleted();

        // 移除任何剩余的处理指示器
        removeProcessingIndicator();

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

    // 隐藏命令建议
    hideCommandSuggestions();

    // 发送消息
    ws.send(JSON.stringify({
        type: 'message',
        content: message
    }));

    // 立即清空输入框
    input.value = '';
    input.style.height = 'auto';

    // 移除焦点并重新聚焦，确保清空生效
    input.blur();
    setTimeout(() => {
        input.focus();
    }, 0);

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
            <h3>Welcome to XAgent</h3>
            <p>Start a conversation with XAgent using the input below.</p>
        </div>
    `;

    currentAssistantMessage = null;
    isInterrupting = false;
    turnCount = 0;
    totalCost = 0;
    toolCounter = 0;
    pendingTools = [];

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
    // Shift+Enter 发送，Enter 换行
    if (event.key === 'Enter' && event.shiftKey) {
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

// 渲染表格
function renderTable(rows) {
    if (rows.length === 0) return '';

    // 解析表格行为单元格
    const parsedRows = rows.map(row => {
        // 移除首尾的 |，然后按 | 分割
        return row.slice(1, -1).split('|').map(cell => cell.trim());
    });

    // 查找分隔符行（包含 --- 的行）
    let separatorIndex = -1;
    for (let i = 0; i < parsedRows.length; i++) {
        if (parsedRows[i].every(cell => /^[\s\-:]+$/.test(cell))) {
            separatorIndex = i;
            break;
        }
    }

    let html = '<table>';

    if (separatorIndex > 0) {
        // 有标准的表头和分隔符
        html += '<thead>';
        for (let i = 0; i < separatorIndex; i++) {
            html += '<tr>';
            parsedRows[i].forEach(cell => {
                html += `<th>${cell}</th>`;
            });
            html += '</tr>';
        }
        html += '</thead>';

        // 表体（分隔符后的行）
        if (separatorIndex + 1 < parsedRows.length) {
            html += '<tbody>';
            for (let i = separatorIndex + 1; i < parsedRows.length; i++) {
                html += '<tr>';
                parsedRows[i].forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
                html += '</tr>';
            }
            html += '</tbody>';
        }
    } else {
        // 没有分隔符，第一行作为表头，其余作为表体
        html += '<thead><tr>';
        parsedRows[0].forEach(cell => {
            html += `<th>${cell}</th>`;
        });
        html += '</tr></thead>';

        if (parsedRows.length > 1) {
            html += '<tbody>';
            for (let i = 1; i < parsedRows.length; i++) {
                html += '<tr>';
                parsedRows[i].forEach(cell => {
                    html += `<td>${cell}</td>`;
                });
                html += '</tr>';
            }
            html += '</tbody>';
        }
    }

    html += '</table>';
    return html;
}

// 增强的 Markdown 格式化
function formatMarkdown(text) {
    if (!text) return '';

    // 先转义 HTML
    let html = escapeHtml(text);

    // 处理代码块 ``` - 支持多种格式
    html = html.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang ? ` class="language-${lang}"` : '';
        return `<pre><code${language}>${code.trim()}</code></pre>`;
    });

    // 处理行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 分割成行处理
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    let inOrderedList = false;
    let inBlockquote = false;
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // 跳过代码块内的行
        if (line.includes('<pre>') || line.includes('</pre>') || line.includes('<code')) {
            result.push(line);
            continue;
        }

        // 检测表格行
        const isTableRow = /^\|(.+)\|$/.test(line.trim());
        const isSeparatorRow = /^\|[\s\-:]+\|$/.test(line.trim());

        if (isTableRow) {
            // 如果是表格行，收集起来
            if (!inTable) {
                // 关闭其他块
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                }
                if (inOrderedList) {
                    result.push('</ol>');
                    inOrderedList = false;
                }
                if (inBlockquote) {
                    result.push('</p></blockquote>');
                    inBlockquote = false;
                }
                inTable = true;
                tableRows = [];
            }
            tableRows.push(line.trim());
            continue;
        } else if (inTable) {
            // 表格结束，渲染表格
            result.push(renderTable(tableRows));
            inTable = false;
            tableRows = [];
        }

        // 标题 # ## ### #### ##### ######
        // 修改正则以支持行首空格和 emoji
        const headingMatch = line.match(/^\s*(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            // 标题前关闭所有列表
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            if (inOrderedList) {
                result.push('</ol>');
                inOrderedList = false;
            }
            if (inBlockquote) {
                result.push('</p></blockquote>');
                inBlockquote = false;
            }

            const level = headingMatch[1].length;
            const content = headingMatch[2].trim();
            line = `<h${level}>${content}</h${level}>`;
        }
        // 无序列表 - 或 *
        else if (/^\s*[\-\*]\s+(.+)$/.test(line)) {
            const match = line.match(/^\s*[\-\*]\s+(.+)$/);
            const content = match[1];
            if (!inList) {
                line = `<ul><li>${content}</li>`;
                inList = true;
            } else {
                line = `<li>${content}</li>`;
            }
        }
        // 有序列表 1. 2. 3.
        else if (/^\s*\d+\.\s+(.+)$/.test(line)) {
            const match = line.match(/^\s*\d+\.\s+(.+)$/);
            const content = match[1];
            if (!inOrderedList) {
                line = `<ol><li>${content}</li>`;
                inOrderedList = true;
            } else {
                line = `<li>${content}</li>`;
            }
        }
        // 引用 >
        else if (/^\s*&gt;\s*(.*)$/.test(line)) {
            const match = line.match(/^\s*&gt;\s*(.*)$/);
            const content = match[1];
            if (!inBlockquote) {
                line = `<blockquote><p>${content}`;
                inBlockquote = true;
            } else {
                line = `${content}`;
            }
        }
        // 分隔线 --- 或 ***
        else if (/^(---|\*\*\*)$/.test(line.trim())) {
            line = '<hr>';
        }
        // 空行 - 关闭列表和引用
        else if (line.trim() === '') {
            if (inList) {
                line = '</ul>';
                inList = false;
            } else if (inOrderedList) {
                line = '</ol>';
                inOrderedList = false;
            } else if (inBlockquote) {
                line = '</p></blockquote>';
                inBlockquote = false;
            } else {
                line = '<br>';
            }
        }
        // 普通段落
        else {
            if (inBlockquote) {
                line = `<br>${line}`;
            } else if (!inList && !inOrderedList) {
                // 非空行包装成段落，确保块级布局
                if (line.trim()) {
                    line = `<p>${line}</p>`;
                }
            }
        }

        result.push(line);
    }

    // 关闭未闭合的标签
    if (inList) result.push('</ul>');
    if (inOrderedList) result.push('</ol>');
    if (inBlockquote) result.push('</p></blockquote>');
    if (inTable && tableRows.length > 0) {
        result.push(renderTable(tableRows));
    }

    html = result.join('\n');

    // 处理粗体 **text** （只使用星号，避免与下划线冲突）
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 处理斜体 *text* （只使用星号，避免与变量名/文件名冲突）
    // 注意：不匹配已经在标签内的内容
    html = html.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');

    // 处理链接 [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 处理图片 ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 6px;">');

    return html;
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
            ⏸️ Interrupt signal sent. Waiting for XAgent to stop...
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
            XAgent has stopped processing. You can now send a new message.
        </div>
    `;

    messagesContainer.appendChild(interruptedDiv);
    currentAssistantMessage = null;
    scrollToBottom();
}

// 设置斜杠命令功能
function setupSlashCommands() {
    console.log('🚀 Setting up slash commands...');
    const messageInput = document.getElementById('message-input');
    
    if (!messageInput) {
        console.error('❌ Message input not found!');
        return;
    }
    
    // 输入事件监听
    messageInput.addEventListener('input', handleSlashInput);
    messageInput.addEventListener('keydown', handleSlashKeydown);
    
    // 创建命令建议容器
    createCommandSuggestions();
    console.log('✅ Slash commands setup complete!');
}

// 处理斜杠命令输入
function handleSlashInput(event) {
    const input = event.target;
    const text = input.value;
    
    console.log('📝 Input changed:', text);
    
    // 检查是否在输入斜杠命令
    if (text.startsWith('/')) {
        console.log('🔍 Slash command detected:', text);
        const command = text.split(' ')[0];
        showCommandSuggestions(command, input);
    } else {
        hideCommandSuggestions();
    }
}

// 处理斜杠命令按键
function handleSlashKeydown(event) {
    if (!commandSuggestions || commandSuggestions.style.display === 'none') return;

    const suggestions = commandSuggestions.querySelectorAll('.command-suggestion');
    const selected = commandSuggestions.querySelector('.command-suggestion.selected');

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            selectNextSuggestion(suggestions, selected);
            break;
        case 'ArrowUp':
            event.preventDefault();
            selectPrevSuggestion(suggestions, selected);
            break;
        case 'Tab':
            // Tab 键自动完成命令
            if (selected) {
                event.preventDefault();
                applySuggestion(selected, event.target);
            }
            break;
        case 'Enter':
            // Enter 键：如果没有 Shift，自动完成命令；如果有 Shift，关闭建议框让发送逻辑处理
            if (!event.shiftKey && selected) {
                event.preventDefault();
                applySuggestion(selected, event.target);
            } else {
                // Shift+Enter，隐藏建议框，让 handleKeyPress 处理发送
                hideCommandSuggestions();
            }
            break;
        case 'Escape':
            hideCommandSuggestions();
            break;
    }
}

// 创建命令建议容器
function createCommandSuggestions() {
    // 移除已存在的建议容器
    const existing = document.querySelector('.command-suggestions');
    if (existing) {
        existing.remove();
    }
    
    commandSuggestions = document.createElement('div');
    commandSuggestions.className = 'command-suggestions';
    commandSuggestions.style.display = 'none';
    
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
        inputContainer.appendChild(commandSuggestions);
        console.log('📦 Command suggestions container created');
    } else {
        console.error('❌ Input container not found!');
    }
}

// 显示命令建议
function showCommandSuggestions(partial, inputElement) {
    console.log('🔍 Showing suggestions for:', partial);
    
    const matches = availableCommands.filter(cmd => 
        cmd.toLowerCase().startsWith(partial.toLowerCase())
    );
    
    console.log('📋 Found matches:', matches);
    
    if (matches.length === 0) {
        hideCommandSuggestions();
        return;
    }
    
    if (!commandSuggestions) {
        console.error('❌ Command suggestions container not found!');
        return;
    }
    
    commandSuggestions.innerHTML = '';
    
    matches.forEach((cmd, index) => {
        const suggestion = document.createElement('div');
        suggestion.className = 'command-suggestion';
        if (index === 0) suggestion.classList.add('selected');

        // 从命令描述映射中获取说明
        const description = commandDescriptions[cmd] || '斜杠命令';
        const descriptionHtml = description ? `<span class="cmd-desc">${description}</span>` : '';

        suggestion.innerHTML = `
            <div class="cmd-name">${cmd}</div>
            ${descriptionHtml}
        `;
        
        suggestion.addEventListener('click', (e) => {
            console.log('🖱️ Suggestion clicked:', cmd);
            e.preventDefault();
            e.stopPropagation();
            applySuggestion(suggestion, inputElement);
        });
        
        commandSuggestions.appendChild(suggestion);
    });
    
    // 定位建议框
    positionSuggestions(inputElement);
    commandSuggestions.style.display = 'block';
}

// 隐藏命令建议
function hideCommandSuggestions() {
    if (commandSuggestions) {
        commandSuggestions.style.display = 'none';
    }
}

// 选择下一个建议
function selectNextSuggestion(suggestions, current) {
    const currentIndex = Array.from(suggestions).indexOf(current);
    const nextIndex = (currentIndex + 1) % suggestions.length;
    
    if (current) current.classList.remove('selected');
    suggestions[nextIndex].classList.add('selected');
}

// 选择上一个建议
function selectPrevSuggestion(suggestions, current) {
    const currentIndex = Array.from(suggestions).indexOf(current);
    const prevIndex = (currentIndex - 1 + suggestions.length) % suggestions.length;
    
    if (current) current.classList.remove('selected');
    suggestions[prevIndex].classList.add('selected');
}

// 应用建议
function applySuggestion(suggestion, inputElement) {
    const command = suggestion.querySelector('.cmd-name').textContent;
    
    // 为 /dqc 命令添加参数提示
    if (command === '/dqc') {
        inputElement.value = '/dqc ';
        inputElement.setSelectionRange(5, 5); // 光标定位到参数位置
    } else {
        inputElement.value = command;
    }
    
    hideCommandSuggestions();
    inputElement.focus();
}

// 定位建议框
function positionSuggestions(inputElement) {
    commandSuggestions.style.position = 'absolute';
    commandSuggestions.style.bottom = '60px'; // 输入框上方
    commandSuggestions.style.left = '0';
    commandSuggestions.style.right = '0';
}

// 添加处理指示器
function addProcessingIndicator(toolName) {
    if (!currentAssistantMessage) return;
    
    // 移除已存在的指示器
    removeProcessingIndicator();
    
    // 根据工具名称显示更具体的信息
    let message = '正在调用工具...';
    if (toolName) {
        if (toolName.includes('getTableGenerationSql')) {
            message = '🔍 正在获取生产SQL代码...';
        } else if (toolName.includes('getHiveTableSchema')) {
            message = '📊 正在获取表结构信息...';
        } else if (toolName.includes('getTableUpstreamLineage')) {
            message = '🔗 正在分析上游血缘关系...';
        } else if (toolName.includes('getTableDataDemo')) {
            message = '📋 正在获取数据示例...';
        } else if (toolName.includes('getFieldEnumDistribution')) {
            message = '📈 正在分析字段分布...';
        } else {
            message = `⚡ 正在调用 ${toolName}...`;
        }
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'processing-indicator';
    indicator.innerHTML = `
        <div class="spinner"></div>
        <span>${message}</span>
    `;

    // 将处理指示器添加到工具容器中
    const toolsContainer = currentAssistantMessage.querySelector('.tools-container');
    if (toolsContainer) {
        toolsContainer.appendChild(indicator);
    } else {
        currentAssistantMessage.appendChild(indicator);
    }
    scrollToBottom();
}

// 移除处理指示器
function removeProcessingIndicator() {
    if (!currentAssistantMessage) return;
    
    const indicator = currentAssistantMessage.querySelector('.processing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 标记工具为已完成
function markToolAsCompleted() {
    if (!currentAssistantMessage || pendingTools.length === 0) return;

    // 获取队列中第一个待完成的工具ID
    const toolId = pendingTools.shift();
    const toolElement = currentAssistantMessage.querySelector(`[data-tool-id="${toolId}"]`);

    if (toolElement) {
        const statusElement = toolElement.querySelector('.tool-status');
        const statusText = toolElement.querySelector('.status-text');
        const statusDot = toolElement.querySelector('.status-dot');

        if (statusText) {
            statusText.textContent = '已完成';
        }

        // 移除加载动画
        toolElement.classList.remove('loading');
        toolElement.classList.add('completed');
    }
}

// 标记所有工具为已完成
function markAllToolsAsCompleted() {
    if (!currentAssistantMessage) return;

    const toolUses = currentAssistantMessage.querySelectorAll('.tool-use.loading');

    toolUses.forEach(tool => {
        const statusText = tool.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = '已完成';
        }

        // 移除加载动画并标记为完成
        tool.classList.remove('loading');
        tool.classList.add('completed');
    });

    // 清空待完成队列
    pendingTools = [];
}
