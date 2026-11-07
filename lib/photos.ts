// Nombres de archivo de las fotos. La identidad es el hash (imageInfo.imghash, enlaces ?open=hash),
// pero al rotar o voltear una foto se guarda con otro nombre (hash-v1.webp, hash-v2.webp…): los
// archivos se sirven con caché de un año y sobrescribir el mismo nombre dejaría la versión vieja.
//   original:  <evento>/<pending|approved|rejected>/<archivo>
//   miniatura: <evento>/thumbnails/thumb_<archivo>   (480 px, muro y cuadrícula)
//   mediana:   <evento>/medium/med_<archivo>         (1280 px, visor de la galería)

export const PHOTO_CACHE_CONTROL = '31536000' // un año: el contenido de un nombre nunca cambia

// Botón "Comprimir" del moderador (/api/transform-image): 2560 px y calidad 85 dejan una foto de celular
// en ~0.5–1 MB sin pérdida visible. Al subir no se comprime: llegan WebP de 2–4 MB y el moderador decide
export const ORIGINAL_MAX_PX = 2560
export const ORIGINAL_QUALITY = 85
export const COMPRESS_FROM_BYTES = 1024 * 1024 // el moderador ve "Comprimir" en fotos de más de 1 MB

export function photoFile(hash: string, version?: number | null): string {
  return version ? `${hash}-v${version}.webp` : `${hash}.webp`
}

export function hashOf(filename: string): string {
  return filename.replace(/(-v\d+)?\.webp$/, '')
}
