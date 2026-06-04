# 希沃智教 π · 智能批改演示

数学 / 英语作业智能批改 Web 应用：React 前端 + Flask API，四端角色（家长 / 学生 / 教师 / 教务）。

## 环境要求

- Python 3.10+（推荐 Conda 环境 `py310`）
- Node.js 18+（构建前端）
- DashScope API Key（`.env` 中配置）

## 快速开始

### 1. 后端

```powershell
cd D:\my_code\xiwopai\first
copy .env.example .env
# 编辑 .env 填入 MOONSHOT_API_KEY（Kimi 批改）、SECRET_KEY 等；见 docs/DEV.md

pip install -r requirements.txt
python app.py
```

默认端口 **50003**（`FLASK_DEBUG=0` 为生产模式）。

### 2. 前端

**开发（热更新，推荐改代码时用）：**

```powershell
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173（Vite 代理到 50003）。

**本地开发速查（多标签登录、常用地址）：** 见 [docs/DEV.md](docs/DEV.md)。

**演示（单端口）：**

```powershell
cd frontend
npm run build
cd ..
python app.py
```

浏览器打开 http://127.0.0.1:50003

### 3. 演示登录

| 账号 | 密码 | 说明 |
|------|------|------|
| 13800138000 | 123456 | 登录时选择端别 |

小学及以下学生需填写家长/教师确认码（默认 `HW-ALLOW`，见 `.env`）。

## 安全说明（演示 → 生产）

- 所有 `/api/*` 接口需 Bearer 令牌（登录后自动携带）
- `/uploads/*` 需登录访问，文件名使用 UUID
- 生产环境务必修改 `SECRET_KEY`、`DEMO_ACCOUNT`、`DEMO_PASSWORD`
- 使用 gunicorn/waitress 部署，勿开启 `FLASK_DEBUG`

## 项目结构

```
app.py              # Flask 入口
core/               # 配置、鉴权、批改适配、申诉存储
routes/             # API / SPA Blueprint
frontend/           # React + Vite
math_correct.py     # 数学批改核心（勿随意改动逻辑）
english_essay.py    # 英语批改核心
tests/              # 单元测试
```

## 测试

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
cd frontend && npm run build
```
