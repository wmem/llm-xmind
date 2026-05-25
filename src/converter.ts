import {
  Relationship,
  RootTopic,
  Summary,
  Topic,
  Workbook,
  type RelationshipBuilder,
  type RootTopicBuilder,
  type SummaryBuilder,
  type TopicBuilder,
  type WorkbookBuilder,
} from "xmind-generator";
import { resolveMindMapImage } from "./image";
import { markerNameToMarkerId } from "./markers";
import { pathKey } from "./path";
import type { CompiledDocument, CompiledSheet, CompiledTopic, MindMapRelationship, MindMapSummary } from "./types";

export async function convertToWorkbook(document: CompiledDocument): Promise<WorkbookBuilder> {
  const roots = await Promise.all(document.sheets.map(convertSheet));
  return Workbook(roots);
}

async function convertSheet(sheet: CompiledSheet): Promise<RootTopicBuilder> {
  const root = await convertRootTopic(sheet.root);
  root.sheetTitle(sheet.title);
  root.relationships(collectRelationships(sheet));
  return root;
}

async function convertRootTopic(compiled: CompiledTopic): Promise<RootTopicBuilder> {
  const builder = RootTopic(compiled.topic.title);
  await applyTopicFields(builder, compiled);
  return builder;
}

async function convertChildTopic(compiled: CompiledTopic): Promise<TopicBuilder> {
  const builder = Topic(compiled.topic.title);
  await applyTopicFields(builder, compiled);
  return builder;
}

async function applyTopicFields(builder: RootTopicBuilder | TopicBuilder, compiled: CompiledTopic): Promise<void> {
  builder.ref(compiled.ref);

  if (compiled.topic.note) {
    builder.note(compiled.topic.note);
  }
  if (compiled.topic.labels?.length) {
    builder.labels(compiled.topic.labels);
  }
  if (compiled.topic.markers?.length) {
    builder.markers(compiled.topic.markers.map(markerNameToMarkerId));
  }
  if (compiled.topic.image) {
    builder.image(await resolveMindMapImage(compiled.topic.image));
  }
  if (compiled.children.length) {
    builder.children(await Promise.all(compiled.children.map(convertChildTopic)));
  }

  const summaries = compiled.topic.summaries?.map((summary) => convertSummary(summary, compiled)) ?? [];
  if (summaries.length) {
    builder.summaries(summaries);
  }
}

function collectRelationships(sheet: CompiledSheet): RelationshipBuilder[] {
  return flattenTopics(sheet.root).flatMap((compiled) =>
    compiled.topic.relationships?.map((relationship) => convertRelationship(relationship, sheet)) ?? [],
  );
}

function convertRelationship(relationship: MindMapRelationship, sheet: CompiledSheet): RelationshipBuilder {
  return Relationship(relationship.title ?? "", {
    from: resolvePathRef(sheet, relationship.fromPath, "relationship.fromPath"),
    to: resolvePathRef(sheet, relationship.toPath, "relationship.toPath"),
  });
}

function convertSummary(summary: MindMapSummary, owner: CompiledTopic): SummaryBuilder {
  return Summary(summary.title, {
    from: resolveDirectChildRef(owner, summary.fromPath, "summary.fromPath"),
    to: resolveDirectChildRef(owner, summary.toPath, "summary.toPath"),
  });
}

function resolvePathRef(sheet: CompiledSheet, path: readonly string[], label: string): string {
  const found = sheet.pathIndex.get(pathKey(path));
  if (!found) {
    throw new Error(`${label} 不存在: ${JSON.stringify(path)}`);
  }
  return found.ref;
}

function resolveDirectChildRef(owner: CompiledTopic, path: readonly string[], label: string): string {
  const found = owner.children.find((child) => pathKey(child.path) === pathKey(path));
  if (!found) {
    throw new Error(`${label} 不是当前 summary 所属 topic 的直接子 topic: ${JSON.stringify(path)}`);
  }
  return found.ref;
}

function flattenTopics(topic: CompiledTopic): CompiledTopic[] {
  return [topic, ...topic.children.flatMap(flattenTopics)];
}
