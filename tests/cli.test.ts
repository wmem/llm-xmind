import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("CLI", () => {
  test("generates xmind from fixture", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
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
  });

  test("supports long output option", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
    const output = join(dir, "minimal-json.xmind");
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "fixtures/minimal.json", "--output", output], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    expect((await stat(output)).size).toBeGreaterThan(0);
  });

  test("prints validation error and exits non-zero", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
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

  test("generates xmind from complete fixtures", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-cli-"));
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
  });
});
