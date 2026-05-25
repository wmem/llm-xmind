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
