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
| 学生 | `13800138003` | 张三（七年级） |
| 教务 | `13800138004` | 见登录页演示列表 |

小学及以下学生登录确认码（演示）：`HW-ALLOW`

---

## 多标签并行登录（教师 + 学生 + 家长）

同一浏览器多标签调试时，**必须用不同 `slot`**，否则会共用登录态、互相顶掉。

**每个链接用新标签页打开，再分别登录：**

```
教师  http://localhost:5173/login?slot=teacher&role=teacher
学生  http://localhost:5173/login?slot=student&role=student
家长  http://localhost:5173/login?slot=parent&role=parent
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
| 待办（学生交卷） | http://localhost:5173/todo |
| 我的作业（学生） | http://localhost:5173/my-work |
| 数学批改 | http://localhost:5173/math |
| 英语批改 | http://localhost:5173/english |
| 语文批改 | http://localhost:5173/chinese |
| 班级看板 | http://localhost:5173/class-analytics |
| 错题本 | http://localhost:5173/wrong-book |
| 设置 | http://localhost:5173/settings |

多标签时可在路径后保留 slot，例如：`/workspace?slot=teacher`、`/my-work?slot=student`（登录后通常会自动带上）。

---

## 联调流程示例（发作业 → 交卷 → 审阅）

1. **标签 1（教师）**：`login?slot=teacher` 登录 → `/workspace` 发布作业  
2. **标签 2（学生）**：`login?slot=student` 登录 → `/todo` 提交  
3. **标签 1**：作业管理 **待审阅** → 审阅并下发  
4. **标签 2**：`/my-work` 查看成绩  

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
