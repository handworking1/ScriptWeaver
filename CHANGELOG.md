# 叙世 · ScriptWeaver 更新说明

## v1.3.0 (2026-06-02)

### 🆕 新功能
- **🔍 对话内搜索**：聊天页头部新增搜索框，实时过滤消息内容，显示匹配条数
- **📜 剧本速览面板**：聊天中点击「📜 剧本」即可查看当前剧本的完整设定（世界观、主线、金手指等），无需退出聊天
- **↩ 撤销发送**：聊天页新增撤销按钮（↩），一键删除最后一条用户消息及 AI 回复，重新输入
- **🚀 首次使用引导**：无剧本或无 AI 配置时，聊天页显示三步引导卡片（创建剧本→配置 AI→开始创作），附直达按钮
- **💡 AI 讨论快捷提问**：讨论页空白区新增「帮我想一个世界观」「帮我设计一个主角」「帮我规划剧情结构」三个快捷按钮

### ✨ 改进
- **发送按钮视觉**：禁用时 `opacity-40` 替代暗灰色，不再误以为按钮损坏
- **AI 思考中指示器**：独立脉动条显示在输入框上方（`isStreaming && !streamingContent`），与消息区明确区分
- **错误提示优化**：顶部横幅 toast 风格（红色 + ✕ 关闭），5 秒自动消失
- **API 错误人性化**：401→"Key 无效" · 429→"请求过频" · 网络断开→"无法连接" · 超时→"请求超时"，5 个 API 调用点统一使用 `friendlyError()`
- **TokenBar 提示**：hover 显示上下文窗口用量说明和费用估算含义
- **角色头像增强**：无头像时首字加大（`text-base`），背景色根据角色名生成唯一 HSL 色相
- **发送按钮**：流式传输中发送按钮也显示为禁用态（`disabled={isStreaming}`）

### 🔧 修复
- `finishStreaming` DB 写入失败时不再清空 `streamingContent`——用户可复制回复内容
- `sendMessage` 使用 `set(state => ...)` 消除异步窗口期 `displayMessages` 陈旧闭包
- `useIpcListeners` 使用 `useRef` 持有回调引用，避免 ESLint exhaustive-deps 警告
- `chat:send` 新增输入校验：configId 格式、messages 长度 ≤200、每条消息 role/content 合法性
- `AIConfigPage` 四个 `load*` 函数声明顺序修复（移到 useEffect 之上）
- `CharacterCompendium` 函数声明顺序修复
- 移除 `CharactersPage`/`ScriptsPage`/`HistoryPage`/`ImportExportButtons` 未使用的 import 和 state

### 🏗 架构
- **ESLint 集成**：flat config（v10），`ts` + `react-hooks` 插件，0 error / 105 warning
- **CI 多平台**：GitHub Actions 矩阵扩展为 `ubuntu-latest` + `windows-latest` + `macos-latest`
- **组件测试**：`@testing-library/react` + `jest-environment-jsdom`，ChatInput 6 个渲染测试（Enter/Shift+Enter/禁用态/帮回/空输入）
- **execAll<T>/execOne<T> 泛型化**：6 个 CRUD 模块全部添加 `*Row` 返回类型，移除 5 处 `as any` 强转
- **preload 零 any**：12 个 `Ipc*Data/Ipc*Update` 接口覆盖所有 IPC 参数
- **safeStorage 不可用警告**：IPC 暴露 `isEncryptionAvailable`，保存 API Key 时密钥链不可用弹出确认框
- **URL 规范化**：`normalizeApiUrl()` 自动处理尾部 `/` 和已含 `/v1` 路径
- **tokenLimit 动态化**：`refreshTokenLimit()` 从 AI 配置的 `maxTokens` 读取，切换模型自动更新
- **token 成本模型感知**：10 个模型的价格映射表 + 部分名称匹配，`estimateCost` 新增 `model` 参数
- **AIDiscussPage 继续拆分**：新增 `DiscussActionBar.tsx`（底部操作栏），主文件降至 ~400 行
- **ScriptPreview 组件**：聊天页独立剧本速览侧边抽屉

---

## v1.2.0 (2026-06-02)

### 🆕 新功能
- **💬 @私聊**：世界模式中输入 `@角色名` 快速发起与特定 NPC 的私聊对话，支持多字姓名（上官婉儿等）
- **🌍 世界介绍生成中指示器**：进入世界模式后显示「🌍 正在生成世界介绍...」加载条
- **📖 角色图鉴**：侧面板手动编辑 + AI 自动分析，好感度滑块 + 7 级情感标签
- **🌐 多标签浏览**：AI 讨论页和聊天页支持同时打开多个标签页，×关闭，+新建，持久化
- **📊 Token 全局显示**：侧边栏实时显示 token 用量（全局累计 + 当前会话分离）
- **🔄 快捷模型切换**：侧边栏下拉快速切换 AI 配置
- **🌟 AI 写回复**：一键生成 3 个建议回复，换一批刷新
- **🎭 角色图鉴 AI 分析**：自动提取角色性格/好感度/关系
- **🌍 世界模式开场**：AI 自动生成世界观背景开场白

