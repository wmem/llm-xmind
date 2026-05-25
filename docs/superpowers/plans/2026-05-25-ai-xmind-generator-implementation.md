# AI XMind Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Bun.js 和 TypeScript 的 CLI + 库，把 AI 友好的 YAML/JSON 思维导图 schema 转成 `.xmind` 文件。

**Architecture:** 输入先由 parser 解析，再由 schema validator 做结构校验，由 semantic validator 做路径、同级标题、marker 冲突和 summary 范围校验。compiler 生成内部 ref 和 path 索引，image resolver 规范化图片，converter 调用 `xmind-generator`，writer/CLI 负责落盘和用户入口。

**Tech Stack:** Bun.js, TypeScript, `xmind-generator@1.0.1`, `jszip@3.10.1`, `yaml`, `ajv`, Bun test。

---

## File Structure

- Create `package.json`: Bun scripts, bin entry, dependencies.
- Create `tsconfig.json`: ESM TypeScript 配置。
- Create `src/index.ts`: 库导出入口。
- Create `src/types.ts`: AI schema 类型、内部编译类型、错误类型。
- Create `src/markers.ts`: marker 字符串枚举、marker group 校验、到 `MarkerId` 的映射。
- Create `src/schema.ts`: JSON Schema 定义和 Ajv validator。
- Create `src/parser.ts`: JSON/YAML/YML 文件解析。
- Create `src/semantic.ts`: 同级标题、路径引用、summary、marker 冲突校验。
- Create `src/compiler.ts`: 内部 ref/path 索引生成。
- Create `src/image.ts`: data URI、SVG data URI、SVG XML、本地文件图片解析。
- Create `src/converter.ts`: 编译模型到 `xmind-generator` builder。
- Create `src/writer.ts`: 生成 workbook 并写出 `.xmind`。
- Create `src/cli.ts`: CLI 参数解析、错误格式化。
- Create `fixtures/minimal.yaml`, `fixtures/minimal.json`, `fixtures/complete.yaml`, `fixtures/complete.json`: 验收输入。
- Create `tests/*.test.ts`: parser/schema/semantic/compiler/image/converter/cli 测试。
- Create `README.md`: CLI、库 API、AI prompt、schema 示例。

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Test: `tests/scaffold.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/scaffold.test.ts
import { describe, expect, test } from "bun:test";
import * as api from "../src/index";

describe("public API scaffold", () => {
  test("exports the planned public entry points", () => {
    expect(Object.keys(api).sort()).toEqual([
      "generateXmindFile",
      "parseMindMapInput",
      "validateMindMapDocument",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/scaffold.test.ts`

Expected: FAIL because `src/index.ts` does not exist.

- [ ] **Step 3: Add minimal scaffold**

```json
// package.json
{
  "name": "llm-xmind",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "llm-xmind": "./src/cli.ts"
  },
  "scripts": {
    "test": "bun test",
    "llm-xmind": "bun run src/cli.ts"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "jszip": "3.10.1",
    "xmind-generator": "1.0.1",
    "yaml": "^2.8.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "latest"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

```ts
// src/index.ts
export async function parseMindMapInput(_filePath: string): Promise<unknown> {
  throw new Error("not implemented");
}

export function validateMindMapDocument(_input: unknown): void {
  throw new Error("not implemented");
}

