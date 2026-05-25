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
