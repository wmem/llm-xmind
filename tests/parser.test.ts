import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMindMapInput } from "../src/parser";
import { ParseError } from "../src/types";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const expectedDocument = { version: "1", sheets: [{ title: "S", root: { title: "R" } }] };

async function expectParseError(promise: Promise<unknown>, file: string, message: string): Promise<void> {
  try {
    await promise;
    throw new Error("Expected ParseError");
  } catch (error) {
    expect(error).toBeInstanceOf(ParseError);
    expect((error as ParseError).code).toBe("PARSE_ERROR");
    expect((error as ParseError).path).toBe(file);
    expect((error as ParseError).message).toContain(message);
  }
}

describe("parseMindMapInput", () => {
  test("parses JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.json");
    await writeFile(file, JSON.stringify(expectedDocument));

    expect(await parseMindMapInput(file)).toEqual(expectedDocument);
    expect(await parseMindMapInput(join(fixturesDir, "parser-valid.json"))).toEqual(expectedDocument);
  });

  test("parses YAML and YML", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const yaml = join(dir, "input.yaml");
    const yml = join(dir, "input.yml");
    const content = "version: \"1\"\nsheets:\n  - title: S\n    root:\n      title: R\n";
    await writeFile(yaml, content);
    await writeFile(yml, content);

    expect(await parseMindMapInput(yaml)).toEqual(expectedDocument);
    expect(await parseMindMapInput(yml)).toEqual(expectedDocument);
    expect(await parseMindMapInput(join(fixturesDir, "parser-valid.yaml"))).toEqual(expectedDocument);
  });

  test("rejects unsupported extensions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.txt");
    await writeFile(file, "{}");

    await expectParseError(parseMindMapInput(file), file, "不支持的输入格式");
  });

  test("rejects invalid JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.json");
    await writeFile(file, "{");

    await expectParseError(parseMindMapInput(file), file, "解析输入失败");
  });

  test("rejects invalid YAML", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.yaml");
    await writeFile(file, "version: \"1\"\nsheets:\n  - title: S\n    root:\n      title: [\n");

    await expectParseError(parseMindMapInput(file), file, "解析输入失败");
  });

  test("rejects missing file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "missing.json");

    await expectParseError(parseMindMapInput(file), file, "读取文件失败");
  });
});
