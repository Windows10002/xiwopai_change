# 希沃智教 π · 本地开发速查

## 启动

```powershell
# 终端 1 - 后端（默认 50003）
cd D:\my_code\xiwopai\first
.\run-conda.ps1
```

```powershell
# 终端 2 - 前端（热更新）
cd D:\my_code\xiwopai\first\frontend
npm run dev
```

浏览器：**http://localhost:5173**（API 代理到 `http://127.0.0.1:50003`）

---

## 演示账号（密码均为 `123456`）

| 身份 | 账号 | 说明 |
|------|------|------|
| 教师 | `13800138001` | 李老师 |
| 家长 | `13800138002` | 张三家长 |
| 学生 | `13800138003` | 张三（七年级，对应 **七年级1班**） |
| 学生（对照） | `13800138004` | 李四（九年级，非本流程） |
| 教务 | `13800138005` | 王教务 |

作业管理增删改后，各端任务列表通过 `workspaceAssignmentsSync`（同页事件 + 跨标签 BroadcastChannel）自动刷新；学情中心数据来自本机批改历史，与任务列表独立。**删除作业不会自动清除学情中的批改历史**，需在学情中心 → 批改历史单独删除。

教师端要点：顶栏「批改」为三科下拉；「更多」含判题反馈与学生申诉；作业管理支持 `?tab=review` 直达待审阅；任务卡片可「去批改 / 本任务学情」；学情页可导出简报与作业成绩 CSV。

学生端要点：首页「π 助学」(`/pi-tutor`) 可分析错题、提问不会的题；「π 奖励」(`/rewards`) 按准确率获徽章；学习台五色与下方三科卡片配色错开；「我的作业」支持 `?tab=work|variants`。

