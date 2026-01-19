# 如何创建新的斜杠命令

本指南将告诉你如何为 Claude WebUI 添加新的自定义斜杠命令。

## 📋 快速步骤

### 1. 创建命令文件
在 `.claude/commands/` 目录下创建一个新的 Markdown 文件：

```bash
.claude/commands/your-command-name.md
```

**规则：**
- 文件名（不含 `.md`）就是命令名
- 例如：`dqcsql.md` → `/dqcsql` 命令

### 2. 编写命令内容

命令文件的基本结构：

```markdown
---
description: 命令的简短描述（一句话）
argument-hint: [参数1] [参数2]（可选）
---

命令的详细提示词内容。

可以使用以下占位符：
- $1, $2, $3... - 按位置的参数
- $ARGUMENTS - 所有参数的完整字符串
```

### 3. 重启服务器

命令文件创建或修改后，**必须重启服务器**才能生效：

```bash
# 停止服务器
pkill -f "python.*webui_server"

# 启动服务器
cd /Users/xionghaoqiang/Xagent
source venv/bin/activate
nohup python webui_server.py > webui_server.log 2>&1 &

# 或使用便捷脚本
./start_with_logs.sh
```

### 4. 验证加载

检查日志确认命令已加载：

```bash
tail -30 webui_server.log | grep "Loaded custom command"
```

应该看到：
```
INFO:__main__:Loaded custom command: /your-command-name
```

### 5. 测试命令

在浏览器中访问 `http://localhost:8000`，输入：
```
/your-command-name 参数1 参数2
```

---

## 📝 命令文件详解

### 基本模板

```markdown
---
description: 这个命令的作用是什么
---

你希望 Claude 做什么事情。
可以包含详细的指令、步骤、要求等。
```

### 带参数的模板

```markdown
---
description: 带参数的命令示例
argument-hint: [表名] [日期]
---

请处理表 **$1**，日期为 **$2**。

## 任务步骤
1. 第一步：使用参数 $1
2. 第二步：使用参数 $2
3. 第三步：使用全部参数 $ARGUMENTS
```

**使用时：**
```
/your-command table_name 20240119
```

**Claude 会接收到：**
```
请处理表 **table_name**，日期为 **20240119**。
（$1 被替换为 table_name，$2 被替换为 20240119）
```

### 高级模板（使用 MCP 工具）

```markdown
---
description: 查询数据库表信息
argument-hint: [表名]
---

请为表 **$1** 执行以下操作：

## 步骤 1：获取表结构
使用 MCP 工具 `getHiveTableSchema` 获取表 $1 的字段信息。

## 步骤 2：获取数据示例
使用 MCP 工具 `getTableDataDemo` 获取表 $1 的示例数据（1条记录）。

## 步骤 3：获取血缘关系
使用 MCP 工具 `getTableUpstreamLineage` 获取表 $1 的上游血缘（1层）。

## 步骤 4：生成报告
基于以上信息，生成一个详细的表分析报告。
```

---

## 🎨 实际示例

### 示例 1：简单命令 - `/about`

**文件：** `.claude/commands/about.md`
```markdown
---
description: 关于 Claude WebUI 项目
---

请介绍这个 Claude WebUI 项目的主要功能和特点：

1. 基于 FastAPI + WebSocket 的实时聊天界面
2. 使用 Claude Agent SDK 与 Claude AI 进行交互
3. 支持 MCP 服务器集成
4. 支持斜杠命令系统

请简要说明这些特性。
```

**使用：**
```
/about
```

### 示例 2：带参数命令 - `/table-info`

**文件：** `.claude/commands/table-info.md`
```markdown
---
description: 查询 Hive 表的详细信息
argument-hint: [表名]
---

请使用 MCP 工具查询以下 Hive 表的详细信息：**$1**

需要获取：
1. 表的字段结构 (使用 getHiveTableSchema)
2. 表的数据示例 (使用 getTableDataDemo)
3. 表的上下游血缘关系概览

请以清晰的格式展示这些信息。
```

**使用：**
```
/table-info bi_sycpb.your_table_name
```

### 示例 3：复杂命令 - `/dqcsql`

**文件：** `.claude/commands/dqcsql.md`
```markdown
---
description: 基于生产SQL生成DQC检查代码
argument-hint: [表名]
---

请为 Hive 表 **$1** 生成数据质量检查（DQC）SQL 代码。

## 任务步骤

### 1. 获取表的生产 SQL
使用 MCP 工具 `getTableGenerationSql` 获取表 $1 的生产 SQL。

### 2. 获取上游血缘关系
使用 MCP 工具 `getTableUpstreamLineage` 获取表 $1 的上游血缘（1层）。

### 3. 获取表结构信息
使用 MCP 工具 `getHiveTableSchema` 获取表 $1 的字段结构。

### 4. 生成 DQC SQL 代码
基于以上信息，生成包含以下检查的 SQL：
- 非空检查
- 外键检查
- 枚举值检查
- 数据完整性检查

确保日期与生产 SQL 保持一致。
```

**使用：**
```
/dqcsql bi_sycpb.your_table_name
```

---

## 🔧 可用的 MCP 工具

当前 WebUI 集成了以下 MCP 工具，可以在命令中使用：

### 表信息查询
- `getHiveTableSchema` - 获取表结构
- `getTableDataDemo` - 获取表的示例数据
- `getFieldEnumValues` - 获取字段的枚举值
- `getFieldEnumDistribution` - 获取字段枚举分布

### 血缘关系
- `getTableUpstreamLineage` - 获取表的上游血缘
- `getTableDownstreamLineage` - 获取表的下游血缘

