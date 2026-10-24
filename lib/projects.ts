import type { DocLink } from "@/lib/doc-link";

export type CommandStep = {
  description: string;
  command: string;
  /** 交互式脚手架时的推荐选项 */
  choices?: string[];
};

export type FileAction = "create" | "replace" | "edit" | "run";

export type ProjectFile = {
  path: string;
  code?: string;
  hint?: string;
  steps?: CommandStep[];
  /** 项目课：跟做顺序 */
  order?: number;
  /** 项目课：新建（create）/ 整体覆盖（replace）/ 局部修改（edit）/ 只跑命令（run） */
  action?: FileAction;
  /** 操作列表里的显示名，默认用文件名；同一个文件分两步改时用它区分 */
  title?: string;
};

/**
 * 局部修改（edit）的代码按编号注释拆块：`// ① …`（顶格）当小标题，后面的代码各自成块、各自可复制。
 * 只认 ①~⑩ 编号，所以代码里普通的说明注释不会被误切；只有一块时返回空数组，调用方整块渲染。
 */
export function splitFileCode(code: string): { label: string; code: string }[] {
  const lines = code.split("\n");
  const blocks: { label: string; lines: string[] }[] = [];

  lines.forEach((line) => {
    const isHeading = /^\/\/\s*[①②③④⑤⑥⑦⑧⑨⑩]/.test(line);
    if (isHeading) {
      blocks.push({ label: line.replace(/^\/\/\s*/, "").trim(), lines: [] });
      return;
    }
    if (blocks.length === 0) blocks.push({ label: "", lines: [] });
    blocks[blocks.length - 1].lines.push(line);
  });

  const parts = blocks
    .map((block) => ({ label: block.label, code: block.lines.join("\n").trim() }))
    .filter((block) => block.code.length > 0);

  return parts.length > 1 ? parts : [];
}

export type FollowStep = {
  description: string;
  command: string;
};

/** 课末的验收步骤：去哪儿看、看到什么算通过（每项一行） */
export type ProjectVerify = {
  label: string;
  description: string[];
};

export type LabOperation =
  | {
      kind: "deps";
      id: "deps";
      order: number;
      label: string;
      description: string;
      command: string;
    }
  | {
      kind: "scaffold";
      id: "scaffold";
      order: number;
      label: string;
      description: string;
      command: string;
    }
  | {
      kind: "check";
      id: "verify";
      order: number;
      label: string;
      description: string[];
    }
  | {
      kind: "file";
      id: string;
      order: number;
      label: string;
      file: ProjectFile;
    };

/** 生成 mkdir + touch 脚手架命令（仅包含 action: create 的文件） */
export function buildScaffoldCommand(files: ProjectFile[]): string | null {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const createFiles = sorted.filter((file) => file.action === "create");
  if (createFiles.length === 0) return null;

  const dirs = new Set<string>();
  const paths: string[] = [];

  for (const file of createFiles) {
    paths.push(file.path);
    const slash = file.path.lastIndexOf("/");
    if (slash > 0) dirs.add(file.path.slice(0, slash));
  }

  const parts: string[] = [];
  if (dirs.size > 0) {
    parts.push(`mkdir -p ${[...dirs].sort().join(" ")}`);
  }
  parts.push(`touch ${paths.join(" ")}`);
  return parts.join(" && ");
}

/** 操作列表：装依赖 → 创建文件 → 逐文件粘贴代码 → 验收 */
export function getLabOperations(
  files: ProjectFile[],
  verify?: ProjectVerify,
  install?: LabProject["install"],
): LabOperation[] {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const operations: LabOperation[] = [];
  let order = 1;

  // 需要新装依赖的课：第一步就是装包，别让它藏在文件说明里
  if (install) {
    operations.push({
      kind: "deps",
      id: "deps",
      order: order++,
      label: "装依赖",
      description:
        install.description ??
        `在 ${PROJECT_DIR} 目录执行，安装本课新增的依赖。`,
      command: install.command,
    });
  }

  const command = buildScaffoldCommand(sorted);
  if (command) {
    operations.push({
      kind: "scaffold",
      id: "scaffold",
      order: order++,
      label: "创建文件",
      description: `在 ${PROJECT_DIR} 目录执行，创建本课需要新建的文件夹和空文件。`,
      command,
    });
  }

  for (const file of sorted) {
    operations.push({
      kind: "file",
      // 同一个文件可能分两步改，id 要带上 order
      id: `${file.path}@${file.order}`,
      order: order++,
      label: file.title ?? getFileName(file.path),
      file,
    });
  }

  if (verify) {
    operations.push({
      kind: "check",
      id: "verify",
      order: order++,
      label: verify.label,
      description: verify.description,
    });
  }

  return operations;
}

export type GuideProject = {
  kind: "guide";
  slug: string;
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题 */
  menuTitle: string;
  files: ProjectFile[];
  docLinks: DocLink[];
};

