'use client'
import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

type Event = {
  id: string
  nombre: string
  ruta: string
  color?: string
  logo?: string
}

const MAX_LOGO_SIZE_MB = 10
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function EventSelector({
  selected,
  onChange,
}: {
  selected: string
  onChange: (ruta: string) => void
}) {
  const [eventos, setEventos] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogoUpload, setShowLogoUpload] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [updatingColor, setUpdatingColor] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [newColor, setNewColor] = useState<string>('#000000')
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      setEventos(data)
    } catch (err) {
      console.error('❌ Error al cargar eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedEvent = eventos.find(ev => ev.ruta === selected)

  // Update newColor when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      setNewColor(selectedEvent.color || '#000000')
    }
  }, [selectedEvent])

  const onLogoDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setStatus('Tipo de archivo no permitido')
      return
    }

    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setStatus(`Archivo demasiado grande (máx ${MAX_LOGO_SIZE_MB}MB)`)
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setStatus('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onLogoDrop,
    multiple: false,
    accept: ALLOWED_LOGO_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_LOGO_SIZE_MB * 1024 * 1024,
  })

  const handleUploadLogo = async () => {
    if (!logoFile || !selectedEvent) return

    setUploadingLogo(true)
    setStatus('Subiendo logo...')

    try {
      const formData = new FormData()
      formData.append('logo', logoFile)

      const uploadRes = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      })

      const uploadResult = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadResult.error || 'Error al subir logo')
      }

      const logoHash = uploadResult.hash

      const updateRes = await fetch('/api/update-event-logo', {
        method: 'POST',
        body: JSON.stringify({ eventId: selectedEvent.id, logo: logoHash }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (!updateRes.ok) {
        throw new Error('Error al actualizar evento')
      }

      setStatus('Logo actualizado correctamente')
      setShowLogoUpload(false)
      setLogoFile(null)
      setLogoPreview(null)
      await fetchEvents()
    } catch (err) {
      setStatus(`${err instanceof Error ? err.message : 'Error al actualizar logo'}`)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleUpdateColor = async () => {
    if (!selectedEvent) return

    setUpdatingColor(true)
    setStatus('Actualizando color...')

    try {
      const res = await fetch('/api/update-event-color', {
        method: 'POST',
        body: JSON.stringify({ eventId: selectedEvent.id, color: newColor }),
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        throw new Error('Error al actualizar color')
      }

      setStatus('Color actualizado correctamente')
      setShowColorPicker(false)
      await fetchEvents()
    } catch (err) {
      setStatus(`${err instanceof Error ? err.message : 'Error al actualizar color'}`)
    } finally {
      setUpdatingColor(false)
    }
  }

  const handleCancelLogo = () => {
    setShowLogoUpload(false)
    setLogoFile(null)
    setLogoPreview(null)
    setStatus('')
  }

  const handleCancelColor = () => {
    setShowColorPicker(false)
    setNewColor(selectedEvent?.color || '#000000')
    setStatus('')
  }

  return (
    <>
      <div className="mb-4">
        <label className="block font-mono text-sm font-semibold text-white/90 mb-2">Selecciona evento:</label>
        <select
          value={selected}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl font-mono bg-white/5 backdrop-blur-md border border-white/10 text-white transition-all duration-300 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
        >
          <option value="" className="bg-gray-900">Selecciona un evento</option>
          {eventos.map(ev => (
            <option key={ev.id} value={ev.ruta} className="bg-gray-900">
              {ev.nombre}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <div className="mt-6 p-6 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <h4 className="text-lg font-bold text-white mb-4 font-mono">
            Configuración actual del evento
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Color Section */}
            <div>
              <label className="block font-mono text-sm font-semibold text-white/70 mb-2">
                Color de fondo:
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-white/30 shadow-lg"
                  style={{ backgroundColor: selectedEvent.color || '#000000' }}
                />
                <span className="font-mono text-sm text-white">{selectedEvent.color || '#000000'}</span>
              </div>
            </div>

            {/* Logo Section */}
            <div>
              <label className="block font-mono text-sm font-semibold text-white/70 mb-2">
                Logotipo:
              </label>
              {selectedEvent.logo ? (
                <div className="h-12 flex items-center bg-white/5 rounded-lg px-3 border border-white/10">
                  <img
                    src={`https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/logos/${selectedEvent.logo}.webp`}
                    alt="Logo del evento"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-sm text-white/50 font-mono">Sin logo personalizado</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!showColorPicker && !showLogoUpload && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setShowColorPicker(true)}
                className="px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-102"
              >
                Cambiar color
              </button>
              <button
                onClick={() => setShowLogoUpload(true)}
                className="px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-102"
              >
                {selectedEvent.logo ? 'Reemplazar logo' : 'Agregar logo'}
              </button>
            </div>
          )}

          {/* Color Picker UI */}
          {showColorPicker && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-white/20"
                  disabled={updatingColor}
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  placeholder="#000000"
                  disabled={updatingColor}
                  className="flex-1 px-4 py-3 rounded-xl font-mono bg-white/5 backdrop-blur-md border border-white/10 text-white transition-all duration-300 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {status && (
                <p className={`text-sm font-mono mb-4 ${status.includes('correctamente') ? 'text-green-400' : 'text-red-400'}`}>
                  {status}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateColor}
                  disabled={updatingColor}
                  className="flex-1 px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-green-500/30 border-2 border-cyan-500/50 cursor-pointer transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingColor ? 'Actualizando...' : 'Confirmar'}
                </button>
                <button
                  onClick={handleCancelColor}
                  disabled={updatingColor}
                  className="px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Logo Upload UI */}
          {showLogoUpload && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 mb-4 ${isDragActive ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-white/20 bg-white/5 hover:border-cyan-500/40'
                  }`}
              >
                <input {...getInputProps()} disabled={uploadingLogo} />
                <p className="font-mono text-white/70 text-sm">
                  {isDragActive
                    ? 'Suelta el logo aquí...'
                    : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-white/50 mt-2">
                  Máx {MAX_LOGO_SIZE_MB}MB • JPG, PNG, WebP
                </p>
              </div>

              {logoPreview && (
                <div className="mb-4 text-center">
                  <img
                    src={logoPreview}
                    alt="Preview"
                    className="max-w-[200px] max-h-20 mx-auto object-contain border border-white/20 rounded-lg p-2 bg-white/5"
                  />
                  <p className="text-sm text-white/70 font-mono mt-2">{logoFile?.name}</p>
                </div>
              )}

              {status && (
                <p className={`text-sm font-mono mb-4 ${status.includes('correctamente') ? 'text-green-400' : 'text-red-400'}`}>
                  {status}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleUploadLogo}
                  disabled={!logoFile || uploadingLogo}
                  className="flex-1 px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-green-500/30 border-2 border-cyan-500/50 cursor-pointer transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingLogo ? 'Subiendo...' : 'Confirmar'}
                </button>
                <button
                  onClick={handleCancelLogo}
                  disabled={uploadingLogo}
                  className="px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}