import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseMindMapInput } from "../src/parser";
import { ParseError } from "../src/types";

describe("parseMindMapInput", () => {
  test("parses JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.json");
    await writeFile(file, JSON.stringify({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] }));

    expect(await parseMindMapInput(file)).toEqual({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] });
  });

  test("parses YAML and YML", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const yaml = join(dir, "input.yaml");
    const yml = join(dir, "input.yml");
    const content = "version: \"1\"\nsheets:\n  - title: S\n    root:\n      title: R\n";
    await writeFile(yaml, content);
    await writeFile(yml, content);

    expect(await parseMindMapInput(yaml)).toEqual({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] });
    expect(await parseMindMapInput(yml)).toEqual({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] });
  });

  test("rejects unsupported extensions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.txt");
    await writeFile(file, "{}");

    await expect(parseMindMapInput(file)).rejects.toBeInstanceOf(ParseError);
  });
});
