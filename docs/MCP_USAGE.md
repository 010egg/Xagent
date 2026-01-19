# Berserker-Metadata MCP 服务器使用指南

WebUI 已经集成了 Bilibili 的 berserker-metadata MCP 服务器，可以查询数据表元数据、血缘关系等信息。

## 🔗 MCP 服务器信息

- **名称**: berserker-metadata
- **类型**: HTTP
- **URL**: http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata

## 🛠️ 可用工具

### 1. 表查询工具

#### getHiveTableSchema
查询 Hive 表的字段结构信息

**使用示例：**
```
查询表 bi_sycpb.dws_dmp_group_people_group_1d_d 的字段结构
```

#### getTableDataDemo
查询表的数据示例（返回字段名和示例数据，限制 1 条记录）

**使用示例：**
```
查看 bi_sycpb.dws_dmp_group_people_group_1d_d 表的数据示例
```

### 2. 血缘关系工具

#### getTableUpstreamLineage
查询表的上游血缘关系（哪些表派生了当前表）

**参数：**
- `table_name`: 表名，格式如 bi_sycpb.table_name
- `levels`: 查询层数（1-10 层，-1 表示所有层）

**使用示例：**
```
查询 bi_sycpb.dws_dmp_group_people_group_1d_d 的上游血缘关系，查询 2 层
```

#### getTableDownstreamLineage
查询表的下游血缘关系（当前表派生了哪些表）

**使用示例：**
```
查询表 bi_sycpb.dws_dmp_group_people_group_1d_d 的下游血缘，查询所有层级
```

### 3. 字段分析工具

#### getFieldEnumDistribution
查询字段的枚举分布情况（包含值、数量、占比、排名，最多 500 条）

**参数：**
- `table_name`: 表名
- `field_name`: 字段名（必须是 bigint 或 string 类型）
- `where_condition`: WHERE 条件（必须包含分区字段），如 `log_date='20250117'`

**使用示例：**
```
查询 bi_sycpb.ads_flow_summary_analysis_data_1d_d 表的 platform 字段在 2025-01-17 的枚举分布
```

#### getFieldEnumValues
查询字段的所有枚举值（最多 500 个）

**使用示例：**
```
列出 bi_sycpb.ads_flow_summary_analysis_data_1d_d 表的 status 字段所有可能的值，条件是 log_date='20250117'
```

### 4. 任务血缘工具

#### getJobUpstreamLineage
查询任务的上游血缘关系（哪些任务被当前任务依赖）

**参数：**
- `job_id`: 任务 ID
- `levels`: 查询层数（1-10 层，-1 表示所有层）

#### getJobDownstreamLineage
查询任务的下游血缘关系（哪些任务依赖当前任务）

### 5. 表生成 SQL 工具

#### getTableGenerationSql
查询表的上游任务 SQL 代码，返回生成该表的 ETL 任务信息（最多 8 条）

**使用示例：**
```
查询生成 bi_sycpb.dws_dmp_group_people_group_1d_d 表的 SQL 代码
```

### 6. 元数据信息

#### getInfo
获取插件信息和可用工具列表

## 💬 在 WebUI 中使用

### 查询表结构
```
帮我查询 bi_sycpb.dws_dmp_group_people_group_1d_d 这张表有哪些字段？
```

### 查询血缘关系
```
bi_sycpb.dws_dmp_group_people_group_1d_d 的上游表有哪些？
```

### 查询数据示例
```
给我看看 bi_sycpb.dws_dmp_group_people_group_1d_d 表的数据示例
```

### 分析字段分布
```
分析 bi_sycpb.ads_flow_summary_analysis_data_1d_d 表中 platform 字段的分布情况，日期是 2025-01-17
```

### 查询表生成逻辑
```
bi_sycpb.dws_dmp_group_people_group_1d_d 是怎么生成的？查看它的 ETL SQL
```

## 🔧 技术细节

### 工具命名规则
所有 MCP 工具都使用前缀 `mcp__<server-name>__<tool-name>` 格式：

```python
# 示例
"mcp__berserker-metadata__getHiveTableSchema"
"mcp__berserker-metadata__getTableUpstreamLineage"
```

### 配置方式
在 `webui_server.py` 中已配置：

```python
mcp_servers = {
    "berserker-metadata": {
        "type": "http",
        "url": "http://cm-mng.bilibili.co/ad-data-public-mcp/mcp/berserker-metadata"
    }
}

allowed_tools = [
    # ... 其他工具
    "mcp__berserker-metadata__getInfo",
    "mcp__berserker-metadata__getHiveTableSchema",
    "mcp__berserker-metadata__getTableUpstreamLineage",
    # ... 更多工具
]
```

## 📝 实际应用场景

### 场景 1：数据血缘分析
```
问题：某个数据表出现异常，需要找到所有上游依赖表

步骤：
1. 查询上游血缘：getTableUpstreamLineage
2. 对每个上游表查询字段结构：getHiveTableSchema
3. 查看生成 SQL：getTableGenerationSql
```

### 场景 2：字段值分析
```
问题：需要了解某个枚举字段的所有可能值和分布

步骤：
1. 查询字段枚举值：getFieldEnumValues
2. 查询分布情况：getFieldEnumDistribution
3. 查看数据示例：getTableDataDemo
```

### 场景 3：表影响分析
```
问题：修改某个表的结构，需要知道会影响哪些下游表

步骤：
1. 查询下游血缘：getTableDownstreamLineage
2. 对每个下游表查询使用情况
3. 评估影响范围
```

## 🚀 快速开始

1. **启动 WebUI**
   ```bash
   cd /Users/xionghaoqiang/Xagent
   ./start_webui.sh
   ```

2. **访问界面**
   ```
   http://localhost:8000
   ```

3. **开始查询**
   在聊天框中输入自然语言查询，Claude 会自动调用合适的 MCP 工具

## ⚠️ 注意事项

1. **分区字段**：使用 `getFieldEnumDistribution` 和 `getFieldEnumValues` 时，必须在 `where_condition` 中包含分区字段

2. **字段类型**：字段枚举查询仅支持 `bigint` 和 `string` 类型字段

3. **结果限制**：
   - 字段枚举最多返回 500 条
   - 表生成 SQL 最多返回 8 条
   - 数据示例限制 1 条记录

4. **网络访问**：确保可以访问内网地址 `http://cm-mng.bilibili.co`

## 📚 相关资源

- [MCP 协议官方文档](https://spec.modelcontextprotocol.io/)
- [Claude Code SDK 文档](https://docs.anthropic.com/claude/docs)
- [WebUI 使用指南](./README_WEBUI.md)
