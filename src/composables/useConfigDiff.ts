export interface ConfigDiffRow {
  key: string
  kind: 'changed' | 'added' | 'removed'
  before: string
  after: string
}

function pretty(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'string') {
    const v = value.length > 80 ? `${value.slice(0, 80)}…` : value
    return JSON.stringify(v)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Top-level key diff between two flat-ish config objects, for the "review
 * changes" preview in the path-config form. Values are compared structurally
 * so reordering arrays doesn't count as a change.
 */
export function diffConfigs(
  before: Record<string, any>,
  after: Record<string, any>
): ConfigDiffRow[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const rows: ConfigDiffRow[] = []
  for (const key of keys) {
    const hasBefore = key in before
    const hasAfter = key in after
    const b = hasBefore ? before[key] : undefined
    const a = hasAfter ? after[key] : undefined
    if (hasBefore && hasAfter) {
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        rows.push({ key, kind: 'changed', before: pretty(b), after: pretty(a) })
      }
    } else if (hasAfter) {
      rows.push({ key, kind: 'added', before: '', after: pretty(a) })
    } else {
      rows.push({ key, kind: 'removed', before: pretty(b), after: '' })
    }
  }
  return rows
}
