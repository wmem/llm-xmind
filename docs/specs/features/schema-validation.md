# 功能规格：输入 schema 和语义校验

## Schema 字段

根对象：

- `version`
- `sheets`

sheet：

- `title`
- `root`

topic：

- `title`
- `note`
- `labels`
- `markers`
- `image`
- `children`
- `relationships`
- `summaries`

relationship：

- `title`
- `fromPath`
- `toPath`

summary：

- `title`
- `fromPath`
- `toPath`

## 语义规则

- sibling topic title 必须唯一。
- path 必须在当前 sheet 内存在。
- relationship 可以引用 root。
- summary 不能引用 root。
- summary 只能覆盖定义它的 topic 的直接 children。
- summary 不支持单点范围。
- summary 不允许重复端点集合。
- 不同端点集合的相邻或重叠 summary 范围允许写入。
- marker 同组冲突会被拒绝。

## 测试

- `tests/schema.test.ts`
- `tests/semantic.test.ts`
- `tests/compiler.test.ts`