π 智能助手方案见 [PI_ASSISTANT.md](./PI_ASSISTANT.md)。智能问答使用 [Agnes](https://platform.agnes-ai.com/)（`.env` 中 `AGNES_API_KEY`），与批改 `DASHSCOPE_API_KEY` 分离；在设置或 π 抽屉切换「智能问答」模式。

小学及以下学生登录确认码（演示）：`HW-ALLOW`

---

## 多标签并行登录（教师 + 学生 + 家长）

同一浏览器多标签调试时，**必须用不同 `slot`**，否则会共用登录态、互相顶掉。

**每个链接用新标签页打开，再分别登录：**

```
教师  http://localhost:5173/login?slot=teacher&role=teacher
学生  http://localhost:5173/login?slot=student&role=student   （账号 13800138003 → 张三）
家长  http://localhost:5173/login?slot=parent&role=parent     （账号 13800138002 → 张三家长）
教务  http://localhost:5173/login?slot=admin&role=admin       （账号 13800138005）
```

也可：打开 `http://localhost:5173/login` → 页面底部 **「开发：多标签并行登录」**（仅 `npm run dev` 时显示）→ 新标签打开各端链接。

登录后地址栏会带 `?slot=xxx`，**不要删掉**。站内跳转会自动保留 slot。顶栏小标签（如「教师」）表示当前槽正确。

**不要用两个标签都打开普通 `/login`（默认槽会冲突）。**

---

## 常用页面

| 页面 | 地址 |
|------|------|
| 首页 | http://localhost:5173/ |
| 登录 | http://localhost:5173/login |
| 作业管理（教师） | http://localhost:5173/workspace |
| 学生申诉（教师） | http://localhost:5173/disputes |
| 待办（学生交卷） | http://localhost:5173/todo |
| 我的作业（学生） | http://localhost:5173/my-work |
| π 奖励（学生） | http://localhost:5173/rewards |
| π 助学（学生） | http://localhost:5173/pi-tutor |
| 数学批改 | http://localhost:5173/math |
| 英语批改 | http://localhost:5173/english |
| 语文批改 | http://localhost:5173/chinese |
| 学情中心 | http://localhost:5173/class-analytics |
| 学情中心·班级学情 | http://localhost:5173/class-analytics（默认） |
| 学情中心·批改历史 | http://localhost:5173/class-analytics?tab=history |
| 学情中心·单次学情 | http://localhost:5173/class-analytics?tab=batch |
| 学情中心·学生学情 | http://localhost:5173/class-analytics?tab=student |
| 学情中心·薄弱趋势 | http://localhost:5173/class-analytics?tab=weak |
| 学情·学科筛选 | `?subject=math` / `english` / 省略为全部 |
| 学情中心·学期（默认当前） | `?term=current` 可省略；全部：`?term=all` |
| ~~学情·任务~~ | `?source=tasks` 已重定向至作业管理 |
| 判题反馈 | http://localhost:5173/feedback-dashboard |
| 产品反馈（π 助手） | http://localhost:5173/product-feedback |
| 错题本 | http://localhost:5173/wrong-book |
| 设置 | http://localhost:5173/settings |

多标签时可在路径后保留 slot，例如：`/workspace?slot=teacher`、`/my-work?slot=student`（登录后通常会自动带上）。

---

## 联调流程示例（发作业 → 交卷 → 审阅）

**演示学生：张三 · 七年级1班**（与登录账号 `13800138003`、家长端绑定孩子一致）

| 字段 | 填写值 |
|------|--------|
| 学生姓名（学生端待办/我的作业、交卷时） | `张三`（仅姓名，不要把班级写进姓名框） |
| 班级（教师发布任务时） | `七年级1班` |
| 布置对象 | 名册点选或填写 `张三` |
| 家长查看 | `13800138002` 登录后首页显示「张三 的课堂任务」 |

1. **标签 1（教师）** `13800138001` → `/workspace` → 发布作业：班级 **七年级1班**，对象 **张三**  
2. **标签 2（学生）** `13800138003` → 确认姓名 **张三** → `/todo` 交卷  
3. **标签 1**：待审阅 → 审阅并 **批量下发成绩**  
4. **标签 2**：`/my-work` 查看；错题本、π 奖励会随本机批改历史更新  
5. **可选标签 3（家长）** `13800138002`：首页任务列表应与教师发布同步刷新  
6. **可选标签 4（教务）** `13800138005` + `slot=admin`：首页「全校任务同步」应出现该任务  

若学生待办为空：检查教师任务是否已发布、对象是否含 **张三**、学生姓名是否与教师名册 **完全一致**（无空格、无后缀班级名）。

多标签时各端列表会自动刷新（无需手动 F5）：

- **作业/交卷/下发**：`workspaceApi` 写操作后广播 `workspace-assignments-changed`（含 `BroadcastChannel` 跨标签）
- **订阅方**：教师作业管理、教务首页任务总览、家长孩子任务、学生待办/我的作业/首页角标
- **本机批改/错题**：`grading-history-changed` + `wrong-book-changed`；家长首页学情摘要、学生错题本与角标会跟随更新

教务端建议：`login?slot=admin&role=admin`（与教师/学生/家长分槽，避免顶号）。

---

## 打包单端口（可选，不跑 Vite）

```powershell
cd D:\my_code\xiwopai\first\frontend
npm run build
cd D:\my_code\xiwopai\first
python app.py
```

浏览器：**http://127.0.0.1:50003**（把上面链接里的 `5173` 改成 `50003` 即可）

---

## 常见问题

| 现象 | 处理 |
|------|------|
| 5173 打不开 | `frontend` 目录执行 `npm run dev` |
| 登录失败 / 非 JSON | 执行 `.\run-conda.ps1`，确认 50003 在跑 |
| 页面没更新 | 浏览器 **Ctrl+F5** 强刷 |
| 多标签登录互相覆盖 | 必须用带 `slot` 的登录链接 |
| 接口 404 | 停掉多余 Flask，只保留一个后端 |

---

## 测试

```powershell
cd D:\my_code\xiwopai\first
python -m unittest discover -s tests -p "test_*.py" -v
```

```powershell
cd D:\my_code\xiwopai\first\frontend
npm run build
```
