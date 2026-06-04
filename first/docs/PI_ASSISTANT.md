# π 智能助手（IP 悬浮入口）产品方案

右下角品牌 IP 由「静态帮助文档」升级为 **可对话的 π 助手**，与现有批改/作业能力并列，不替代教师专业判断。

## 目标

| 场景 | 说明 |
|------|------|
| 功能导航 | 「待办在哪」「怎么发考试」「学情和作业管理区别」→ 给出路径 + 一句话操作 |
| 使用答疑 | 拍题技巧、导出 Word、家长代拍规则等（可复用现有帮助条目） |
| 产品反馈 | 结构化收集建议/Bug，写入服务端或导出给开发者 |
| 可选深度问答 | 配置大模型 API 后，开放 Ask 模式（一问一答，不自动改数据） |

## 架构（推荐分两期）

### 第一期：规则引擎 + 反馈（无外部 API 也能上线）

```
用户输入 → 意图分类（关键词/轻量规则）
  ├─ nav.*     → 本地「功能地图」JSON（角色 × 问题 → 路由 + 步骤）
  ├─ help.*    → 检索 AiHelpModal 同款 FAQ 段落
  ├─ feedback  → POST /api/product-feedback（JSONL 或 DB）
  └─ fallback  → 引导点击「作业管理 / 学情中心」+ 展示 3 条常见问题
```

- **UI**：右下角 IP → 右侧抽屉（非全屏），上方对话气泡列表，底部输入框；首屏 3 个快捷芯片（「找功能」「使用帮助」「反馈建议」）。
- **角色感知**：读取 `useAppSession().role`，导航答案区分教师/学生/家长/教务。
- **不展示 URL**：站内跳转用 `useAppNavigate()`，避免地址栏 `?slot=` 预览。

### 第二期：大模型 Ask 模式（可选开关）

- 后端 `POST /api/assistant/chat`：携带 `role`、`currentPath`、最近 N 轮对话；system prompt 注入功能地图摘要 + 安全边界（禁止改分、禁止代学生交卷）。
- **大模型**：[Agnes](https://platform.agnes-ai.com/) OpenAI 兼容接口（`https://apihub.agnes-ai.com/v1`），环境变量 `AGNES_API_KEY`；**不与批改 DashScope 共用**。
- 前端设置项：`assistantMode: "rules" | "llm"`，未配置 `AGNES_API_KEY` 时隐藏 LLM 选项。
- **RAG（可选）**：将 `docs/DEV.md`、帮助 FAQ 切块 embedding，减少胡编路径。
- **成本控制**：每会话最多 20 轮；教师端可略放宽。

## 与「学情 / 作业」的边界

- 助手 **只读** 业务数据；删作业、改分、下发成绩仍走原有页面。
- 删除/发布作业后列表同步依赖 `workspaceAssignmentsSync`（已实现），助手回答中可提示「若其它标签页未更新，请切换窗口或刷新」。

## 反馈数据结构（建议）

```json
{
  "role": "teacher",
  "path": "/workspace",
  "category": "bug | idea | question",
  "message": "用户原文",
  "contact": "选填",
  "clientVersion": "0.0.1",
  "createdAt": "ISO8601"
}
```

## 实施顺序建议

1. `PiAssistantDrawer` UI + 规则意图 + 功能地图（1–2 天）— **已完成**
2. `POST /api/product-feedback` + 管理端导出（0.5 天）— **已完成**：`GET /api/product-feedback`、`GET /api/product-feedback/export`、页面 `/product-feedback`
3. 设置页开关、替换 `FabHelp` → `FabPiAssistant`（0.5 天）— **已完成**
4. 规则增强 + 页面上下文（阶段 A2/A3）— **已完成**：`piPathContext`、扩充 FAQ/功能地图
5. LLM 接入与 prompt 调优（阶段 B）— **已完成**：`POST /api/assistant/chat`、`GET /api/assistant/config`、设置与抽屉内「规则 / 智能问答」切换

## 风险与约束

- 学生端勿引导绕过教师审核的流程。
- 演示环境说明数据存本机/演示库，反馈勿含真实隐私。
- LLM 回答需标注「仅供参考，以页面实际功能为准」。