### 任务信息
- `getTableGenerationSql` - 获取表的生产 SQL
- `getJobUpstreamLineage` - 获取任务的上游血缘
- `getJobDownstreamLineage` - 获取任务的下游血缘

### 基础工具
- `Read` - 读取文件
- `Write` - 写入文件
- `Edit` - 编辑文件
- `Bash` - 执行命令
- `Glob` - 查找文件
- `Grep` - 搜索内容

**使用方式：**
在命令的提示词中明确告诉 Claude 使用哪个工具，例如：
```
使用 MCP 工具 `getHiveTableSchema` 获取表 $1 的字段信息
```

---

## 💡 最佳实践

### 1. 命令命名
- ✅ 使用短小精悍的名称：`dqcsql`, `table-info`, `help`
- ✅ 使用连字符分隔多个单词：`table-info`, `code-review`
- ❌ 避免过长的名称：`generate-data-quality-check-sql`

### 2. 描述文本
- ✅ 简短精确，一句话说明用途
- ✅ 示例：`"查询 Hive 表的详细信息"`
- ❌ 避免过于详细的描述

### 3. 参数提示
- ✅ 使用方括号表示必填参数：`[表名]`
- ✅ 使用圆括号表示可选参数：`(可选参数)`
- ✅ 示例：`[表名] [日期] (输出格式)`

### 4. 提示词内容
- ✅ 使用清晰的标题和结构
- ✅ 分步骤说明任务
- ✅ 明确指定使用哪些 MCP 工具
- ✅ 说明期望的输出格式
- ❌ 避免模糊不清的指令

### 5. 参数占位符
- ✅ 使用 `$1`, `$2` 表示按位置的参数
- ✅ 使用 `$ARGUMENTS` 表示所有参数
- ✅ 用 `**$1**` 加粗显示参数值
- ❌ 不要使用 `${1}` 或其他格式

---

## 🐛 常见问题

### Q1: 创建了命令文件但无法使用？
**A:** 确保已重启服务器。命令只在服务器启动时加载一次。

### Q2: 命令没有出现在 `/help` 列表中？
**A:** 检查：
1. 文件是否在 `.claude/commands/` 目录下
2. 文件扩展名是否是 `.md`
3. 文件是否有读取权限
4. 查看服务器日志确认是否加载

### Q3: 参数替换不工作？
**A:** 检查：
1. 使用 `$1`, `$2` 格式，不是 `${1}` 或 `$[1]`
2. 参数之间用空格分隔
3. 参数不要包含特殊字符

### Q4: 命令执行卡住不返回？
**A:** 可能原因：
1. 提示词太复杂，Claude 处理时间长
2. 要求的 MCP 工具调用失败
3. 网络问题
- 解决：简化提示词，逐步测试

### Q5: 如何查看命令是否加载成功？
**A:** 运行：
```bash
tail -50 webui_server.log | grep "Loaded custom command"
```

---

## 📚 进阶技巧

### 1. 覆盖内置命令

自定义命令优先级高于内置命令，可以创建同名文件覆盖：

**文件：** `.claude/commands/help.md`
```markdown
---
description: 显示帮助信息（自定义版本）
---

请用友好的方式列出所有可用的斜杠命令...
```

这会覆盖默认的 `/help` 命令。

### 2. 多个参数处理

```markdown
---
description: 比较两个表
argument-hint: [表1] [表2]
---

请比较表 **$1** 和表 **$2** 的差异：

1. 获取表 $1 的结构
2. 获取表 $2 的结构
3. 对比分析

原始输入参数：$ARGUMENTS
```

### 3. 条件逻辑

```markdown
---
description: 灵活的表分析
argument-hint: [表名] (详细级别)
---

请分析表 **$1**。

参数：$ARGUMENTS

如果用户提供了第二个参数 $2：
- 如果是 "simple"：只返回基本信息
- 如果是 "detailed"：返回详细分析
- 如果为空：返回标准分析
```

### 4. 组合多个工具

```markdown
---
description: 全面的数据质量分析
argument-hint: [表名]
---

对表 **$1** 进行全面分析：

## 阶段 1：表信息收集
1. 使用 `getHiveTableSchema` 获取结构
2. 使用 `getTableDataDemo` 获取样例
3. 使用 `getFieldEnumValues` 获取枚举

## 阶段 2：血缘分析
4. 使用 `getTableUpstreamLineage` 获取上游
5. 使用 `getTableDownstreamLineage` 获取下游

## 阶段 3：质量分析
6. 使用 `getTableGenerationSql` 获取生产逻辑
7. 分析潜在的数据质量问题

## 阶段 4：生成报告
整合所有信息，生成综合分析报告。
```

---

## 🚀 快速参考卡片

```
┌─────────────────────────────────────────────────┐
│  创建新斜杠命令 - 快速参考                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. 创建文件                                     │
│     .claude/commands/your-command.md            │
│                                                 │
│  2. 编写内容                                     │
│     ---                                         │
│     description: 命令描述                        │
│     argument-hint: [参数]                       │
│     ---                                         │
│     命令的提示词内容                             │
│     使用 $1, $2 作为参数占位符                   │
│                                                 │
│  3. 重启服务器                                   │
│     pkill -f "python.*webui_server"             │
│     nohup python webui_server.py > log 2>&1 &   │
│                                                 │
│  4. 验证                                         │
│     tail webui_server.log | grep "Loaded"       │
│                                                 │
│  5. 测试                                         │
│     浏览器输入: /your-command 参数               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 `webui_server.log` 日志
2. 参考 `SLASH_COMMANDS.md` 完整文档
3. 查看现有命令文件作为示例

---

**祝你创建出强大的自定义命令！** 🎉
