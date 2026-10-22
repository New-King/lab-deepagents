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
      label: getFileName(file.path),
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
        hint: "让 tsx 能跑 TS 脚本，ESM 与顶层 await 都放开。",
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
    title: "一行拿到配好的 agent：它默认给了什么",
    menuTitle: "它是什么",
    summary:
      "手写版要自己接模型、接工具、写循环；这一课换成一行拿到配好的 agent，把默认行为看清楚 —— 文件工具与派活工具是自带的，待办要自己挂上去。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/minimal.ts",
        "打印出每一步的工具调用与最终待办，能看到 write_todos 与写文件都被调用过",
      ],
    },
    concepts: [
      {
        text: "`createDeepAgent` — 拿到一个已配置好的 agent：模型、内置工具、系统提示都由它装好",
      },
      { text: "`invoke` — 跑一次 agent，输入输出都是消息列表（底层就是 LangGraph 的图）" },
      {
        text: "`todoListMiddleware` — 待办中间件：装上才给 agent 待办工具，默认并不带",
      },
      {
        text: "`write_todos` — 由中间件注册给模型调用的工具：每次调用整份替换待办清单",
        note: "脚本里不 import 它，只在工具调用记录里出现",
      },
    ],
    conceptArticle: {
      title: "Deep Agents 是什么：与 LangGraph、编排平台的分工",
      body: [
        "## 它是什么",
        "一个包，入口是 `createDeepAgent`。调用一次拿到的是一张「已经配好的图」：模型加工具循环的骨架、一段很长的系统提示、一组内置工具（待办、文件、子任务），以及上下文管理的中间件。",
        "骨架是固定的：只有「模型 ↔ 工具」这一个循环，没有画死的分支。具体走几步、调什么工具、要不要派子任务，全部由模型运行时决定。所谓「流程」不在图上的连线里，而在提示词、工具集与中间件诱导出的行为里。",
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
        "贵的是设计决策，而且很难一次做对：待办放状态还是放消息、工具返回什么格式模型才肯用、文件读回的粒度怎么定、摘要什么时候触发、丢掉什么信息、子 agent 的边界怎么切、提示词怎么写。这些是反复试出来的经验值，这个库的价值主要就是把它们打包成默认值。",
        "## 代价：慢在哪",
        "慢在轮数，不在造图。图在创建 agent 时就定好，每次调用直接跑，不存在「先设计图再试一次」这个动作。真实开销来自：长任务可能十几次模型往返、每更新一次待办都是一次调用、每个子 agent 都是独立上下文加自己的模型调用、每轮还要多一段推理。",
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
        hint: "最小示例：一个模型 + 一个任务，看默认行为与工具调用痕迹。",
        code: `import { loadEnvFile } from "node:process";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createDeepAgent } from "deepagents";
import { todoListMiddleware } from "langchain";

// 脚本是裸 Node 进程，环境变量自己读
try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  // 单次输出上限：不设的话长任务容易一次写几千字，既慢又贵
  maxTokens: 800,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 手写版要自己管模型调用、自己绑工具并执行、自己写循环；这里一行拿到配好的 agent
// 默认自带：模型与工具循环、文件系统工具（write_file / read_file / ls）、
// 以及有 subagents 时派活用的 task；待办不在默认配置里，要显式挂中间件
const agent = createDeepAgent({
  model,
  tools: [],
  middleware: [todoListMiddleware()],
});

// 任务必须真的需要拆解，待办清单才有意义
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "先列计划再动手：比较固定长度、按段落、按语义三种切块策略，写一份对比报告到 report.md，不超过 300 字，只写结论",
    },
  ],
});

// 内置工具在消息里留下痕迹：哪一步用了哪个工具、参数是什么
// 只有 AI 消息带 tool_calls；先用 Array.isArray 做运行时收窄再取
// （直接写 "tool_calls" in message 只会把类型收窄成 unknown，编译不过）
for (const message of result.messages) {
  const calls = "tool_calls" in message ? message.tool_calls : undefined;
  if (!Array.isArray(calls)) continue;
  for (const call of calls) {
    console.log(call.name, call.args);
  }
}

// 待办是状态字段：每次调用 write_todos 都覆盖成最新一版
console.log("最终待办：", result.todos);
// 虚拟文件是另一个状态字段：路径 → 内容
console.log("产出文件：", Object.keys(result.files ?? {}));
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
    slug: "virtual-filesystem",
    title: "上下文工程：用文件代替上下文",
    menuTitle: "上下文工程",
    summary:
      "长任务真正会爆的是上下文。这一课把大产物写进虚拟文件、只读回需要的片段，再用中间件把历史压掉 —— 这是它最核心的一招。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/minimal.ts",
        "打印出虚拟文件清单与消息规模，产物文件进了状态而不是留在对话里",
      ],
    },
    concepts: [
      { text: "`write_file` — 内置工具：把内容写进虚拟文件，产物不再占着上下文" },
      { text: "`read_file` — 内置工具：按需把文件片段读回上下文" },
      { text: "`files` — 状态里存放虚拟文件的字段：路径到内容的映射，跨轮持久" },
      {
        text: "`middleware` — createDeepAgent 的参数：在模型调用与工具调用前后挂钩子",
      },
    ],
    files: [
      {
        path: "src/minimal.ts",
        order: 1,
        action: "replace",
        hint: "覆盖成一次任务里写完再读回：产物进文件，只把需要的片段带进上下文。",
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
  maxTokens: 800,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// middleware 是横切面：模型调用前后、工具调用前后都能挂钩子
// 摘要类中间件（langchain 的 summarizationMiddleware）也挂这里，参数按官方文档配
const agent = createDeepAgent({
  model,
  tools: [],
  middleware: [todoListMiddleware()],
});

// 一次任务里走完：先 write_file 存进状态，再 read_file 只取回需要的那一段
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "把三种切块策略的对比写进 summary-1.md（不超过 200 字），再只读这份文件写出三句话摘要",
    },
  ],
});

// files 是状态字段：路径 → 内容，产物不再堆在对话里
console.log("文件：", Object.keys(result.files ?? {}));
console.log("消息数：", result.messages.length);
console.log(
  "输入规模：",
  result.messages.reduce((total, message) => total + String(message.content).length, 0),
);
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 文件系统",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
      {
        title: "LangGraph 状态",
        href: "https://docs.langchain.com/oss/python/langgraph/graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "backends",
    title: "后端：文件到底存在哪",
    menuTitle: "后端",
    summary:
      "上一课只说了「写进文件」，没说文件存在哪。默认的 StateBackend 跟着 thread 活，脚本一结束就没了；要让产物落到真实磁盘，得换 backend。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/backends.ts",
        "workspace/ 目录下出现 notes.md，状态里只剩内部产物，两者分开存放",
      ],
    },
    concepts: [
      { text: "`backend` — createDeepAgent 的参数：文件工具最终写到哪，由它决定" },
      { text: "`StateBackend` — 默认后端：文件存在图状态里，跟 thread 走，不落盘" },
      {
        text: "`FilesystemBackend` — 读写真实磁盘：rootDir 指目录，virtualMode 把路径限制在目录内",
      },
      {
        text: "`CompositeBackend` — 按路径前缀分发：第一个参数是默认后端，第二个是路由表",
      },
      { text: "`virtualMode` — 路径沙箱开关：默认 false 等于没有保护，配 rootDir 必须开" },
      {
        text: "`StoreBackend` — 把文件存进 Store：跨 thread 持久，适合长期记忆",
        note: "需要同时给 createDeepAgent 传 store",
      },
      {
        text: "`LocalShellBackend` — 本地 shell 后端：能执行命令，但没有隔离，只适合开发",
      },
      {
        text: "`SandboxBackendProtocol` — 沙箱后端协议：实现后自动多出 execute 工具",
        note: "在隔离环境里跑命令，生产环境用",
      },
      {
        text: "`BackendProtocol` — 后端要实现的接口：ls、readFile、writeFile、editFile、glob、grep",
        note: "可选 execute；实现这套方法即可自接入",
      },
      {
        text: "`namespace` — StoreBackend 的隔离键：不同用户、不同项目各存一格",
        note: "多用户时必须显式给，否则所有人共用一份",
      },
    ],
    conceptArticle: {
      title: "Backend 怎么选：四种存法、三条硬规则",
      body: [
        "## 它是什么",
        "backend 是一个**对象**，实现一组文件操作方法：`ls`、`readFile`、`writeFile`、`editFile`、`glob`、`grep`，可选 `execute`。agent 的文件工具（`read_file`、`write_file` 等）只是把调用转发给它。",
        "所以换 backend 不是「改个开关」，是换掉整套「文件怎么存取」的实现。模型对此无感：它只知道路径，不知道背后是内存、磁盘还是数据库。",
        "## 四种现成的",
        "| 后端 | 存哪 | 活着多久 | 适合 |",
        "|---|---|---|---|",
        "| `StateBackend` | 图状态（内存） | 跟 thread 走，进程退出即失 | 演示、临时产物 |",
        "| `FilesystemBackend` | 真实磁盘目录 | 一直在 | 本地工具、单机 |",
        "| `StoreBackend` | LangGraph Store（内存 / Postgres） | 跨 thread、跨重启 | 用户文件、长期记忆 |",
        "| `LocalShellBackend` / 沙箱后端 | 磁盘或容器，并多出 `execute` | 看实现 | 需要跑命令 |",
        "## 三条硬规则",
        "1. **`rootDir` 必须给绝对路径**：官方文档明确要求，相对路径行为不确定。",
        "2. **`virtualMode` 必须开**：默认 `false` 时即使设了 `rootDir`，也不限制路径（`..`、`~`、绝对路径都能出界）。",
        "3. **大多数场景用 `CompositeBackend` 包住**：agent 会把内部产物（大工具结果、对话历史）也写进 backend，直接给磁盘会把这些东西混进项目目录。",
        "## 什么时候要自己写",
        "文件要进自家对象存储或自建表结构，**并且**需要像文件系统一样增删查改时，才实现 `BackendProtocol`。只是偶尔上传一个产物，写成普通工具更划算。",
        "## 多用户隔离",
        "`StoreBackend` 的 `namespace` 决定「存哪一格」。多用户、多项目场景必须显式给出，否则所有用户共用同一份存储——这是官方文档专门警告过的点。",
      ],
    },
    files: [
      {
        path: "src/backends.ts",
        order: 1,
        action: "create",
        hint: "换成 CompositeBackend：工作区落真实磁盘，内部产物留在状态里。",
        code: `import { mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { ChatDeepSeek } from "@langchain/deepseek";
import {
  CompositeBackend,
  FilesystemBackend,
  StateBackend,
  createDeepAgent,
} from "deepagents";

try {
  loadEnvFile(".env.local");
} catch {
  // 没有 .env.local 时忽略
}

const model = new ChatDeepSeek({
  model: "deepseek-flash",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 不传 backend 时用的就是 StateBackend：文件存在图状态里，换了 thread 或重启就没了
// 要让产物真正落盘，换 FilesystemBackend；rootDir 用绝对路径，virtualMode 才做路径约束
const workspace = resolve("workspace");
mkdirSync(workspace, { recursive: true });

const agent = createDeepAgent({
  model,
  tools: [],
  // 为什么不直接把 FilesystemBackend 丢给 agent：
  // agent 还会把内部产物（大工具结果、对话历史）写进 backend，
  // 这些不该混进项目目录，所以默认后端留 StateBackend，只把 /workspace/ 路由到磁盘
  backend: new CompositeBackend(new StateBackend(), {
    "/workspace/": new FilesystemBackend({
      rootDir: workspace,
      virtualMode: true,
    }),
  }),
});

const result = await agent.invoke({
  messages: [
    { role: "user", content: "把三种切块策略的要点整理成笔记，写进 /workspace/notes.md" },
  ],
});

// 状态里剩下的只是内部产物；真正的笔记已经写到磁盘
console.log("状态里的文件：", Object.keys(result.files ?? {}));
console.log("磁盘上的文件：", readdirSync(workspace));

// backend 只要满足 BackendProtocol（ls / readFile / writeFile / grep …）就能插进来
// 跨 thread 的长期记忆换成 StoreBackend：new StoreBackend({ namespace }) + 传 store

// 需要 agent 执行命令时，把默认后端换成 LocalShellBackend：能跑 shell，
// 但没有隔离（命令能碰到宿主机的任意路径），只适合本地开发
// 生产用实现 SandboxBackendProtocol 的沙箱后端：工具集会自动多出 execute，
// 命令在隔离环境里跑，搞坏了也波及不到宿主机
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 后端",
        href: "https://docs.langchain.com/oss/python/deepagents/backends",
      },
      {
        title: "LangGraph 持久化",
        href: "https://docs.langchain.com/oss/python/langgraph/persistence",
      },
    ],
  },
  {
    kind: "project",
    slug: "subagents",
    title: "子 agent：隔离上下文，也能同时开几路",
    menuTitle: "子 agent",
    summary:
      "子 agent 的价值不在「多一个大脑」，而在上下文隔离与权限收窄：各干各的、互不污染。互不依赖的子任务还能在同一轮同时开出去。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/subagents.ts",
        "打印出子任务调用数与产出文件，同一轮里能看到多个 task 调用",
      ],
    },
    concepts: [
      { text: "`subagents` — createDeepAgent 的参数：声明可被派活的子 agent 名单" },
      {
        text: "`SubAgent` — 子 agent 的规格类型：name、description、systemPrompt、tools",
      },
      { text: "`task` — 主 agent 派活的工具：把子任务连同上下文一起交给某个子 agent" },
    ],
    files: [
      {
        path: "src/subagents.ts",
        order: 1,
        action: "create",
        hint: "定义两个子 agent：一个只查资料，一个只写稿；任务拆成三路同时派出去。",
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
    title: "记忆与审批：把底层能力接进来",
    menuTitle: "记忆与审批",
    summary:
      "checkpointer、Store、interrupt 都不是这一层发明的，是底层图的能力。这一课把它们接到 deep agent 上，并收尾：什么任务值得上这套架构。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 pnpm tsx src/subagents.ts",
        "写文件前挂起并等待批准；批准后继续，换一条 thread 仍记得上一次的偏好",
      ],
    },
    concepts: [
      { text: "`checkpointer` — 按 thread 保存每一步状态，支持续跑与恢复" },
      { text: "`store` — 跨 thread 的长期记忆，节点与工具都能读写" },
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
        hint: "覆盖成带记忆与审批：保留一个子 agent，挂 checkpointer 与 store，写文件前先挂起。",
        code: `import { loadEnvFile } from "node:process";
import { ChatDeepSeek } from "@langchain/deepseek";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";
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

const researcher: SubAgent = {
  name: "researcher",
  description: "只写被指定的那一部分，把要点写进独立文件",
  systemPrompt: "只处理被指定的那一部分，产出独立的 notes 文件。",
  tools: [],
};

// 接入点：checkpointer 管 thread 内续跑，store 管跨 thread 的长期记忆
// interruptOn 按工具名配置人工确认：写文件这类副作用先挂起等人点头
const agent = createDeepAgent({
  model,
  tools: [],
  subagents: [researcher],
  checkpointer: new MemorySaver(),
  store: new InMemoryStore(),
  interruptOn: { write_file: true },
});

const result = await agent.invoke(
  { messages: [{ role: "user", content: "把结论写进 report.md" }] },
  { configurable: { thread_id: "report-1" } },
);

// 挂起时结果里带中断信息；恢复用 Command({ resume: ... }) 带回答复
console.log("中断：", result.__interrupt__);
// 恢复时节点会整段重跑：发通知、扣款这类动作必须可重复执行

// 收尾判断：任务是否长（多步、要记进度）、产物是否大（要文件系统）、
// 子任务是否可并行且需要上下文隔离。三条都不占，就别上这套架构。
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
