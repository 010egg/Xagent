# 斜杠命令使用指南

## 概述

斜杠命令是一种以 `/` 开头的特殊命令，用于控制 Claude WebUI 会话或执行特定操作。

## 内置命令

### `/help`
显示所有可用的斜杠命令及其描述。

**用法:**
```
/help
```

### `/clear`
清除当前对话历史，开始一个全新的会话。这将重置 Claude 客户端并清空所有对话上下文。

**用法:**
```
/clear
```

### `/compact`
压缩对话历史以减少 token 使用。（计划中的功能）

**用法:**
```
/compact
```

## 自定义命令

### 创建自定义命令

你可以在 `.claude/commands/` 目录中创建自己的斜杠命令。每个命令是一个 markdown 文件（`.md`）。

#### 基本格式

```markdown
---
description: 命令描述
---

命令的内容或提示词
```

#### 支持的元数据字段

在 YAML 前言中，你可以定义以下字段：

- `description`: 命令的简短描述
- `argument-hint`: 参数提示，如 `[table_name]`
- `allowed-tools`: 允许使用的工具列表
- `model`: 指定使用的模型

#### 参数占位符

在命令内容中，你可以使用占位符来接收用户输入的参数：

- `$1`, `$2`, `$3`, ... - 按位置的参数
- `$ARGUMENTS` - 所有参数的完整字符串

### 示例：创建一个表查询命令

文件: `.claude/commands/table-info.md`

```markdown
---
description: 查询 Hive 表的详细信息
argument-hint: [table_name]
---

请使用 MCP 工具查询以下 Hive 表的详细信息：**$1**

需要获取：
1. 表的字段结构 (使用 getHiveTableSchema)
2. 表的数据示例 (使用 getTableDataDemo)
3. 表的上下游血缘关系概览

请以清晰的格式展示这些信息。
```

**用法:**
```
/table-info bi_sycpb.dws_dmp_group_people_group_1d_d
```

### 示例：创建一个项目介绍命令

文件: `.claude/commands/about.md`

```markdown
---
description: 关于 Claude WebUI 项目
---

请介绍这个 Claude WebUI 项目的主要功能和特点：

1. 这是一个基于 FastAPI + WebSocket 的实时聊天界面
2. 使用 Claude Agent SDK 与 Claude AI 进行交互
3. 支持 MCP (Model Context Protocol) 服务器集成
4. 支持斜杠命令系统
5. 具有实时流式响应和工具调用展示
6. 支持中断功能

请简要说明这些特性，并说明如何使用。
```

**用法:**
```
/about
```

## 已创建的自定义命令

本项目目前包含以下自定义命令：

1. **`/about`** - 关于 Claude WebUI 项目
2. **`/table-info [table_name]`** - 查询 Hive 表的详细信息

## 命令目录结构

```
.claude/
└── commands/
    ├── about.md
    ├── table-info.md
    └── [你的自定义命令].md
```

## 使用技巧

1. **命令发现**: 使用 `/help` 查看所有可用命令
2. **快速重置**: 使用 `/clear` 快速开始新对话
3. **参数传递**: 自定义命令支持多个参数，用空格分隔
4. **命令组织**: 可以在 `commands/` 下创建子目录来组织命令

## 技术实现

### 命令加载

服务器在启动时会自动扫描 `.claude/commands/` 目录，加载所有 `.md` 文件作为自定义命令。

### 命令处理流程

1. 用户输入以 `/` 开头的消息
2. 服务器检测到斜杠命令
3. 解析命令名称和参数
4. 匹配内置命令或自定义命令
5. 执行相应的处理逻辑
6. 返回结果给前端

### 扩展命令系统

要添加新的内置命令，需要修改 `webui_server.py` 中的 `_handle_slash_command` 方法。

## 故障排除

### 命令未识别

确保：
- 命令文件在 `.claude/commands/` 目录中
- 文件扩展名是 `.md`
- 服务器已重启以加载新命令

### 参数替换不工作

检查：
- 使用了正确的占位符格式（`$1`, `$2`, `$ARGUMENTS`）
- 参数之间用空格分隔

## 未来计划

- [ ] 实现 `/compact` 命令的完整功能
- [ ] 支持命令别名
- [ ] 支持命令参数验证
- [ ] 添加命令帮助文档
- [ ] 支持命令权限控制
