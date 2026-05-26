import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseMindMapInput, validateMindMapDocument } from "../src/index";
import type { MindMapTopic } from "../src/types";

function flattenTopics(topic: MindMapTopic): MindMapTopic[] {
  return [topic, ...(topic.children?.flatMap(flattenTopics) ?? [])];
}

describe("CLI", () => {
  test("generates xmind from fixture", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
    try {
      const output = join(dir, "minimal.xmind");
      const proc = Bun.spawn(["bun", "run", "src/cli.ts", "fixtures/minimal.yaml", "-o", output], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      expect((await stat(output)).size).toBeGreaterThan(0);

      const zip = await JSZip.loadAsync(await readFile(output));
      expect(zip.file("content.json")).not.toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("supports long output option", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
    try {
      const output = join(dir, "minimal-json.xmind");
      const proc = Bun.spawn(["bun", "run", "src/cli.ts", "fixtures/minimal.json", "--output", output], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      expect((await stat(output)).size).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("prints validation error and exits non-zero", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
    try {
      const output = join(dir, "invalid.xmind");
      const proc = Bun.spawn(["bun", "run", "src/cli.ts", "fixtures/invalid-required.yaml", "-o", output], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      const stderr = await new Response(proc.stderr).text();
      expect(exitCode).toBe(1);
      expect(stderr).toContain("SchemaValidationError");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("prints usage and exits non-zero when arguments are missing", async () => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(exitCode).toBe(1);
    expect(stderr).toContain("用法");
  });

  test("prints schema JSON for AI/tool integration", async () => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "--print-schema"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const schema = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(schema.properties.version.const).toBe("1");
    expect(schema.$defs.topic.properties.children.items.$ref).toBe("#/$defs/topic");
  });

  test("prints the AI template", async () => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "--print-ai-template"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();

    expect(exitCode).toBe(0);
    expect(stdout).toContain("只输出 YAML");
    expect(stdout).toContain("不要生成 ID");
    expect(stdout).toContain('version: "1"');
  });

  test("generates xmind from complete fixtures", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
    try {
      const yamlOutput = join(dir, "complete-yaml.xmind");
      const jsonOutput = join(dir, "complete-json.xmind");

      const yamlProc = Bun.spawn(["bun", "run", "src/cli.ts", "fixtures/complete.yaml", "-o", yamlOutput], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const jsonProc = Bun.spawn(["bun", "run", "src/cli.ts", "fixtures/complete.json", "-o", jsonOutput], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(await yamlProc.exited).toBe(0);
      expect(await jsonProc.exited).toBe(0);
      expect((await stat(yamlOutput)).size).toBeGreaterThan(0);
      expect((await stat(jsonOutput)).size).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("complete fixtures cover file images", async () => {
    for (const fixture of ["fixtures/complete.yaml", "fixtures/complete.json"]) {
      const document = validateMindMapDocument(await parseMindMapInput(fixture));
      const topics = document.sheets.flatMap((sheet) => flattenTopics(sheet.root));

      expect(topics.some((topic) => topic.image?.kind === "file" && topic.image.path === "fixtures/image.svg")).toBe(
        true,
      );
    }
  });
});
