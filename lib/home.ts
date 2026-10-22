export type HomeSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

import type { DocLink } from "@/lib/doc-link";

export type HomeDocLink = DocLink;

export type HomeStackItem = {
  label: string;
  value: string;
};

export const HOME_INIT_PATH = "/lab/getting-started";

export const HOME = {
  title: "Deep Agents Lab",
  sections: [
    {
      title: "什么是 Deep Agents",
      paragraphs: [
        "Deep Agents 是建在 LangGraph 之上的一套预置 agent 架构，把「长任务该怎么组织」沉淀成默认配置：待办清单、虚拟文件系统、子 agent、上下文压缩。",
        "它不替代图，而是给你一份已经配好的图。学它的重点不是记 API，而是看清它替做了什么决定 —— 以及不用它的时候，那些决定要自己拿。",
      ],
    },
    {
      title: "核心组成",
      bullets: [
        "Planning —— 待办清单：长任务里让进度可见、可更新。",
        "虚拟文件系统 —— 大产物写文件，只把需要的片段读回上下文。",
        "Subagents —— 子任务分出去，上下文与工具权限各自隔离。",
        "Middleware —— 模型调用与工具调用前后的横切面，摘要与裁剪挂在这里。",
        "继承自底层 —— checkpointer（续跑）、Store（长期记忆）、interrupt（人工审批）。",
      ],
    },
    {
      title: "本 Lab 讲什么",
      paragraphs: [
        "本 Lab 采用项目驱动式学习：在独立的 TypeScript 项目 my-deepagents-app 里，按左侧课程把一个「技术调研报告 agent」逐步搭起来。",
        "学习路径（5 课）：它是什么 → 上下文工程 → 后端 → 子 agent → 记忆与审批。只留五个核心概念，其余能力在对应课的注释与延伸阅读里带过。",
      ],
    },
    {
      title: "怎么读这个 Lab",
      bullets: [
        "每课页上半部分是知识点（本课出现的 API），下半部分是操作列表：装依赖 → 创建文件 → 粘贴代码 → 验收。",
        "每课都带一个对照物：不用它手写要写什么、它替做了什么决定。只讲功能不讲对照的课不算完成。",
        "右侧是本课用到的官方文档；知识点右上角偶尔会有「延伸阅读」，讲一个相关但不在主线里的概念。",
      ],
    },
  ] satisfies HomeSection[],
  stack: {
    title: "本教程技术栈",
    items: [
      { label: "语言", value: "TypeScript（Node 20+）" },
      { label: "环境工具", value: "pnpm + tsx" },
      { label: "agent 架构", value: "deepagents（基于 LangGraph）" },
      { label: "底层编排", value: "@langchain/langgraph" },
      { label: "模型", value: "DeepSeek（@langchain/deepseek 的 ChatDeepSeek）" },
      { label: "文档对照", value: "官方 Python 文档 + TS 类型定义" },
      { label: "验证方式", value: "每课一个可独立运行的 TS 脚本" },
    ] satisfies HomeStackItem[],
  },
  cta: {
    label: "立即开始",
    href: HOME_INIT_PATH,
  },
  docLinks: [
    {
      title: "Deep Agents 概览",
      href: "https://docs.langchain.com/oss/python/deepagents/overview",
    },
    {
      title: "LangGraph 文档",
      href: "https://docs.langchain.com/oss/python/langgraph/overview",
    },
    {
      title: "持久化",
      href: "https://docs.langchain.com/oss/python/langgraph/persistence",
    },
    {
      title: "人在环",
      href: "https://docs.langchain.com/oss/python/langgraph/interrupts",
    },
    {
      title: "LangSmith 评测",
      href: "https://docs.langchain.com/langsmith/evaluation",
    },
  ] satisfies HomeDocLink[],
};