/** 知识点右上角「延伸阅读」弹窗里的文章 */
export type ConceptArticle = {
  title: string;
  /** 每项一段：`## ` 开头是小标题，`- ` 开头是要点，``` 之间是代码 */
  body: string[];
};

/**
 * 知识点：一句话说清这个方法干什么。
 * `note` 是可选的补充，界面上在条目右侧显示一个灯泡图标，悬停（手机上点一下）浮出气泡；
 * 只在确实需要时写（与官方文档写法的差异、常见坑等），尽量短。
 */
export type Concept = {
  text: string;
  note?: string;
};

export type LabProject = {
  kind: "project";
  slug: string;
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题 */
  menuTitle: string;
  summary: string;
  /** 可选：本课新增的依赖，会渲染成操作列表的第一步 */
  install?: {
    command: string;
    description?: string;
  };
  /** 可选：课末验收步骤（操作列表的最后一项） */
  verify?: ProjectVerify;
  concepts: Concept[];
  /** 可选：知识点旁的延伸阅读 */
  conceptArticle?: ConceptArticle;
  files: ProjectFile[];
  docLinks: DocLink[];
};

const ORDER_LABELS = [
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
] as const;

export function getOrderLabel(order: number) {
  return ORDER_LABELS[order - 1] ?? String(order);
}

export function getFileActionLabel(action: FileAction) {
  if (action === "replace") return "覆盖";
  if (action === "edit") return "修改";
  if (action === "run") return "执行";
  return "新建";
}

export function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

export type NavItem = GuideProject | LabProject;

export const PROJECT_DIR = "my-deepagents-app";

