# 课表：Deep Agents（预置 agent 架构）

> 主线 5 课，只讲「它大概是什么、核心靠什么扛长任务」。
> 核心问题只有一个：**一个能扛长任务的 agent，到底多出了什么？**
> 学员维护一个 TypeScript 项目 `my-deepagents-app`，每课覆盖式演进（见 `README.md`）。
> 场景：技术调研报告 agent（给题目 → 多路查证 → 汇总成带出处的报告）。
> **前置**：`lab-langgraph` 第 1–6 课 + 第 11 课。

## 总览

| 课 | 主题 | 本课出现的能力 | 变更文件 |
|---|---|---|---|
| 0 | 初始化：uv 建项目、装依赖、配 Key | — | `INIT_STEPS` |
| 1 | 它是什么：一行拿到配好的 agent | `createDeepAgent` `invoke` `todoListMiddleware` `write_todos` | `src/minimal.ts` |
| 2 | 上下文工程：文件代替上下文 | `write_file` `read_file` `files` `middleware` | `src/minimal.ts` |
| 3 | 后端：文件到底存在哪 | `backend` `StateBackend` `FilesystemBackend` `CompositeBackend` `virtualMode` `StoreBackend` `LocalShellBackend` `SandboxBackendProtocol` | `src/backends.ts` |
| 4 | 子 agent：隔离上下文，也能同时开几路 | `subagents` `SubAgent` `task` | `src/subagents.ts` |
| 5 | 记忆与审批：把底层能力接进来 | `checkpointer` `store` `interruptOn` | `src/subagents.ts` |

---

### 第 1 课 · 它是什么：一行拿到配好的 agent

- **目标**：先看清「省掉了什么」，才知道它到底加了什么
- **示例**：`createDeepAgent(...)` 跑一个需要拆解的任务，打印每一步的工具调用与最终待办
- **要点**：它没有替代 LangGraph，而是给你一份**已配置好的图 + 系统提示 + 一组内置工具**（待办 / 文件 / 派活）；判断标准是「任务是否需要多步、需要中途记进度、产物很大」
- **验收**：一次运行里能看到 `write_todos` 与写文件被自动调用，最终待办清单与任务对得上
- **文档**：Deep Agents 官方 Overview / Quickstart
- **延伸阅读**：知识点右上角弹窗 —— 「Deep Agents 是什么：与 LangGraph、编排平台的分工」（三层关系、与拖拽式平台的区别、三种退化与对位解法、为什么解法有效、为什么值得单独做个库、代价与不该用的场景、同类对照）

### 第 2 课 · 上下文工程：用文件代替上下文

- **目标**：理解长任务的上下文管理核心手法 —— 这是它最核心的一招
- **示例**：让 agent 把中间产物写进虚拟文件，再读回片段；对比「全塞上下文」的输入规模
- **要点**：文件 = 外部记忆，只把**需要的片段**读回 prompt；`files` 是状态字段；写文件是**副作用**，要配合第 5 课的中断与幂等；摘要类中间件负责压历史，会**丢信息**，要决定哪些必须保留
- **验收**：同一任务下，写文件版第二轮输入不随材料变长而线性膨胀（给出数字）
- **文档**：官方 File system / Backends 章节 + LangChain 中间件

### 第 3 课 · 后端：文件到底存在哪

- **目标**：搞清「写进文件」这句话背后，文件实存在哪里、能活多久
- **示例**：默认 `StateBackend` 跑一次（状态里有、磁盘上没有），再换 `CompositeBackend`：`/workspace/` 路由到 `FilesystemBackend` 落盘，内部产物留状态
- **要点**：默认后端跟 thread 走，重启即失；`FilesystemBackend` 才落真实磁盘，`virtualMode` 默认 **false 等于没有保护**，配 `rootDir` 必须开；agent 会把 `/large_tool_results/`、`/conversation_history/` 也写进 backend，所以单独套 `FilesystemBackend` 会把内部产物混进项目目录，要用 `CompositeBackend` 分层；跨 thread 的长期记忆用 `StoreBackend`（构造时传 stateAndStore 与 namespace）；要执行命令用 `LocalShellBackend`（无隔离，仅开发），生产换成实现 `SandboxBackendProtocol` 的沙箱后端，工具集会多一个 `execute`
- **验收**：`workspace/notes.md` 出现在本地磁盘，状态里只剩内部产物
- **文档**：官方 Backends 章节

### 第 4 课 · 子 agent：隔离上下文，也能同时开几路

- **目标**：什么时候该把活分给子 agent，而不是给主 agent 加工具
- **示例**：定义「研究者」与「写作者」两个子 agent（各自的 prompt / 工具），由主 agent 通过 `task` 调用；三份材料在同一轮派出去
- **要点**：子 agent 的价值是**上下文隔离**（各干各的、互不污染）与**权限收窄**（只给它该有的工具）；并行是模型自己在同一轮返回多个 `task` 调用触发的；不是越多越好 —— 能用一个 agent 一个工具解决的，别拆
- **验收**：日志能看出多个子 agent 在同一轮执行，且汇总结果包含全部来源
- **文档**：官方 Subagents 章节 + LangGraph 并行

### 第 5 课 · 记忆与审批：把底层能力接进来

- **目标**：把 `lab-langgraph` 学过的三样接进 deep agent，并收尾选型
- **示例**：`checkpointer`（同 thread 续跑）+ `store`（跨会话记忆）+ `interruptOn`（写文件前人工确认）
- **要点**：这三样都不是 deep agent 发明的，是底层 LangGraph 的能力；接入点是 `createDeepAgent` 的参数；**重跑幂等**依旧成立（挂起恢复后节点从头执行）；收尾给出三条判断线 —— 任务是否长、产物是否大、子任务是否可并行且需要隔离，三条都不占就别上
- **验收**：挂起 → 人工批准 → 继续；再开一条 thread 仍记得长期记忆
- **文档**：官方 Persistence / Human-in-the-loop 章节 + `lab-langgraph` 第 5、6、8 课

---

## 与面试的对应

| 面试常问 | 落点 |
|---|---|
| 长任务怎么保证不跑偏 | 第 1 课（`write_todos` + `todoListMiddleware`） |
| 上下文超长怎么办 | 第 2 课（文件系统 + 中间件摘要） |
| 产物存哪、怎么跨会话 | 第 3 课（`backend` / `CompositeBackend` / `StoreBackend`） |
| 多 agent 怎么协作、怎么隔离上下文 | 第 4 课（`subagents` / `task` / 并行） |
| 记忆与人工审批怎么做 | 第 5 课（`checkpointer` / `store` / `interruptOn`） |
| 什么时候用预置 agent、什么时候自己画图 | 第 1 课延伸阅读 + 第 5 课收尾 |
