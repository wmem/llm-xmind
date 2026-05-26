# 不变量：标题路径引用模型

## 规则

topic 引用统一使用标题路径：

- root path 是 `[]`。
- child path 从 root children 开始，例如 `["A", "A1"]`。
- 同一 parent 下 sibling title 必须唯一。
- path index 只在单个 sheet 内生效，不跨 sheet 共享。

## 适用范围

- `relationships.fromPath`
- `relationships.toPath`
- `summaries.fromPath`
- `summaries.toPath`

## 语义边界

- relationship 可以引用 root。
- summary 不能引用 root。
- summary 必须定义在端点的共同 parent topic 上。
- summary 端点必须是 owner topic 的直接 children。

## 测试

主要测试文件：

- `tests/semantic.test.ts`
- `tests/compiler.test.ts`
- `tests/converter.test.ts`

