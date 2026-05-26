# 不变量：xmind-generator 能力边界

## 规则

项目 schema 必须以 `xmind-generator` 当前可写能力为边界。

当前暴露能力包括：

- sheet title。
- topic title、note、labels、markers、image、children。
- relationships。
- summaries。
- SVG、file image、data URI image。

## 禁止事项

- 不把无法写入 `xmind-generator` 的字段加入 schema。
- 不为兼容看似合理的 AI 输出而静默忽略字段。
- 不依赖 `xmind-generator` 的静默丢弃行为；已知风险要在本项目 fail-fast。

## 特殊依赖

`xmind-generator@1.0.1` 运行时需要 `jszip`，但包元数据未声明该依赖。本项目必须显式依赖并固定 `jszip@3.10.1`。

