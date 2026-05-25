export type {
  CompiledDocument,
  CompiledSheet,
  CompiledTopic,
  MarkerName,
  MindMapDocument,
  MindMapImage,
  MindMapRelationship,
  MindMapSheet,
  MindMapSummary,
  MindMapTopic,
} from "./types";

export {
  ImageError,
  ParseError,
  SchemaValidationError,
  SemanticValidationError,
} from "./types";

export async function parseMindMapInput(_filePath: string): Promise<unknown> {
  throw new Error("not implemented");
}

export function validateMindMapDocument(_input: unknown): void {
  throw new Error("not implemented");
}

export async function generateXmindFile(_input: unknown, _outputPath: string): Promise<void> {
  throw new Error("not implemented");
}