export const INIT_STEPS: CommandStep[] = [
  {
    description: "创建课程项目目录（站点本身不跑 Deep Agents，代码都写在这个项目里）。",
    command: `mkdir ${PROJECT_DIR} && cd ${PROJECT_DIR}`,
  },
  {
    description: "初始化 Node 项目，并把包类型设成 ESM（脚本里要用 import 与顶层 await）。",
    command: "pnpm init && pnpm pkg set type=module",
  },
  {
    description: "装 Deep Agents、LangChain、LangGraph 与 DeepSeek 模型包。",
    command: "pnpm add deepagents langchain @langchain/langgraph @langchain/deepseek",
  },
  {
    description: "装跑 TypeScript 脚本用的开发依赖。",
    command: "pnpm add -D typescript tsx @types/node",
  },
  {
    description: "建源码目录。产物写在虚拟文件系统里，不需要额外准备语料。",
    command: "mkdir src",
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "guide",
    slug: "getting-started",
    title: "初始化",
    menuTitle: "初始化",
    docLinks: [
      {
        title: "Deep Agents 文档",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
      {
        title: "pnpm 使用说明",
        href: "https://pnpm.io/zh/cli/add",
      },
    ],
    files: [
      {
        path: "终端",
        steps: INIT_STEPS,
      },
      {
        path: ".env.local",
        steps: [
          {
            description: "在项目根目录创建这个文件。",
            command: "touch .env.local",
          },
        ],
        hint: "ChatDeepSeek 从环境变量 DEEPSEEK_API_KEY 读 Key，这里只写这一行：",
        code: `DEEPSEEK_API_KEY=sk-...`,
      },
      {
        path: "tsconfig.json",
        steps: [
          {
            description: "在项目根目录创建这个文件。",
            command: "touch tsconfig.json",
          },
        ],
        hint: "让 tsx 能够运行 TS 脚本，开放 ESM 与顶层 await。",
        code: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}`,
      },
    ],
  },
  {
    kind: "project",
    slug: "from-graph-to-agent",
    title: "它是什么：createDeepAgent 默认装配了什么",
    menuTitle: "它是什么",
    summary:
      "直接使用 LangGraph，节点、条件边与工具执行都需要自己实现，几十行才能跑通一个任务。这一课看 `createDeepAgent` 一次配置包含了什么：文件工具与子任务派发默认提供，待办需要手动添加，产物默认只保存在内存中。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/minimal.ts",
        "终端打印每轮的工具调用、最终待办与结束原因；workspace/report.md 出现在磁盘上，可直接打开查看报告正文",
        "换成第二个小节的代码重新运行：不发起请求，只打印图中的节点与边",
      ],
    },
    concepts: [
      {
        text: "`createDeepAgent` — 得到一个已配置好的 agent：模型、内置工具、系统提示都已装配",
      },
      {
        text: "`write_file` / `read_file` — 内置文件工具：产物写入虚拟文件，需要时读回片段",
      },
      {
        text: "`backend` — 参数：文件最终写到哪个后端；不传则使用 StateBackend，随 thread 存在、不写入磁盘",
      },
      {
        text: "`FilesystemBackend` — 读写真实磁盘：rootDir 指定目录，virtualMode 把路径限制在目录内",
      },
      {
        text: "`CompositeBackend` — 按路径前缀分发：第一个参数是默认后端，第二个是路由表",
      },
      { text: "`invoke` — 执行一次 agent，输入与输出都是消息列表（底层是 LangGraph 图）" },
      {
        text: "`todoListMiddleware` — 待办中间件：启用后才提供待办工具，默认不包含",
      },
      {
        text: "`getGraphAsync` — 从 agent.graph 读取底层图的节点与边，说明预置内容只是一套配置",
        note: "在 agent.graph 上调用，不发请求",
      },
    ],
    conceptArticle: {
      title: "Deep Agents 是什么：与 LangGraph、编排平台的分工",
      body: [
        "## 文件默认存在哪",
        "不传 `backend` 时用的是 `StateBackend`：文件是图状态里的一个字段，跟 thread 走，进程退出即失。所以示例把 `/workspace/` 路由到真实磁盘，跑完能在目录里打开产物。",
        "默认后端仍留内存，是因为 agent 也会把内部产物（大工具结果、对话历史）写进文件系统；直接给磁盘会把这些混进项目目录，所以用 `CompositeBackend` 按路径分层。",
        "两条硬规则：`rootDir` 给绝对路径；`virtualMode` 必须开，默认 `false` 时即使设了 `rootDir` 也不限制路径（`..`、`~`、绝对路径都能出界）。",
        "## 四种后端，怎么选",
        "- `StateBackend`（默认）：文件进图状态，跟 thread 走，进程退出即失；不能执行命令。",
        "- `FilesystemBackend`：写在真实磁盘，持久；不能执行命令。",
        "- `StoreBackend`：写进 LangGraph 的 Store（键值库），可跨 thread；持久性取决于 store 实现，内存 store 随进程消失；不能执行命令。",
        "- `LocalShellBackend`：磁盘加沙箱，能执行命令（无隔离，仅在开发用）。",
        "换 backend 只影响两件事：**文件存在哪**、**能不能执行命令**。后者由 `isSandboxBackend(backend)` 判断，为 `true` 时 agent 才会被装上 `execute` 工具。",
        "## 三层关系",
        "- **LangGraph**：引擎。图、状态、持久化、中断，都要自己画。",
        "- **deepagents**：引擎之上的预置架构。把「长任务该怎么组织」沉淀成默认值，图由它生成，仍能拿回来继续改。",
        "- **拖拽式编排平台**：再往上一层。把这类能力做成界面，运行、存储、发布都由平台托管。",
        "## 与编排平台的区别",
        "- 形态：一个是代码包，一个是在线控制台。",
        "- 用法：前者写代码调用，后者拖节点、填提示词。",
        "- 产出：前者是图，能继续改；后者是可发布的应用，改动受平台约束。",
        "- 流程由来：前者由模型运行时现场拆解，后者由人连线固定。",
        "- 迁移：前者代码在自有仓库，自托管随意；后者与平台绑定。",
        "## 它解决什么",
        "任务一长，agent 会出现三种退化，每种都有对位的默认解法：",
        "- **上下文爆掉**：调了十几次工具、读了几份长材料之后，历史被塞满，变慢、变贵、关键信息被挤掉。解法是把大产物写进虚拟文件、只读回需要的片段，并用中间件压缩历史。",
        "- **任务漂移**：步数一多就忘记最初目标、重复劳动、或者没做完就收尾。解法是把待办清单外置成状态字段，进度每轮可见。",
        "- **上下文互相污染**：一个 agent 边查资料边写稿，查来的大段原文把写作要求挤掉。解法是把子任务交给子 agent，各自独立的上下文与更窄的工具权限。",
        "## 为什么这些解法有效",
        "模型每一轮能看到的只有消息列表。文件内容放在图状态里就不占 token，需要时按需取回；待办清单作为状态字段每轮都出现，等于给模型一张外部清单；子 agent 是另起一份消息列表，信噪比更高，结果通过文件传递而不是搬运原文。",
        "共同点是把隐式的东西显式化：进度从「模型自己记」变成状态字段，记忆从「对话历史」变成按需取用的文件，协作从「共享一个对话」变成文件加独立上下文。模型缺的不是能力，是在无界上下文里保持长程一致。",
        "## 为什么要单独做成一个库",
        "上面每一条用 LangGraph 都能写出来，代码本身不难：待办是一个状态字段加一个工具，文件系统是一个字典状态字段加读写工具，子 agent 是子图加一个派活工具。",
        "成本最高的是设计决策，而且很难一次做对：待办放状态还是放消息、工具返回什么格式模型才肯用、文件读回的粒度怎么定、摘要什么时候触发、丢掉什么信息、子 agent 的边界怎么切、提示词怎么写。这些是反复试出来的经验值，这个库的价值主要就是把它们打包成默认值。",
        "## 代价：慢在哪",
        "耗时主要在轮数，而不在构建图。图在创建 agent 时就定好，每次调用直接跑，不存在「先设计图再试一次」这个动作。真实开销来自：长任务可能十几次模型往返、每更新一次待办都是一次调用、每个子 agent 都是独立上下文加自己的模型调用、每轮还要多一段推理。",
        "控制成本有三招：设步数上限、收敛工具集（工具越多模型越爱试）、固定顺序的流程就直接画图。",
        "## 什么时候不该用",
        "- 三步以内、一个上下文装得下的任务：多挂三个用不上的工具加一段长提示，只会更慢更贵。",
        "- 流程必须固定（先分类再回复这类）：顺序要用图来保证，提示词保证不了。",
        "- 首字延迟敏感的界面：几轮工具调用带来的等待不划算。",
        "## 同类对照",
        "- **产品型 harness**：面向终端或编辑器的编码 agent，形态最接近（也是待办加文件加子 agent），但它们是成品，不是库。",
        "- **同层框架**：其它厂商的 agent 框架，同样预置了 agent 循环，但多数没有文件系统与待办清单这一套。",
        "- **更薄的框架**：只有循环与工具，待办与文件要自己加。",
        "- **平台**：拖拽式编排产品，属于另一层。",
      ],
    },
    files: [
      {
        path: "src/minimal.ts",
        order: 1,
        action: "create",
        hint: "最小示例：一个模型加一个任务，观察默认行为与工具调用记录；产物同时写入磁盘。",
        code: `import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { ChatDeepSeek } from "@langchain/deepseek";
import {
  CompositeBackend,
  FilesystemBackend,
  StateBackend,
  createDeepAgent,
} from "deepagents";
import { todoListMiddleware } from "langchain";

// 脚本是裸 Node 进程，环境变量自己读
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  // 单次输出上限：不设的话容易一次写几千字，既慢又贵
  // 注意思考模式会占用输出预算，800 太小会把工具调用截断，这里留足
  maxTokens: 2000,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 直接使用 LangGraph，得自己管模型调用、自己绑工具并执行、自己写循环；这里一次调用拿到配好的 agent
// 默认自带：模型与工具循环、文件系统工具（write_file / read_file / ls）、
// 以及有 subagents 时派活用的 task；待办不在默认配置里，要显式挂中间件
// 默认 backend 是内存，文件只看得到名字、看不到实体
// 把 /workspace/ 路由到真实磁盘：rootDir 要绝对路径，virtualMode 锁死路径范围
const workspace = resolve("workspace");
mkdirSync(workspace, { recursive: true });

const agent = createDeepAgent({
  model,
  tools: [],
  middleware: [todoListMiddleware()],
  backend: new CompositeBackend(new StateBackend(), {
    "/workspace/": new FilesystemBackend({
      rootDir: workspace,
      virtualMode: true,
    }),
  }),
  // 收尾格式属于 agent 配置，不写进任务里
  // 工具用法不用在这里写：内置工具的 schema 自带说明（官方 FilesystemMiddleware 注释：默认省略，因为 tool schemas 已提供）
  systemPrompt: [
    "交付物一律产出为文件，不要在回答里复述正文。",
    "完成后只回一句话，说明写到了哪个文件。",
  ].join("\\n"),
});

// 任务只说「做什么」，不指定用哪个工具 —— 选工具是 agent 的职责
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "比较固定长度、按段落、按语义三种切块策略，写一份对比报告到 /workspace/report.md，不超过 300 字，只写结论",
    },
  ],
});

