// Una sola vez, para las fotos subidas antes de la versión mediana y la caché de un año:
//  - crea <evento>/medium/med_<archivo> (1280 px) para cada foto que no la tenga
//  - vuelve a subir original y miniatura (mismos bytes) con Cache-Control de un año
// Uso: node --env-file=.env.local scripts/backfill-medium.mjs
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const BUCKET = 'nextjsGallery'
const CACHE = '31536000'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const storage = supabase.storage.from(BUCKET)

async function list(prefix) {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset })
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) return out
  }
}

async function reupload(path, buffer) {
  const { error } = await storage.update(path, buffer, { contentType: 'image/webp', cacheControl: CACHE })
  if (error) console.error('  ✗', path, error.message)
}

const events = (await list('')).filter(e => !e.metadata && e.name !== 'logos').map(e => e.name)
let done = 0

for (const ev of events) {
  const media = new Set((await list(`${ev}/medium`)).map(f => f.name))
  const thumbs = new Set((await list(`${ev}/thumbnails`)).map(f => f.name))

  for (const folder of ['pending', 'approved', 'rejected']) {
    const files = (await list(`${ev}/${folder}`)).filter(f => f.metadata && f.name.endsWith('.webp') && f.name !== 'dummy.webp')
    for (const f of files) {
      const { data, error } = await storage.download(`${ev}/${folder}/${f.name}`)
      if (error) { console.error('  ✗', f.name, error.message); continue }
      const original = Buffer.from(await data.arrayBuffer())

      if (!media.has(`med_${f.name}`)) {
        const medium = await sharp(original)
          .rotate()
          .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer()
        const { error: upErr } = await storage.upload(`${ev}/medium/med_${f.name}`, medium, {
          contentType: 'image/webp', cacheControl: CACHE, upsert: true,
        })
        if (upErr) console.error('  ✗ mediana', f.name, upErr.message)
      }

      await reupload(`${ev}/${folder}/${f.name}`, original)
      if (thumbs.has(`thumb_${f.name}`)) {
        const { data: t } = await storage.download(`${ev}/thumbnails/thumb_${f.name}`)
        if (t) await reupload(`${ev}/thumbnails/thumb_${f.name}`, Buffer.from(await t.arrayBuffer()))
      }
      console.log(`${++done} ${ev}/${folder}/${f.name}`)
    }
  }
}
console.log(`Listo: ${done} fotos`)
