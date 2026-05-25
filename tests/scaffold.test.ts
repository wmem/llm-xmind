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