// 逐条打印消息：每一轮做了什么、调了哪个工具、说了什么
for (const [index, message] of result.messages.entries()) {
  const calls = "tool_calls" in message ? message.tool_calls : undefined;
  const names = Array.isArray(calls) ? calls.map((call) => call.name) : [];
  console.log(
    "[" + index + "] " + message.type,
    names.length > 0 ? "→ " + names.join(", ") : String(message.content).slice(0, 120),
  );
}

// 待办是状态字段：每次调用 write_todos 都覆盖成最新一版
console.log("最终待办：", result.todos);
// 虚拟文件是另一个状态字段：路径 → 内容
console.log("产出文件：", Object.keys(result.files ?? {}));

// 结束原因最关键：length 代表被 maxTokens 截断，stop 代表模型自己认为说完了
const last = result.messages[result.messages.length - 1];
// response_metadata 的类型是 Partial<unknown>，要断言后才能取字段
const meta = last.response_metadata as { finish_reason?: string } | undefined;
console.log("结束原因：", meta?.finish_reason);
console.log("最后一条：", last.content);
`,
      },
      {
        path: "src/minimal.ts",
        order: 2,
        action: "replace",
        title: "看图结构",
        hint: "覆盖成只读结构：不调用模型、不消耗 token，打印中间件加入的节点与边。",
        code: `import { loadEnvFile } from "node:process";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createDeepAgent } from "deepagents";
