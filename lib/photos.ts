// Nombres de archivo de las fotos. La identidad es el hash (imageInfo.imghash, enlaces ?open=hash),
// pero al rotar o voltear una foto se guarda con otro nombre (hash-v1.webp, hash-v2.webp…): los
// archivos se sirven con caché de un año y sobrescribir el mismo nombre dejaría la versión vieja.
//   original:  <evento>/<pending|approved|rejected>/<archivo>
//   miniatura: <evento>/thumbnails/thumb_<archivo>   (480 px, muro y cuadrícula)
//   mediana:   <evento>/medium/med_<archivo>         (1280 px, visor de la galería)

export const PHOTO_CACHE_CONTROL = '31536000' // un año: el contenido de un nombre nunca cambia

export function photoFile(hash: string, version?: number | null): string {
  return version ? `${hash}-v${version}.webp` : `${hash}.webp`
}

export function hashOf(filename: string): string {
  return filename.replace(/(-v\d+)?\.webp$/, '')
}
