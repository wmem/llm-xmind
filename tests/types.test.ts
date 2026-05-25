import { describe, expect, test } from "bun:test";
import {
  ImageError,
  ParseError,
  SchemaValidationError,
  SemanticValidationError,
} from "../src/types";
import {
  ParseError as PublicParseError,
  SchemaValidationError as PublicSchemaValidationError,
} from "../src/index";

describe("domain errors", () => {
  test("carry code, path and message", () => {
    const error = new SchemaValidationError("字段类型错误", "sheets[0].root.title");
    expect(error.name).toBe("SchemaValidationError");
    expect(error.code).toBe("SCHEMA_VALIDATION_ERROR");
    expect(error.path).toBe("sheets[0].root.title");
    expect(error.message).toBe("字段类型错误");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SchemaValidationError);
  });

  test("exports all domain error classes", () => {
    expect(new ParseError("解析失败", "input.yaml").code).toBe("PARSE_ERROR");
    expect(new SemanticValidationError("路径不存在", "sheets[0]").code).toBe("SEMANTIC_VALIDATION_ERROR");
    expect(new ImageError("图片非法", "sheets[0].root.image").code).toBe("IMAGE_ERROR");
  });

  test("exports runtime error classes from public entry", () => {
    const error = new PublicSchemaValidationError("字段缺失", "sheets[0].root");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PublicSchemaValidationError);
    expect(error.code).toBe("SCHEMA_VALIDATION_ERROR");
  });

  test("public entry errors can be caught by class", () => {
    try {
      throw new PublicParseError("解析失败", "input.yaml");
    } catch (error) {
      expect(error).toBeInstanceOf(PublicParseError);
      expect((error as PublicParseError).code).toBe("PARSE_ERROR");
    }
  });
});