import { todoListMiddleware } from "langchain";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 构造 agent 只是拼配置，不会发请求
const agent = createDeepAgent({
  model,
  tools: [],
  middleware: [todoListMiddleware()],
});

// 底层就是一张 LangGraph 图：从 agent.graph 上读结构，同样不发请求
// nodes 是对象（键是节点名），能看到中间件把自己的节点也插了进来
// 骨架始终是 model_request 与 tools 的循环，其余全是配置拼出来的
const drawable = await agent.graph.getGraphAsync();
console.log("节点：", Object.keys(drawable.nodes));
console.log(
  "边：",
  drawable.edges.map(
    (edge) => edge.source + " → " + edge.target + (edge.conditional ? "（条件）" : ""),
  ),
);
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 概览",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
      {
        title: "快速开始",
        href: "https://docs.langchain.com/oss/python/deepagents/quickstart",
      },
    ],
  },
  {
    kind: "project",
    slug: "sandbox",
    title: "沙箱：让 agent 真的能跑命令",
    menuTitle: "沙箱",
    summary:
      "文件工具只能读写，统计行数、跑脚本、转格式都得执行命令。`LocalShellBackend` 把文件限制在一个目录里，并给 agent 装上 `execute`。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/sandbox.ts",
        "终端先打印「用过 execute：true」，再打印 report.md 全文，末尾是命令算出的行数与字节数",
        "最后两行对比：LocalShell 能执行命令为 true，Store 后端为 false",
      ],
    },
    concepts: [
      {
        text: "`LocalShellBackend` — 后端：文件限制在 `rootDir` 内，并给 agent 装上 `execute`",
        note: "命令跑在宿主机上，没有隔离，仅开发用",
      },
      {
        text: "`virtualMode` — 只把文件工具的路径限制在根目录内，不约束命令能访问哪些文件",
      },
      {
        text: "`timeout` / `maxOutputBytes` — 命令超时秒数与输出字节上限：超时被杀，超限截断",
      },
      {
        text: "`isSandboxBackend` — 判断后端能否执行命令：为 true 时 agent 才有命令工具",
      },
    ],
    conceptArticle: {
      title: "沙箱：从本机目录到真容器",
      body: [
        "## 为什么需要它",
        "文件工具只能读写。要统计行数、跑脚本、跑构建、转图片格式，都得执行命令 —— 这是 agent 从「会写字」变成「会干活」的那一步。",
        "## deepagents 怎么支持",
        "`SandboxBackendProtocol` 在文件读写那组方法之外只多一个 `execute(command)`。backend 实现它，`isSandboxBackend()` 就是 `true`，文件系统中间件会把 `execute` 工具装进工具清单；不实现就只剩文件工具。",
        "所以「agent 能不能跑命令」不是中间件开关，而是 backend 类型决定的。",
        "## 本机后端的安全边界在哪",
        "- `virtualMode` 只约束文件工具（`ls`、`read_file`、`write_file`），命令不受限：`cat /etc/hosts` 照样能读。",
        "- `env` 只传必要变量（`PATH`、`HOME`），不把整个 `process.env` 带进去；要继承必须显式开 `inheritEnv`。",
        "- `timeout` 杀掉跑太久的命令，`maxOutputBytes` 截断过长的输出，避免一次 `ls -R /` 把上下文塞满。",
        "三条合起来说明：`LocalShellBackend` 是「有命令能力的开发后端」，不是安全边界。",
        "## 真要隔离",
        "- 继承 `BaseSandbox`，实现 `execute` 与文件上传下载，把命令丢进容器或 microVM；官方自带的具体实现是 `LangSmithSandbox`。",
        "- 每次会话一个目录或一个容器，跑完回收；真实项目里常见做法是每次运行建一个 uuid 目录，结束时整目录删除。",
        "- 沙箱里的产物要留到下一次，必须搬出去：先 `realpath` 解析软链，再校验路径前缀仍在沙箱内，加大小上限，最后上传对象存储。",
        "## 最后两行在对照什么",
        "默认后端是 `StateBackend`（不传 `backend` 时用它）：文件进图状态、跟 thread 走，也没有 `execute`。最后两行临时造一个 `StoreBackend` 实例 —— `store` 是它存文件的地方，`namespace` 是存哪一格 —— 再用同一个 `isSandboxBackend()` 判断，得到 `false`。结论只有一句：能不能执行命令，看后端有没有实现 `execute`。",
        "## 面试会问到哪",
        "- **隔离边界**：进程、容器、microVM 三档，命令直接跑在宿主机只能算开发环境。",
        "- **限制维度**：超时、内存、输出字节、环境变量、网络出站。",
        "- **生命周期**：每会话一个沙箱，谁创建、谁回收、复用还是重建。",
        "- **危险操作**：把审批挂在 `execute` 上，执行前挂起，人批准后再跑。",
      ],
    },
    files: [
      {
        path: "src/sandbox.ts",
        order: 1,
        action: "create",
        hint: "一次运行一个目录：agent 写文件、执行命令统计、再把文件读回；末尾对比两个后端有没有 execute。",
        code: `import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { ChatDeepSeek } from "@langchain/deepseek";
import { InMemoryStore } from "@langchain/langgraph";
import {
  LocalShellBackend,
  StoreBackend,
  createDeepAgent,
  isSandboxBackend,
} from "deepagents";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  maxTokens: 3000,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 每次运行一个独立目录：命令只允许在这个目录里干活
const sandboxDir = resolve("workspace", "run-1");
mkdirSync(sandboxDir, { recursive: true });

// LocalShellBackend = 文件工具 + execute
// virtualMode 只约束文件工具（ls / read_file / write_file），不约束命令
const backend = new LocalShellBackend({
  rootDir: sandboxDir,
  virtualMode: true,
  timeout: 30,
  maxOutputBytes: 20_000,
  env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: sandboxDir },
});

const agent = createDeepAgent({
  model,
  tools: [],
  backend,
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "把「固定长度 / 按段落 / 按语义」三种切块策略各写一行到 /report.md；再统计这个文件有多少行、多少字节，把统计结果追加到文件末尾",
    },
  ],
});

// 是否调用过命令
const usedExecute = result.messages.some(
  (message) =>
    "tool_calls" in message &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.some((call) => call.name === "execute"),
);
console.log("用过 execute：", usedExecute);

// 文件在沙箱目录里
const file = await backend.read("/report.md");
console.log("report.md 内容：");
console.log(String(file.content));

// 不传 backend 时默认用 StateBackend：文件进图状态、跟 thread 走，也没有 execute
// 这里传的是 LocalShellBackend，所以 agent 才有命令工具
// StoreBackend 不是默认值，只是另一种可选后端：把文件存进 store，namespace 决定存哪一格
const store = new InMemoryStore();
const storeBackend = new StoreBackend({ store, namespace: ["sandbox"] });

// 同一个判断函数：LocalShell 有 execute 返回 true，Store 只有文件读写返回 false
console.log("LocalShell 能执行命令：", isSandboxBackend(backend));
console.log("Store 能执行命令：", isSandboxBackend(storeBackend));
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 后端",
        href: "https://docs.langchain.com/oss/python/deepagents/backends",
      },
      {
        title: "人在环",
        href: "https://docs.langchain.com/oss/python/langgraph/interrupts",
      },
    ],
  },
  {
    kind: "project",
    slug: "subagents",
    title: "子 agent：隔离上下文与并行派发",
    menuTitle: "子 agent",
    summary:
      "查天气的工具只挂在两个子 agent 上，主 agent 自己没有：想拿到两个城市的天气，只能一次派两路出去，各自带回一句话，再合成建议。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/subagents.ts",
        "终端打印子任务调用数与「同一轮最多的 task 数」，后者为 2，说明两个城市同时开工",
        "最后一行打印 /advice.md 的内容，正文里同时出现北京与上海的天气",
      ],
    },
    concepts: [
      { text: "`subagents` — createDeepAgent 的参数：声明可被派发任务的子 agent 列表" },
      {
        text: "`SubAgent` — 子 agent 的规格类型：name、description、systemPrompt、tools",
      },
      { text: "`task` — 主 agent 派发任务的工具：把子任务连同上下文交给指定子 agent" },
      {
        text: "`tool` — 定义工具：name、description、schema 决定模型怎么调用",
        note: "两个检索工具只挂在子 agent 上，主 agent 没有",
      },
    ],
    files: [
      {
        path: "src/subagents.ts",
        order: 1,
        action: "create",
        hint: "一个 mock 天气工具只给两个子 agent，各查一个城市；主 agent 没这个工具，只能派活再合成建议。",
        code: `import { loadEnvFile } from "node:process";

import { ChatDeepSeek } from "@langchain/deepseek";
import { type SubAgent, createDeepAgent } from "deepagents";
import { tool } from "langchain";

// 脚本是裸 Node 进程，环境变量自己读
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  maxTokens: 500,
  apiKey: process.env.DEEPSEEK_API_KEY,
  // 短任务不需要思考链，关掉省掉每轮的推理 token
  modelKwargs: { thinking: { type: "disabled" } },
});

