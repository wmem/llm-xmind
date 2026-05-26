# 功能规格：AI 辅助资产

## 文件

- `schema.json`
- `ai-template.md`

## API

公共入口导出：

- `mindMapDocumentSchema`
- `aiTemplate`

## CLI

```bash
bun run llm-xmind --print-schema
bun run llm-xmind --print-ai-template
```

## 约束

- `schema.json` 必须与 `src/schema.ts` 的 `mindMapDocumentSchema` 一致。
- `ai-template.md` 必须与 `src/assets.ts` 的 `aiTemplate` 一致。
- AI 模板必须强调思维导图输出，不按聊天时间顺序写流水账。
- topic title 放重点；细节、证据、背景和取舍放到 `note`。

## 测试

- `tests/assets.test.ts`
- `tests/cli.test.ts`
- `tests/scaffold.test.ts`

