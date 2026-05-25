import { describe, expect, test } from "bun:test";
import { Marker, type MarkerId } from "xmind-generator";
import {
  assertNoMarkerGroupConflict,
  isMarkerName,
  markerNameToMarkerId,
  supportedMarkerNames,
} from "../src/markers";
import { SemanticValidationError } from "../src/types";

describe("markers", () => {
  const markerGroups = [
    Marker.Priority,
    Marker.Smiley,
    Marker.Task,
    Marker.Flag,
    Marker.Star,
    Marker.People,
    Marker.Arrow,
    Marker.Month,
    Marker.Week,
  ];

  const markerIds = (group: Record<string, MarkerId>): string[] => Object.values(group).map((marker) => marker.id);
  const sorted = (values: string[]): string[] => [...values].sort();

  test("recognizes supported marker names", () => {
    expect(isMarkerName("priority-1")).toBe(true);
    expect(isMarkerName("arrow-refresh")).toBe(true);
    expect(isMarkerName("unknown")).toBe(false);
  });

  test("exports all Marker ids supported by xmind-generator", () => {
    const actualMarkerIds = markerGroups.flatMap(markerIds);

    expect(sorted(supportedMarkerNames)).toEqual(sorted(actualMarkerIds));
  });

  test("maps marker name to MarkerId", () => {
    expect(markerNameToMarkerId("priority-1").id).toBe("priority-1");
  });

  test("maps every supported marker name to same MarkerId id", () => {
    for (const name of supportedMarkerNames) {
      expect(markerNameToMarkerId(name).id).toBe(name);
    }
  });

  test("rejects same marker group in one topic", () => {
    expect(() => assertNoMarkerGroupConflict(["priority-1", "priority-2"], "root.markers")).toThrow(
      SemanticValidationError,
    );
    expect(() => assertNoMarkerGroupConflict(["priority-1", "task-done"], "root.markers")).not.toThrow();
  });

  test("rejects same marker group conflict for every marker group", () => {
    for (const group of markerGroups) {
      const [first, second] = markerIds(group);

      expect(() => assertNoMarkerGroupConflict([first, second], "root.markers")).toThrow(SemanticValidationError);
    }
  });
});
