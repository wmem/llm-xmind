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

export { parseMindMapInput } from "./parser";
export { validateMindMapDocument } from "./schema";

export async function generateXmindFile(_input: unknown, _outputPath: string): Promise<void> {
  throw new Error("not implemented");
}
