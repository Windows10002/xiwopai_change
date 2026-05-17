# 希沃智教 π · 智能作业批改（演示）

> **版权所有 © 2025–2026 [Windows10002](COPYRIGHT)**  
> 本仓库为专有作品，**非开源项目**。未经权利人书面授权，禁止复制、修改、再发布或商用。  
> 详见 [LICENSE](LICENSE) 与 [COPYRIGHT](COPYRIGHT)。

## 说明

教师端 / 学生端分角色界面、批改、学情分析、错题本等功能的演示实现。

- 后端：Flask（默认端口见 `app.py`）
- 前端：`frontend/`（构建产物在 `frontend/dist`）

## 本地运行（简要）

```bash
# 后端
pip install -r requirements.txt
python app.py

# 前端构建
cd frontend
npm install
npm run build
# 或：node node_modules/vite/bin/vite.js build
```

浏览器访问 Flask 提供的地址（如 `http://127.0.0.1:5007`），勿仅打开 `index.html`。

## 协作者须知

- 提交代码即表示您确认不侵犯第三方权利，且同意作品整体著作权归属 **Windows10002**（另有书面约定除外）。
- 请勿将 API Key 写入仓库；使用 `.env` 并参考 `.env.example`。

## 许可证

**专有许可，保留一切权利。** 不是 MIT / Apache / GPL 开源协议。