// mock 数据：真实项目里换成天气接口
const weatherOf: Record<string, string> = {
  北京: "晴，18℃，北风 3 级",
  上海: "小雨，22℃，东南风 2 级",
};

const getWeather = tool(
  async ({ city }: { city: string }) => weatherOf[city] ?? "查不到这个城市",
  {
    name: "get_weather",
    description: "查某个城市明天的天气",
    schema: {
      type: "object",
      properties: { city: { type: "string", description: "城市名" } },
      required: ["city"],
    },
  },
);

// 两个子 agent 用同一个工具，各自只管一个城市：并行查，互不干扰
const beijingScout: SubAgent = {
  name: "beijing-scout",
  description: "只负责北京：查明天天气",
  systemPrompt: "只查北京明天的天气，用一句话回给主 agent，不要写文件。",
  tools: [getWeather],
};

const shanghaiScout: SubAgent = {
  name: "shanghai-scout",
  description: "只负责上海：查明天天气",
  systemPrompt: "只查上海明天的天气，用一句话回给主 agent，不要写文件。",
  tools: [getWeather],
};

// 主 agent 没有 get_weather：想知道天气，只能派活
const agent = createDeepAgent({
  model,
  tools: [],
  subagents: [beijingScout, shanghaiScout],
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "比较北京和上海明天的天气，给一句出行建议写到 /advice.md",
    },
  ],
});

