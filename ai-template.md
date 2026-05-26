# llm-xmind AI 输出模板

你需要把聊天内容提炼成一个 XMind 思维导图输入文件。目标不是复述聊天记录，而是把信息组织成可扫读、可决策、可继续展开的知识结构。

严格要求：

- 默认只输出 YAML；如果上层明确要求 JSON，则只输出等价 JSON。不输出解释文字、Markdown 围栏或额外说明。
- 输出必须符合 schema.json。
- 不要按聊天时间顺序记录流水账。先归纳主题、结论、问题、方案、决策、风险，再组织层级。
- topic title 只写重点，使用短语、关键词或明确结论；避免整句长段、过程描述、寒暄和无信息量标题。
- 细节、证据、例子、背景、取舍放到 note，不要把所有细节拆成 topic。
- topic 层级表达“概念包含/问题拆解/方案归类/因果关系”，不是对话发生顺序。
- 每层 topic 数量保持克制；合并重复、相近或只差表述的内容。
- 不要生成 ID、ref、uuid 或任何内部引用字段。
- topic 之间的引用只能使用标题路径 fromPath / toPath。
- fromPath / toPath 使用字符串数组；引用 root topic 时使用 []。
- children 可以继续嵌套，schema 不设置最大层级；实际深度受运行时内存、调用栈和 XMind 客户端能力限制。
- 同一个 parent 下的同级 topic title 必须唯一。
- relationship 可以引用 root；summary 不能引用 root。
- summary 必须定义在 fromPath 和 toPath 的共同父 topic 上，且端点必须是该 topic 的直接 children。
- image 只使用 file、data-uri 或 svg 三种 kind。

请按下面风格输出，注意 title 是重点，note 承载解释：

```yaml
version: "1"
sheets:
  - title: "聊天总结"
    root:
      title: "核心主题"
      note: "用 1-3 句话概括这次聊天的背景、目标和最终状态。"
      labels:
        - "总结"
      markers:
        - "priority-1"
      children:
        - title: "关键结论"
          note: "放结论背后的原因、证据、约束或例子。"
          children:
            - title: "结论 A"
              note: "不要写成聊天原句；提炼为可复用判断。"
        - title: "待处理问题"
          note: "记录尚未解决的问题、风险、依赖和下一步。"
      relationships:
        - title: "影响"
          fromPath: ["关键结论", "结论 A"]
          toPath: ["待处理问题"]
      summaries:
        - title: "主要内容"
          fromPath: ["关键结论"]
          toPath: ["待处理问题"]
```
