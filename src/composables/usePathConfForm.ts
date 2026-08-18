// MediaMTX ≥ v1.20.1 redacts credentials in API responses, replacing any
// non-empty password with this literal placeholder. Such values can only be
// set, never read back, so a form holding the placeholder means "unchanged".
export const REDACTED_CREDENTIAL = '<redacted>'

export const isRedactedCredential = (v: unknown): boolean =>
  typeof v === 'string' && v === REDACTED_CREDENTIAL

export interface PathConfForm {
  name: string
  source: string
  sourceFingerprint: string
  sourceOnDemand: boolean
  sourceOnDemandStartTimeout: string
  sourceOnDemandCloseAfter: string
  maxReaders: number
  alwaysAvailable: boolean
  alwaysAvailableFile: string
  publishUser: string
  publishPass: string
  readUser: string
  readPass: string
  publishIPs: string[]
  readIPs: string[]
  overridePublish: string
  record: boolean
  recordPath: string
  recordFormat: string
  recordSegmentDuration: string
  recordPartDuration: string
  recordDeleteAfter: string
  runOnInit: string
  runOnInitRestart: boolean
  runOnDemand: string
  runOnDemandRestart: boolean
  runOnDemandStartTimeout: string
  runOnDemandCloseAfter: string
  runOnUnDemand: string
  runOnReady: string
  runOnReadyRestart: boolean
  runOnNotReady: string
  runOnRead: string
  runOnReadRestart: boolean
  runOnUnread: string
  runOnRecordSegmentCreate: string
  runOnRecordSegmentComplete: string
}

export function emptyPathConfForm(): PathConfForm {
  return {
    name: '',
    source: '',
    sourceFingerprint: '',
    sourceOnDemand: false,
    sourceOnDemandStartTimeout: '',
    sourceOnDemandCloseAfter: '',
    maxReaders: 0,
    alwaysAvailable: false,
    alwaysAvailableFile: '',
    publishUser: '',
    publishPass: '',
    readUser: '',
    readPass: '',
    publishIPs: [],
    readIPs: [],
    overridePublish: 'none',
    record: false,
    recordPath: '',
    recordFormat: 'fmp4',
    recordSegmentDuration: '',
    recordPartDuration: '',
    recordDeleteAfter: '',
    runOnInit: '',
    runOnInitRestart: false,
    runOnDemand: '',
    runOnDemandRestart: false,
    runOnDemandStartTimeout: '',
    runOnDemandCloseAfter: '',
    runOnUnDemand: '',
    runOnReady: '',
    runOnReadyRestart: false,
    runOnNotReady: '',
    runOnRead: '',
    runOnReadRestart: false,
    runOnUnread: '',
    runOnRecordSegmentCreate: '',
    runOnRecordSegmentComplete: ''
  }
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

const bool = (v: unknown): boolean => v === true

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : str(v).split(',')

// MediaMTX's API returns a sparse PathConf; any field it omits is a default.
// Only copy the fields the form edits, converting null/undefined to '' so the
// form never shows "null" text in inputs.
export function fillPathConfForm(target: PathConfForm, row: Record<string, any>): void {
  Object.assign(target, emptyPathConfForm(), {
    name: str(row.name),
    source: str(row.source),
    sourceFingerprint: str(row.sourceFingerprint),
    sourceOnDemand: bool(row.sourceOnDemand),
    sourceOnDemandStartTimeout: str(row.sourceOnDemandStartTimeout),
    sourceOnDemandCloseAfter: str(row.sourceOnDemandCloseAfter),
    maxReaders: num(row.maxReaders),
    alwaysAvailable: bool(row.alwaysAvailable),
    alwaysAvailableFile: str(row.alwaysAvailableFile),
    publishUser: str(row.publishUser),
    publishPass: str(row.publishPass),
    readUser: str(row.readUser),
    readPass: str(row.readPass),
    publishIPs: list(row.publishIPs),
    readIPs: list(row.readIPs),
    overridePublish: str(row.overridePublish) || 'none',
    record: bool(row.record),
    recordPath: str(row.recordPath),
    recordFormat: str(row.recordFormat) || 'fmp4',
    recordSegmentDuration: str(row.recordSegmentDuration),
    recordPartDuration: str(row.recordPartDuration),
    recordDeleteAfter: str(row.recordDeleteAfter),
    runOnInit: str(row.runOnInit),
    runOnInitRestart: bool(row.runOnInitRestart),
    runOnDemand: str(row.runOnDemand),
    runOnDemandRestart: bool(row.runOnDemandRestart),
    runOnDemandStartTimeout: str(row.runOnDemandStartTimeout),
    runOnDemandCloseAfter: str(row.runOnDemandCloseAfter),
    runOnUnDemand: str(row.runOnUnDemand),
    runOnReady: str(row.runOnReady),
    runOnReadyRestart: bool(row.runOnReadyRestart),
    runOnNotReady: str(row.runOnNotReady),
    runOnRead: str(row.runOnRead),
    runOnReadRestart: bool(row.runOnReadRestart),
    runOnUnread: str(row.runOnUnread),
    runOnRecordSegmentCreate: str(row.runOnRecordSegmentCreate),
    runOnRecordSegmentComplete: str(row.runOnRecordSegmentComplete)
  })
}

const splitList = (v: string) =>
  v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

/**
 * Builds the payload for PATCH/POST. MediaMTX copies every field verbatim, so
 * an empty string is what clears a field back to its default (empty
 * publishUser = no auth, empty runOnReady = no hook, empty IP list = allow
 * all). The one exception is `source`: MediaMTX rejects an empty string there,
 * so an empty source is sent as the literal default value "publisher"
 * (publish directly).
 */
export function pathConfPayload(form: PathConfForm): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(form)) {
    if (key === 'name') continue
    if (value === null || value === undefined) continue
    // Passwords are redacted to "<redacted>" in API responses (v1.20.1+). The
    // server copies every PATCHed field verbatim, so re-sending the
    // placeholder would replace the real password with that literal string.
    // Omit it instead, leaving the existing password untouched.
    if (
      (key === 'publishPass' || key === 'readPass') &&
      isRedactedCredential(value)
    ) {
      continue
    }
    if (key === 'source' && value === '') {
      data[key] = 'publisher'
    } else if (key === 'publishIPs' || key === 'readIPs') {
      data[key] = (value as string[]).join(',')
    } else {
      data[key] = value
    }
  }
  return data
}

export const splitCsv = splitList
