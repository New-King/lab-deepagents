# 覆盖矩阵：Deep Agents 能力 ↔ 课次

> 用途：确认「该讲的都讲了」+ 记录**没进主线**的能力与原因。
> 课次编号见 `docs/curriculum.md`。**前置**：`lab-langgraph` 第 1–6、11 课。

## 一、进主线

| Deep Agents 能力 | 课次 | 说明 |
|---|---|---|
| `create_deep_agent` 与「省了什么」 | 1 | 与手写 `llmCall` / `toolNode` / `route` 对照 |
| 内置工具四件套（todo / 文件 / task） | 2 | 先看懂默认给的东西 |
| Planning（`write_todos`） | 3 | 长任务不跑偏 |
| 虚拟文件系统与后端选择 | 4 | 大产物不进上下文 |
| Subagents（`task`） | 5 | 上下文隔离 + 权限收窄 |
| 并行子 agent | 6 | 与 `Send` 对照 |
| 中间件与摘要/上下文管理 | 7 | 可插拔横切面 |
| checkpointer / Store / interrupt 接入 | 8 | 复用底层 LangGraph 能力 |
| 本地 Agent Server + Studio | 9 | 起服务看调用树，本课不写前端 |
| 观测（LangSmith：planner / subagent 层级） | 9 | 调试 deep agent 的主要手段 |
| 选型与评测（手写图 vs deep agent） | 10 | 面试重点 |

## 二、进延伸阅读（不做主线）

| 能力 | 为什么不做主线 | 建议落点 |
|---|---|---|
| 自定义中间件的深度用法（改状态、拦截工具） | 主线只保留「摘要 + 一个日志中间件」，再深就变成 LangGraph 内部机制课 | 第 7 课延伸阅读 |
| 文件系统的真实后端（磁盘 / S3 / 沙箱） | 课程用内存状态即可讲清原理，接真实后端需要额外依赖与凭据 | 第 4 课延伸阅读 |
| 与 `langgraph-supervisor` / 手写 supervisor 的关系 | 概念重叠（都是多 agent 协作），放进主线会与第 5、6 课重复 | 第 10 课延伸阅读 |
| 评测工具链细节 | 与 `lab-langgraph` 第 12 课的 LangSmith 评测重叠，本课只做「两种架构对比」 | 第 10 课延伸阅读 |

## 三、明确不做

| 项 | 原因 |
|---|---|
| 换成 JS 版（npm `deepagents`）重写全课 | 覆盖度未核实（见 `README.md` 待办）；官方主线是 Python |
| Sandbox agents / 隔离工作区 | 需要真实容器环境，课程载体不匹配 |
| Realtime / Voice agents | 与「长任务架构」主题无关，属于另一条产品线 |
| 平台侧能力（Agent Builder / 托管部署） | 属于产品操作，不是开发技能；第 9 课只到本地 Agent Server |

## 四、与其它 lab 的分工

| 主题 | 本课 | 别的 lab |
|---|---|---|
| 状态 / reducer / 条件边 / interrupt 机制 | 只在「接入方式」处点名，不重讲 | `lab-langgraph`（主线） |
| 手写 agent 循环 | 作为**对照物**出现（第 1、10 课） | `lab-langgraph` 第 4 课（主线） |
| RAG / 检索 | 不涉及（调研场景里只用简单检索工具） | `lab-llamaindex`（主线） |
| 前端聊天页 | 不做（用 Studio 观察） | 需要时另起 Next 前端接 Agent Server |
| 另一条 TS 全栈路线 | — | `lab-mastra` |

## 五、每课必须有「对照物」（维护硬约束）

本课极易退化成「产品说明书」，因此每课都要能回答两件事：

1. **不用它，手写要写什么**（引用 `lab-langgraph` 的对应课，或本课内给出简化版）
2. **它替做了什么决定**（默认值从哪来、能不能改、改了会怎样）

写课时若答不上这两条，说明这一课还没想清，先补设计再动笔。
