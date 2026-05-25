# AI 友好的 XMind 生成工具设计

## 背景

目标是构建一个基于 Bun.js 和 TypeScript 的工具，让 AI 能稳定地把聊天内容总结成结构化 YAML 或 JSON，再由工具转换为 `.xmind` 文件。

第一版同时提供：

- 可复用 TypeScript 库：供后续 HTTP API、MCP、其他服务集成。
- CLI 工具：供本地脚本和 AI Agent 直接调用。

底层 XMind 文件生成使用 `xmind-generator`。schema 不直接暴露 XMind 内部 ID，也不要求 AI 输出构建期引用。AI 只负责表达内容结构；工具负责生成内部引用并调用 `xmind-generator`。

## 已确认的 xmind-generator 能力

基于 `xmind-generator@1.0.1` 的 README、类型声明和实现，公开 builder 能力如下：

- `Workbook(rootBuilder | rootBuilder[])`
- `RootTopic(title)`
- `RootTopic(title).sheetTitle(title)`
- `Topic(title)`
- `.children(Topic[])`
- `.note(string)`：纯文本备注。
- `.labels(string[])`
- `.markers(MarkerId[])`
- `.image(NamedResourceData)`：`{ data, name }`，其中 `data` 可为 `data:${string}`、`ArrayBuffer`、`Buffer` 或 `Uint8Array`。
- `Summary(title, { from, to })`
- `RootTopic(...).summaries(...)`
- `Topic(...).summaries(...)`
- `Relationship(title, { from, to })`
- `RootTopic(...).relationships(...)`
- `.ref(string)`：构建期引用，不写入导出的 XMind 文件。
- `writeLocalFile(workbook, path)`
- `readImageFile(filePath)`

第一版只围绕这些能力建模。没有公开 builder 支持的能力不进入 AI schema。

## 目标

- 定义 AI 友好的输入 schema，让 AI 尽量只输出自然内容和层级结构。
- 支持 JSON 与 YAML 输入。
- 支持单 sheet 和多 sheet。
- 支持主题树、备注、标签、标记、图片、关系线和概要。
- 自动生成内部引用，不要求 AI 输出 ID。
- 校验输入结构、字段类型、枚举值和路径引用一致性。
- 将合法输入转换为 `xmind-generator` workbook 并写出 `.xmind` 文件。
- 用测试保证 schema 定义的所有格式都被验证和转换。

## 非目标

- 第一版不调用大模型，不负责聊天内容摘要本身。
- 第一版不提供 Web UI。
- 第一版不做增量编辑现有 `.xmind` 文件。
- 第一版不反向解析 `.xmind` 到 YAML/JSON。
- 第一版不暴露 XMind 内部 ID。
- 第一版不支持 `xmind-generator` 未公开的 style、layout、structure、relationship control points、HTML note 等字段。

## 设计原则

### AI 友好

schema 应减少 AI 犯错概率：

- 不要求 AI 生成全局唯一 ID。
- 不要求 AI 理解 XMind 内部 ID 或 `xmind-generator` 的 `.ref()`。
- 字段名保持直白，例如 `title`、`children`、`note`、`labels`。
- 引用主题时使用标题路径 `path`，而不是随机 ID。
- 默认禁止同级重复标题，保证路径定位稳定。
- schema 拒绝未知字段，避免 AI 输出看似合理但无效的内容。

### 能力诚实

schema 只声明第一版确实能转换到 `xmind-generator` 的能力。无法转换的字段不进入 schema，避免 AI 生成无效配置。

### 内部编译

工具内部把 AI 输入编译成稳定的中间模型：

- 遍历每个 sheet 的 topic tree。
- 为每个 topic 生成内部 ref，例如 `sheet-0/topic-0-1-2`。
- 建立 `path -> ref` 映射。
- 将 relationship、summary 的路径引用改写成 ref。
- 调用 `xmind-generator` builder。

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

## AI 输入 schema

顶层结构命名为 `MindMapDocument`。

```ts
type MindMapDocument = {
  version: "1";
  sheets: MindMapSheet[];
};
```

### Sheet

```ts
type MindMapSheet = {
  title: string;
  root: MindMapTopic;
};
```

约束：

- `sheets` 至少 1 个。
- `sheet.title` 非空。
- 每个 sheet 内部独立解析路径。

### Topic

```ts
type MindMapTopic = {
  title: string;
  note?: string;
  labels?: string[];
  markers?: MarkerName[];
  image?: MindMapImage;
  children?: MindMapTopic[];
  relationships?: MindMapRelationship[];
  summaries?: MindMapSummary[];
};
```

约束：

- `title` 非空。
- `note` 只支持纯文本。
- `labels` 为字符串数组，元素非空。
- `markers` 只能使用 `xmind-generator` 支持的 marker ID。
- `children` 中同级 topic 的 `title` 默认不得重复。
- `relationships` 和 `summaries` 可以定义在任意 topic 上，但引用范围必须在同一 sheet 内。

