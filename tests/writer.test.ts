import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  generateXmindFile,
  parseMindMapInput,
  SemanticValidationError,
  validateMindMapDocument,
  type MindMapDocument,
} from "../src/index";

describe("public writer API", () => {
  test("generates a non-empty xmind file from parsed input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-writer-"));
    const input = join(dir, "input.yaml");
    const output = join(dir, "output.xmind");
    await writeFile(input, 'version: "1"\nsheets:\n  - title: S\n    root:\n      title: R\n');
    const parsed = await parseMindMapInput(input);
    const document = validateMindMapDocument(parsed);
    await generateXmindFile(document, output);
    expect((await stat(output)).size).toBeGreaterThan(0);
  });

  test("runs semantic validation before writing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-writer-"));
    const output = join(dir, "output.xmind");
    const document: MindMapDocument = {
      version: "1",
      sheets: [
        {
          title: "S",
          root: {
            title: "R",
            children: [{ title: "A" }, { title: "A" }],
          },
        },
      ],
    };

    await expect(generateXmindFile(document, output)).rejects.toBeInstanceOf(SemanticValidationError);
  });

  test("writes a zip file containing content and manifest", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-writer-"));
    const output = join(dir, "output.xmind");
    const document: MindMapDocument = {
      version: "1",
      sheets: [{ title: "S", root: { title: "R" } }],
    };

    await generateXmindFile(document, output);

    const zip = await JSZip.loadAsync(await readFile(output));
    expect(zip.file("content.json")).not.toBeNull();
    expect(zip.file("manifest.json")).not.toBeNull();
  });

  test("rejects filesystem errors from failed writes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-writer-"));
    const output = join(dir, "missing-parent", "output.xmind");
    const document: MindMapDocument = {
      version: "1",
      sheets: [{ title: "S", root: { title: "R" } }],
    };

    try {
      await generateXmindFile(document, output);
      throw new Error("expected generateXmindFile to reject");
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
      expect((error as Error).message).not.toContain("超时");
    }
  });
});
