export function toNullableUuidInput(value: unknown): unknown {
  // keep undefined and null as is
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  // trim and cast '' to null
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