### ✨ 改进
- AI 讨论页重设计：按钮选择剧本 + 常驻管理面板 + 常驻角色创建
- AI 讨论持久化：切换页面不丢失，记住上次选择
- AI 讨论应用到剧本
- SUGGESTIONS 增强 / 智能滚动 / 导出优化
- 成本显示 ≈ 标注
- TokenBar 移至侧边栏
- 多标签完善：关闭活跃标签自动回退，关闭最后一个回到设置页

### 🔧 修复
- 继续对话不复创 / 世界模式总结 / 弹窗误关闭 / 温度滑块
- 数据库迁移重复列 / 导入确认框 / 角色名缓存 TTL
- 6 个竞态条件：openScript/closeScript stale-closure、快速关闭两标签复现、@私聊 stale 查询、多字姓名截断、Token 成本跳跃
- CloseConv 改用 useEffect 回退，避免 setState 内直接调用 switchConv
- 角色图鉴闭包陈旧 + setTimeout 清理：快速连续编辑不再覆盖数据
- 世界介绍卸载保护 + 启动空白期修复

### 🏗 架构
- 数据库模块化 · ChatPage 拆分 · 提示词/校验独立 · DbRow 类型
- preload 参数去 any · ErrorBoundary · Jest 24 测试 · CI
- PDF 安全转换 · 导入事务保护 · 导出排除 API Key
- **chat:send 事件化**：从 `ipcMain.handle`（阻塞主进程）改为 `ipcMain.on`（纯事件模式）
- **导入数据字段级校验**：逐行校验必填字段 + 类型 + role 枚举 + NaN 检测
- **种子模板外部化**：7 个提示词模板提取到 `seedTemplates.ts`
- **退出前强制刷盘**：`app.on('before-quit')` 调用 `saveDbSync()`
- **连续快速发送保护**：新请求自动中止旧 AbortController
- **注释双语化**：所有新功能带中英文双语注释

---

## v1.1.0 (2026-06-02)

### 🆕 新功能

- **✨ AI 写回复**：聊天输入栏新增按钮，AI 根据对话上下文生成 3 个建议回复，支持换一批刷新
- **🤖 角色图鉴 AI 分析**：点击按钮自动从对话中提取角色信息（性格、好感度、身材、状态、关系摘要）
- **🏷️ [帮回] 核心辅助系统 v3.1**：剧本设置中开启后支持 12 种特殊指令
  - 角色外：帮回剧情总结、帮回章节规划、帮回爽点分析、帮回人设检查
  - 角色内：帮回出手/谋划/承受/示弱/操控/侵占/大幕/细描
- **🌍 世界模式开场介绍**：进入世界模式时 AI 自动生成世界观+背景的开场白
- **📖 角色图鉴**：聊天界面右侧面板，手动+AI自动记录角色信息
- **📥 AI 讨论应用到剧本**：选中已有剧本讨论时，一键将讨论结果覆盖现有设定
- **💬 设置页继续对话**：选择剧本后显示最近 5 个对话，点击直接继续

### ✨ 改进

- **AI 剧本讨论持久化**：切换页面/剧本后讨论内容不丢失
- **AI 剧本讨论管理面板**：内联编辑全部 22 个剧本字段，与剧本管理页完全同步
- **SUGGESTIONS 识别增强**：支持 `|` 、 `、` 分隔符、数字前缀、跨行格式
- **智能滚动**：上滚查看历史时不被 AI 流式输出强制拉回底部
- **成本显示优化**：标注 `≈` 前缀，明确为估算值
- **导出排除 API Key**：防止跨机器导入失败

### 🔧 修复

- 修复：继续对话创建新对话的 bug（改为直接恢复已有对话）
- 修复：世界模式剧情总结按钮不工作
- 修复：编辑按钮 onClick 空实现
- 修复：ChatSetup 剧本选择按钮不工作
- 修复：数据库导入无事务保护（加 BEGIN/COMMIT/ROLLBACK）
- 修复：导出含加密 API Key 导致跨机不可用

### 🏗 架构改进

- 数据库层模块化拆分：`electron/db/` 11 个模块替代单文件
- ChatPage 拆分为 7 个子组件+2 个 hook
- 提示词抽取到独立文件 `electron/prompts.ts`
- 输入校验层 `electron/validate.ts`
- DbRow 类型定义 `electron/db/types.ts`，消除 rowTo* 函数 any
- 版本化数据库迁移（PRAGMA user_version）
- ErrorBoundary 防止白屏
- saveDb 500ms debounce 优化性能
- Jest 测试框架 + 13 个单元测试
- GitHub Actions CI（tsc + test + build）
- 4 处静默 catch {} 加 console.error

### 📦 技术栈

Electron 33 · React 18 · TypeScript 5.7 · Vite 6 · Tailwind CSS 3 · Zustand 5 · SQLite (sql.js) · Jest · GitHub Actions

---

## v1.0.0 (2026-06-02)

- 初始发布
- 剧本管理 / 角色管理 / AI 配置 / 流式聊天 / 历史记录
- 亮暗主题 / 多 API 配置 / 提示词模板 / 全局规则
