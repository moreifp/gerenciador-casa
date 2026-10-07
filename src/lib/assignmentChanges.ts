/** Compare assigned users without generating duplicate inserts or accidental notifications. */
export function assignmentChanges(previous: string[], next: string[]) {
  const before = new Set(previous);
  const after = new Set(next);
  return {
    added: [...after].filter(id => !before.has(id)),
    removed: [...before].filter(id => !after.has(id)),
  };
}