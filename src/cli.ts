#!/usr/bin/env bun

import {
  aiTemplate,
  generateXmindFile,
  mindMapDocumentSchema,
  parseMindMapInput,
  validateMindMapDocument,
} from "./index";

const usage = [
  "用法: llm-xmind <input> -o|--output <output>",
  "      llm-xmind --print-schema",
  "      llm-xmind --print-ai-template",
].join("\n");

type CliArgs =
  | {
      mode: "generate";
      input: string;
      output: string;
    }
  | {
      mode: "print-schema" | "print-ai-template";
    };

function parseArgs(args: string[]): CliArgs {
  if (args.length === 1 && args[0] === "--print-schema") {
    return { mode: "print-schema" };
  }

  if (args.length === 1 && args[0] === "--print-ai-template") {
    return { mode: "print-ai-template" };
  }

  if (args.length !== 3) {
    throw new Error(usage);
  }

  const [input, option, output] = args;
  if (!input || !output || (option !== "-o" && option !== "--output")) {
    throw new Error(usage);
  }

  return { mode: "generate", input, output };
}

function formatError(error: unknown): string {
  const err = error instanceof Error ? error : new Error(String(error));
  const path = "path" in err && err.path ? ` (${String(err.path)})` : "";
  return `${err.name}: ${err.message}${path}`;
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(Bun.argv.slice(2));

    switch (args.mode) {
      case "print-schema":
        console.log(JSON.stringify(mindMapDocumentSchema, null, 2));
        break;
      case "print-ai-template":
        console.log(aiTemplate.trimEnd());
        break;
      case "generate": {
        const parsed = await parseMindMapInput(args.input);
        const document = validateMindMapDocument(parsed);
        await generateXmindFile(document, args.output);
        console.log(`generated ${args.output}`);
        break;
      }
    }
    process.exit(0);
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }
}

await main();
