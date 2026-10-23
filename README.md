# lab-deepagents（Deep Agents 项目制课程）

Deep Agents（LangChain 的 `deepagents`）的课程站点，站点结构、UI 与数据文件形状照抄 `lab-ai-sdk`。

主站不跑任何 Deep Agents 代码 —— 它是「对照学习站」：左侧课程 + 右侧官方文档，学员在自己的项目里跟做。

## 一句话定位

**Deep Agents = LangGraph 之上的一套「预置 agent 架构」**：不是新的编排引擎，而是把「长任务该怎么组织」沉淀成默认配置——

- **planner**：任务拆成 todo 清单，边做边更新
- **虚拟文件系统**：大产物写文件而不是塞进上下文
- **subagents**：子任务交给独立上下文的子 agent
- **上下文压缩**：长对话自动摘要

所以它是 `lab-langgraph` 的**上一层**，不是替代品：上一课教你「图怎么画」，本课教你「成熟的 agent 长什么样、为什么这么设计」。

## 与其他 lab 的关系

| 项目 | 讲什么 | 层 |
|---|---|---|
| `lab-langgraph` | 手写图：状态 / reducer / 工具循环 / 记忆 / 中断 | 机制 |
| **`lab-deepagents`（本项目）** | 预置架构：planner / 子 agent / 文件系统 / 压缩 | 架构范式 |
| `lab-llamaindex` | 检索链（RAG 工程化） | 检索层 |
| `lab-mastra` | TS 全栈的另一条路线 | 全栈框架 |

**前置**：`lab-langgraph` 第 1–6 课（状态 / 工具循环 / checkpointer / interrupt）+ 第 11 课（`useStream`）。没学过就上本课，会看不懂「为什么这些是默认」和「它省掉了哪几行」。

## 语言选型

**本课以 TypeScript 为准**（`deepagents@1.x`、`@langchain/deepseek`）：课程面向 TS 全栈项目，示例代码与真实工程一致。

代价与注意：

- 官方文档主线是 **Python**，API 名是蛇形（`create_deep_agent` / `system_prompt` / `virtual_mode`），TS 是驼峰（`createDeepAgent` / `systemPrompt` / `virtualMode`）。对不上时以 **TS 类型定义**为准，不要照抄 Python 示例。
- **待办工具默认不启用**：Python 版默认带 `write_todos`，TS 版要显式挂 `todoListMiddleware`（来自 `langchain` 包）。
- Python 与 TS 的行为差异已在本课示例中标注，遇到文档没写的边界情况先查类型定义。

本课程不建自写前端：5 课全部用命令行脚本验证，需要看调用树时另起本地 Agent Server 即可（协议与前端 Hook 同一套）。

## 站点结构

```text
lab-deepagents/
├── AGENTS.md                    # 维护规则（课程结构、知识点规则、覆盖式演进约定）
├── README.md                    # 本文件
├── docs/
│   ├── curriculum.md            # 课表：每课目标/示例/要点/验收/文档
│   └── coverage-matrix.md       # Deep Agents 官方能力 ↔ 课次映射（含未进主线项与原因）
├── app/
│   └── (shell)/lab/[projectSlug]/page.tsx
├── components/                  # 代码面板 / 文档侧栏 / 延伸阅读弹窗（照抄 lab-ai-sdk）
└── lib/
    ├── projects.ts              # 课次数据（同名同结构：INIT_STEPS / NAV_ITEMS）
    ├── home.ts                  # 首页介绍数据
    └── layout-classes.ts        # 布局 class
```

## 学员项目的演进方式（覆盖式）

学员维护一个 TypeScript 项目 `my-deepagents-app`：agent 在 `src/`。4 课只覆盖三个脚本，不依赖外部语料。

