# 功能规格：CLI 和独立二进制

## CLI

生成 XMind：

```bash
bun run llm-xmind <input> -o <output>
bun run llm-xmind <input> --output <output>
```

打印辅助资产：

```bash
bun run llm-xmind --print-schema
bun run llm-xmind --print-ai-template
```

## 独立二进制

编译：

```bash
bun run compile
```

输出：

```text
dist/llm-xmind
```

运行：

```bash
./dist/llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
```

## 错误行为

- 参数不完整时 exit 1，并输出用法。
- schema、semantic、image、parse 错误时 exit 1，并输出错误名称和消息。
- 成功生成文件时 exit 0，并输出 `generated <output>`。

## 测试

- `tests/cli.test.ts`
- `tests/package.test.ts`

