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

**本课以 Python 为准**：`deepagents` 的官方文档与示例以 Python 为主线。npm 上也有 JS 版，但其功能覆盖与示例完整度**未核实**（见「待办」），因此不承诺 TS 支线。

本课程不建自写前端：第 9 课用本地 Agent Server 自带的 Studio 看调用树（协议与前端 Hook 同一套，需要网页时另起一个 Next 前端即可接上）。

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

学员维护一个 Python 项目 `my-deepagents-app`：agent 在 `src/`，语料在 `content/`，验证脚本在 `scripts/`；第 9 课加一个 Next 前端复用 `lab-langgraph` 第 11 课的页面。

```text
第 0 课  uv venv + pip install deepagents langchain-deepseek + .env.local（DEEPSEEK_API_KEY）
第 1 课  新建 src/minimal.py：create_deep_agent + 一个自带工具，跑通「一个长任务」
         （对照 lab-langgraph 第 4 课手写的 llmCall / toolNode / route 三件套）
第 2 课  新建 src/tools_demo.py：观察内置工具四件套（write_todos / 文件读写 / task）在消息里长什么样
第 3 课  覆盖 src/minimal.py：给一个必须拆解的任务（如「对比三篇文章并写摘要」），看 todo 清单的生成与更新
第 4 课  覆盖 src/minimal.py：把产物写进虚拟文件系统，验证大产物不再占用上下文
第 5 课  新建 src/subagents.py：定义两个子 agent（研究者 / 写作者），由主 agent 通过 task 调用
第 6 课  覆盖 src/subagents.py：同一轮派多个子 agent 并行（对照 lab-langgraph 第 10 课的 Send）
第 7 课  覆盖 src/subagents.py：挂摘要中间件 + 自定义中间件（模型调用前后 / 工具调用前后挂钩）
第 8 课  覆盖 src/subagents.py：接 checkpointer + Store（跨会话记忆）+ interrupt（写文件前人工确认）
第 9 课  新建 langgraph.json（注册图，env 指向 .env.local）+ uv add --dev langgraph-cli[inmem]；用 Studio 看 planner / subagent 层级
第 10 课 新建 src/eval_compare.py：同一任务跑「手写图」与「deep agent」，对比步数 / token / 结果质量，写清各自适用面
```

## 技术栈

- 站点：Next.js（App Router）+ Tailwind + shiki（与 `lab-ai-sdk` 一致）
- 课程主体：Python 3.12 + `deepagents`（基于 LangGraph）+ `langchain-deepseek` + `zod` 等价物（Pydantic）+ `uv`
- 模型：DeepSeek（`deepseek-chat`）—— 与 `lab-langgraph` / `newking` 一致
- 前端（第 9 课起）：`@langchain/react` 的 `useStream` + `langgraphjs` CLI 起本地 Agent Server（复用 `lab-langgraph` 第 11 课成果）
- 场景：**技术调研报告 agent** —— 给一个题目，多路子 agent 并行查证 → 汇总 → 落成一篇带出处的报告文件

## 开发

```bash
pnpm install
pnpm dev          # 站点
```

## 待办

- [ ] **API 名核实**：`create_deep_agent` 的参数表（tools / instructions / subagents / middleware）、内置工具的确切名字与状态字段（`todos` / `files`）—— 开写前对照官方文档逐个确认，**不要凭印象写进课里**
- [ ] **JS 版覆盖度核实**：npm `deepagents` 是否具备 subagents / 中间件 / 文件系统后端，决定是否提供 TS 支线
- [ ] **中间件来源核实**：摘要类中间件来自 `deepagents` 还是 `langchain` 主包（影响安装命令与 import 路径）
- [ ] **第 6 课待核实**：并行子 agent 是否由主 agent 在同一轮返回多个 `task` 调用触发，与 `lab-langgraph` 第 10 课 `Send` 的差异要写清
- [ ] **第 9 课待核实**：Python 图 + `langgraph.json` 在 `langgraphjs` CLI 下的启动方式（`langgraph dev` 是否需另装 Python CLI）
- [ ] 站点脚手架（照抄 `lab-ai-sdk` 的 components / layout-classes）
- [ ] 学员项目模板（每课「跟做」需要的最终代码）
- [ ] 每课右侧 `docLinks` 全部校验可访问
