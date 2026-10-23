// Validadores para valores que terminan formando rutas dentro del bucket.
// Evitan que alguien mande "../otroEvento" o carpetas arbitrarias.

export const MODERATION_FOLDERS = ['pending', 'approved', 'rejected'] as const
export type ModerationFolder = (typeof MODERATION_FOLDERS)[number]

const EVENT_ROUTE = /^[A-Za-z0-9_-]{1,64}$/
const FILENAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}$/

export function isValidEventRoute(value: unknown): value is string {
  return typeof value === 'string' && EVENT_ROUTE.test(value) && value !== 'logos'
}

export function isValidFilename(value: unknown): value is string {
  return typeof value === 'string' && FILENAME.test(value) && !value.includes('..')
}

export function isModerationFolder(value: unknown): value is ModerationFolder {
  return typeof value === 'string' && (MODERATION_FOLDERS as readonly string[]).includes(value)
}

const HASHTAG = /^[\p{L}\p{N}_]{1,40}$/u
const MAX_HASHTAGS = 6

// "Shift2025, #trading" -> "#Shift2025 #trading". null si alguno trae caracteres no válidos.
export function normalizeHashtags(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const tags = value.split(/[\s,]+/).map(t => t.replace(/^#+/, '')).filter(Boolean)
  if (tags.length > MAX_HASHTAGS || !tags.every(t => HASHTAG.test(t))) return null
  return [...new Set(tags)].map(t => `#${t}`).join(' ')
}
