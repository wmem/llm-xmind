#!/usr/bin/env bun

import { generateXmindFile, parseMindMapInput, validateMindMapDocument } from "./index";

const usage = "用法: llm-xmind <input> -o|--output <output>";

type CliArgs = {
  input: string;
  output: string;
};

function parseArgs(args: string[]): CliArgs {
  if (args.length !== 3) {
    throw new Error(usage);
  }

  const [input, option, output] = args;
  if (!input || !output || (option !== "-o" && option !== "--output")) {
    throw new Error(usage);
  }

  return { input, output };
}

function formatError(error: unknown): string {
  const err = error instanceof Error ? error : new Error(String(error));
  const path = "path" in err && err.path ? ` (${String(err.path)})` : "";
  return `${err.name}: ${err.message}${path}`;
}

async function main(): Promise<void> {
  try {
    const { input, output } = parseArgs(Bun.argv.slice(2));
    const parsed = await parseMindMapInput(input);
    const document = validateMindMapDocument(parsed);
    await generateXmindFile(document, output);
    console.log(`generated ${output}`);
    process.exit(0);
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }
}

await main();