### Marker

marker 使用 `xmind-generator` 实际 marker ID 字符串，降低 AI 输出复杂度。

支持值：

- `priority-1` 到 `priority-7`
- `smiley-laugh`
- `smiley-smile`
- `smiley-cry`
- `smiley-surprise`
- `smiley-boring`
- `smiley-angry`
- `smiley-embarrass`
- `task-start`
- `task-oct`
- `task-quarter`
- `task-half`
- `task-done`
- `task-pause`
- `flag-red`
- `flag-orange`
- `flag-dark-blue`
- `flag-purple`
- `flag-green`
- `flag-blue`
- `flag-gray`
- `star-red`
- `star-orange`
- `star-dark-blue`
- `star-purple`
- `star-green`
- `star-blue`
- `star-gray`
- `people-red`
- `people-orange`
- `people-dark-blue`
- `people-purple`
- `people-green`
- `people-blue`
- `people-gray`
- `arrow-left`
- `arrow-right`
- `arrow-up`
- `arrow-down`
- `arrow-left-right`
- `arrow-up-down`
- `arrow-refresh`
- `month-jan`
- `month-feb`
- `month-mar`
- `month-apr`
- `month-may`
- `month-jun`
- `month-jul`
- `month-sep`
- `month-oct`
- `month-nov`
- `month-dec`
- `week-sun`
- `week-mon`
- `week-tue`
- `week-web`
- `week-thu`
- `week-fri`
- `week-sat`

同一个 topic 内不允许出现同组 marker 冲突，例如两个 priority marker。

### Image

```ts
type MindMapImage =
  | { kind: "data-uri"; name: string; data: `data:${string}` }
  | { kind: "file"; path: string }
  | { kind: "svg"; name?: string; content: string };
```

设计规则：

- `data-uri` 直接转换为 `NamedResourceData`。
- `file` 使用 `xmind-generator` 的 `readImageFile` 读取，保持库原生支持能力。
- `svg` 作为 AI 友好输入格式支持，但转换层不直接假定 XMind 客户端可显示 SVG。
- SVG 输入默认渲染成 PNG，再以 `NamedResourceData` 传给 `xmind-generator`。
- SVG 渲染失败时返回可定位错误，不静默丢图。
- 第一版不支持远程 URL 图片下载。

说明：`xmind-generator` 的 `NamedResourceData` 允许任意扩展名文件被打包进资源目录，但这不等价于 XMind 客户端一定能显示该格式。因此 SVG 需要在本工具侧转换为 PNG。

### Relationship

```ts
type MindMapRelationship = {
  title?: string;
  fromPath: string[];
  toPath: string[];
};
```

约束：

- `fromPath` 和 `toPath` 是相对当前 sheet root 的标题路径。
- 路径不包含 root title，从 root 的子节点开始。
- 空路径 `[]` 表示 root topic。
- 路径必须唯一命中一个 topic。
- relationship 只能引用同一 sheet 内 topic。

### Summary

```ts
type MindMapSummary = {
  title: string;
  fromPath: string[];
  toPath: string[];
};
```

约束：

- `fromPath` 和 `toPath` 必须在同一 sheet 内。
- 两个路径对应的 topic 必须拥有同一个父 topic。
- summary 映射到 `xmind-generator` 的 `{ from, to }` 范围。
- 如果两个 topic 不在同一父节点下，校验失败。

## 示例输入

```yaml
version: "1"
sheets:
  - title: "项目讨论"
    root:
      title: "AI 友好的 XMind 生成工具"
      note: "把聊天内容总结成结构化思维导图。"
      labels:
        - "设计"
        - "工具"
      markers:
        - "priority-1"
      children:
        - title: "输入"
          children:
            - title: "YAML"
            - title: "JSON"
        - title: "输出"
          children:
            - title: ".xmind 文件"
      relationships:
        - title: "转换"
          fromPath:
            - "输入"
          toPath:
            - "输出"
      summaries:
        - title: "结构化输入"
          fromPath:
            - "输入"
            - "YAML"
          toPath:
            - "输入"
            - "JSON"
```

## 内部编译模型

内部模型不暴露给 AI。

```ts
type CompiledTopic = {
  ref: string;
  path: string[];
  topic: MindMapTopic;
  children: CompiledTopic[];
};
```

编译步骤：

1. 校验 schema。
2. 遍历每个 sheet，检查同级标题唯一性。
3. 生成内部 ref。
4. 建立 path 索引。
5. 校验 relationship 和 summary 的路径引用。
6. 将 topic tree 转换为 `Topic(...)` / `RootTopic(...)` builder。
7. 转换 marker 字符串为 `MarkerId`。
8. 解析图片为 `NamedResourceData`。
9. 将 relationship 和 summary path 改写为内部 ref。
10. 调用 `Workbook(...)` 和 `writeLocalFile(...)`。

## 架构

模块划分：

