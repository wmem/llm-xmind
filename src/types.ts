export type MarkerName = string;

export type MindMapImage =
  | { kind: "data-uri"; name: string; data: `data:${string}` }
  | { kind: "file"; path: string }
  | { kind: "svg"; name?: string; content: string };

export type MindMapRelationship = {
  title?: string;
  fromPath: string[];
  toPath: string[];
};

export type MindMapSummary = {
  title: string;
  fromPath: string[];
  toPath: string[];
};

export type MindMapTopic = {
  title: string;
  note?: string;
  labels?: string[];
  markers?: MarkerName[];
  image?: MindMapImage;
  children?: MindMapTopic[];
  relationships?: MindMapRelationship[];
  summaries?: MindMapSummary[];
};

export type MindMapSheet = {
  title: string;
  root: MindMapTopic;
};

export type MindMapDocument = {
  version: "1";
  sheets: MindMapSheet[];
};

export type CompiledTopic = {
  ref: string;
  path: string[];
  topic: MindMapTopic;
  children: CompiledTopic[];
};

export type CompiledSheet = {
  title: string;
  root: CompiledTopic;
  pathIndex: Map<string, CompiledTopic>;
};

export type CompiledDocument = {
  version: "1";
  sheets: CompiledSheet[];
};

class DomainError extends Error {
  constructor(
    name: string,
    public readonly code: string,
    message: string,
    public readonly path?: string,
  ) {
    super(message);
    this.name = name;
  }
}

export class ParseError extends DomainError {
  constructor(message: string, path?: string) {
    super("ParseError", "PARSE_ERROR", message, path);
  }
}

export class SchemaValidationError extends DomainError {
  constructor(message: string, path?: string) {
    super("SchemaValidationError", "SCHEMA_VALIDATION_ERROR", message, path);
  }
}

export class SemanticValidationError extends DomainError {
  constructor(message: string, path?: string) {
    super("SemanticValidationError", "SEMANTIC_VALIDATION_ERROR", message, path);
  }
}

export class ImageError extends DomainError {
  constructor(message: string, path?: string) {
    super("ImageError", "IMAGE_ERROR", message, path);
  }
}