export async function generateXmindFile(_input: unknown, _outputPath: string): Promise<void> {
  throw new Error("not implemented");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun install && bun test tests/scaffold.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json src/index.ts tests/scaffold.test.ts
git commit -m "初始化 Bun TypeScript 项目"
```

## Task 2: Core Types And Errors

**Files:**
- Create: `src/types.ts`
- Modify: `src/index.ts`
- Test: `tests/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/types.test.ts
import { describe, expect, test } from "bun:test";
import {
  ImageError,
  ParseError,
  SchemaValidationError,
  SemanticValidationError,
} from "../src/types";

describe("domain errors", () => {
  test("carry code, path and message", () => {
    const error = new SchemaValidationError("字段类型错误", "sheets[0].root.title");
    expect(error.name).toBe("SchemaValidationError");
    expect(error.code).toBe("SCHEMA_VALIDATION_ERROR");
    expect(error.path).toBe("sheets[0].root.title");
    expect(error.message).toBe("字段类型错误");
  });

  test("exports all domain error classes", () => {
    expect(new ParseError("解析失败", "input.yaml").code).toBe("PARSE_ERROR");
    expect(new SemanticValidationError("路径不存在", "sheets[0]").code).toBe("SEMANTIC_VALIDATION_ERROR");
    expect(new ImageError("图片非法", "sheets[0].root.image").code).toBe("IMAGE_ERROR");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/types.test.ts`

Expected: FAIL because `src/types.ts` does not exist.

- [ ] **Step 3: Add types and errors**

```ts
// src/types.ts
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
```

```ts
// src/index.ts
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

export async function parseMindMapInput(_filePath: string): Promise<unknown> {
  throw new Error("not implemented");
}

export function validateMindMapDocument(_input: unknown): void {
  throw new Error("not implemented");
}

export async function generateXmindFile(_input: unknown, _outputPath: string): Promise<void> {
  throw new Error("not implemented");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/types.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/index.ts tests/types.test.ts
git commit -m "定义思维导图核心类型和错误"
```

## Task 3: Parser

**Files:**
- Create: `src/parser.ts`
- Modify: `src/index.ts`
- Create: `tests/fixtures/parser-valid.json`
- Create: `tests/fixtures/parser-valid.yaml`
- Test: `tests/parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/parser.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseMindMapInput } from "../src/parser";
import { ParseError } from "../src/types";

describe("parseMindMapInput", () => {
  test("parses JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.json");
    await writeFile(file, JSON.stringify({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] }));
    expect(await parseMindMapInput(file)).toEqual({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] });
  });

  test("parses YAML and YML", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const yaml = join(dir, "input.yaml");
    const yml = join(dir, "input.yml");
    const content = "version: \"1\"\nsheets:\n  - title: S\n    root:\n      title: R\n";
    await writeFile(yaml, content);
    await writeFile(yml, content);
    expect(await parseMindMapInput(yaml)).toEqual({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] });
    expect(await parseMindMapInput(yml)).toEqual({ version: "1", sheets: [{ title: "S", root: { title: "R" } }] });
  });

  test("rejects unsupported extensions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-parser-"));
    const file = join(dir, "input.txt");
    await writeFile(file, "{}");
    await expect(parseMindMapInput(file)).rejects.toBeInstanceOf(ParseError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/parser.test.ts`

Expected: FAIL because `src/parser.ts` does not exist.

- [ ] **Step 3: Implement parser**

```ts
// src/parser.ts
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import YAML from "yaml";
import { ParseError } from "./types";

export async function parseMindMapInput(filePath: string): Promise<unknown> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    throw new ParseError(`读取文件失败: ${(error as Error).message}`, filePath);
  }

  try {
    const extension = extname(filePath).toLowerCase();
    if (extension === ".json") {
      return JSON.parse(content);
    }
    if (extension === ".yaml" || extension === ".yml") {
      return YAML.parse(content);
    }
    throw new ParseError(`不支持的输入格式: ${extension || "unknown"}`, filePath);
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(`解析输入失败: ${(error as Error).message}`, filePath);
  }
}
```

```ts
// src/index.ts
export { parseMindMapInput } from "./parser";
export function validateMindMapDocument(_input: unknown): void {
  throw new Error("not implemented");
}
export async function generateXmindFile(_input: unknown, _outputPath: string): Promise<void> {
  throw new Error("not implemented");
}
export type * from "./types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/parser.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parser.ts src/index.ts tests/parser.test.ts
git commit -m "实现 JSON 和 YAML 输入解析"
```

## Task 4: Markers

**Files:**
- Create: `src/markers.ts`
- Test: `tests/markers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/markers.test.ts
import { describe, expect, test } from "bun:test";
import { assertNoMarkerGroupConflict, isMarkerName, markerNameToMarkerId } from "../src/markers";
import { SemanticValidationError } from "../src/types";

