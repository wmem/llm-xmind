# llm-xmind

`llm-xmind` 是一个 AI 友好的 XMind 生成工具。推荐工作流是：AI 只输出严格的 YAML/JSON 结构化数据，本工具负责解析、校验语法和语义约束，然后生成 `.xmind` 文件。

## 安装依赖

```bash
bun install
```

## CLI 使用

```bash
bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
```

CLI 会读取 YAML 或 JSON 输入，校验通过后写出 XMind 文件。

## TypeScript API

核心调用链：

```ts
import {
  generateXmindFile,
  parseMindMapInput,
  validateMindMapDocument,
} from "llm-xmind";

const parsed = await parseMindMapInput("fixtures/minimal.yaml");
const document = validateMindMapDocument(parsed);
await generateXmindFile(document, "tmp/minimal.xmind");
```

也就是：

```text
parseMindMapInput -> validateMindMapDocument -> generateXmindFile
```

## AI 输出要求

- 只输出 YAML/JSON，不输出解释文字、Markdown 围栏或额外说明。
- 不要生成 ID。本工具会根据标题路径解析 topic。
- `relationships` 和 `summaries` 使用 `fromPath` / `toPath` 标题路径引用 topic。
- 引用 root topic 时使用空数组 `[]`。例如 relationship 可以使用 `fromPath: []` 引用 root。

## Schema 示例

```yaml
version: "1"
sheets:
  - title: 示例
    root:
      title: Root
      children:
        - title: A
          children:
            - title: A1
        - title: B
        - title: C
      relationships:
        - title: Root to A1
          fromPath: []
          toPath:
            - A
            - A1
      summaries:
        - title: B-C 概要
          fromPath:
            - B
          toPath:
            - C
```

常用 topic 字段：

- `title`：必填，非空字符串。
- `note`：备注文本。
- `labels`：标签数组。
- `markers`：标记数组。
- `image`：图片资源。
- `children`：子 topic 数组。
- `relationships`：当前 topic 下定义的关系线。
- `summaries`：当前 topic 下定义的概要。

## 图片说明

`image` 支持以下形式：

```yaml
image:
  kind: file
  path: fixtures/image.svg
```

```yaml
image:
  kind: data-uri
  name: image.png
  data: data:image/png;base64,...
```

```yaml
image:
  kind: svg
  name: image.svg
  content: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
```

```yaml
image:
  kind: data-uri
  name: image.svg
  data: data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E
```

说明：

- 支持 `file`、非 SVG data URI、SVG XML、SVG data URI。
- SVG data URI 会规范化为原始 SVG 资源写入 XMind。
- 不做 SVG 转 PNG。如果需要 PNG，请在输入中直接提供 PNG 文件或 PNG data URI。
- SVG 内容必须是完整 `<svg>` 文档。

## 语义约束

- 同一个 parent 下的同级 topic 标题必须唯一。
- `summary` 只能覆盖定义它的 topic 的直接 children。
- `summary` 不支持单点范围。
- 同一个 topic 下的 `summary` 范围不能重叠。
- `relationship` 的 `fromPath` / `toPath` 必须引用已存在 topic。
- `relationship` 可以使用 `[]` 引用 root topic。

## 验证命令

```bash
bun test
bunx tsc --noEmit
mkdir -p tmp
bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
bun run llm-xmind fixtures/complete.yaml -o tmp/complete.xmind
test -s tmp/minimal.xmind
test -s tmp/complete.xmind
```
