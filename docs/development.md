# 开发说明

## 环境

- 运行时：Bun。
- 语言：TypeScript。
- 主要依赖：
  - `xmind-generator@1.0.1`
  - `jszip@3.10.1`
  - `yaml`
  - `ajv`

安装依赖：

```bash
bun install
```

## 目录约定

```text
src/                 # 源码
tests/               # 单元测试和集成测试
fixtures/            # CLI 和解析测试输入
docs/                # 项目文档
schema.json          # AI 输入 JSON Schema
ai-template.md       # 给 AI 的输出模板
```

## 编码原则

- 保持 AI schema 简洁，不要求 AI 输出 ID。
- 新字段必须能真实转换到 `xmind-generator`，否则不要加入 schema。
- 先做结构校验，再做语义校验，再生成内部模型。
- 对外错误使用领域错误类型，方便 CLI 和上层应用捕获。
- 修改 schema 时必须同步更新：
  - `src/types.ts`
  - `src/schema.ts`
  - `schema.json`
  - `fixtures/complete.yaml`
  - `fixtures/complete.json`
  - schema 测试
  - converter 测试
  - README 和相关 docs

## 错误处理

领域错误定义在 `src/types.ts`：

- `ParseError`：文件读取、格式不支持、JSON/YAML 解析失败。
- `SchemaValidationError`：字段类型、必填字段、未知字段、enum 等 schema 错误。
- `SemanticValidationError`：路径、重复标题、summary、marker 语义错误。
- `ImageError`：图片文件读取、SVG 解析、SVG data URI 解析错误。

CLI 错误输出格式：

```text
ErrorName: message (path)
```

其中 `path` 仅在错误对象带 path 时输出。

## 日志

当前没有独立日志系统。CLI 只输出：

- 成功：`generated <output>`
- 失败：错误名称、错误消息、可选 path

如果后续增加日志，应避免污染 `--print-schema` 和 `--print-ai-template` 的 stdout，因为它们可能被上层工具直接解析。

## 内存和规模

当前实现主要在内存中完成：

- parser 读取完整输入文件。
- image file 读取为 Buffer。
- workbook archive 一次性生成 ArrayBuffer。
- 递归处理 topic children。

因此大型文件、极深 topic、海量图片会受 Bun/JavaScript 内存和调用栈限制。项目语义是“不人为限制 topic 层级”，不是无限规模保证。

## 编译二进制

```bash
bun run compile
```

产物：

```text
dist/llm-xmind
```

`dist/` 不提交到 git。

## 依赖注意事项

`xmind-generator@1.0.1` 运行时会 import `jszip`，但包元数据没有声明 `jszip` 依赖。本项目显式依赖并固定 `jszip@3.10.1`，不要随意删除。