describe("markers", () => {
  test("recognizes supported marker names", () => {
    expect(isMarkerName("priority-1")).toBe(true);
    expect(isMarkerName("arrow-refresh")).toBe(true);
    expect(isMarkerName("unknown")).toBe(false);
  });

  test("maps marker name to MarkerId", () => {
    expect(markerNameToMarkerId("priority-1").id).toBe("priority-1");
  });

  test("rejects same marker group in one topic", () => {
    expect(() => assertNoMarkerGroupConflict(["priority-1", "priority-2"], "root.markers")).toThrow(SemanticValidationError);
    expect(() => assertNoMarkerGroupConflict(["priority-1", "task-done"], "root.markers")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/markers.test.ts`

Expected: FAIL because `src/markers.ts` does not exist.

- [ ] **Step 3: Implement marker mapping**

```ts
// src/markers.ts
import { Marker, type MarkerId } from "xmind-generator";
import { SemanticValidationError } from "./types";

const markerEntries = {
  "priority-1": Marker.Priority.p1,
  "priority-2": Marker.Priority.p2,
  "priority-3": Marker.Priority.p3,
  "priority-4": Marker.Priority.p4,
  "priority-5": Marker.Priority.p5,
  "priority-6": Marker.Priority.p6,
  "priority-7": Marker.Priority.p7,
  "smiley-laugh": Marker.Smiley.laugh,
  "smiley-smile": Marker.Smiley.smile,
  "smiley-cry": Marker.Smiley.cry,
  "smiley-surprise": Marker.Smiley.surprise,
  "smiley-boring": Marker.Smiley.boring,
  "smiley-angry": Marker.Smiley.angry,
  "smiley-embarrass": Marker.Smiley.embarrass,
  "task-start": Marker.Task.start,
  "task-oct": Marker.Task.oct,
  "task-quarter": Marker.Task.quarter,
  "task-half": Marker.Task.half,
  "task-done": Marker.Task.done,
  "task-pause": Marker.Task.pause,
  "flag-red": Marker.Flag.red,
  "flag-orange": Marker.Flag.orange,
  "flag-dark-blue": Marker.Flag.darkBlue,
  "flag-purple": Marker.Flag.purple,
  "flag-green": Marker.Flag.green,
  "flag-blue": Marker.Flag.blue,
  "flag-gray": Marker.Flag.gray,
  "star-red": Marker.Star.red,
  "star-orange": Marker.Star.orange,
  "star-dark-blue": Marker.Star.darkBlue,
  "star-purple": Marker.Star.purple,
  "star-green": Marker.Star.green,
  "star-blue": Marker.Star.blue,
  "star-gray": Marker.Star.gray,
  "people-red": Marker.People.red,
  "people-orange": Marker.People.orange,
  "people-dark-blue": Marker.People.darkBlue,
  "people-purple": Marker.People.purple,
  "people-green": Marker.People.green,
  "people-blue": Marker.People.blue,
  "people-gray": Marker.People.gray,
  "arrow-left": Marker.Arrow.left,
  "arrow-right": Marker.Arrow.right,
  "arrow-up": Marker.Arrow.up,
  "arrow-down": Marker.Arrow.down,
  "arrow-left-right": Marker.Arrow.leftRight,
  "arrow-up-down": Marker.Arrow.upDown,
  "arrow-refresh": Marker.Arrow.refresh,
  "month-jan": Marker.Month.jan,
  "month-feb": Marker.Month.feb,
  "month-mar": Marker.Month.mar,
  "month-apr": Marker.Month.apr,
  "month-may": Marker.Month.may,
  "month-jun": Marker.Month.jun,
  "month-jul": Marker.Month.jul,
  "month-sep": Marker.Month.sep,
  "month-oct": Marker.Month.oct,
  "month-nov": Marker.Month.nov,
  "month-dec": Marker.Month.dec,
  "week-sun": Marker.Week.sun,
  "week-mon": Marker.Week.mon,
  "week-tue": Marker.Week.tue,
  "week-web": Marker.Week.web,
  "week-thu": Marker.Week.thu,
  "week-fri": Marker.Week.fri,
  "week-sat": Marker.Week.sat,
} as const;

export type SupportedMarkerName = keyof typeof markerEntries;
export const supportedMarkerNames = Object.keys(markerEntries) as SupportedMarkerName[];

export function isMarkerName(value: string): value is SupportedMarkerName {
  return Object.prototype.hasOwnProperty.call(markerEntries, value);
}

export function markerNameToMarkerId(name: string): MarkerId {
  if (!isMarkerName(name)) {
    throw new SemanticValidationError(`不支持的 marker: ${name}`);
  }
  return markerEntries[name];
}

export function assertNoMarkerGroupConflict(markers: string[], path: string): void {
  const seen: MarkerId[] = [];
  for (const marker of markers) {
    const markerId = markerNameToMarkerId(marker);
    if (seen.some((existing) => existing.isSameGroup(markerId))) {
      throw new SemanticValidationError(`同一个 topic 内存在同组 marker: ${marker}`, path);
    }
    seen.push(markerId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/markers.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/markers.ts tests/markers.test.ts
git commit -m "实现 XMind marker 映射"
```

## Task 5: Schema Validation

**Files:**
- Create: `src/schema.ts`
- Modify: `src/index.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/schema.test.ts
import { describe, expect, test } from "bun:test";
import { validateMindMapDocument } from "../src/schema";
import { SchemaValidationError } from "../src/types";

const minimal = {
  version: "1",
  sheets: [{ title: "S", root: { title: "R" } }],
};

describe("validateMindMapDocument schema", () => {
  test("accepts minimal document", () => {
    expect(validateMindMapDocument(minimal)).toEqual(minimal);
  });

  test("accepts every schema field", () => {
    const complete = {
      version: "1",
      sheets: [{
        title: "S",
        root: {
          title: "R",
          note: "plain note",
          labels: ["a"],
          markers: ["priority-1"],
          image: { kind: "svg", name: "diagram.svg", content: "<svg xmlns=\"http://www.w3.org/2000/svg\"/>" },
          children: [{ title: "A" }, { title: "B" }],
          relationships: [{ title: "rel", fromPath: ["A"], toPath: ["B"] }],
          summaries: [{ title: "sum", fromPath: ["A"], toPath: ["B"] }],
        },
      }],
    };
    expect(validateMindMapDocument(complete)).toEqual(complete);
  });

  test("rejects missing required fields and unknown fields", () => {
    expect(() => validateMindMapDocument({ sheets: [] })).toThrow(SchemaValidationError);
    expect(() => validateMindMapDocument({ ...minimal, extra: true })).toThrow(SchemaValidationError);
    expect(() => validateMindMapDocument({ version: "1", sheets: [] })).toThrow(SchemaValidationError);
  });

  test("rejects invalid image variants and marker enum", () => {
    expect(() => validateMindMapDocument({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", markers: ["bad-marker"] } }],
    })).toThrow(SchemaValidationError);
    expect(() => validateMindMapDocument({
      version: "1",
      sheets: [{ title: "S", root: { title: "R", image: { kind: "url", url: "https://example.com/a.png" } } }],
    })).toThrow(SchemaValidationError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/schema.test.ts`

Expected: FAIL because `src/schema.ts` does not exist.

- [ ] **Step 3: Implement JSON Schema validation**

```ts
// src/schema.ts
import Ajv, { type ErrorObject } from "ajv";
import { supportedMarkerNames } from "./markers";
import { SchemaValidationError, type MindMapDocument } from "./types";

const imageSchema = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "name", "data"],
      properties: {
        kind: { const: "data-uri" },
        name: { type: "string", minLength: 1 },
        data: { type: "string", pattern: "^data:.+" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "path"],
      properties: {
        kind: { const: "file" },
        path: { type: "string", minLength: 1 },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "content"],
      properties: {
        kind: { const: "svg" },
        name: { type: "string", minLength: 1, nullable: true },
        content: { type: "string", minLength: 1 },
      },
    },
  ],
} as const;

const pathSchema = { type: "array", items: { type: "string", minLength: 1 } } as const;

const topicSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string", minLength: 1 },
    note: { type: "string" },
    labels: { type: "array", items: { type: "string", minLength: 1 } },
    markers: { type: "array", items: { type: "string", enum: supportedMarkerNames } },
    image: imageSchema,
    children: { type: "array", items: {} },
    relationships: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fromPath", "toPath"],
        properties: {
          title: { type: "string" },
          fromPath: pathSchema,
          toPath: pathSchema,
        },
      },
    },
    summaries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "fromPath", "toPath"],
        properties: {
          title: { type: "string", minLength: 1 },
          fromPath: pathSchema,
          toPath: pathSchema,
        },
      },
    },
  },
};
topicSchema.properties = {
  ...(topicSchema.properties as Record<string, unknown>),
  children: { type: "array", items: topicSchema },
};

export const mindMapDocumentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["version", "sheets"],
  properties: {
    version: { const: "1" },
    sheets: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "root"],
        properties: {
          title: { type: "string", minLength: 1 },
          root: topicSchema,
        },
      },
    },
  },
} as const;

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile<MindMapDocument>(mindMapDocumentSchema);

