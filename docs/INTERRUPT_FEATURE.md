# 中断功能使用指南

Claude WebUI 现已支持类似 Claude Code 的 ESC 中断功能，允许你随时停止 Claude 的响应。

---

## ✨ 功能特性

### 🎯 核心能力
- **键盘快捷键**：按 `ESC` 键立即中断
- **图形按钮**：点击红色的中断按钮
- **实时反馈**：中断按钮带有脉动动画提示
- **安全中断**：优雅地停止 Claude，不会丢失会话上下文

### 💡 使用场景
- Claude 回答偏离主题时
- 查询时间过长需要重新提问
- 发现问题描述不准确需要修正
- 想要尝试不同的提问方式

---

## 🚀 使用方法

### 方式一：键盘快捷键（推荐）

在 Claude 正在回答时，按 `ESC` 键：

```
1. 发送消息给 Claude
2. Claude 开始回复（工具调用、文本生成等）
3. 按下 ESC 键
4. 看到"Interrupt signal sent"提示
5. Claude 停止响应
6. 显示"Request interrupted"消息
7. 可以发送新消息
```

### 方式二：点击中断按钮

1. Claude 开始回复时，发送按钮会自动变成**红色的中断按钮**（方形图标）
2. 点击该按钮发送中断信号
3. 等待 Claude 停止

---

## 🎨 界面变化

### 空闲状态（可以发送消息）
```
┌─────────────────────────────────┐
│  [输入框]               [发送🚀]  │
└─────────────────────────────────┘
```

### 处理状态（Claude 正在回复）
```
┌─────────────────────────────────┐
│  [输入框]        [中断⏹️]        │
│  ⏹️ Press ESC to interrupt      │
└─────────────────────────────────┘
```

**特征**：
- ✅ 红色中断按钮（脉动动画）
- ✅ 底部提示：`Press ESC to interrupt`
- ✅ 发送按钮隐藏

---

## 📝 中断流程详解

### 完整流程

```
用户操作          前端界面                后端处理              Claude SDK
────────          ────────               ────────             ────────
发送消息    →    显示用户消息      →    转发到 SDK      →    开始处理
                 显示中断按钮                                 工具调用
                 显示提示文字                                 生成文本
                                                               ...
按 ESC     →    发送中断信号      →    调用 interrupt()  →   停止处理
                 显示"发送中断"
                                  ←    返回中断确认     ←    释放资源
                 显示"已中断"
                 恢复发送按钮
```

### 前端消息

#### 1. 发送中断信号时
```
⏸️ Interrupt signal sent. Waiting for Claude to stop...
```

#### 2. 中断成功后
```
⏹️ Request interrupted
Claude has stopped processing. You can now send a new message.
```

---

## 🔧 技术实现

### 前端（JavaScript）

```javascript
// 全局 ESC 键监听
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isProcessing) {
        event.preventDefault();
        interruptRequest();
    }
});

// 发送中断请求
function interruptRequest() {
    ws.send(JSON.stringify({
        type: 'interrupt'
    }));
}
```

### 后端（Python）

```python
# WebSocket 消息处理
elif message_data.get("type") == "interrupt":
    await conversation_manager.interrupt(websocket)

# 调用 Claude SDK 的 interrupt 方法
async def interrupt(self, websocket: WebSocket):
    if self.client:
        await self.client.interrupt()
        await websocket.send_json({
            "type": "interrupted",
            "content": "Request interrupted successfully"
        })
```

---

## ⚠️ 注意事项

### 1. 中断时机
- ✅ **可以中断**：Claude 正在思考、调用工具、生成文本时
- ❌ **无法中断**：空闲状态（此时没有任何操作需要中断）

### 2. 会话保持
- ✅ 中断**不会**清空对话历史
- ✅ 中断后仍可继续对话
- ✅ Claude 会记住之前的所有交互

### 3. 响应延迟
- 中断信号发送后，可能需要 1-3 秒才能完全停止
- 这是因为 Claude 需要安全地释放资源
- 请耐心等待"Request interrupted"提示

### 4. 资源管理
- 中断的请求会被正确清理
- 不会产生资源泄漏
- API 成本会计算到中断时刻

---

## 🎯 实际应用示例

### 场景 1：重新组织提问

```
用户: 帮我分析 bi_sycpb 数据库的所有表
Claude: 开始调用工具查询...

👉 按 ESC（发现范围太大，想缩小查询）

用户: 只分析 bi_sycpb.dws_dmp_group_people_group_1d_d 这张表
Claude: 好的，我来查询这张表的信息...
```

### 场景 2：停止长时间运行的工具

```
用户: 查询所有表的上游血缘关系
Claude: 正在查询第 1 个表...
Claude: 正在查询第 2 个表...
Claude: 正在查询第 3 个表...

👉 按 ESC（发现会很慢，想停止）

用户: 只查询一张表就好
```

### 场景 3：纠正错误的查询

```
用户: 查询 bi_sycpb.wrong_table_name 的字段
Claude: 正在查询...

👉 按 ESC（发现表名输错了）

用户: 查询 bi_sycpb.dws_dmp_group_people_group_1d_d 的字段
```

---

## 🔍 故障排除

### 问题 1：按 ESC 没反应

**可能原因**：
- 不在处理状态（Claude 已经停止）
- 浏览器焦点不在页面上
- JavaScript 被阻止

**解决方法**：
1. 确认看到红色中断按钮
2. 确认浏览器标签页处于激活状态
3. 点击页面任意位置获取焦点
4. 或直接点击中断按钮

### 问题 2：中断后无法发送新消息

**可能原因**：
- 前端状态未正确更新
- WebSocket 连接断开

**解决方法**：
1. 刷新页面（会话不会丢失）
2. 检查连接状态指示器
3. 查看浏览器控制台错误

### 问题 3：中断后看到错误消息

**可能原因**：
- 后端 Claude SDK 客户端未初始化
- 网络连接问题

**解决方法**：
1. 重新发送一条消息（会自动重新连接）
2. 点击"Reset Session"重置会话
3. 刷新页面

---

## 📊 与 Claude Code 的对比

| 特性 | Claude Code | Claude WebUI |
|------|-------------|--------------|
| 中断快捷键 | ✅ ESC | ✅ ESC |
| 图形按钮 | ❌ 无 | ✅ 红色中断按钮 |
| 视觉反馈 | 文本提示 | 脉动动画 + 文字 |
| 会话保持 | ✅ | ✅ |
| 实时提示 | 底部提示栏 | 输入框下方 |

---

## 💻 开发者信息

### API 消息格式

#### 前端 → 后端
```json
{
  "type": "interrupt"
}
```

#### 后端 → 前端
```json
{
  "type": "interrupted",
  "content": "Request interrupted successfully"
}
```

### CSS 类名
- `.interrupt-btn` - 中断按钮
- `.interrupt-hint` - 中断提示文字
- `.message.system` - 系统消息（包括中断提示）

### 相关文件
- `static/index.html` - HTML 结构
- `static/styles.css` - 样式定义
- `static/app.js` - 前端逻辑
- `webui_server.py` - 后端处理

---

## 🎉 总结

中断功能让你可以：
- ✅ **随时停止** Claude 的响应
- ✅ **保持会话** 上下文不丢失
- ✅ **重新提问** 更准确的问题
- ✅ **节省成本** 避免无用的长响应
- ✅ **提高效率** 快速迭代对话

就像使用 Claude Code 一样简单和强大！

---

**按 ESC 键，掌控对话节奏！** ⚡
