# AGENTS.md — lab-deepagents 维护规则

Deep Agents 课程（lab-deepagents）的约定。改这个仓库前先读本文件；与 `docs/curriculum.md` 冲突时以本文件为准。

## 一、回复风格

- **一句话先给结论**，用户追问再展开；不要先铺垫「分几种情况」再给结论。
- 只答被问的那一点：不引申相邻概念，不主动加对比表、包名对照、源码条款、备选方案。
- 只有用户明确要细节（「展开」「为什么」「依据在哪」）时，才给来源与出处。
- 改动说完就停，不要顺手补一句「要不要我顺便…」。

## 二、信息架构

- **左侧菜单 = 主线课**，顺序见 `docs/curriculum.md`（5 课）。
- 每课页 = 跟做步骤 + 知识点 + 文件 + 代码 + 右侧官方文档（`docLinks`），可选「延伸阅读」弹窗。
- 每课有两个标题字段：`title`（页内 h1，完整、可带「：说明」）与 `menuTitle`（左侧菜单，短名）。**两个都必填**。
- **验收写法**：2～3 行**陈述句** —— ① 怎么跑；② 跑完能看到什么。不写问句、不写检查清单。
- 站点结构、组件、布局 class：照抄 `lab-ai-sdk`；数据文件沿用同名 `lib/projects.ts` 与 `lib/home.ts`。

## 三、动笔前必做：先查文档，不清楚就问

1. **先查官方文档**：Deep Agents 官方文档 + `https://docs.langchain.com/**`（底层 LangGraph 行为以 LangGraph 文档为准）。API 名、参数、导入路径逐项对着文档写，**不凭印象**。
2. **本包很新、迭代快**：`createDeepAgent` 的参数、内置工具名、中间件来源（属于 `deepagents` 还是 `langchain` 主包）**每次动笔前重新核实，以 npm 包里的类型定义为准**，不许照抄旧文章或 Python 示例。
3. **Python 与 TS 版不等价**：本课程固定 TypeScript（见 `README.md`）。官方文档主线是 Python，**禁止**把 Python 写法直接当 TS 用法写进课里；蛇形/驼峰参数名、默认是否带待办工具都要逐项核对。
4. **文档没写的、或与实际不符的**：先问用户，不要自己跑命令试探、也不要写进课里当事实。
5. **没实测过的不要写成事实**：确认过的才写进步骤说明，未验证的在课里标「待验证」，并同步进 `README.md` 待办。
6. **改 `lib/projects.ts` 前先 `git diff` 或重读文件**：整段替换会**静默覆盖**别人的改动。

## 四、知识点规则

只写 **`deepagents` / `langchain` / LangGraph 真实存在的 API / 概念**，每条 = **名称 + 一句中文说明它干什么**，并且**只列本课示例代码里真实出现过的方法与参数**。

不要写：

- 自写函数（本课程自己的辅助函数）
- 「我们把参数传到哪」这类代码层面知识
- 同一个能力在后续课重复列（哪课首次出现就在哪课写）；**底层 LangGraph 能力（checkpointer / interrupt / store）在 `lab-langgraph` 已讲过，本课只在接入方式上列**

只有讲**重要概念**（如为什么用文件代替上下文、为什么拆子 agent）时，才允许写示例代码里没出现的东西 —— 这类内容放 `conceptArticle` 或示例代码的中文注释里。

## 五、覆盖式演进（学员项目）

学员维护**一个** TypeScript 项目 `my-deepagents-app`：agent 在 `src/`。逐课叠加：

| 课 | 新增 | 覆盖 |
|---|---|---|
| 1 | `src/minimal.ts` | — |
| 2 | — | `src/minimal.ts` |
| 3 | `src/backends.ts` | — |
| 4 | `src/subagents.ts` | — |
| 5 | — | `src/subagents.ts` |

禁止每课新建项目、新建平行目录。

**只讲 5 个核心**（文件系统 / 上下文压缩 / 后端 / 子 agent 隔离 / 记忆与审批），其余能力不进主线：Planning 与内置工具清单并入第 1 课，中间件并入第 2 课，并行子 agent 并入第 4 课。

**每课的文件只包含本课要展示的内容**：后面课覆盖同一文件时，删掉本课用不到的子 agent、工具、中间件，不要为了「兼容前面课的脚本」而留着。

## 六、代码与依赖约定

- **场景**：**技术对比报告 agent** —— 给一个题目，多路子 agent 并行撰写 → 汇总 → 落成带依据的报告文件。**不依赖外部语料**：默认 backend 是内存虚拟文件系统，读不到本地磁盘，课程任务不要假设有 `content/` 素材。
- **语言固定 TypeScript**，Node 20+，用 `pnpm` 管依赖、`tsx` 跑脚本；不混 Python 写法。
- 模型统一 **DeepSeek**（`deepseek-flash`，支持 Tool Calls）。不要用已淘汰的 `deepseek-chat` 别名。
- **新增依赖要写成一步**：需要装包的课在课数据里写 `install: { command, description }`。
- 依赖只加课程真需要的包：`deepagents`、`langchain`、`@langchain/langgraph`、`@langchain/deepseek`，外加开发依赖 `typescript` / `tsx` / `@types/node`。**不要**引入其它 provider 或云服务。
- 跑脚本统一用 `pnpm tsx src/xxx.ts`：**不带任何参数**。
- 不建自写前端、不起本地 Agent Server：5 课全用命令行脚本验证。

## 七、写课约定

- **【强制】课页文案无人称**：`lib/home.ts` 与 `lib/projects.ts` 里**会渲染到页面上的文字**（含示例代码字符串、`verify` 的期望输出）一律不出现 `我`、`你`、`他`，以及「学员」「学习者」这类称谓。
  - **维护文档不受此限制**：本文件、`README.md`、`docs/**` 可以使用。
- **课页里不出现别的课程 / 仓库的名字**（`lab-langgraph`、`lab-llamaindex`、`newking` 等）：需要对照就在维护文档里写。
- **知识点是 `{ text, note? }`**：`note` 可选、**尽量短（≤ 48 字，体检脚本会提醒）**。
- 示例代码写**中文注释**；每课示例必须能独立跑通。
- **严禁把「它省了什么」写成空话**：每讲一个内置能力，课里都要有**对照物**（手写版长什么样 / 不用它会长什么样），否则这课就变成产品说明书。

## 八、开发约定

- **只改 lab-deepagents**；其它既有仓库（`lab-ai-sdk`、`lab-langgraph`、`lab-mastra`、`lab-llamaindex`、`newking`）禁止改动。
- 站点本身**不装课程依赖**：`package.json` 只有 `next` / `react` / `shiki` 与工具链。
- **站点脚手架建好后，照 `lab-langgraph/scripts/audit-course.mjs` 复制一份体检脚本**；之后**改完必须跑**。
- 改前先说明；改完列出文件清单。
- 不主动 commit / push。
