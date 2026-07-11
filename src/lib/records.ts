export function zeroRecord<K extends string>(
  keys: readonly K[],
): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}
