# 测试说明

## 测试框架

项目使用 Bun 内置测试框架：

```bash
bun test
```

类型检查：

```bash
bunx tsc --noEmit
```

## 测试目录

```text
tests/
  assets.test.ts      # schema.json 和 ai-template.md 发行产物
  cli.test.ts         # CLI 行为
  compiler.test.ts    # 内部 ref 和 path index
  converter.test.ts   # xmind-generator 转换结果
  image.test.ts       # 图片解析和 SVG 处理
  markers.test.ts     # marker 映射和组冲突
  package.test.ts     # package scripts
  parser.test.ts      # JSON/YAML 解析
  scaffold.test.ts    # 公共 API 出口
  schema.test.ts      # JSON Schema 校验
  semantic.test.ts    # 语义校验
  types.test.ts       # 领域错误类型
  writer.test.ts      # 写出 .xmind 文件
```

## 测试策略

- schema 测试覆盖每个字段的合法和非法形态。
- semantic 测试覆盖跨字段约束和错误定位。
- compiler 测试覆盖内部 ref、path index 和多 sheet 隔离。
- converter 测试直接解包 `content.json`，确认字段写入 `xmind-generator` 结果。
- image 测试覆盖 SVG data URI、inline SVG、file image 和错误路径。
- CLI 测试覆盖生成文件、参数错误、schema/template 打印。
- assets 测试确保 `schema.json` 与运行时 schema 一致，`ai-template.md` 与导出常量一致。

## 添加测试

新增行为时优先按模块添加测试：

- 解析行为：`tests/parser.test.ts`
- schema 字段：`tests/schema.test.ts`
- 语义约束：`tests/semantic.test.ts`
- 转换输出：`tests/converter.test.ts`
- CLI 入口：`tests/cli.test.ts`
- 发行产物：`tests/assets.test.ts`

新增 schema 字段时至少要补：

1. schema 正向测试。
2. schema 反向测试。
3. converter 写入结果测试。
4. complete fixture。
5. `schema.json` 同步。
6. 文档说明。

## 手工验收命令

```bash
bun test
bunx tsc --noEmit
bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
bun run llm-xmind fixtures/complete.yaml -o tmp/complete.xmind
test -s tmp/minimal.xmind
test -s tmp/complete.xmind
bun run compile
./dist/llm-xmind --print-schema
```

