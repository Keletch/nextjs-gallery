'use client'
import { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'

type Folder = 'pending' | 'approved' | 'rejected' | 'logs'

export function useModeration(evento: string, folder: Folder) {
  const [images, setImages] = useState<string[]>([])
  const [urls, setUrls] = useState<Record<string, { thumb: string; original: string }>>({})
  const [logs, setLogs] = useState<any[]>([])
  const [logView, setLogView] = useState<'moderation' | 'uploads'>('moderation')
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    if (!evento || folder === 'logs') return

    const fetchImages = async () => {
      try {
        const res = await fetch(`/api/${folder}-index?evento=${evento}`)
        const list = await res.json()

        const validImages = Array.isArray(list)
          ? list.filter((f: unknown): f is string => typeof f === 'string' && /\.(webp)$/i.test(f))
          : []

        setImages(validImages)

        const entries = await Promise.all(
          validImages.map(async (filename) => {
            const thumbPath = `${evento}/thumbnails/thumb_${filename}`
            const originalPath = `${evento}/${folder}/${filename}`

            const { data: thumbData } = supabaseClient.storage
              .from('nextjsGallery')
              .getPublicUrl(thumbPath)

            const { data: originalData } = supabaseClient.storage
              .from('nextjsGallery')
              .getPublicUrl(originalPath)

            return [
              filename,
              {
                thumb: thumbData?.publicUrl || '',
                original: originalData?.publicUrl || '',
              },
            ]
          })
        )

        setUrls(Object.fromEntries(entries))
      } catch (err) {
        console.error('❌ Error al cargar imágenes:', err)
        setStatus('No se pudieron cargar las imágenes')
      }
    }

    fetchImages()
  }, [evento, folder])

  useEffect(() => {
    if (folder !== 'logs') return

    if (!evento) {
      setLogs([]) // ✅ limpiar logs si no hay evento
      return
    }

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/get-logs?evento=${evento}`) // ✅ filtrado por evento
        const allLogs = await res.json()
        setLogs(allLogs)
      } catch (err) {
        console.error('❌ Error al cargar logs:', err)
        setStatus('No se pudieron cargar los logs')
      }
    }

    fetchLogs()
  }, [folder, evento]) // ✅ incluye evento como dependencia

  async function handleAction(endpoint: string, payload: any, successMsg: string) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ ...payload, evento }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (res.ok) {
        setImages(prev => prev.filter(img => img !== payload.filename))

        if (endpoint === '/api/delete-image') {
          await fetch('/api/delete-image', {
            method: 'POST',
            body: JSON.stringify({ filename: `thumb_${payload.filename}`, folder: 'thumbnails', evento }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })
        }

        setStatus(successMsg)
      } else {
        setStatus('Error en la operación')
      }
    } catch (err) {
      setStatus('Error en la operación')
    }
  }

  return {
    images,
    urls,
    logs,
    logView,
    setLogView,
    status,
    handleAction,
  }
}