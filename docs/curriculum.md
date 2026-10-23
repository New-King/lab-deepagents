# 课表：Deep Agents（预置 agent 架构）

> 主线 4 课，只讲「它大概是什么、核心靠什么扛长任务」。
> 核心问题只有一个：**一个能扛长任务的 agent，到底多出了什么？**
> 学员维护一个 TypeScript 项目 `my-deepagents-app`，每课覆盖式演进（见 `README.md`）。
> 场景：技术对比报告 agent（给题目 → 多路撰写 → 汇总成带依据的报告）。不依赖外部语料。
> **前置**：`lab-langgraph` 第 1–6 课 + 第 11 课。

## 总览

| 课 | 主题 | 本课出现的能力 | 变更文件 |
|---|---|---|---|
| 0 | 初始化：uv 建项目、装依赖、配 Key | — | `INIT_STEPS` |
| 1 | 它是什么：createDeepAgent 默认装配了什么 | `createDeepAgent` `write_file` `read_file` `backend` `FilesystemBackend` `CompositeBackend` `invoke` `todoListMiddleware` `getGraphAsync` | `src/minimal.ts` |
| 2 | 沙箱：让 agent 真的能跑命令 | `LocalShellBackend` `rootDir` `execute` `virtualMode` `timeout` `maxOutputBytes` `isSandboxBackend` | `src/sandbox.ts` |
| 3 | 子 agent：隔离上下文与并行派发 | `subagents` `SubAgent` `task` `tool` | `src/subagents.ts` |
| 4 | 记忆与审批：接入底层能力 | `checkpointer` `store` `interruptOn` `Command` | `src/subagents.ts` |

---

### 第 1 课 · 它是什么：createDeepAgent 默认装配了什么

- **目标**：先看清「省掉了什么」，才知道它到底加了什么
- **示例**：`createDeepAgent(...)` 跑一个需要拆解的任务，打印每一步的工具调用与最终待办；默认 backend 在内存里，示例把 `/workspace/` 路由到磁盘，产物跑完能直接打开；第二个小节覆盖成只读 `agent.graph` 的节点与边
- **要点**：它没有替代 LangGraph，而是给你一份**已配置好的图 + 系统提示 + 一组内置工具**（待办 / 文件 / 派活）；产物用 `write_file` 写进虚拟文件、需要时 `read_file` 读回，文件存哪由 `backend` 决定 —— 默认 `StateBackend` 跟 thread 走、进程退出即失，`rootDir` 要给绝对路径、`virtualMode` 必须开；判断标准是「任务是否需要多步、需要中途记进度、产物很大」；文件要跨会话，就把 store 接进来换成 `StoreBackend`，这属于 LangGraph 的能力（第 3 课）
- **验收**：一次运行里能看到写文件被自动调用、`workspace/report.md` 出现在磁盘；第二个小节打印出中间件插进来的节点
- **文档**：Deep Agents 官方 Overview / Quickstart / Backends
- **延伸阅读**：知识点右上角弹窗 —— 「Deep Agents 是什么：与 LangGraph、编排平台的分工」（三层关系、与拖拽式平台的区别、四种后端对照、三种退化与对位解法、为什么解法有效、为什么值得单独做个库、代价与不该用的场景、同类对照）

### 第 2 课 · 沙箱：让 agent 真的能跑命令

- **目标**：看清「agent 能不能跑命令」由后端决定，以及本机后端的安全边界在哪
- **示例**：`LocalShellBackend` 指到一个运行目录，agent 写 `/report.md`、执行命令统计行数与字节数、结果追加回文件；末尾对比两个后端有没有 `execute`
- **要点**：`SandboxBackendProtocol` 在文件方法之外只多一个 `execute(command)`，实现它 `isSandboxBackend()` 才为 `true`，`execute` 工具才会被装进工具清单；`virtualMode` 只约束文件工具、不约束命令，`env` 只传必要变量，`timeout` 与 `maxOutputBytes` 限住时长与输出；命令跑在宿主机上，所以本机后端只是开发用；真要隔离就继承 `BaseSandbox` 接容器
- **验收**：终端打印「用过 execute：true」，`report.md` 末尾出现命令算出的行数与字节数；末尾两行一个是 true 一个是 false
- **文档**：官方 Backends 章节（含 sandbox 部分）
- **延伸阅读**：知识点右上角弹窗 ——「沙箱：从本机目录到真容器」（安全边界三件事、真隔离怎么接、产物怎么搬出沙箱、面试四个落点）

### 第 3 课 · 子 agent：隔离上下文与并行派发

- **目标**：什么时候该把活分给子 agent，而不是给主 agent 加工具
- **示例**：一个 mock 天气工具只挂在两个子 agent 上（各查一个城市），主 agent 没有这个工具；`task` 在同一轮把两路派出去，回来合成一句出行建议
- **要点**：子 agent 的价值是**上下文隔离**（各干各的、互不污染）与**工具收窄**（只给它该有的工具）；示例靠**工具差**制造派发动机 —— 主 agent 自己查不了天气，派活才是拿到信息的唯一路径，比用提示词要求「必须派发」可靠；分工按**资料或职责**切，不按流水线切（一个子 agent 依赖另一个的产出时，并行就不成立）；并行是模型自己在同一轮返回多个 `task` 调用触发的；不是越多越好 —— 能用一个 agent 一个工具解决的，别拆；示例不设步数上限（默认 `recursionLimit` 是一万，等于没有），真实项目调用时应自己给小值兜底
- **验收**：日志能看出多个子 agent 在同一轮执行，且汇总结果包含全部来源
- **文档**：官方 Subagents 章节 + LangGraph 并行

### 第 4 课 · 记忆与审批：接入底层能力

- **目标**：把 `lab-langgraph` 学过的三样接进 deep agent，并收尾选型
- **示例**：`checkpointer`（同 thread 续跑）+ `store`（跨 thread 记忆）+ `interruptOn` 挂在 `execute` 上：执行命令前挂起，`Command({ resume })` 批准后继续
- **要点**：三样都是底层 LangGraph 的能力，接入点是 `createDeepAgent` 的参数；挂起粒度是**工具调用**，不落在代码行；中断信息在 `result.__interrupt__` 里（工具名、参数、允许的决定）；**重跑幂等**依旧成立，恢复后节点整段重跑；审批最该挂在 `execute` 上 —— 它能读系统文件、删文件、外联
- **验收**：终端打印被拦下的 `pwd` 命令与允许的决定；批准后命令执行，返回当前工作目录
- **文档**：官方 Persistence / Human-in-the-loop 章节 + `lab-langgraph` 第 5、6、8 课

---

## 与面试的对应

| 面试常问 | 落点 |
|---|---|
| 长任务怎么保证不跑偏 | 第 1 课（`write_todos` + `todoListMiddleware`） |
| 上下文超长怎么办 | 第 1 课（`write_file` 把产物外置，不塞进对话） |
| 产物存哪、怎么跨会话 | 第 1 课（`backend` 决定存哪）+ 第 4 课（`store` 让它跨会话） |
| agent 怎么执行代码、隔离到哪一层 | 第 2 课（`LocalShellBackend` / `isSandboxBackend` / `BaseSandbox`） |
| 多 agent 怎么协作、怎么隔离上下文 | 第 3 课（`subagents` / `task` / 并行） |
| 记忆与人工审批怎么做 | 第 4 课（`checkpointer` / `store` / `interruptOn`） |
| 什么时候用预置 agent、什么时候自己画图 | 第 1 课延伸阅读 + 第 4 课收尾 |
