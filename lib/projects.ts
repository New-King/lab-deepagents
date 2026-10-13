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
 * 只在确实需要时写（Python 对应物、常见坑等），尽量短。
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
    description: "用 uv 初始化 Python 3.12 项目。",
    command: "uv init --python 3.12",
  },
  {
    description: "装 Deep Agents 与 DeepSeek 模型包。",
    command: "uv add deepagents langchain-deepseek",
  },
  {
    description: "建语料目录：调研任务要读的材料放在这里。",
    command: "mkdir -p content",
  },
  {
    description: "在项目根目录创建 .env.local，填入 DeepSeek 的 API Key。",
    command: "touch .env.local",
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
        title: "uv 使用说明",
        href: "https://docs.astral.sh/uv/",
      },
    ],
    files: [
      {
        path: "终端",
        steps: INIT_STEPS,
      },
      {
        path: ".env.local",
        hint: "ChatDeepSeek 从环境变量 DEEPSEEK_API_KEY 读 Key，这里只写这一行：",
        code: `DEEPSEEK_API_KEY=sk-...`,
      },
    ],
  },
  {
    kind: "project",
    slug: "from-graph-to-agent",
    title: "从手写图到 create_deep_agent",
    menuTitle: "起点对照",
    summary:
      "先把基线摆出来：同样的任务，手写版要自己接模型、接工具、写路由；这一课换成一行拿到配好的 agent，看清它到底省了什么、又多了什么。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.minimal",
        "打印出一条完整回答；消息序列里能看到内置工具被自动调用",
      ],
    },
    concepts: [
      {
        text: "`create_deep_agent` — 拿到一个已配置好的 agent：模型、内置工具、系统提示都由它装好",
      },
      { text: "`invoke` — 跑一次 agent，输入输出都是消息列表（底层就是 LangGraph 的图）" },
    ],
    conceptArticle: {
      title: "Deep Agents 是什么：与 LangGraph、编排平台的分工",
      body: [
        "## 它是什么",
        "一个包，入口是 `create_deep_agent`。调用一次拿到的是一张「已经配好的图」：模型加工具循环的骨架、一段很长的系统提示、一组内置工具（待办、文件、子任务），以及上下文管理的中间件。",
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
        path: "src/minimal.py",
        order: 1,
        action: "create",
        hint: "最小示例：一个模型 + 一个任务，先看默认行为。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

# 脚本是裸 Python 进程，环境变量自己读
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

# 手写版要自己写 llmCall / toolNode / route 三件套；这里一行拿到配好的 agent
agent = create_deep_agent(model=model, tools=[])

# 输入输出都是消息列表：底层就是一张 LangGraph 图
result = agent.invoke(
    {"messages": [{"role": "user", "content": "比较三种切块策略的取舍"}]}
)

for message in result["messages"]:
    print(message.type, str(message.content)[:120])
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
    slug: "builtin-tools",
    title: "内置工具：默认给了哪些家伙什",
    menuTitle: "内置工具",
    summary:
      "默认装好的工具不是随手加的：文件四件套解决「产物往哪放」，待办工具解决「进度往哪记」。这一课先把消息序列里的工具调用看清楚。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.tools_demo",
        "打印出每次工具调用的名字与参数，能看到写文件与读文件成对出现",
      ],
    },
    concepts: [
      { text: "`write_file` — 把内容写进虚拟文件，产物不再占用上下文" },
      { text: "`read_file` — 按需把文件片段读回上下文" },
      { text: "`edit_file` — 局部修改已有文件，而不是整份重写" },
      { text: "`ls` — 列出虚拟文件，确认当前有哪些产物" },
    ],
    files: [
      {
        path: "src/tools_demo.py",
        order: 1,
        action: "create",
        hint: "跑一个会产出文件的任务，把工具调用逐条打印出来。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

agent = create_deep_agent(model=model, tools=[])

result = agent.invoke(
    {
        "messages": [
            {
                "role": "user",
                "content": "把三份材料的要点分别写进 notes-1.md、notes-2.md、notes-3.md，再列出目录",
            }
        ]
    }
)

# 内置工具在消息里留下痕迹：write_file / read_file / edit_file / ls
for message in result["messages"]:
    for call in getattr(message, "tool_calls", None) or []:
        print(call["name"], call["args"])

# 状态里能直接看到产出的文件
print("文件：", list((result.get("files") or {}).keys()))
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 内置工具",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
      {
        title: "LangChain 工具",
        href: "https://docs.langchain.com/oss/python/langchain/tools",
      },
    ],
  },
  {
    kind: "project",
    slug: "planning",
    title: "Planning：长任务不跑偏",
    menuTitle: "Planning",
    summary:
      "长任务最容易出的问题不是「做错」，而是「做着做着忘了要做什么」。这一课看待办清单怎么生成、怎么更新，以及它什么时候会失效。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.minimal",
        "打印出待办清单的每一版：能看到条目被逐条完成，而不是列完就不动",
      ],
    },
    concepts: [
      { text: "`write_todos` — 模型用来生成与更新待办清单的工具" },
      { text: "`todos` — 状态里存放待办清单的字段，逐条带状态（待办 / 进行中 / 完成）" },
    ],
    files: [
      {
        path: "src/minimal.py",
        order: 1,
        action: "replace",
        hint: "覆盖成「需要拆解」的任务，并打印待办清单的每一版。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

agent = create_deep_agent(model=model, tools=[])

# 这一步容易被跳过：任务必须真的需要拆解，清单才有意义
result = agent.invoke(
    {
        "messages": [
            {
                "role": "user",
                "content": "读完 content/ 下的三份材料，写一份对比报告到 report.md，并要求每个结论都标出处",
            }
        ]
    }
)

# 待办清单是状态字段：模型每次调用 write_todos 都会覆盖成最新一版
for message in result["messages"]:
    for call in getattr(message, "tool_calls", None) or []:
        if call["name"] == "write_todos":
            print(call["args"])

print("最终清单：", result.get("todos"))
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 规划",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
      {
        title: "LangChain 中间件",
        href: "https://docs.langchain.com/oss/python/langchain/middleware",
      },
    ],
  },
  {
    kind: "project",
    slug: "virtual-filesystem",
    title: "虚拟文件系统：为什么用文件代替上下文",
    menuTitle: "文件系统",
    summary:
      "上下文不是仓库，是工作台。这一课把大产物写进虚拟文件，只把需要的片段读回来，并对比两种做法的输入规模。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.minimal",
        "打印出虚拟文件清单与两次运行为模型提供的输入规模，写文件那次的输入明显更小",
      ],
    },
    concepts: [
      { text: "`files` — 状态里存放虚拟文件的字段：路径到内容的映射，跨轮持久" },
    ],
    files: [
      {
        path: "src/minimal.py",
        order: 1,
        action: "replace",
        hint: "覆盖成两段对照：先把产物写文件，再只读回需要的片段。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

agent = create_deep_agent(model=model, tools=[])

# ① 产物写进虚拟文件：文件内容留在状态里，不进 prompt
first = agent.invoke(
    {
        "messages": [
            {
                "role": "user",
                "content": "读 content/ 下的材料，把每篇的要点写进 summary-1.md，不要复述原文",
            }
        ]
    }
)
print("文件：", list((first.get("files") or {}).keys()))

# ② 第二轮只读回需要的那一份：上下文里只有片段，没有全文
second = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "只读 summary-1.md，用三句话写一份摘要"}
        ]
    }
)
print("第二轮输入规模：", sum(len(str(m.content)) for m in second["messages"]))
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
    slug: "subagents",
    title: "Subagents：把活分出去，也把上下文隔开",
    menuTitle: "子 agent",
    summary:
      "子 agent 的价值不在「多一个大脑」，而在上下文隔离与权限收窄：各干各的，互不污染，只给它该有的工具。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.subagents",
        "消息里能看到主 agent 通过子任务把查资料与写稿分开，子 agent 的工具集各不相同",
      ],
    },
    concepts: [
      { text: "`subagents` — create_deep_agent 的参数：声明可被派活的子 agent 名单" },
      { text: "`task` — 主 agent 派活的工具：把子任务连同上下文一起交给某个子 agent" },
    ],
    files: [
      {
        path: "src/subagents.py",
        order: 1,
        action: "create",
        hint: "定义两个子 agent：一个只查资料，一个只写稿。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

# ① 子 agent 各自的边界：做什么、能碰哪些工具
researcher = {
    "name": "researcher",
    "description": "只负责读 content/ 下的材料并提炼要点，不写报告",
    "system_prompt": "读材料、提炼要点，产出放进 notes.md；不做总结陈词。",
    "tools": [],
}

writer = {
    "name": "writer",
    "description": "只负责根据 notes.md 写出带出处的报告",
    "system_prompt": "只依据 notes.md 写作，每个结论都标出来源文件。",
    "tools": [],
}

# ② 主 agent 通过 task 把活分出去；上下文按子 agent 隔离
agent = create_deep_agent(model=model, tools=[], subagents=[researcher, writer])

result = agent.invoke(
    {
        "messages": [
            {"role": "user", "content": "读材料后写一份报告到 report.md，要求带出处"}
        ]
    }
)

for message in result["messages"]:
    for call in getattr(message, "tool_calls", None) or []:
        print(call["name"], str(call["args"])[:80])
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
    slug: "parallel-subagents",
    title: "并行子 agent：同一轮同时开几路",
    menuTitle: "并行",
    summary:
      "互不依赖的子任务没有理由排队。这一课让主 agent 在同一轮派出多个子任务，并说明底层的并行机制与合并要求。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.subagents",
        "打印出同一轮里的多个子任务调用，且最终产物包含全部来源",
      ],
    },
    concepts: [
      { text: "`Send` — 底层机制：同一轮为每个子任务生成一次调用，多路并行执行" },
    ],
    files: [
      {
        path: "src/subagents.py",
        order: 1,
        action: "replace",
        hint: "覆盖成多路调研：一次派三个子任务，再汇总。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

researcher = {
    "name": "researcher",
    "description": "读一份材料并提炼要点到独立文件",
    "system_prompt": "只处理被指定的那一份材料，产出独立的 notes 文件。",
    "tools": [],
}

agent = create_deep_agent(model=model, tools=[], subagents=[researcher])

# 三个子任务互不依赖：底层按同一轮派发（等价于为每个任务生成一次 Send 调用）
result = agent.invoke(
    {
        "messages": [
            {
                "role": "user",
                "content": "分别读三份材料，各写一份 notes 文件，最后合并成 report.md",
            }
        ]
    }
)

calls = [c for m in result["messages"] for c in (getattr(m, "tool_calls", None) or [])]
print("子任务调用数：", len([c for c in calls if c["name"] == "task"]))
print("产出文件：", list((result.get("files") or {}).keys()))
`,
      },
    ],
    docLinks: [
      {
        title: "Deep Agents 概览",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
      {
        title: "LangGraph 并行",
        href: "https://docs.langchain.com/oss/python/langgraph/graph-api",
      },
    ],
  },
  {
    kind: "project",
    slug: "middleware",
    title: "中间件：上下文怎么裁，由钩子说了算",
    menuTitle: "中间件",
    summary:
      "长对话迟早会撑爆上下文。与其祈祷提示词管用，不如把「什么时候摘要、保留什么」写成可配置的钩子。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.subagents",
        "多轮之后模型收到的输入不随轮数线性增长，且关键事实仍在回答里",
      ],
    },
    concepts: [
      {
        text: "`middleware` — create_deep_agent 的参数：在模型调用与工具调用前后挂钩子",
      },
    ],
    files: [
      {
        path: "src/subagents.py",
        order: 1,
        action: "replace",
        hint: "覆盖成挂中间件：摘要压历史，另加一个只做记录的钩子。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

# 中间件是横切面：模型调用前后、工具调用前后都能挂
# 摘要类中间件负责把过长的历史压掉；具体类名以官方文档为准
agent = create_deep_agent(model=model, tools=[], middleware=[])

# 连续多轮：观察输入规模是否随轮数线性膨胀
state = {"messages": [{"role": "user", "content": "先记住：报告要求带出处"}]}
for turn in range(6):
    state["messages"].append({"role": "user", "content": f"第 {turn + 1} 轮：补充一条要点"})
    result = agent.invoke(state)
    state["messages"] = result["messages"]
    size = sum(len(str(m.content)) for m in state["messages"])
    print("轮次", turn + 1, "输入规模", size)

print("关键事实仍在：", any("出处" in str(m.content) for m in state["messages"]))
`,
      },
    ],
    docLinks: [
      {
        title: "LangChain 中间件",
        href: "https://docs.langchain.com/oss/python/langchain/middleware",
      },
      {
        title: "上下文管理",
        href: "https://docs.langchain.com/oss/python/langchain/short-term-memory",
      },
    ],
  },
  {
    kind: "project",
    slug: "memory-and-hitl",
    title: "记忆与人在环：把底层能力接进来",
    menuTitle: "记忆与审批",
    summary:
      "checkpointer、Store、interrupt 都不是这一层发明的，是底层图的能力。这一课把它们接到 deep agent 上，并说明重跑幂等的要求。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.subagents",
        "写文件前挂起并等待批准；批准后继续，换了 thread 仍记得上一次的偏好",
      ],
    },
    concepts: [
      { text: "`checkpointer` — 按 thread 保存每一步状态，支持续跑与恢复" },
      { text: "`store` — 跨 thread 的长期记忆，节点与工具都能读写" },
      { text: "`interrupt` — 让图在执行中途停下来等人，再带着答复继续" },
    ],
    files: [
      {
        path: "src/subagents.py",
        order: 1,
        action: "replace",
        hint: "覆盖成带记忆与审批：挂 checkpointer 与 store，写文件前先挂起。",
        code: `import os
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.memory import InMemoryStore

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

# 接入点：checkpointer 管 thread 内续跑，store 管跨 thread 记忆
# 写文件这类副作用要先挂起等人确认（interrupt），再恢复执行
agent = create_deep_agent(
    model=model,
    tools=[],
    checkpointer=InMemorySaver(),
    store=InMemoryStore(),
)

config = {"configurable": {"thread_id": "report-1"}}
result = agent.invoke(
    {"messages": [{"role": "user", "content": "把结论写进 report.md"}]},
    config,
)

# 挂起时状态里有待处理的中断；恢复用 Command(resume=...)
print("中断：", result.get("__interrupt__"))
# 恢复时节点会整段重跑：发通知、扣款这类动作必须可重复执行
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
  {
    kind: "project",
    slug: "local-server",
    title: "本地服务：用 Studio 看 planner 与子 agent",
    menuTitle: "本地服务",
    summary:
      "调试 deep agent 最有效的手段不是打印日志，而是看整棵调用树：谁派的活、几个子 agent、各自烧了多少。",
    install: {
      command: "uv add --dev langgraph-cli[inmem]",
      description: "在 my-deepagents-app 目录执行，装上本地 Agent Server 的命令行工具。",
    },
    verify: {
      label: "跑起来看层级",
      description: [
        "在 my-deepagents-app 目录执行 uv run langgraph dev",
        "打开打印出来的 Studio 地址，能看到主 agent、子 agent 与工具调用各成一层的调用树",
      ],
    },
    concepts: [
      { text: "`langgraph.json` — 本地服务的配置：把哪张图注册成哪个名字、读哪个 env 文件" },
      { text: "`langgraph dev` — 起本地 Agent Server（内存模式），Studio 直接连它看调用树" },
    ],
    files: [
      {
        path: "langgraph.json",
        order: 1,
        action: "create",
        hint: "把图注册成名字叫 agent 的服务入口，env 指向已有的 .env.local。",
        code: `{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/minimal.py:agent"
  },
  "env": ".env.local"
}`,
      },
      {
        path: "终端",
        order: 2,
        action: "run",
        hint: "起本地服务（内存模式），按打印出来的地址打开 Studio：",
        code: `uv run langgraph dev`,
      },
    ],
    docLinks: [
      {
        title: "本地 Agent Server",
        href: "https://docs.langchain.com/oss/python/langgraph/local-server",
      },
      {
        title: "LangSmith 观测",
        href: "https://docs.langchain.com/oss/python/langgraph/observability",
      },
    ],
  },
  {
    kind: "project",
    slug: "selection-and-eval",
    title: "选型与评测：什么时候该用深 agent",
    menuTitle: "选型与评测",
    summary:
      "把「用不用」讲清楚：同一任务跑手写图与 deep agent，比步数、输入规模与结果质量，得出自己的判断线。",
    verify: {
      label: "跑脚本看结果",
      description: [
        "在 my-deepagents-app 目录执行 uv run python -m src.eval_compare",
        "打印出两种实现的步数与输入规模对比，以及一份按三条判断线写出的选用结论",
      ],
    },
    concepts: [
      { text: "`evaluate` — LangSmith 的评测入口：按数据集批量跑并算分" },
      { text: "`recursion_limit` — 一次运行允许走多少步的上限，长任务必须显式设置" },
    ],
    files: [
      {
        path: "src/eval_compare.py",
        order: 1,
        action: "create",
        hint: "对照脚本：同一任务分别跑两种实现，把规模与质量指标打出来。",
        code: `import os
import time
from pathlib import Path

from deepagents import create_deep_agent
from dotenv import load_dotenv
from langchain_deepseek import ChatDeepSeek

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")
model = ChatDeepSeek(model="deepseek-chat", api_key=os.environ["DEEPSEEK_API_KEY"])

agent = create_deep_agent(model=model, tools=[])
question = "读 content/ 下的材料，写一份带出处的对比报告到 report.md"

# 步数上限放在 config 顶层，不是 configurable 里
start = time.time()
result = agent.invoke(
    {"messages": [{"role": "user", "content": question}]},
    {"recursion_limit": 40},
)

messages = result["messages"]
print("耗时：", round(time.time() - start, 1), "秒")
print("消息数：", len(messages))
print("输入规模：", sum(len(str(m.content)) for m in messages))
print("产出：", list((result.get("files") or {}).keys()))

# 批量评测走 LangSmith 的 evaluate：先建数据集，再按评分器跑一遍
# 三条判断线：任务是否长（多步需记进度）、产物是否大（需文件系统）、
# 子任务是否可并行且需要上下文隔离。三条都不占，就用一条简单的链。
print("按三条判断线写出结论，再决定要不要继续加子 agent 与中间件")
`,
      },
    ],
    docLinks: [
      {
        title: "LangSmith 评测",
        href: "https://docs.langchain.com/langsmith/evaluation",
      },
      {
        title: "Deep Agents 概览",
        href: "https://docs.langchain.com/oss/python/deepagents/overview",
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}
