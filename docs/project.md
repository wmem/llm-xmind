# 项目总览

`llm-xmind` 是一个面向 AI Agent 的 XMind 生成工具。它让 AI 只输出严格的 YAML/JSON 结构化数据，再由本工具完成解析、schema 校验、语义校验、内部引用生成和 `.xmind` 文件写出。

## 使用场景

- 将聊天记录总结为可打开、可继续编辑的 XMind 文件。
- 在 Agent 工作流中把对话、需求、方案、决策和风险沉淀成思维导图。
- 给上层应用提供 TypeScript API，把结构化思维导图数据转换成 `.xmind`。
- 通过独立二进制在不依赖本仓库源码路径的环境中运行 CLI。

## 核心目标

- AI 友好：AI 不需要输出 ID、ref、uuid 或 XMind 内部引用。
- 输出稳定：输入必须先通过 JSON Schema 和语义校验。
- 能力真实：schema 只暴露当前可以转换到 `xmind-generator` 的字段。
- 易集成：同时提供 CLI、可编译二进制、TypeScript API、`schema.json` 和 `ai-template.md`。

## 当前功能

- 支持 YAML、YML、JSON 输入。
- 支持多 sheet。
- 支持递归子 topic，项目不人为限制 topic 层级。
- 支持 topic 字段：`title`、`note`、`labels`、`markers`、`image`、`children`、`relationships`、`summaries`。
- 自动生成内部 topic ref。
- 支持 relationship 使用标题路径引用 topic，且 relationship 可以引用 root。
- 支持 summary 使用标题路径引用同一 parent 下的直接 children。
- 支持 `file`、`data-uri`、`svg` 三类图片输入。
- 支持 SVG data URI 规范化为原始 SVG 资源写入 XMind。
- 提供 `schema.json` 和 AI 输出模板。
- 提供 `bun run compile` 编译独立二进制。

## 非目标

- 不做通用 XMind 编辑器。
- 不暴露 XMind 内部 ID 给 AI。
- 不支持 `xmind-generator` 没有公开 builder 能力的字段。
- 不做 SVG 转 PNG；SVG 直接按 `xmind-generator` 可接受资源写入。
- 不承诺数学意义的无限 topic 层级；实际规模受运行时、内存、`xmind-generator` 和客户端限制。

## 使用入口

CLI：

```bash
bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
bun run llm-xmind --print-schema
bun run llm-xmind --print-ai-template
```

独立二进制：

```bash
bun run compile
./dist/llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
```

TypeScript API：

```ts
import {
  generateXmindFile,
  parseMindMapInput,
  validateMindMapDocument,
} from "llm-xmind";

const parsed = await parseMindMapInput("input.yaml");
const document = validateMindMapDocument(parsed);
await generateXmindFile(document, "output.xmind");
```

## 路线图

- 增强 AI 模板：沉淀更多场景模板，例如会议纪要、代码评审、需求拆解、架构设计。
- 增强错误输出：针对路径错误、summary 错误、marker 冲突提供更可操作的修复建议。
- 增强大文件能力：评估极深 topic 和大量图片输入时的栈、内存和生成性能。
- 增强发布流程：补充 npm/bin 发布配置、版本策略和 release checklist。
- 增强兼容性验证：增加更多 XMind 客户端和 MindMaster 打开结果的人工验证记录。

