# 覆盖矩阵：Deep Agents 能力 ↔ 课次

> 用途：确认「该讲的都讲了」+ 记录**没进主线**的能力与原因。
> 课次编号见 `docs/curriculum.md`。**前置**：`lab-langgraph` 第 1–6、11 课。
> 主线只留 4 课、4 个核心概念；下面是取舍记录。

## 一、进主线

| Deep Agents 能力 | 课次 | 说明 |
|---|---|---|
| `create_deep_agent` 与「省了什么」 | 1 | 与手写 `llmCall` / `toolNode` / `route` 对照 |
| 内置工具清单（todo / 文件 / task） | 1 | 只在第 1 课点名，不单独成课 |
| Planning（`write_todos`） | 1 | 长任务不跑偏，并入第 1 课 |
| `recursion_limit` 与成本控制 | 1 | 步数上限，放在第 1 课的调用里 |
| 虚拟文件系统 | 2 | 大产物不进上下文 |
| 中间件与摘要/上下文管理 | 2 | 上下文压缩，并入第 2 课 |
| backend：State / Filesystem / Store / Composite | 3 | 文件实存哪、活多久 |
| `virtualMode` 与路径约束 | 3 | 配 `rootDir` 必须开 |
| 沙箱后端与 `execute` 工具 | 3 | 只讲协议与取舍，不接云厂商 |
| Subagents（`task`） | 4 | 上下文隔离 + 权限收窄 |
| 并行子 agent | 4 | 同一轮多个 `task`，并入第 4 课 |
| checkpointer / Store / interrupt 接入 | 5 | 复用底层 LangGraph 能力 |
| 选型判断（三条判断线） | 1、5 | 第 1 课延伸阅读 + 第 5 课收尾 |

## 二、没进主线（原主线项，已回收）

| 能力 | 为什么砍 | 现在在哪 |
|---|---|---|
| 「内置工具四件套」独立课 | 只是清单，不足以撑一课 | 第 1 课 concepts 与代码注释 |
| 「Planning」独立课 | `write_todos` 一个工具讲不了整课 | 第 1 课 concepts + 打印待办清单 |
| 「并行子 agent」独立课 | 与第 3 课同一机制，拆开是重复 | 第 3 课代码与 `Send` 注释 |
| 「中间件」独立课 | 摘要属于上下文工程的一部分 | 第 2 课 `middleware` 参数 |
| 「本地 Agent Server + Studio」 | 面试无比较优势，且要额外装 CLI | 不教；需要时按官方文档起服务 |
| 「选型与评测」独立课 | 结论性内容，单独成课偏空 | 第 1 课延伸阅读的「什么时候不该用」 |

## 三、明确不做

| 项 | 原因 |
|---|---|
| 换成 JS 版（npm `deepagents`）重写全课 | 覆盖度未核实（见 `README.md` 待办）；官方主线是 Python |
| Sandbox agents / 隔离工作区 | 需要真实容器环境，课程载体不匹配 |
| Realtime / Voice agents | 与「长任务架构」主题无关，属于另一条产品线 |
| 平台侧能力（Agent Builder / 托管部署） | 属于产品操作，不是开发技能 |
| Sandbox backend 集成（LangSmith / AgentCore / Daytona） | 需要容器与云凭据，只在第 3 课点名协议与 `execute`，不做集成 |
| 自定义中间件的深度用法（改状态、拦截工具） | 再深就变成 LangGraph 内部机制课 |
| LangSmith 批量评测 | 与底层图的评测课重叠，本课只做架构对比 |

## 四、与其它 lab 的分工

| 主题 | 本课 | 别的 lab |
|---|---|---|
| 状态 / reducer / 条件边 / interrupt 机制 | 只在「接入方式」处点名，不重讲 | `lab-langgraph`（主线） |
| 手写 agent 循环 | 作为**对照物**出现（第 1 课延伸阅读） | `lab-langgraph` 第 4 课（主线） |
| RAG / 检索 | 不涉及（调研场景里只用简单检索工具） | `lab-llamaindex`（主线） |
| 前端聊天页 | 不做 | 需要时另起 Next 前端接 Agent Server |
| 另一条 TS 全栈路线 | — | `lab-mastra` |

## 五、每课必须有「对照物」（维护硬约束）

本课极易退化成「产品说明书」，因此每课都要能回答两件事：

1. **不用它，手写要写什么**（引用 `lab-langgraph` 的对应课，或本课内给出简化版）
2. **它替做了什么决定**（默认值从哪来、能不能改、改了会怎样）

写课时若答不上这两条，说明这一课还没想清，先补设计再动笔。
