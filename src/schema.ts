import Ajv, { type ErrorObject } from "ajv";
import { supportedMarkerNames } from "./markers";
import { SchemaValidationError, type MindMapDocument } from "./types";

const nonEmptyStringSchema = { type: "string", minLength: 1 } as const;
const pathSchema = {
  type: "array",
  items: nonEmptyStringSchema,
} as const;

export const mindMapDocumentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["version", "sheets"],
  properties: {
    version: { const: "1" },
    sheets: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/sheet" },
    },
  },
  $defs: {
    sheet: {
      type: "object",
      additionalProperties: false,
      required: ["title", "root"],
      properties: {
        title: nonEmptyStringSchema,
        root: { $ref: "#/$defs/topic" },
      },
    },
    topic: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: nonEmptyStringSchema,
        note: { type: "string" },
        labels: {
          type: "array",
          items: nonEmptyStringSchema,
        },
        markers: {
          type: "array",
          items: {
            type: "string",
            enum: supportedMarkerNames,
          },
        },
        image: { $ref: "#/$defs/image" },
        children: {
          type: "array",
          items: { $ref: "#/$defs/topic" },
        },
        relationships: {
          type: "array",
          items: { $ref: "#/$defs/relationship" },
        },
        summaries: {
          type: "array",
          items: { $ref: "#/$defs/summary" },
        },
      },
    },
    image: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["kind", "name", "data"],
          properties: {
            kind: { const: "data-uri" },
            name: nonEmptyStringSchema,
            data: { type: "string", pattern: "^data:.+" },
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["kind", "path"],
          properties: {
            kind: { const: "file" },
            path: nonEmptyStringSchema,
          },
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["kind", "content"],
          properties: {
            kind: { const: "svg" },
            name: nonEmptyStringSchema,
            content: nonEmptyStringSchema,
          },
        },
      ],
    },
    relationship: {
      type: "object",
      additionalProperties: false,
      required: ["fromPath", "toPath"],
      properties: {
        title: { type: "string" },
        fromPath: pathSchema,
        toPath: pathSchema,
      },
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["title", "fromPath", "toPath"],
      properties: {
        title: nonEmptyStringSchema,
        fromPath: pathSchema,
        toPath: pathSchema,
      },
    },
  },
} as const;

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(mindMapDocumentSchema);

function formatPath(error: ErrorObject): string {
  let path = error.instancePath.replaceAll("/", ".").replace(/^\./, "");

  if (error.keyword === "required" && "missingProperty" in error.params) {
    path = [path, error.params.missingProperty].filter(Boolean).join(".");
  }

  if (error.keyword === "additionalProperties" && "additionalProperty" in error.params) {
    path = [path, error.params.additionalProperty].filter(Boolean).join(".");
  }

  return path || "<root>";
}

function formatMessage(error: ErrorObject): string {
  const path = formatPath(error);
  return `schema 校验失败: ${path} ${error.message ?? "字段不合法"}`;
}

export function validateMindMapDocument(input: unknown): MindMapDocument {
  if (!validate(input)) {
    const firstError = validate.errors?.[0];

    if (!firstError) {
      throw new SchemaValidationError("schema 校验失败");
    }

    throw new SchemaValidationError(formatMessage(firstError), formatPath(firstError));
  }

  return input as MindMapDocument;
}
