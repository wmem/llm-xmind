import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

describe("package scripts", () => {
  test("provides a compile command for a standalone binary", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.compile).toBe("bun build --compile ./src/cli.ts --outfile dist/llm-xmind");
  });
});
