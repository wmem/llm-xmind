import { writeFile } from "node:fs/promises";
import { compileMindMapDocument } from "./compiler";
import { convertToWorkbook } from "./converter";
import { validateSemantics } from "./semantic";
import type { MindMapDocument } from "./types";

export async function generateXmindFile(document: MindMapDocument, outputPath: string): Promise<void> {
  validateSemantics(document);
  const compiled = compileMindMapDocument(document);
  const workbook = await convertToWorkbook(compiled);
  const buffer = await workbook.archive();
  await writeFile(outputPath, Buffer.from(buffer));
}
