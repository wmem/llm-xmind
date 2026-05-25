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