export function validateMindMapDocument(input: unknown): MindMapDocument {
  if (validate(input)) {
    return input;
  }
  const firstError = validate.errors?.[0];
  throw new SchemaValidationError(formatAjvError(firstError), formatAjvPath(firstError));
}

function formatAjvError(error?: ErrorObject): string {
  if (!error) {
    return "输入不符合 schema";
  }
  return `${error.instancePath || "/"} ${error.message ?? "不符合 schema"}`;
}

function formatAjvPath(error?: ErrorObject): string | undefined {
  if (!error?.instancePath) {
    return undefined;
  }
  return error.instancePath
    .slice(1)
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .join(".");
}
```

```ts
// src/index.ts
export { parseMindMapInput } from "./parser";
export { validateMindMapDocument } from "./schema";
export async function generateXmindFile(_input: unknown, _outputPath: string): Promise<void> {
  throw new Error("not implemented");
}
export type * from "./types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/schema.ts src/index.ts tests/schema.test.ts
git commit -m "实现 AI 输入 schema 校验"
```

## Task 6: Semantic Validation

**Files:**
- Create: `src/semantic.ts`
- Test: `tests/semantic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/semantic.test.ts
import { describe, expect, test } from "bun:test";
import { validateSemantics } from "../src/semantic";
import { SemanticValidationError, type MindMapDocument } from "../src/types";

const document = (root: MindMapDocument["sheets"][number]["root"]): MindMapDocument => ({
  version: "1",
  sheets: [{ title: "S", root }],
});

