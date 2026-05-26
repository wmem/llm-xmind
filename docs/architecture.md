# 架构说明

## 总体流程

```text
YAML/JSON 文件
  -> parseMindMapInput
  -> validateMindMapDocument
  -> validateSemantics
  -> compileMindMapDocument
  -> convertToWorkbook
  -> generateXmindFile
  -> .xmind
```

CLI 和 API 共用同一条核心管线。CLI 只负责参数解析、错误输出和落盘入口，不绕过任何校验阶段。

## 模块职责

| 模块 | 职责 |
| --- | --- |
| `src/types.ts` | 定义 AI 输入类型、编译后中间类型和领域错误类型。 |
| `src/parser.ts` | 读取 `.json`、`.yaml`、`.yml` 并解析为未知对象。 |
| `src/schema.ts` | 定义运行时 JSON Schema，并用 Ajv 校验结构、类型、枚举和未知字段。 |
| `src/semantic.ts` | 校验跨字段语义：路径存在、同级标题唯一、marker 组冲突、summary 归属和范围。 |
| `src/compiler.ts` | 生成内部 ref、构建每个 sheet 内的 path index。 |
| `src/converter.ts` | 把编译模型转换为 `xmind-generator` workbook builder。 |
| `src/image.ts` | 解析和规范化图片输入，尤其是 SVG 和 SVG data URI。 |
| `src/markers.ts` | 封装 `xmind-generator` 支持的 marker 名称和冲突规则。 |
| `src/writer.ts` | 执行语义校验、编译、转换、归档并写出 `.xmind` 文件。 |
| `src/cli.ts` | 命令行入口，支持生成文件、打印 schema、打印 AI 模板。 |
| `src/assets.ts` | 导出 AI 模板文本。 |
| `src/index.ts` | 公共 TypeScript API 出口。 |

## 输入模型

AI 输入模型以标题路径引用 topic：

- root path 固定为 `[]`。
- 子 topic path 是从 root children 开始的标题数组，例如 `["A", "A1"]`。
- 同一 parent 下的 sibling title 必须唯一，否则路径无法稳定解析。

AI 不输出 ID。内部 ref 由 `compiler` 按 sheet 和 topic 顺序生成，例如 `sheet-0/topic-0-1`。

## Schema 校验

`src/schema.ts` 的 `mindMapDocumentSchema` 是运行时 schema。根目录 `schema.json` 必须与它保持一致，由 `tests/assets.test.ts` 防漂移。

schema 负责：

- 必填字段。
- 字段类型。
- 非空字符串。
- marker enum。
- image variant discriminator。
- 拒绝未知字段。

schema 不负责：

- 路径是否存在。
- 同级标题是否重复。
- relationship/summary 的业务语义。
- 图片文件是否存在或 SVG 内容是否有效。

## 语义校验

`src/semantic.ts` 在每个 sheet 内构建路径索引，然后校验：

- 同级 topic title 唯一。
- relationship 的 `fromPath` 和 `toPath` 存在。
- summary 端点存在，不能引用 root。
- summary 必须定义在端点共同 parent topic 上。
- summary 端点必须是 owner topic 的直接 children。
- summary 不支持单点范围。
- 同一 owner 下不允许重复端点集合，例如 `A -> B` 与 `B -> A` 等价。
- marker 同组冲突。

## 转换层

`src/converter.ts` 把 `CompiledDocument` 转成 `xmind-generator` 的 workbook builder：

- sheet root 转成 `RootTopic`。
- child topic 转成 `Topic`。
- relationships 收集到 sheet root。
- summaries 写在所属 topic 上。
- image 先经 `resolveMindMapImage` 规范化。

转换层保留部分 fail-fast 校验，避免绕过 writer 时被 `xmind-generator` 静默丢数据，例如重复 summary 范围。

## 图片处理

支持三类 image：

- `file`：读取本地文件并交给 `xmind-generator`。
- `data-uri`：非 SVG data URI 原样传递。
- `svg`：内联 SVG XML 转为原始 SVG bytes。

SVG data URI 会被解码为原始 SVG bytes，避免写入 `data:image/svg+xml,...` 字符串资源。

## 输出

`generateXmindFile` 不使用 `xmind-generator` 的 `writeLocalFile`，而是直接：

1. `workbook.archive()`。
2. `Buffer.from(arrayBuffer)`。
3. `fs.writeFile(outputPath, buffer)`。

这样可以明确等待写文件完成，并把文件系统错误直接返回给调用者。

