# 不变量：校验管线

## 规则

输入必须按固定顺序处理：

```text
parse -> schema validation -> semantic validation -> compile -> convert -> write
```

任何入口都不能绕过 schema 和语义校验直接写文件。

## 职责边界

- parser 只负责读取和解析输入格式。
- schema validator 只负责结构、类型和枚举。
- semantic validator 负责跨字段和业务语义。
- compiler 生成内部 ref 和 path index。
- converter 调用 `xmind-generator`。
- writer 负责完整生成流程和文件写出。

## 维护要求

- CLI 和 API 必须共用同一管线。
- 新增入口时必须复用 `generateXmindFile` 或同等校验流程。
- 转换层可以保留 fail-fast 防御校验，但不能替代语义校验。

