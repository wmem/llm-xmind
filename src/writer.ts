import { writeLocalFile } from "xmind-generator";
import { stat } from "node:fs/promises";
import { compileMindMapDocument } from "./compiler";
import { convertToWorkbook } from "./converter";
import { validateSemantics } from "./semantic";
import type { MindMapDocument } from "./types";

export async function generateXmindFile(document: MindMapDocument, outputPath: string): Promise<void> {
  validateSemantics(document);
  const compiled = compileMindMapDocument(document);
  const workbook = await convertToWorkbook(compiled);
  await writeLocalFile(workbook, outputPath);
  await waitForWrittenFile(outputPath);
}

async function waitForWrittenFile(outputPath: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await stat(outputPath)).size > 0) {
        return;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`XMind 文件写出超时: ${outputPath}`);
}
