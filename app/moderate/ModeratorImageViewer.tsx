'use client'
import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'

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
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex flex-col md:flex-row w-full max-w-7xl h-full md:h-[90vh] mx-4 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.9)]" onClick={(e) => e.stopPropagation()}>

        {/* Imagen */}
        <div className="flex-1 flex items-center justify-center p-6 bg-black/50 relative">
          {/* Spinner de carga */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-r-transparent mb-4"></div>
              <p className="text-white/70 font-mono animate-pulse">Cargando imagen...</p>
            </div>
          </div>

          {/* Imagen */}
          <img
            src={imageUrl}
            alt="Preview"
            className={`max-w-full max-h-full object-contain transition-all duration-700 ease-out ${imageLoaded
              ? 'opacity-100 scale-100 blur-0'
              : 'opacity-0 scale-95 blur-sm'
              }`}
            style={{ transform: getTransform() }}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Panel de controles */}
        <div className="w-full md:w-96 flex flex-col bg-gradient-to-br from-white/5 to-white/10 border-t md:border-t-0 md:border-l border-white/20 overflow-y-auto">
          <div className="p-6 space-y-6">
            <h3 className="text-2xl font-bold text-white font-mono">Editar Imagen</h3>

            {/* Info del archivo */}
            {fileSize > 0 && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm font-mono text-white/70 mb-1">
                  <strong className="text-white/90">Tamaño:</strong> {formatFileSize(fileSize)}
                </p>
                <p className="text-sm font-mono text-white/70">
                  <strong className="text-white/90">Carpeta:</strong> {folder}
                </p>
              </div>
            )}

            {/* Descripción */}
            <div>
              <label className="block font-mono text-sm font-semibold text-white/90 mb-2">Descripción:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escribe una descripción..."
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl font-mono bg-white/5 backdrop-blur-md border border-white/10 text-white transition-all duration-300 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 min-h-[100px] resize-none"
              />
            </div>

            {/* Transformaciones */}
            <div>
              <label className="block font-mono text-sm font-semibold text-white/90 mb-3">Transformaciones:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className="px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105"
                >
                  ↶ 90°
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105"
                >
                  ↷ 90°
                </button>
                <button
                  onClick={() => setFlipH(!flipH)}
                  className={`px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border cursor-pointer transition-all duration-300 hover:bg-white/10 hover:scale-105 ${flipH ? 'border-cyan-500/50 bg-cyan-500/20' : 'border-white/10'}`}
                >
                  ⇄ Horizontal
                </button>
                <button
                  onClick={() => setFlipV(!flipV)}
                  className={`px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border cursor-pointer transition-all duration-300 hover:bg-white/10 hover:scale-105 ${flipV ? 'border-cyan-500/50 bg-cyan-500/20' : 'border-white/10'}`}
                >
                  ⇅ Vertical
                </button>
              </div>
              {(rotation !== 0 || flipH || flipV) && (
                <button
                  onClick={() => {
                    setRotation(0)
                    setFlipH(false)
                    setFlipV(false)
                  }}
                  className="w-full mt-2 px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10"
                >
                  Restablecer
                </button>
              )}
            </div>

            {/* Status */}
            {saveStatus && (
              <div className={`p-3 rounded-lg font-mono text-sm ${saveStatus.includes('correctamente') ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
                {saveStatus}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="mt-auto p-6 border-t border-white/10 flex gap-3">
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex-1 px-6 py-3 rounded-xl font-mono font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-green-500/30 border-2 border-cyan-500/50 cursor-pointer transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
              >
                {isSaving ? 'Guardando...' : '✓ Guardar Cambios'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-mono font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10"
            >
              {hasChanges ? 'Cancelar' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}