# 功能规格：XMind 转换

## 输入

转换层输入为 `CompiledDocument`，由 `compileMindMapDocument` 生成。

## 输出

输出为 `xmind-generator` 的 workbook builder，再由 writer 调用 `archive()` 写成 `.xmind` zip 文件。

## 转换规则

- 每个 sheet 转成一个 root topic。
- sheet title 写入 root builder。
- topic title、note、labels、markers、image、children 逐层写入。
- relationships 从整棵 topic 树收集后写到 sheet root。
- summaries 写在其所属 topic 上。
- ref 由 compiler 生成，不来自 AI 输入。

## 多 sheet

每个 sheet 有独立 path index。相同标题路径可以出现在不同 sheet 中，不会互相串扰。

## 深层 topic

项目不设置 schema 最大层级。转换层递归处理 children，测试覆盖 13 层嵌套 topic。

## 测试

- `tests/compiler.test.ts`
- `tests/converter.test.ts`
- `tests/writer.test.ts`

