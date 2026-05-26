# 不变量：AI 友好的输入 schema

## 规则

AI 输入 schema 必须保持 AI 友好：

- AI 不输出 ID、ref、uuid 或 XMind 内部引用。
- topic 引用只能使用标题路径 `fromPath` / `toPath`。
- root topic 使用空路径 `[]`。
- schema 拒绝未知字段。
- schema 只暴露当前可以真实转换到 `xmind-generator` 的能力。

## 原因

AI 生成全局唯一 ID 不稳定，也不应该理解 XMind 内部数据结构。标题路径更贴近人类表达，也更容易由 AI 从上下文中生成。

## 维护要求

- 新增字段前必须确认 `xmind-generator` 支持写入。
- 如果字段无法转换，不能先加入 schema。
- 修改 schema 时同步更新 `schema.json`、fixtures、测试和文档。

