import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { aiTemplate } from "../src/assets";
import { mindMapDocumentSchema } from "../src/schema";

describe("AI-facing assets", () => {
  test("schema.json mirrors the runtime schema", async () => {
    const schema = JSON.parse(await readFile("schema.json", "utf8"));

    expect(schema).toEqual(mindMapDocumentSchema);
  });

  test("ai-template.md contains the prompt contract and YAML skeleton", async () => {
    const template = await readFile("ai-template.md", "utf8");

    expect(template).toBe(aiTemplate);
    expect(template).toContain("只输出 YAML");
    expect(template).toContain("不要生成 ID");
    expect(template).toContain("不要按聊天时间顺序记录流水账");
    expect(template).toContain("topic title 只写重点");
    expect(template).toContain("细节、证据、例子、背景、取舍放到 note");
    expect(template).toContain("schema.json");
    expect(template).toContain('version: "1"');
    expect(template).toContain("children 可以继续嵌套");
    expect(template).toContain("fromPath");
    expect(template).toContain("toPath");
  });
});
