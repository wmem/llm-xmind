# llm-xmind AI 输出模板

你需要把聊天内容总结成一个 XMind 思维导图输入文件。

严格要求：

- 默认只输出 YAML；如果上层明确要求 JSON，则只输出等价 JSON。不输出解释文字、Markdown 围栏或额外说明。
- 输出必须符合 schema.json。
- 不要生成 ID、ref、uuid 或任何内部引用字段。
- topic 之间的引用只能使用标题路径 fromPath / toPath。
- fromPath / toPath 使用字符串数组；引用 root topic 时使用 []。
- children 可以继续嵌套，schema 不设置最大层级；实际深度受运行时内存、调用栈和 XMind 客户端能力限制。
- 同一个 parent 下的同级 topic title 必须唯一。
- relationship 可以引用 root；summary 不能引用 root。
- summary 必须定义在 fromPath 和 toPath 的共同父 topic 上，且端点必须是该 topic 的直接 children。
- image 只使用 file、data-uri 或 svg 三种 kind。

请按下面骨架输出：

```yaml
version: "1"
sheets:
  - title: "主题名称"
    root:
      title: "中心主题"
      note: "可选备注"
      labels:
        - "可选标签"
      markers:
        - "priority-1"
      children:
        - title: "一级主题 A"
          children:
            - title: "二级主题 A1"
        - title: "一级主题 B"
      relationships:
        - title: "可选关系标题"
          fromPath: ["一级主题 A", "二级主题 A1"]
          toPath: ["一级主题 B"]
      summaries:
        - title: "概要标题"
          fromPath: ["一级主题 A"]
          toPath: ["一级主题 B"]
```