- `src/schema`：TypeScript 类型、JSON Schema、schema 常量。
- `src/parser`：根据扩展名解析 JSON/YAML。
- `src/validator`：执行 schema 校验和语义校验。
- `src/compiler`：生成内部 ref、path 索引和编译模型。
- `src/image`：处理 data URI、文件图片和 SVG 转 PNG。
- `src/converter`：把编译模型转成 `xmind-generator` builder。
- `src/writer`：调用 `xmind-generator` 写出本地文件。
- `src/cli`：解析命令行参数，连接 parser、validator、compiler、converter、writer。

数据流：

```text
JSON/YAML 文件
  -> parser
  -> schema validator
  -> semantic validator
  -> compiler
  -> image resolver
  -> converter
  -> xmind-generator
  -> .xmind 文件
```

边界规则：

- parser 只负责语法解析，不做业务校验。
- schema validator 负责结构、类型、枚举、基础约束。
- semantic validator 负责同级标题、路径引用、summary 范围、marker 冲突等跨字段规则。
- compiler 负责生成内部 ref，不修改原始输入对象。
- converter 不接受未验证输入。
- CLI 不包含转换规则，只负责组装流程和输出错误。

## 错误处理

错误分为四类：

- `ParseError`：JSON/YAML 语法错误、文件不存在、扩展名不支持。
- `SchemaValidationError`：字段类型、必填字段、枚举值、数组元素等 schema 错误。
- `SemanticValidationError`：同级标题重复、路径引用非法、summary 范围非法、marker 同组冲突等错误。
- `ImageError`：图片文件读取失败、data URI 非法、SVG 渲染失败。

CLI 输出需要包含：

- 错误类型。
- 字段路径，例如 `sheets[0].root.children[1].markers[0]`。
- 简短原因。
- 对非法路径，输出 `fromPath` 或 `toPath` 和当前 sheet 可用路径摘要。

## 测试策略

测试必须保证 schema 定义的所有格式都被验证。

测试分层：

- parser 测试：JSON、YAML、YML 都能解析；非法语法失败。
- schema 测试：覆盖每一个字段的合法与非法形态。
- semantic 测试：覆盖同级标题唯一性、路径引用、summary 父节点约束、marker 同组冲突。
- compiler 测试：确认内部 ref 生成稳定，path 索引正确。
- image 测试：覆盖 data URI、文件图片、SVG 转 PNG、非法 SVG。
- converter 测试：覆盖 schema 中每一个可转换字段，确认确实传递到 `xmind-generator` 对应结构。
- CLI 测试：从 fixture 输入生成 `.xmind` 文件，并验证文件存在且非空。

fixture 分层：

- `minimal.json` 与 `minimal.yaml`：最小合法输入。
- `complete.json` 与 `complete.yaml`：包含 schema 支持的全部字段。
- `invalid-required-*`：缺少必填字段。
- `invalid-type-*`：字段类型错误。
- `invalid-enum-*`：枚举值非法。
- `invalid-path-*`：路径引用非法。
- `invalid-summary-*`：summary 范围非法。
- `invalid-marker-*`：marker 非法或同组冲突。
- `invalid-image-*`：图片输入非法。
- `invalid-array-*`：数组为空、元素非法等边界情况。

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
- SVG 转 PNG 需要选择可在 Bun/Node 环境落地的库，并用 fixture 验证实际输出。
- 依赖保持克制，核心依赖预计包括：
  - `xmind-generator`
  - YAML 解析库
  - JSON Schema 校验库
  - SVG 渲染或图片转换库
  - CLI 参数解析库或轻量自写解析

## 验收标准

- `bun test` 通过。
- `bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind` 能生成非空文件。
- `bun run llm-xmind fixtures/complete.yaml -o tmp/complete.xmind` 能生成非空文件。
- schema 中声明的每个字段都有 validator 测试覆盖。
- schema 中声明的每个可转换字段都有 converter 测试覆盖。
- SVG 图片输入能转换为可打包的 PNG 资源。
- 非法输入能给出可定位的错误路径。
- README 包含 AI 生成 JSON/YAML 的示例提示词和输入示例。

## 风险与处理

- `xmind-generator` 的公开 API 无法覆盖全部 XMind 能力。
  - 处理方式：第一版 schema 只覆盖公开 builder 支持的能力。
- AI 可能生成不稳定字段名或额外字段。
  - 处理方式：schema 默认拒绝未知字段，并在 README 中提供严格输出提示词。
- topic title 可能重复，路径引用会不稳定。
  - 处理方式：默认禁止同级重复标题；validator 输出重复位置。
- YAML 隐式类型可能导致字符串被解析成布尔值或数字。
  - 处理方式：schema 校验会拒绝类型不符；README 提醒 AI 对版本号、路径片段等使用引号。
- SVG 渲染库可能引入原生依赖或运行时兼容问题。
  - 处理方式：实现计划阶段先做技术验证；如果 Bun 环境不可用，退回到 Node 兼容的转换库或明确降级为 data URI/文件图片。
