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
    expect(() => assertNoMarkerGroupConflict(["priority-1", "priority-2"], "root.markers")).toThrow(
      SemanticValidationError,
    );
    expect(() => assertNoMarkerGroupConflict(["priority-1", "task-done"], "root.markers")).not.toThrow();
  });
});
