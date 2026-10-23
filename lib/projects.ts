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
    slug: "subagents",
    title: "子 agent：隔离上下文与并行派发",
    menuTitle: "子 agent",
    summary:
      "子 agent 的作用是隔离上下文与收窄权限：各自持有独立上下文，互不污染；互不依赖的子任务可以在同一轮并行派出。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/subagents.ts",
        "打印子任务调用数与产出文件，同一轮里可以看到多个 task 调用",
      ],
    },
    concepts: [
      { text: "`subagents` — createDeepAgent 的参数：声明可被派发任务的子 agent 列表" },
      {
        text: "`SubAgent` — 子 agent 的规格类型：name、description、systemPrompt、tools",
      },
      { text: "`task` — 主 agent 派发任务的工具：把子任务连同上下文交给指定子 agent" },
    ],
    files: [
      {
        path: "src/subagents.ts",
        order: 1,
        action: "create",
        hint: "定义两个子 agent：一个负责查资料，一个负责写稿；任务拆成三路同时派出。",
        code: `import { loadEnvFile } from "node:process";
import { ChatDeepSeek } from "@langchain/deepseek";
import { type SubAgent, createDeepAgent } from "deepagents";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// ① 子 agent 各自的边界：做什么、能碰哪些工具
const researcher: SubAgent = {
  name: "researcher",
  description: "只写被指定的那一部分，把要点写进独立文件",
  systemPrompt: "只处理被指定的那一部分，产出独立的 notes 文件；不做总结陈词。",
  tools: [],
};

const writer: SubAgent = {
  name: "writer",
  description: "只根据 notes 文件写出带出处的报告",
  systemPrompt: "只依据 notes 文件写作，每个结论都标出来源文件。",
  tools: [],
};

// ② 主 agent 通过 task 派活：每个子 agent 有自己的上下文，只带该有的工具
const agent = createDeepAgent({
  model,
  tools: [],
  subagents: [researcher, writer],
});

// ③ 三部分互不依赖：模型会在同一轮里返回多个 task 调用，底层并行执行
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "分别写三种切块策略各一段说明（每段不超过 100 字），各存一份 notes 文件，最后合并成 report.md",
    },
  ],
});

// 同样先收窄再取：flatMap 里返回空数组表示这条消息没有工具调用
const calls = result.messages.flatMap((message) => {
  const raw = "tool_calls" in message ? message.tool_calls : undefined;
  return Array.isArray(raw) ? raw : [];
});
console.log("子任务调用数：", calls.filter((call) => call.name === "task").length);
console.log("产出文件：", Object.keys(result.files ?? {}));
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
      "checkpointer、Store、interrupt 都不是这一层新增的，而是底层图的能力。这一课把它们接入 deep agent，并在收尾给出判断：什么任务适合这套架构。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/subagents.ts",
        "执行命令前挂起，打印出被拦下的命令与参数；批准后命令执行并给出结果",
      ],
    },
    concepts: [
      { text: "`checkpointer` — 按 thread 保存每一步状态，支持续跑与恢复" },
      { text: "`store` — 跨 thread 的长期记忆，节点与工具都能读写" },
      { text: "`Command` — 从挂起处恢复执行：resume 携带批准或拒绝的决定" },
      {
        text: "`interruptOn` — 按工具名配置人工确认：调用前挂起，等人答复再继续",
        note: "必须同时给 checkpointer，否则无处保存挂起状态",
      },
    ],
    files: [
      {
        path: "src/subagents.ts",
        order: 1,
        action: "replace",
        hint: "覆盖成带审批的版本：后端换成能执行命令的，execute 调用前挂起，批准后继续。",
        code: `import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { ChatDeepSeek } from "@langchain/deepseek";
import { Command, MemorySaver } from "@langchain/langgraph";
import { LocalShellBackend, createDeepAgent } from "deepagents";

// 脚本是裸 Node 进程，环境变量自己读
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

// 接入点：checkpointer 管 thread 内续跑，store 管跨 thread 的长期记忆
// 这个后端能执行命令，命令直接跑在宿主机上（能读系统文件、能删文件），所以每次都要人点头
const agent = createDeepAgent({
  model,
  tools: [],
  checkpointer: new MemorySaver(),
  backend: new LocalShellBackend({ rootDir: workspace }),
  // 挂起粒度是工具调用：execute 被调用前停下，等人批准
  interruptOn: { execute: true },
});

const config = { configurable: { thread_id: "shell-1" } };

const first = await agent.invoke(
  { messages: [{ role: "user", content: "执行 pwd，汇报当前工作目录" }] },
  config,
);

// 中断信息在 __interrupt__ 里：被拦下的工具名、参数，以及允许的决定
console.log("待批准：", JSON.stringify(first.__interrupt__));

// 批准后继续：resume 携带决定，图从被拦下的位置接着跑
const resumed = await agent.invoke(
  new Command({ resume: { decisions: [{ type: "approve" }] } }),
  config,
);

// 挂起恢复后节点会整段重跑：发通知、扣款这类动作必须可重复执行
console.log("命令结果：", String(resumed.messages.at(-1)?.content).slice(0, 120));
`,
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
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}
