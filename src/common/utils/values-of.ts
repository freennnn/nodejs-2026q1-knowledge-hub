export function valuesOf<const T extends Record<string, string>>(
  obj: T,
): readonly T[keyof T][] {
  // Object.values() loses the literal union (and is typed as string[] here),
  // so we assert through unknown to preserve T[keyof T] at the call site.
  return Object.values(obj) as unknown as readonly T[keyof T][];
}