```text
第 0 课  pnpm init（type=module）+ pnpm add deepagents langchain @langchain/langgraph @langchain/deepseek + .env.local（DEEPSEEK_API_KEY）
第 1 课  新建 src/minimal.ts：createDeepAgent + todoListMiddleware，跑一个需要拆解的任务
         默认 backend 在内存，示例用 CompositeBackend 把 /workspace/ 路由到磁盘
         第二个小节覆盖成只读 agent.graph 的节点与边（不发请求）
第 2 课  新建 src/sandbox.ts：LocalShellBackend 指到运行目录，agent 执行命令统计文件行数
第 3 课  新建 src/subagents.ts：两个子 agent（研究者 / 写作者），同一轮派多个 task 出去
第 4 课  覆盖 src/subagents.ts：接 checkpointer + store + interruptOn（execute 前人工确认），用 Command 恢复
```

## 技术栈

- 站点：Next.js（App Router）+ Tailwind + shiki（与 `lab-ai-sdk` 一致）
- 课程主体：TypeScript + `deepagents`（基于 LangGraph）+ `langchain` + `@langchain/langgraph` + `@langchain/deepseek` + `tsx`
- 模型：DeepSeek（`deepseek-flash`）—— 支持 Tool Calls，1M 上下文
- 验证方式：每课一个可独立运行的 TS 脚本（`pnpm tsx src/xxx.ts`），不建前端
- 场景：**技术对比报告 agent** —— 给一个题目，多路子 agent 并行撰写 → 汇总 → 落成一份带依据的报告文件（材料由模型自己推断，不需要准备语料）

## 开发

```bash
pnpm install
pnpm dev          # 站点
```

## 待办

- [x] **TS 版 API 核实**：`deepagents@1.15.1` 类型定义已核对 —— `createDeepAgent` 参数、`StateBackend` / `FilesystemBackend` / `CompositeBackend` / `StoreBackend` 构造、`SubAgent` 字段、`interruptOn`、`files` 状态字段
- [x] **待办工具差异**：TS 版默认不带 `write_todos`，需显式挂 `todoListMiddleware`（来自 `langchain`）
- [x] **思考模式核实**：`deepseek-flash` 默认开思考模式且要求历史带回 `reasoning_content`；一旦摘要中间件改写历史，接口直接返回 400（`The reasoning_content in the thinking mode must be passed back`）。解法：`modelKwargs: { thinking: { type: "disabled" } }`（2026-10-23 实跑确认；课程主线不再演示摘要压缩，此条留作维护记录）
- [x] **`getGraphAsync` 写法**：直接 `agent.getGraphAsync()` 的类型是 `never`（编译不过）；正确的是 `agent.graph.getGraphAsync()`，返回 `nodes` 是对象、`edges` 是数组（2026-10-22 实跑确认）
- [x] **第 2 课沙箱已实跑**（2026-10-23）：`LocalShellBackend` + `virtualMode` + `timeout` + `maxOutputBytes`，agent 主动调用 `execute` 统计行数与字节数，产物留在沙箱目录；`isSandboxBackend` 对 LocalShell 为 `true`、对 `StoreBackend` 为 `false`
- [ ] **第 2 课待实跑**：Windows 下 `LocalShellBackend` 的命令与路径表现（课程用 `resolve()` 转绝对路径）；`BaseSandbox` 接容器只讲思路，未实跑
- [x] **后端直调**：`StoreBackend` 的 `write` / `read`、换实例读回，`LocalShellBackend` 的 `initialize` + `execute` 均已实跑通过（2026-10-22，零 token）
- [x] **interruptOn 实跑核实**（2026-10-23）：形状为 `[{ id, value: { actionRequests: [{ name, args, description }], reviewConfigs: [{ actionName, allowedDecisions: ["approve","edit","reject","respond"] }] } }]`；恢复写法 `new Command({ resume: { decisions: [{ type: "approve" }] } })`，需同时给 `checkpointer` 与相同 `thread_id`
- [ ] **第 3 课待核实**：并行子 agent 是否由主 agent 在同一轮返回多个 `task` 调用触发（对照 `langgraph` 的 `Send`）
- [ ] 站点脚手架（照抄 `lab-ai-sdk` 的 components / layout-classes）
- [ ] 学员项目模板（每课「跟做」需要的最终代码）
- [ ] 每课右侧 `docLinks` 全部校验可访问
