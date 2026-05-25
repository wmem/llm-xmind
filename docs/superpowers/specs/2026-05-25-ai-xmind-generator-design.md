# AI 友好的 XMind 生成工具设计

## 背景

目标是构建一个基于 Bun.js 和 TypeScript 的工具，让 AI 能稳定地把聊天内容总结成结构化 YAML 或 JSON，再由工具转换为 `.xmind` 文件。

第一版同时提供：

- 可复用 TypeScript 库：供后续 HTTP API、MCP、其他服务集成。
- CLI 工具：供本地脚本和 AI Agent 直接调用。

底层 XMind 文件生成使用 `xmind-generator`。项目自身不直接拼装 `.xmind` 压缩包格式，而是把稳定、可校验的 AI 输入 schema 映射到该库支持的对象和方法。

## 目标

- 定义 AI 友好的 `MindMapDocument` schema。
- 支持 JSON 与 YAML 输入。
- 校验输入结构、字段类型、枚举值和引用一致性。
- 将合法输入转换为 `xmind-generator` workbook 并写出 `.xmind` 文件。
- 尽量覆盖 `xmind-generator` 支持的信息面，包括主题、子主题、标记、备注、关系线、概要、图片、链接、样式与布局等。
- 用测试保证 schema 定义的所有格式都被验证和转换。

## 非目标

- 第一版不调用大模型，不负责聊天内容摘要本身。
- 第一版不提供 Web UI。
- 第一版不做增量编辑现有 `.xmind` 文件。
- 第一版不反向解析 `.xmind` 到 YAML/JSON。

## 使用方式

CLI 示例：

```bash
bun run llm-xmind input.yaml -o output.xmind
```

TS 库示例：

```ts
import { generateXmindFile, parseMindMapInput, validateMindMapDocument } from "llm-xmind";

const document = await parseMindMapInput("input.yaml");
validateMindMapDocument(document);
await generateXmindFile(document, "output.xmind");
```

## 输入模型

顶层结构命名为 `MindMapDocument`。

核心字段：

- `schemaVersion`：schema 版本，第一版为 `"1.0"`。
- `title`：文档标题。
- `metadata`：可选元数据，例如来源、摘要时间、模型名、提示词版本。
- `root`：根主题。
- `relationships`：可选关系线列表。
- `summaries`：可选概要列表。
- `attachments`：可选附件或图片引用信息。
- `settings`：可选 workbook/sheet 级设置。

主题结构命名为 `MindMapTopic`。

主题字段覆盖：

- `id`：可选稳定 ID。未提供时由工具生成。
- `title`：主题标题。
- `children`：子主题。
- `notes`：纯文本或 HTML 备注。
- `labels`：标签列表。
- `markers`：标记列表。
- `link`：外部链接或内部引用。
- `image`：图片路径、URL 或已声明附件引用。
- `style`：主题样式字段。
- `layout`：主题布局字段。
- `structure`：结构类型字段。
- `branch`：分支相关设置。
- `numbering`：编号相关设置。

关系线结构命名为 `MindMapRelationship`。

关系线字段：

- `id`
- `from`
- `to`
- `title`
- `style`
- `controlPoints`

概要结构命名为 `MindMapSummary`。

概要字段：

- `id`
- `title`
- `topicIds`
- `style`

第一版实现时需要以 `xmind-generator` 实际导出的 TypeScript 类型和 README 示例为准。如果该库某些能力没有公开 Builder 方法，schema 中对应字段必须标记为暂不支持，不能假装已转换。

## 示例输入

```yaml
schemaVersion: "1.0"
title: "聊天总结"
metadata:
  source: "chat"
  model: "example-model"
root:
  id: "root"
  title: "AI 友好的 XMind 生成工具"
  notes:
    plain: "把 AI 总结结果转换成 XMind 文件。"
  labels:
    - "设计"
    - "工具"
  children:
    - id: "input"
      title: "输入"
      children:
        - id: "json"
          title: "JSON"
        - id: "yaml"
          title: "YAML"
    - id: "output"
      title: "输出"
      markers:
        - "priority-1"
      children:
        - id: "xmind"
          title: ".xmind 文件"
relationships:
  - id: "rel-input-output"
    from: "input"
    to: "output"
    title: "转换"
summaries:
  - id: "summary-input"
    title: "结构化输入"
    topicIds:
      - "json"
      - "yaml"
```

## 架构

模块划分：

- `src/schema`：TypeScript 类型、JSON Schema、schema 常量。
- `src/parser`：根据扩展名解析 JSON/YAML。
- `src/validator`：执行 schema 校验和引用一致性校验。
- `src/converter`：把 `MindMapDocument` 转成 `xmind-generator` workbook。
- `src/writer`：调用 `xmind-generator` 写出本地文件。
- `src/cli`：解析命令行参数，连接 parser、validator、converter、writer。

