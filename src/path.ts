export function pathKey(path: readonly string[]): string {
  return JSON.stringify(path);
}