// 每条消息里有几个 task 调用：同一轮多个就是并行派发
const perTurn = result.messages.map((message) => {
  const raw = "tool_calls" in message ? message.tool_calls : undefined;
  return Array.isArray(raw) ? raw.filter((call) => call.name === "task").length : 0;
});

console.log("子任务调用数：", perTurn.reduce((sum, n) => sum + n, 0));
console.log("同一轮最多的 task 数：", Math.max(...perTurn));
console.log("产出文件：", Object.keys(result.files ?? {}));
// 默认后端不落盘：内容在 result.files 里，直接打出来看
console.log("advice.md 内容：", result.files?.["/advice.md"]?.content);
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 子 agent",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
      {
        title: "多 agent 编排",
        href: "https://docs.langchain.com/oss/python/langchain/multi-agent",
      },
    ],
  },
  {
    kind: "project",
    slug: "memory-and-hitl",
    title: "记忆与审批：接入底层能力",
    menuTitle: "记忆与审批",
    summary:
      "checkpointer 与 interrupt 都不是这一层新增的，而是底层图的能力。这一课把它们接入 deep agent，把审批搬到网页上，最后给出判断：什么任务适合这套架构。",
    install: {
      command:
        "pnpm add next react react-dom @langchain/react && pnpm add -D @langchain/langgraph-cli @types/react @types/react-dom",
      description:
        "在 my-deepagents-app 目录执行：装 Next 与前端 Hook（本课要把审批搬到网页上），以及提供 langgraphjs 命令的 CLI。",
    },
    verify: {
      label: "在网页上点批准",
      description: [
        "终端 A 在 my-deepagents-app 目录执行 pnpm exec langgraphjs dev，本地 Agent Server 起在 http://localhost:2024",
        "终端 B 执行 pnpm dev，打开 http://localhost:3000",
        "发一句「执行 pwd」：页面弹出审批卡，点批准后命令执行，结果回到对话里",
        "让它写一个文件也一样先挂起，批准后才落进 workspace/ 目录",
      ],
    },
    concepts: [
      { text: "`checkpointer` — 按 thread 保存每一步状态，支持续跑与恢复" },
      {
        text: "`interruptOn` — 按工具名逐个开人工确认：名单里的工具在调用前挂起，等人答复再继续",
        note: "必须同时给 checkpointer；写文件与执行命令要分别列进去",
      },
      {
        text: "`langgraph.json` — 把图注册成服务上的名字：graphs 里写文件路径与导出名",
        note: "这个名字就是前端的 assistantId",
      },
      { text: "`langgraphjs dev` — 起本地 Agent Server（默认 2024 端口），thread 与持久化都由它管" },
      {
        text: "`useStream` — React Hook：用 apiUrl 连服务、assistantId 指定图，拿到可直接渲染的消息与状态",
      },
      { text: "`submit` — 往当前 thread 发一条新消息，触发一次运行" },
      {
        text: "`interrupt` — 图挂起后前端拿到的载荷：actionRequests 是待批的工具调用，reviewConfigs 是允许的决定",
      },
      {
        text: "`respond` — 回答挂起的 interrupt：参数作为 resume 值交回图，批准或拒绝都在这里传",
        note: "submit 不带 resume；恢复只能走 respond",
      },
    ],
    files: [
      {
        path: "src/agent.ts",
        order: 1,
        action: "create",
        hint: "这个文件只做一件事：把图建好并导出，交给 Agent Server 按 langgraph.json 加载；命令执行与写文件都列进审批名单。",
        code: `import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { ChatDeepSeek } from "@langchain/deepseek";
import { MemorySaver } from "@langchain/langgraph";
import { LocalShellBackend, createDeepAgent } from "deepagents";

// Agent Server 加载这个文件时是普通 Node 进程，Key 从 .env.local 读
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  maxTokens: 4000,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const workspace = resolve("workspace");
mkdirSync(workspace, { recursive: true });

// 这个导出是给 Agent Server 用的：langgraph.json 按路径加导出名加载它
// 前端不 import 这个文件，只用 assistantId 这个名字连过来
// checkpointer 管 thread 内续跑；本地用内存版，托管部署时由平台换成持久化
// 后端沿用沙箱课的最小写法：virtualMode 只把文件工具限制在 rootDir 内
// 命令不受它约束（能读系统文件、能删文件），所以每次执行都要人点头
export const agent = createDeepAgent({
  model,
  tools: [],
  checkpointer: new MemorySaver(),
  backend: new LocalShellBackend({ rootDir: workspace, virtualMode: true, timeout: 30 }),
  // 挂起粒度是工具调用：名单里的工具在调用前停下，等人批准
  // 执行命令会碰宿主机，写文件会改磁盘上的产物，两样都拦
  interruptOn: { execute: true, write_file: true, edit_file: true },
});
`,
      },
      {
        path: "langgraph.json",
        order: 2,
        action: "create",
        hint: "把 src/agent.ts 导出的图注册成名字叫 agent 的服务；这个文件要在项目根目录，env 指向已有的 .env.local。",
        code: `{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:agent"
  },
  "env": ".env.local"
}`,
      },
      {
        path: "app/layout.tsx",
        order: 3,
        action: "create",
        hint: "Next 的根布局：页面文件要靠它渲染，放在 app 目录里。",
        code: `import type { ReactNode } from "react";

export const metadata = { title: "Deep Agents 审批台" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}`,
      },
      {
        path: "app/page.tsx",
        order: 4,
        action: "create",
        hint: "审批界面：连上 Agent Server 发消息并渲染回复；图挂起时弹出审批卡，点批准就用 command.resume 带着决定恢复同一次运行。",
        code: `"use client";

import { useState } from "react";
import { useStream } from "@langchain/react";

// 挂起载荷：待批的工具调用 + 每个工具允许哪些决定
type Pending = {
  actionRequests: { name: string; args: Record<string, unknown> }[];
  reviewConfigs: { actionName: string; allowedDecisions: string[] }[];
};

export default function Home() {
  const [input, setInput] = useState("");
  // 连本地 Agent Server：地址是它的端口，名字是 langgraph.json 里注册的键
  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
  });

  const pending = stream.interrupt?.value as Pending | undefined;

  function send(text: string) {
    if (!text.trim() || stream.isLoading) return;
    stream.submit({ messages: [{ role: "user", content: text }] });
    setInput("");
  }

  // 恢复挂起：respond 的参数会作为 resume 值交回图
  // decisions 的顺序必须与 actionRequests 一一对应
  function decide(type: "approve" | "reject") {
    void stream.respond({
      decisions:
        type === "approve"
          ? [{ type: "approve" }]
          : [{ type: "reject", message: "不执行这条命令，也不要重试" }],
    });
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20 }}>Deep Agents 审批台</h1>

      <div style={{ display: "grid", gap: 8, margin: "16px 0" }}>
        {stream.messages.map((message) => (
          <div key={message.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, fontSize: 14 }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>{message.type}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
          </div>
        ))}
      </div>

      {pending && (
        <div style={{ border: "1px solid #f0c36d", background: "#fffaeb", borderRadius: 8, padding: 12, fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}>等待审批</div>
          {pending.actionRequests.map((action, index) => (
            <div key={index} style={{ marginBottom: 8 }}>
              <div>工具：{action.name}</div>
              <pre style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>{JSON.stringify(action.args)}</pre>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => decide("approve")}>
              批准
            </button>
            <button type="button" onClick={() => decide("reject")}>
              驳回
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        style={{ display: "flex", gap: 8, marginTop: 16 }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="让 agent 执行一条命令，例如 pwd"
          style={{ flex: 1, padding: "8px 10px", fontSize: 14 }}
        />
        <button type="submit" disabled={stream.isLoading}>
          发送
        </button>
        <button type="button" onClick={() => stream.stop()} disabled={!stream.isLoading}>
          停止
        </button>
      </form>
    </main>
  );
}`,
      },
      {
        path: "package.json",
        order: 5,
        action: "edit",
        hint: "加一个 dev 脚本用来起 Next（与 type 字段同级；首次 pnpm dev 时 Next 会自己补 tsconfig 里的 jsx 与 dom 配置，确认即可）。",
        code: `"scripts": {
  "dev": "next dev"
},`,
      },
    ],
    docLinks: [
      {
        title: "LangGraph 持久化",
        href: "https://docs.langchain.com/oss/python/langgraph/persistence",
      },
      {
        title: "人在环",
        href: "https://docs.langchain.com/oss/python/langgraph/interrupts",
      },
      {
        title: "Deep Agents 人工审批",
        href: "https://docs.langchain.com/oss/python/deepagents/human-in-the-loop",
      },
      {
        title: "前端接入（useStream）",
        href: "https://docs.langchain.com/oss/javascript/deepagents/frontend/todo-list",
      },
      {
        title: "useStream 参考",
        href: "https://reference.langchain.com/javascript/langchain-react/index/useStream",
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}
