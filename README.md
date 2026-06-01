# 叙世 · ScriptWeaver

> AI 驱动的叙事空间 — 每个故事，都值得被讲述。

**叙世** 是一个基于 Electron + React + TypeScript 的桌面端 AI 叙事创作平台。写剧本、塑角色、构世界观，AI 全程协创。支持沉浸对话与 GM 跑团双模式，数据本地存储，可接 Ollama 完全离线运行。

---

## ✨ 功能概览

### 📜 剧本管理
- 创建/编辑/删除剧本：标题、世界观、故事背景、对标作品、时代背景、主角困境、金手指
- **40+ 类型标签**：言情/玄幻/重生/系统文/打脸爽文等，四大类一键勾选
- **事件时间线** & **章节/幕管理**：规划剧情结构
- **创作模式**：沉浸式角色扮演 / 上帝视角共同创作 / 混合模式
- **系统执行模式**：严格度、工作流、前情提要、定期总结、规则自检
- **AI 补全**：输入标题，AI 自动生成世界观、背景、主线支线等全部字段

### 🎭 角色管理
- 为每个剧本创建/编辑角色：姓名、性格、背景、口癖、外貌、头像
- **AI 补全人设**：输入角色名，AI 自动生成完整人设
- **AI 讨论**：右侧滑动面板和 AI 深入讨论角色设计

### 🤖 AI 剧本讨论
- 独立页面，与剧本管理平级，全屏专注讨论
- 按**十二步工作流**引导：对标学习→一句话概括→一段式概括→人物介绍→大纲→……→书名创作
- **提取角色**：AI 自动从讨论中识别角色，一键添加到角色管理
- **生成剧本**：讨论完成，一键生成完整剧本保存

### 💬 聊天
- **角色对话模式**：1v1 沉浸，AI 完全融入角色
- **世界参与模式**：AI 化身 GM，叙述世界、控制全部 NPC
- **流式输出**：SSE 实时打字机效果
- **选项卡片**：AI 回复的 [SUGGESTIONS] 自动转为可点击选项
- **快捷输入栏**：自定义短语，一键发送，可折叠
- **多对话切换**：同时开多个对话，随时切换
- **角色图鉴**：好感度滑块、性格、身材、状态记录

### ⚙️ AI 配置
- 多组 API 配置，支持故障转移
- **内置预设**：DeepSeek V4 Pro/Flash/V3/R1、GPT-4o、Claude、Qwen、GLM-4、Moonshot、Ollama
- API Key 加密存储（操作系统级安全存储）
- **测试连接**按钮
- **提示词模板**：7 个内置（默认/古风/现代/RPG/亲密/叙事创作系统/三位一体）
- **全局规则** & **主角设定**：所有对话自动注入
- **GM 设置**：叙事风格、细节程度、节奏、骰子判定
- **回复长度** & **互动选项**：每次对话可独立配置

### 📋 历史记录
- 按剧本筛选，分支标记
- 查看/删除/导出
- **导出格式**：Markdown / JSON / 小说格式 / PDF 打印
- **继续对话**：从历史记录恢复任何对话

### 其他
- ☀️/🌙 亮暗主题切换（持久化 localStorage）
- 数据导入/导出（不含 API Key）
- 跨平台：Windows / macOS / Linux

---

## 🚀 快速开始

### 下载使用

在 [Releases](../../releases) 下载最新 `叙世-x64.exe`，双击运行。

### 开发

```bash
git clone https://github.com/yourname/scriptweaver.git
cd scriptweaver
npm install
npm run dev        # 开发模式
npm run build:win  # 打包 Windows EXE
```

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 桌面 | Electron 33 |
| 前端 | React 18 + TypeScript + Vite 6 |
| UI | Tailwind CSS 3 |
| 状态 | Zustand 5 |
| 数据库 | SQLite (sql.js WASM) |
| 加密 | Electron safeStorage |
| Markdown | react-markdown + rehype-highlight |
| 流式 | fetch ReadableStream SSE |

---

## 🔑 支持的 API

| 提供商 | 地址 |
|--------|------|
| DeepSeek | `https://api.deepseek.com` |
| OpenAI | `https://api.openai.com` |
| Ollama | `http://localhost:11434` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` |
| Moonshot | `https://api.moonshot.cn` |

---

## 📄 许可

MIT License