数据流：

```text
JSON/YAML 文件
  -> parser
  -> schema validator
  -> semantic validator
  -> converter
  -> xmind-generator
  -> .xmind 文件
```

边界规则：

- parser 只负责语法解析，不做业务校验。
- schema validator 只负责结构、类型、枚举、基础约束。
- semantic validator 负责跨字段规则，例如关系线引用的 topic 是否存在。
- converter 不接受未知结构，调用前必须完成校验。
- CLI 不包含转换规则，只负责组装流程和输出错误。

## 错误处理

错误分为三类：

- `ParseError`：JSON/YAML 语法错误、文件不存在、扩展名不支持。
- `SchemaValidationError`：字段类型、必填字段、枚举值、数组元素等 schema 错误。
- `SemanticValidationError`：关系线、概要、图片引用等跨节点一致性错误。

CLI 输出需要包含：

- 错误类型。
- 字段路径，例如 `root.children[0].markers[1]`。
- 简短原因。
- 对非法引用，输出引用值和可用 ID 范围摘要。

## 测试策略

测试必须保证 schema 定义的所有格式都被验证。

测试分层：

- parser 测试：JSON、YAML、YML 都能解析；非法语法失败。
- schema 测试：覆盖每一个字段的合法与非法形态。
- semantic 测试：覆盖 topic ID、relationship、summary、image/attachment 等引用一致性。
- converter 测试：覆盖 schema 中每一个可转换字段，确认确实传递到 `xmind-generator` 对应结构。
- CLI 测试：从 fixture 输入生成 `.xmind` 文件，并验证文件存在且非空。

fixture 分层：

- `minimal.json` 与 `minimal.yaml`：最小合法输入。
- `complete.json` 与 `complete.yaml`：包含 schema 支持的全部字段。
- `invalid-required-*`：缺少必填字段。
- `invalid-type-*`：字段类型错误。
- `invalid-enum-*`：枚举值非法。
- `invalid-reference-*`：跨字段引用非法。
- `invalid-array-*`：数组为空、元素非法、重复 ID 等边界情况。

覆盖要求：

- 每个 schema 字段都必须有正向测试。
- 每类字段都必须有反向测试。
- 嵌套结构要覆盖到叶子节点。
- 数组字段要覆盖空数组、单项、多项、非法元素。
- YAML 和 JSON 解析后使用同一套 schema 校验。
- converter 测试不能只验证校验通过，还要验证字段被映射。
- 当 schema 增加、删除或修改任何字段时，必须同步更新类型、JSON Schema、fixture、validator 测试和 converter 测试。

## 实现约束

- 使用 Bun.js 作为运行时和测试入口。
- 使用 TypeScript。
- 尽量保持 ESM。
- schema 与 TS 类型需要避免长期漂移。优先从一个来源生成另一个来源，或用测试检测两者一致性。
- 依赖保持克制，核心依赖预计包括：
  - `xmind-generator`
  - YAML 解析库
  - JSON Schema 校验库
  - CLI 参数解析库或轻量自写解析

## 验收标准

- `bun test` 通过。
- `bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind` 能生成非空文件。
- `bun run llm-xmind fixtures/complete.yaml -o tmp/complete.xmind` 能生成非空文件。
- schema 中声明的每个字段都有 validator 测试覆盖。
- schema 中声明的每个可转换字段都有 converter 测试覆盖。
- 非法输入能给出可定位的错误路径。
- README 包含 AI 生成 JSON/YAML 的示例提示词和输入示例。

## 风险与处理

- `xmind-generator` 的公开 API 可能无法覆盖所有 XMind 内部能力。
  - 处理方式：以库公开能力为准，schema 对暂不支持字段明确标注，测试中区分“可校验但不可转换”和“可转换”字段。
- AI 可能生成不稳定字段名或额外字段。
  - 处理方式：schema 默认拒绝未知字段，并在 README 中提供严格输出提示词。
- topic title 可能重复，关系线用 title 引用会不稳定。
  - 处理方式：推荐 AI 生成 `id`，没有 `id` 时工具可生成，但跨节点引用必须使用 `id`。
- YAML 隐式类型可能导致字符串被解析成布尔值或数字。
  - 处理方式：schema 校验会拒绝类型不符；README 提醒 AI 对版本号、ID、日期等使用引号。

## 当前仓库状态说明

当前目录存在 `.git` 空目录，但不是可用 Git 仓库，因此无法完成设计文档提交。后续如果需要提交，需要先修复或重新初始化 Git 仓库。
