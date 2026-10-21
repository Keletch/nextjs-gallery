'use client'
import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from 'lucide-react'
import Glass, { GlassButton, GlassTextarea } from '@/components/Glass'

interface ModeratorImageViewerProps {
  imageUrl: string
  filename: string
  evento: string
  folder: 'pending' | 'approved' | 'rejected'
  onClose: () => void
  onUpdate?: () => void
}

export default function ModeratorImageViewer({
  imageUrl,
  filename,
  evento,
  folder,
  onClose,
  onUpdate,
}: ModeratorImageViewerProps) {
  const [description, setDescription] = useState<string>('')
  const [originalDescription, setOriginalDescription] = useState<string>('')
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [fileSize, setFileSize] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const hash = filename.replace(/\.webp$/, '')

  useEffect(() => {
    const fetchInfo = async () => {
      const { data } = await supabaseClient
        .from('imageInfo')
        .select('description')
        .eq('imghash', hash)
        .maybeSingle()

      if (data) {
        setDescription(data.description || '')
        setOriginalDescription(data.description || '')
      }
    }

    fetchInfo()

    // Obtener tamaño del archivo original
    fetch(imageUrl, { method: 'HEAD' })
      .then(res => {
        const size = parseInt(res.headers.get('content-length') || '0')
        setFileSize(size)
      })
      .catch(() => setFileSize(0))
  }, [hash, imageUrl])

  // Detectar cambios
  useEffect(() => {
    const descChanged = description !== originalDescription
    const transformChanged = rotation !== 0 || flipH || flipV
    setHasChanges(descChanged || transformChanged)
  }, [description, originalDescription, rotation, flipH, flipV])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      onClose()
      return
    }

    setIsSaving(true)
    setSaveStatus('Guardando cambios...')

    try {
      // 1. Guardar descripción si cambió
      if (description !== originalDescription) {
        const { error: descError } = await supabaseClient
          .from('imageInfo')
          .update({ description: description.trim() || null })
          .eq('imghash', hash)

        if (descError) throw new Error('Error al guardar descripción')
      }

      // 2. Aplicar transformaciones si hay rotación o volteo
      if (rotation !== 0 || flipH || flipV) {
        const transformRes = await fetch('/api/transform-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            evento,
            folder,
            rotation,
            flipH,
            flipV,
          }),
        })

        if (!transformRes.ok) {
          const error = await transformRes.json()
          throw new Error(error.error || 'Error al transformar imagen')
        }
      }

      setSaveStatus('Cambios guardados correctamente')
      setTimeout(() => {
        if (onUpdate) onUpdate()
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error al guardar cambios:', err)
      setSaveStatus(`${err instanceof Error ? err.message : 'Error al guardar'}`)
      setIsSaving(false)
    }
  }

  const getTransform = () => {
    let transform = `rotate(${rotation}deg)`
    if (flipH) transform += ' scaleX(-1)'
    if (flipV) transform += ' scaleY(-1)'
    return transform
  }

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
      <Glass
        radius={32}
        frost="heavy"
        className="mx-4 flex h-full w-full max-w-7xl flex-col md:h-[90vh] md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Imagen */}
        <div className="relative flex flex-1 items-center justify-center bg-black/30 p-6">
          {/* Spinner de carga */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="text-center">
              <div className="mb-4 inline-block h-9 w-9 animate-spin rounded-full border-2 border-white/80 border-r-transparent"></div>
              <p className="animate-pulse text-white/60">Cargando imagen...</p>
            </div>
          </div>

          {/* Imagen */}
          <img
            src={imageUrl}
            alt="Preview"
            className={`max-h-full max-w-full rounded-2xl object-contain transition-all duration-700 ease-out ${imageLoaded
              ? 'opacity-100 scale-100 blur-0'
              : 'opacity-0 scale-95 blur-sm'
              }`}
            style={{ transform: getTransform() }}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Panel de controles */}
        <div className="flex w-full flex-col overflow-y-auto border-t border-white/10 md:w-96 md:border-l md:border-t-0">
          <div className="space-y-6 p-6">
            <h3 className="text-2xl font-semibold tracking-tight">Editar imagen</h3>

            {/* Info del archivo */}
            {fileSize > 0 && (
              <Glass radius={18} frost="regular" refraction={0} className="space-y-1 p-4 text-sm text-white/65">
                <p><span className="text-white/90">Tamaño:</span> {formatFileSize(fileSize)}</p>
                <p><span className="text-white/90">Carpeta:</span> {folder}</p>
              </Glass>
            )}

            {/* Descripción */}
            <div>
              <label className="mb-2 block pl-1 text-sm font-medium text-white/75">Descripción</label>
              <GlassTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe una descripción..."
                maxLength={500}
                rows={4}
              />
            </div>

            {/* Transformaciones */}
            <div>
              <label className="mb-3 block pl-1 text-sm font-medium text-white/75">Transformaciones</label>
              <div className="grid grid-cols-2 gap-2">
                <GlassButton size="sm" onClick={() => setRotation((r) => (r - 90) % 360)}>
                  <RotateCcw className="h-4 w-4" strokeWidth={1.7} /> 90°
                </GlassButton>
                <GlassButton size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                  <RotateCw className="h-4 w-4" strokeWidth={1.7} /> 90°
                </GlassButton>
                <GlassButton size="sm" selected={flipH} onClick={() => setFlipH(!flipH)}>
                  <FlipHorizontal2 className="h-4 w-4" strokeWidth={1.7} /> Horizontal
                </GlassButton>
                <GlassButton size="sm" selected={flipV} onClick={() => setFlipV(!flipV)}>
                  <FlipVertical2 className="h-4 w-4" strokeWidth={1.7} /> Vertical
                </GlassButton>
              </div>
              {(rotation !== 0 || flipH || flipV) && (
                <GlassButton
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    setRotation(0)
                    setFlipH(false)
                    setFlipV(false)
                  }}
                >
                  Restablecer
                </GlassButton>
              )}
            </div>

            {/* Status */}
            {saveStatus && (
              <Glass radius={14} frost="regular" refraction={0} className="p-3 text-sm text-white/85">
                {saveStatus}
              </Glass>
            )}
          </div>

          {/* Botones de acción */}
          <div className="mt-auto flex gap-3 border-t border-white/10 p-6">
            {hasChanges && (
              <GlassButton onClick={handleSaveChanges} disabled={isSaving} size="lg" selected className="flex-1">
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </GlassButton>
            )}
            <GlassButton onClick={onClose} size="lg" className={hasChanges ? '' : 'flex-1'}>
              {hasChanges ? 'Cancelar' : 'Cerrar'}
            </GlassButton>
          </div>
        </div>
      </Glass>
    </div>
  )
}