describe("validateSemantics", () => {
  test("accepts valid paths and sibling summary range", () => {
    expect(() => validateSemantics(document({
      title: "R",
      children: [{ title: "A" }, { title: "B" }],
      relationships: [{ title: "rel", fromPath: ["A"], toPath: ["B"] }],
      summaries: [{ title: "sum", fromPath: ["A"], toPath: ["B"] }],
    }))).not.toThrow();
  });

  test("rejects duplicate sibling titles", () => {
    expect(() => validateSemantics(document({
      title: "R",
      children: [{ title: "A" }, { title: "A" }],
    }))).toThrow(SemanticValidationError);
  });

  test("rejects missing relationship path", () => {
    expect(() => validateSemantics(document({
      title: "R",
      children: [{ title: "A" }],
      relationships: [{ fromPath: ["A"], toPath: ["B"] }],
    }))).toThrow(SemanticValidationError);
  });

  test("rejects summary paths with different parents", () => {
    expect(() => validateSemantics(document({
      title: "R",
      children: [{ title: "A", children: [{ title: "A1" }] }, { title: "B" }],
      summaries: [{ title: "bad", fromPath: ["A", "A1"], toPath: ["B"] }],
    }))).toThrow(SemanticValidationError);
  });

  test("rejects same marker group", () => {
    expect(() => validateSemantics(document({
      title: "R",
      markers: ["priority-1", "priority-2"],
    }))).toThrow(SemanticValidationError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/semantic.test.ts`

Expected: FAIL because `src/semantic.ts` does not exist.

- [ ] **Step 3: Implement semantic validation**

```ts
// src/semantic.ts
import { assertNoMarkerGroupConflict } from "./markers";
import { SemanticValidationError, type MindMapDocument, type MindMapTopic } from "./types";

type TopicRecord = {
  topic: MindMapTopic;
  path: string[];
  parentPath: string[] | null;
};

export function validateSemantics(document: MindMapDocument): void {
  document.sheets.forEach((sheet, sheetIndex) => {
    const records = collectTopicRecords(sheet.root);
    const index = new Map(records.map((record) => [pathKey(record.path), record]));
    records.forEach((record) => {
      validateTopic(record.topic, `sheets[${sheetIndex}].root${pathSuffix(record.path)}`);
      validateUniqueChildren(record.topic, `sheets[${sheetIndex}].root${pathSuffix(record.path)}.children`);
      for (const relationship of record.topic.relationships ?? []) {
        assertPath(index, relationship.fromPath, `sheets[${sheetIndex}].relationships.fromPath`);
        assertPath(index, relationship.toPath, `sheets[${sheetIndex}].relationships.toPath`);
      }
      for (const summary of record.topic.summaries ?? []) {
        const from = assertPath(index, summary.fromPath, `sheets[${sheetIndex}].summaries.fromPath`);
        const to = assertPath(index, summary.toPath, `sheets[${sheetIndex}].summaries.toPath`);
        if (pathKey(from.parentPath ?? []) !== pathKey(to.parentPath ?? [])) {
          throw new SemanticValidationError("summary 的 fromPath 和 toPath 必须拥有同一个父 topic", `sheets[${sheetIndex}].summaries`);
        }
      }
    });
  });
}

function collectTopicRecords(root: MindMapTopic): TopicRecord[] {
  const records: TopicRecord[] = [];
  const walk = (topic: MindMapTopic, path: string[], parentPath: string[] | null) => {
    records.push({ topic, path, parentPath });
    topic.children?.forEach((child) => walk(child, [...path, child.title], path));
  };
  walk(root, [], null);
  return records;
}

function validateTopic(topic: MindMapTopic, path: string): void {
  if (topic.markers) {
    assertNoMarkerGroupConflict(topic.markers, `${path}.markers`);
  }
}

function validateUniqueChildren(topic: MindMapTopic, path: string): void {
  const seen = new Set<string>();
  for (const child of topic.children ?? []) {
    if (seen.has(child.title)) {
      throw new SemanticValidationError(`同级 topic 标题重复: ${child.title}`, path);
    }
    seen.add(child.title);
  }
}

function assertPath(index: Map<string, TopicRecord>, path: string[], errorPath: string): TopicRecord {
  const record = index.get(pathKey(path));
  if (!record) {
    throw new SemanticValidationError(`topic 路径不存在: ${JSON.stringify(path)}`, errorPath);
  }
  return record;
}

function pathKey(path: string[]): string {
  return JSON.stringify(path);
}

function pathSuffix(path: string[]): string {
  return path.length === 0 ? "" : `.children(${path.join("/")})`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/semantic.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/semantic.ts tests/semantic.test.ts
git commit -m "实现语义校验"
```

## Task 7: Compiler

**Files:**
- Create: `src/compiler.ts`
- Test: `tests/compiler.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/compiler.test.ts
import { describe, expect, test } from "bun:test";
import { compileMindMapDocument } from "../src/compiler";

describe("compileMindMapDocument", () => {
  test("generates stable refs and path index", () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [{
        title: "S",
        root: {
          title: "R",
          children: [{ title: "A", children: [{ title: "A1" }] }, { title: "B" }],
        },
      }],
    });

    const sheet = compiled.sheets[0];
    expect(sheet.root.ref).toBe("sheet-0/topic");
    expect(sheet.pathIndex.get(JSON.stringify([]))?.ref).toBe("sheet-0/topic");
    expect(sheet.pathIndex.get(JSON.stringify(["A"]))?.ref).toBe("sheet-0/topic-0");
    expect(sheet.pathIndex.get(JSON.stringify(["A", "A1"]))?.ref).toBe("sheet-0/topic-0-0");
    expect(sheet.pathIndex.get(JSON.stringify(["B"]))?.ref).toBe("sheet-0/topic-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/compiler.test.ts`

Expected: FAIL because `src/compiler.ts` does not exist.

- [ ] **Step 3: Implement compiler**

```ts
// src/compiler.ts
import type { CompiledDocument, CompiledSheet, CompiledTopic, MindMapDocument, MindMapTopic } from "./types";

export function compileMindMapDocument(document: MindMapDocument): CompiledDocument {
  return {
    version: document.version,
    sheets: document.sheets.map((sheet, sheetIndex) => compileSheet(sheet.title, sheet.root, sheetIndex)),
  };
}

function compileSheet(title: string, root: MindMapTopic, sheetIndex: number): CompiledSheet {
  const pathIndex = new Map<string, CompiledTopic>();
  const compiledRoot = compileTopic(root, [], `sheet-${sheetIndex}/topic`, pathIndex);
  return { title, root: compiledRoot, pathIndex };
}

function compileTopic(topic: MindMapTopic, path: string[], ref: string, pathIndex: Map<string, CompiledTopic>): CompiledTopic {
  const compiled: CompiledTopic = {
    ref,
    path,
    topic,
    children: [],
  };
  pathIndex.set(JSON.stringify(path), compiled);
  compiled.children = (topic.children ?? []).map((child, index) =>
    compileTopic(child, [...path, child.title], `${ref}-${index}`, pathIndex),
  );
  return compiled;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/compiler.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compiler.ts tests/compiler.test.ts
git commit -m "实现内部引用编译"
```

## Task 8: Image Resolver

**Files:**
- Create: `src/image.ts`
- Test: `tests/image.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/image.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveMindMapImage } from "../src/image";
import { ImageError } from "../src/types";

const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"></svg>";

describe("resolveMindMapImage", () => {
  test("keeps non-SVG data URI as data URI", async () => {
    const image = await resolveMindMapImage({ kind: "data-uri", name: "pixel.png", data: "data:image/png;base64,AA==" });
    expect(image.name).toBe("pixel.png");
    expect(image.data).toBe("data:image/png;base64,AA==");
  });

  test("normalizes SVG data URI to raw SVG bytes", async () => {
    const image = await resolveMindMapImage({
      kind: "data-uri",
      name: "diagram.svg",
      data: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    });
    expect(image.name).toBe("diagram.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toContain("<svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).not.toContain("data:image/svg+xml");
  });

  test("normalizes inline SVG content", async () => {
    const image = await resolveMindMapImage({ kind: "svg", content: svg });
    expect(image.name).toBe("image.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toContain("<svg");
  });

  test("reads file image through xmind-generator compatible data", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-image-"));
    const file = join(dir, "sample.svg");
    await writeFile(file, svg);
    const image = await resolveMindMapImage({ kind: "file", path: file });
    expect(image.name).toBe("sample.svg");
    expect(Buffer.from(image.data as Uint8Array).toString("utf8")).toContain("<svg");
  });

  test("rejects invalid SVG", async () => {
    await expect(resolveMindMapImage({ kind: "svg", content: "not svg" })).rejects.toBeInstanceOf(ImageError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/image.test.ts`

Expected: FAIL because `src/image.ts` does not exist.

- [ ] **Step 3: Implement image resolver**

```ts
// src/image.ts
import { readImageFile, type NamedResourceData } from "xmind-generator";
import { ImageError, type MindMapImage } from "./types";

export async function resolveMindMapImage(image: MindMapImage): Promise<NamedResourceData> {
  if (image.kind === "file") {
    try {
      return await readImageFile(image.path);
    } catch (error) {
      throw new ImageError(`读取图片文件失败: ${(error as Error).message}`, image.path);
    }
  }

  if (image.kind === "svg") {
    const svg = normalizeSvgXml(image.content, "image.content");
    return { name: image.name ?? "image.svg", data: Buffer.from(svg, "utf8") };
  }

  if (isSvgDataUri(image.data)) {
    const svg = normalizeSvgXml(decodeSvgDataUri(image.data), "image.data");
    const name = image.name.toLowerCase().endsWith(".svg") ? image.name : `${image.name}.svg`;
    return { name, data: Buffer.from(svg, "utf8") };
  }

  return { name: image.name, data: image.data };
}

function isSvgDataUri(value: string): boolean {
  return /^data:image\/svg\+xml[;,]/i.test(value);
}

function decodeSvgDataUri(value: string): string {
  const match = value.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) {
    throw new ImageError("非法 SVG data URI", "image.data");
  }
  const payload = match[2] ?? "";
  return match[1] ? Buffer.from(payload, "base64").toString("utf8") : decodeURIComponent(payload);
}

function normalizeSvgXml(value: string, path: string): string {
  const trimmed = value.trim();
  if (!/^<svg[\s>]/i.test(trimmed) || !/<\/svg>$/i.test(trimmed)) {
    throw new ImageError("SVG 内容必须是完整 <svg> 文档", path);
  }
  return trimmed;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/image.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/image.ts tests/image.test.ts
git commit -m "实现图片解析和 SVG 规范化"
```

## Task 9: Converter

**Files:**
- Create: `src/converter.ts`
- Test: `tests/converter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/converter.test.ts
import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import { compileMindMapDocument } from "../src/compiler";
import { convertToWorkbook } from "../src/converter";

describe("convertToWorkbook", () => {
  test("maps all convertible schema fields into content.json", async () => {
    const compiled = compileMindMapDocument({
      version: "1",
      sheets: [{
        title: "S",
        root: {
          title: "R",
          note: "note",
          labels: ["label"],
          markers: ["priority-1"],
          image: { kind: "svg", content: "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>" },
          children: [{ title: "A" }, { title: "B" }],
          relationships: [{ title: "rel", fromPath: ["A"], toPath: ["B"] }],
          summaries: [{ title: "sum", fromPath: ["A"], toPath: ["B"] }],
        },
      }],
    });

    const workbook = await convertToWorkbook(compiled);
    const zip = await JSZip.loadAsync(await workbook.archive());
    const content = JSON.parse(await zip.file("content.json")!.async("string"));
    const root = content[0].rootTopic;
    expect(content[0].title).toBe("S");
    expect(root.title).toBe("R");
    expect(root.notes.plain.content).toContain("note");
    expect(root.labels).toEqual(["label"]);
    expect(root.markers).toEqual([{ markerId: "priority-1" }]);
    expect(root.image.src).toMatch(/^xap:resources\/.+\.svg$/);
    expect(root.children.attached.map((child: { title: string }) => child.title)).toEqual(["A", "B"]);
    expect(content[0].relationships[0].title).toBe("rel");
    expect(root.summaries[0].class).toBe("summary");
    expect(root.children.summary[0].title).toBe("sum");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/converter.test.ts`

Expected: FAIL because `src/converter.ts` does not exist.

- [ ] **Step 3: Implement converter**

```ts
// src/converter.ts
import { Relationship, RootTopic, Summary, Topic, Workbook, type RootTopicBuilder, type TopicBuilder, type WorkbookBuilder } from "xmind-generator";
import { markerNameToMarkerId } from "./markers";
import { resolveMindMapImage } from "./image";
import type { CompiledDocument, CompiledSheet, CompiledTopic, MindMapRelationship, MindMapSummary } from "./types";

export async function convertToWorkbook(document: CompiledDocument): Promise<WorkbookBuilder> {
  const roots = await Promise.all(document.sheets.map(convertSheet));
  return Workbook(roots);
}

async function convertSheet(sheet: CompiledSheet): Promise<RootTopicBuilder> {
  const root = (await convertTopic(sheet.root, true)) as RootTopicBuilder;
  root.sheetTitle(sheet.title);
  root.relationships(
    flatten(sheet.root).flatMap((topic) =>
      topic.topic.relationships?.map((relationship) => convertRelationship(relationship, sheet)) ?? [],
    ),
  );
  return root;
}

async function convertTopic(compiled: CompiledTopic, isRoot = false): Promise<TopicBuilder | RootTopicBuilder> {
  const builder = isRoot ? RootTopic(compiled.topic.title) : Topic(compiled.topic.title);
  builder.ref(compiled.ref);
  if (compiled.topic.note) builder.note(compiled.topic.note);
  if (compiled.topic.labels?.length) builder.labels(compiled.topic.labels);
  if (compiled.topic.markers?.length) builder.markers(compiled.topic.markers.map(markerNameToMarkerId));
  if (compiled.topic.image) builder.image(await resolveMindMapImage(compiled.topic.image));
  if (compiled.children.length) builder.children(await Promise.all(compiled.children.map((child) => convertTopic(child) as Promise<TopicBuilder>)));
  const summaries = compiled.topic.summaries?.map((summary) => convertSummary(summary, compiled)) ?? [];
  if (summaries.length) {
    (builder as TopicBuilder).summaries(summaries);
  }
  return builder;
}

function convertRelationship(relationship: MindMapRelationship, sheet: CompiledSheet) {
  return Relationship(relationship.title ?? "", {
    from: sheet.pathIndex.get(JSON.stringify(relationship.fromPath))!.ref,
    to: sheet.pathIndex.get(JSON.stringify(relationship.toPath))!.ref,
  });
}

function convertSummary(summary: MindMapSummary, owner: CompiledTopic) {
  return Summary(summary.title, {
    from: findDescendantRef(owner, summary.fromPath),
    to: findDescendantRef(owner, summary.toPath),
  });
}

function findDescendantRef(owner: CompiledTopic, path: string[]): string {
  const found = flatten(owner).find((topic) => JSON.stringify(topic.path) === JSON.stringify(path));
  if (!found) {
    throw new Error(`summary path not found: ${JSON.stringify(path)}`);
  }
  return found.ref;
}

function flatten(topic: CompiledTopic): CompiledTopic[] {
  return [topic, ...topic.children.flatMap(flatten)];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/converter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/converter.ts tests/converter.test.ts
git commit -m "实现 XMind workbook 转换"
```

## Task 10: Writer And Public API

**Files:**
- Create: `src/writer.ts`
- Modify: `src/index.ts`
- Test: `tests/writer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/writer.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtemp, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateXmindFile, parseMindMapInput, validateMindMapDocument } from "../src/index";

describe("public writer API", () => {
  test("generates a non-empty xmind file from parsed input", async () => {
    const dir = await mkdtemp(join(tmpdir(), "llm-xmind-writer-"));
    const input = join(dir, "input.yaml");
    const output = join(dir, "output.xmind");
    await writeFile(input, "version: \"1\"\nsheets:\n  - title: S\n    root:\n      title: R\n");
    const parsed = await parseMindMapInput(input);
    const document = validateMindMapDocument(parsed);
    await generateXmindFile(document, output);
    expect((await stat(output)).size).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/writer.test.ts`

Expected: FAIL because `generateXmindFile` is not implemented.

- [ ] **Step 3: Implement writer and public API**

```ts
// src/writer.ts
import { writeLocalFile } from "xmind-generator";
import { compileMindMapDocument } from "./compiler";
import { convertToWorkbook } from "./converter";
import { validateSemantics } from "./semantic";
import type { MindMapDocument } from "./types";

export async function generateXmindFile(document: MindMapDocument, outputPath: string): Promise<void> {
  validateSemantics(document);
  const compiled = compileMindMapDocument(document);
  const workbook = await convertToWorkbook(compiled);
  await writeLocalFile(workbook, outputPath);
}
```

```ts
// src/index.ts
export { parseMindMapInput } from "./parser";
export { validateMindMapDocument } from "./schema";
export { generateXmindFile } from "./writer";
export type * from "./types";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/writer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/writer.ts src/index.ts tests/writer.test.ts
git commit -m "实现 XMind 文件写出 API"
```

## Task 11: CLI And Fixtures

**Files:**
- Create: `src/cli.ts`
- Create: `fixtures/minimal.yaml`
- Create: `fixtures/minimal.json`
- Create: `fixtures/complete.yaml`
- Create: `fixtures/complete.json`
- Test: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/cli.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtemp, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
  });

  test("prints validation error and exits non-zero", async () => {
    const proc = Bun.spawn(["bun", "run", "src/cli.ts", "fixtures/invalid-required.yaml", "-o", "/tmp/invalid.xmind"], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(exitCode).toBe(1);
    expect(stderr).toContain("SchemaValidationError");
  });
});
```

- [ ] **Step 2: Add fixtures before running the test**

```yaml
# fixtures/minimal.yaml
version: "1"
sheets:
  - title: "Minimal"
    root:
      title: "Root"
```

```json
// fixtures/minimal.json
{
  "version": "1",
  "sheets": [
    {
      "title": "Minimal",
      "root": { "title": "Root" }
    }
  ]
}
```

```yaml
# fixtures/complete.yaml
version: "1"
sheets:
  - title: "Complete"
    root:
      title: "Root"
      note: "plain note"
      labels:
        - "label"
      markers:
        - "priority-1"
      image:
        kind: "svg"
        name: "diagram.svg"
        content: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"></svg>"
      children:
        - title: "A"
        - title: "B"
      relationships:
        - title: "rel"
          fromPath: ["A"]
          toPath: ["B"]
      summaries:
        - title: "sum"
          fromPath: ["A"]
          toPath: ["B"]
```

```json
// fixtures/complete.json
{
  "version": "1",
  "sheets": [
    {
      "title": "Complete",
      "root": {
        "title": "Root",
        "note": "plain note",
        "labels": ["label"],
        "markers": ["priority-1"],
        "image": {
          "kind": "svg",
          "name": "diagram.svg",
          "content": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"></svg>"
        },
        "children": [{ "title": "A" }, { "title": "B" }],
        "relationships": [{ "title": "rel", "fromPath": ["A"], "toPath": ["B"] }],
        "summaries": [{ "title": "sum", "fromPath": ["A"], "toPath": ["B"] }]
      }
    }
  ]
}
```

```yaml
# fixtures/invalid-required.yaml
version: "1"
sheets:
  - title: "Invalid"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test tests/cli.test.ts`

Expected: FAIL because `src/cli.ts` does not exist.

- [ ] **Step 4: Implement CLI**

```ts
// src/cli.ts
#!/usr/bin/env bun
import { parseMindMapInput } from "./parser";
import { validateMindMapDocument } from "./schema";
import { generateXmindFile } from "./writer";

function parseArgs(args: string[]): { input: string; output: string } {
  const input = args[0];
  const outputFlag = args.findIndex((arg) => arg === "-o" || arg === "--output");
  const output = outputFlag >= 0 ? args[outputFlag + 1] : undefined;
  if (!input || !output) {
    throw new Error("用法: llm-xmind <input.yaml|input.json> -o <output.xmind>");
  }
  return { input, output };
}

try {
  const { input, output } = parseArgs(Bun.argv.slice(2));
  const parsed = await parseMindMapInput(input);
  const document = validateMindMapDocument(parsed);
  await generateXmindFile(document, output);
  console.log(`generated ${output}`);
} catch (error) {
  const err = error as Error & { path?: string };
  console.error(`${err.name}: ${err.message}${err.path ? ` (${err.path})` : ""}`);
  process.exit(1);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test tests/cli.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts fixtures tests/cli.test.ts
git commit -m "实现命令行生成入口"
```

## Task 12: README And Full Verification

**Files:**
- Create: `README.md`
- Modify: `package.json`
- Test: all tests and CLI fixture commands

- [ ] **Step 1: Write README**

````md
# llm-xmind

AI 友好的 XMind 生成工具。AI 输出严格 YAML 或 JSON，本工具校验 schema 后生成 `.xmind` 文件。

## CLI

```bash
bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
```

## TypeScript API

```ts
import { generateXmindFile, parseMindMapInput, validateMindMapDocument } from "llm-xmind";

const parsed = await parseMindMapInput("input.yaml");
const document = validateMindMapDocument(parsed);
await generateXmindFile(document, "output.xmind");
```

## AI 输出要求

只输出 YAML 或 JSON，不要输出解释文字。不要生成 ID。关系线和概要使用 `fromPath` / `toPath` 标题路径引用 topic。

```yaml
version: "1"
sheets:
  - title: "项目讨论"
    root:
      title: "AI 友好的 XMind 生成工具"
      children:
        - title: "输入"
        - title: "输出"
      relationships:
        - title: "转换"
          fromPath: ["输入"]
          toPath: ["输出"]
```

## 图片

支持本地文件、非 SVG data URI、SVG XML 和 SVG data URI。SVG data URI 会被规范化为原始 SVG 资源，兼容 XMind 和 MindMaster。
````

- [ ] **Step 2: Ensure package script works**

```json
// package.json scripts section
{
  "scripts": {
    "test": "bun test",
    "llm-xmind": "bun run src/cli.ts"
  }
}
```

- [ ] **Step 3: Run all tests**

Run: `bun test`

Expected: PASS for all test files.

- [ ] **Step 4: Run fixture CLI commands**

Run:

```bash
mkdir -p tmp
bun run llm-xmind fixtures/minimal.yaml -o tmp/minimal.xmind
bun run llm-xmind fixtures/complete.yaml -o tmp/complete.xmind
test -s tmp/minimal.xmind
test -s tmp/complete.xmind
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json
git commit -m "补充文档和验收命令"
```

## Self-Review Checklist

- Spec coverage: parser、schema、semantic、compiler、image、converter、writer、CLI、README 都有任务覆盖。
- Schema coverage: Task 5 覆盖最小输入、全字段输入、必填缺失、未知字段、非法 marker、非法 image variant；Task 6 覆盖跨字段语义；Task 8 覆盖 image variants。
- Converter coverage: Task 9 解包 `content.json` 检查 title、note、labels、markers、image、children、relationships、summaries。
- SVG compatibility: Task 8 明确 SVG data URI 规范化，Task 9 检查资源为 `.svg`。
- `jszip` runtime issue: Task 1 明确依赖 `jszip@3.10.1`，Task 9 用 `JSZip` 解包验证生成产物。
- Placeholder scan: 本计划没有 `TBD`、`TODO`、`implement later`。
- Type consistency: `MindMapDocument`、`MindMapTopic`、`MindMapImage`、`CompiledDocument`、`CompiledTopic` 在各任务中命名一致。
