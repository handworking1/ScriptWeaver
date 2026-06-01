# 🎭 剧本角色聊天

> 本地优先 · AI 驱动 · 沉浸式角色扮演与剧本创作平台

一个基于 Electron + React + TypeScript 的桌面端 AI 聊天应用，专为剧本创作和角色扮演设计。支持 OpenAI 兼容 API（DeepSeek、Ollama 等），数据完全本地存储。

---

## ✨ 功能概览

### 📜 剧本管理
- 创建/编辑/删除剧本，支持丰富的元数据：世界观、故事背景、对标作品、类型标签
- **小说类型标签**：内置 40+ 标签（言情/玄幻/重生/系统文/打脸爽文等），按四大类组织
- **事件时间线** & **章节/幕管理**：规划剧情结构
- **创作模式**：沉浸式角色扮演 / 上帝视角共同创作 / 混合模式
- **系统执行模式**：严格度、工作流、前情提要、定期总结、规则自检

### 🎭 角色管理
- 为每个剧本创建/编辑角色：姓名、性格、背景、口癖、外貌、头像
- **AI 补全**：输入角色名，AI 自动生成完整人设
- **AI 讨论**：侧边栏和 AI 深入讨论角色设计

### 🤖 AI 剧本讨论页
- 独立页面，和 AI 按**十二步工作流**讨论剧本
- 从对标作品学习到书名创作的完整流程引导
- **👥 提取角色**：AI 自动识别讨论中的角色并一键添加到角色管理
- **📝 生成剧本**：讨论完成后一键生成完整剧本

### 💬 聊天
- **角色对话模式**：1v1 沉浸式对话
- **世界参与模式**：AI 作为 GM 叙述者，用户参与世界
- **流式输出**：SSE 实时显示 AI 回复
- **快捷回复**：AI 提供的 [SUGGESTIONS] 自动转为可点击选项卡片
- **快捷输入栏**：自定义快捷短语，一键发送
- **对话列表**：同时开多个对话，随时切换
- **角色图鉴**：滑动面板记录角色好感度、性格、状态等

### ⚙️ AI 配置
- 多组 API 配置，支持故障转移
- **模型预设**：DeepSeek V4 Pro/Flash/V3/R1、GPT-4o、Claude、Qwen、GLM-4 等
- API Key 加密存储（Electron safeStorage）
- **测试连接**按钮，一键验证 API 可用性
- **提示词模板**：7 个内置模板（默认/古风/现代/RPG/亲密/叙事创作系统）
- **全局规则**：所有对话自动注入的规则
- **主角设定**：可选全局生效的玩家角色设定
- **GM 设置**：叙事风格、细节程度、节奏、骰子判定

### 📋 历史记录
- 按剧本筛选对话列表，支持分支标记
- 查看/删除/导出对话
- **导出格式**：Markdown、JSON、小说格式、PDF 打印
- **继续对话**：从历史记录恢复任何对话

### 其他
- ☀️/🌙 亮暗主题切换（持久化）
- 数据导入/导出（不含 API Key）
- 跨平台：Windows / macOS / Linux

---

## 🚀 快速开始

### 下载使用

在 [Releases](../../releases) 下载最新 `剧本角色聊天-x64.exe`，双击运行。

### 开发环境

```bash
git clone https://github.com/yourname/script-character-chat.git
cd script-character-chat
npm install
npm run dev      # 开发模式（Vite + Electron）
npm run build:win # 打包 Windows
```

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 桌面容器 | Electron 33 |
| 前端 | React 18 + TypeScript + Vite 6 |
| UI | Tailwind CSS 3 + Radix/Headless 风格 |
| 状态管理 | Zustand 5 |
| 数据库 | SQLite (sql.js WASM) |
| 安全存储 | Electron safeStorage |
| Markdown | react-markdown + rehype-highlight |
| 流式请求 | fetch + ReadableStream SSE 解析 |

---

## 📁 项目结构

```
├── electron/            # Electron 主进程
│   ├── main.ts          # 窗口创建、应用生命周期
│   ├── preload.ts       # 安全 IPC 桥接
│   ├── database.ts      # SQLite CRUD（5 张表 + KV 设置表）
│   ├── safe-storage.ts  # API Key 加密/解密
│   └── ipc-handlers.ts  # 全部 IPC 处理器 + SSE 流式
├── src/
│   ├── main.tsx         # React 入口
│   ├── App.tsx          # 布局 + 路由
│   ├── index.css        # Tailwind + highlight.js 主题
│   ├── types/           # TypeScript 类型定义
│   ├── stores/          # Zustand 状态管理（5 个 store）
│   ├── lib/             # 工具函数（提示词构建/导出/ID/token 计算）
│   ├── components/      # 可复用组件（14 个）
│   └── pages/           # 页面组件（7 个）
├── public/              # 静态资源（图标）
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 🔑 API 配置

支持所有 OpenAI 兼容 API：

| 提供商 | API 地址 |
|--------|---------|
| DeepSeek | `https://api.deepseek.com` |
| OpenAI | `https://api.openai.com` |
| Ollama 本地 | `http://localhost:11434` |
| 阿里通义千问 | `https://dashscope.aliyuncs.com/compatible-mode` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` |
| Moonshot | `https://api.moonshot.cn` |

---

## 📄 许可

MIT License
