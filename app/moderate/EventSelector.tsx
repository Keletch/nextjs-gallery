'use client'
import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { ChevronDown } from 'lucide-react'
import Glass, { GlassButton, GlassInput, GlassSelect } from '@/components/Glass'

type Event = {
  id: string
  nombre: string
  ruta: string
  color?: string
  logo?: string
  destacado?: boolean
  hashtags?: string
  oculto?: boolean
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
  const [updatingFeatured, setUpdatingFeatured] = useState(false)
  const [featuredStatus, setFeaturedStatus] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [savingHashtags, setSavingHashtags] = useState(false)
  const [hashtagsStatus, setHashtagsStatus] = useState('')
  const [updatingHidden, setUpdatingHidden] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [eventStatus, setEventStatus] = useState('')
  const [showConfig, setShowConfig] = useState(false)

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
      setHashtags(selectedEvent.hashtags || '')
      setHashtagsStatus('')
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

  const handleSaveHashtags = async () => {
    if (!selectedEvent) return
    setSavingHashtags(true)
    setHashtagsStatus('')
    try {
      const res = await fetch('/api/update-event-hashtags', {
        method: 'POST',
        body: JSON.stringify({ eventId: selectedEvent.id, hashtags }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar hashtags')
      await fetchEvents()
      setHashtagsStatus('Guardados')
    } catch (err) {
      setHashtagsStatus(err instanceof Error ? err.message : 'Error al guardar hashtags')
    } finally {
      setSavingHashtags(false)
    }
  }

  const handleToggleFeatured = async () => {
    if (!selectedEvent) return
    setUpdatingFeatured(true)
    setFeaturedStatus('')
    try {
      const res = await fetch('/api/set-featured-event', {
        method: 'POST',
        body: JSON.stringify({ eventId: selectedEvent.destacado ? null : selectedEvent.id }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar evento destacado')
      // Sin mensaje de éxito: el texto de la tarjeta ya cambia según el estado
      await fetchEvents()
    } catch (err) {
      setFeaturedStatus(err instanceof Error ? err.message : 'Error al actualizar evento destacado')
    } finally {
      setUpdatingFeatured(false)
    }
  }

  const handleToggleHidden = async () => {
    if (!selectedEvent) return
    setUpdatingHidden(true)
    setEventStatus('')
    try {
      const res = await fetch('/api/set-event-hidden', {
        method: 'POST',
        body: JSON.stringify({ eventId: selectedEvent.id, oculto: !selectedEvent.oculto }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el evento')
      await fetchEvents()
    } catch (err) {
      setEventStatus(err instanceof Error ? err.message : 'Error al actualizar el evento')
    } finally {
      setUpdatingHidden(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent || deleteConfirm !== selectedEvent.ruta) return
    setDeleting(true)
    setEventStatus('')
    try {
      const res = await fetch('/api/delete-event', {
        method: 'POST',
        body: JSON.stringify({ eventId: selectedEvent.id, confirmacion: deleteConfirm }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el evento')
      onChange('')
      await fetchEvents()
    } catch (err) {
      setEventStatus(err instanceof Error ? err.message : 'No se pudo eliminar el evento')
    } finally {
      setDeleting(false)
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
        <label className="mb-2 block pl-1 text-sm font-medium text-white/75">Evento</label>
        <GlassSelect
          value={selected}
          onChange={e => {
            // Al cambiar de evento se cierra la confirmación de borrado
            setShowDelete(false)
            setDeleteConfirm('')
            setEventStatus('')
            onChange(e.target.value)
          }}
          disabled={loading}
        >
          <option value="">Selecciona un evento</option>
          {eventos.map(ev => (
            <option key={ev.id} value={ev.ruta}>
              {ev.nombre}{ev.destacado ? ' (destacado)' : ''}{ev.oculto ? ' (oculto)' : ''}
            </option>
          ))}
        </GlassSelect>
      </div>

      {selectedEvent && (
        <Glass radius={26} frost="regular" className="mt-6 p-6">
          {/* Plegable (cerrado al inicio): así el panel de fotos queda a la vista sin tanto scroll */}
          <button
            type="button"
            onClick={() => setShowConfig(v => !v)}
            aria-expanded={showConfig}
            className="flex w-full items-center justify-between text-left"
          >
            <h4 className="text-lg font-semibold tracking-tight">Configuración del evento</h4>
            <ChevronDown className={`h-5 w-5 text-white/60 transition-transform duration-300 ${showConfig ? 'rotate-180' : ''}`} />
          </button>

          {showConfig && (
          <div className="mt-5">

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Color */}
            <div>
              <p className="mb-2 text-sm text-white/55">Color de fondo</p>
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-[12px] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.35)]"
                  style={{ backgroundColor: selectedEvent.color || '#000000' }}
                />
                <span className="text-sm tabular-nums text-white/80">{selectedEvent.color || '#000000'}</span>
              </div>
            </div>

            {/* Logo */}
            <div>
              <p className="mb-2 text-sm text-white/55">Logotipo</p>
              {selectedEvent.logo ? (
                <div className="flex h-11 items-center rounded-[12px] bg-white/5 px-3 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.18)]">
                  <img
                    src={`https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/logos/${selectedEvent.logo}.webp`}
                    alt="Logo del evento"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-sm text-white/45">Sin logo personalizado</p>
              )}
            </div>
          </div>

          {/* Destacado en galería */}
          <Glass radius={20} frost="regular" refraction={0} className="mb-6 flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-white/90">
                {selectedEvent.destacado ? 'Evento destacado' : 'Evento destacado en la galería'}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {selectedEvent.destacado
                  ? 'La galería abre este evento al cargar y es el que sale elegido al subir fotos.'
                  : 'Si ninguno está destacado, la galería muestra todos los eventos y al subir fotos hay que elegir evento.'}
              </p>
              {featuredStatus && <p className="mt-2 text-xs text-white/80">{featuredStatus}</p>}
            </div>
            <GlassButton
              onClick={handleToggleFeatured}
              disabled={updatingFeatured || selectedEvent.oculto}
              selected={!selectedEvent.destacado}
              className="shrink-0"
            >
              {updatingFeatured ? 'Guardando...' : selectedEvent.destacado ? 'Quitar destacado' : 'Destacar'}
            </GlassButton>
          </Glass>

          {/* Hashtags del evento: van al final al compartir una foto y de la descripción en el visor */}
          <Glass radius={20} frost="regular" refraction={0} className="mb-6 space-y-3 p-4">
            <div>
              <p className="text-sm font-medium text-white/90">Hashtags del evento</p>
              <p className="mt-1 text-xs text-white/50">Se agregan al final al compartir una foto y en su descripción. Máximo 6.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <GlassInput
                type="text"
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                placeholder="#Shift2025 #Trading"
                disabled={savingHashtags}
                className="flex-1"
              />
              <GlassButton
                onClick={handleSaveHashtags}
                disabled={savingHashtags || hashtags === (selectedEvent.hashtags || '')}
                selected
                className="shrink-0"
              >
                {savingHashtags ? 'Guardando...' : 'Guardar'}
              </GlassButton>
            </div>
            {hashtagsStatus && <p className="text-xs text-white/80">{hashtagsStatus}</p>}
          </Glass>

          {/* Action Buttons */}
          {!showColorPicker && !showLogoUpload && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <GlassButton onClick={() => setShowColorPicker(true)}>
                Cambiar color
              </GlassButton>
              <GlassButton onClick={() => setShowLogoUpload(true)}>
                {selectedEvent.logo ? 'Reemplazar logo' : 'Agregar logo'}
              </GlassButton>
            </div>
          )}

          {/* Color Picker UI */}
          {showColorPicker && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Glass radius={16} frost="regular" refraction={24} className="shrink-0 p-1.5">
                  <input
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className="block h-12 w-12 cursor-pointer rounded-[11px] border-0 bg-transparent p-0"
                    disabled={updatingColor}
                  />
                </Glass>
                <GlassInput
                  type="text"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  placeholder="#000000"
                  disabled={updatingColor}
                  className="flex-1"
                />
              </div>

              {status && <p className="text-sm text-white/80">{status}</p>}

              <div className="flex gap-2">
                <GlassButton onClick={handleUpdateColor} disabled={updatingColor} selected className="flex-1">
                  {updatingColor ? 'Actualizando...' : 'Confirmar'}
                </GlassButton>
                <GlassButton onClick={handleCancelColor} disabled={updatingColor}>
                  Cancelar
                </GlassButton>
              </div>
            </div>
          )}

          {/* Logo Upload UI */}
          {showLogoUpload && (
            <div className="mt-4 space-y-4">
              <Glass radius={20} frost="regular" selected={isDragActive} className="cursor-pointer transition-colors hover:bg-white/[0.08]">
                {/* Las props del dropzone van aquí: traen su propio ref y no deben pisar el del vidrio */}
                <div {...getRootProps()} className="m-2 rounded-[14px] border border-dashed border-white/20 p-6 text-center outline-none">
                  <input {...getInputProps()} disabled={uploadingLogo} />
                  <p className="text-sm text-white/75">
                    {isDragActive
                      ? 'Suelta el logo aquí'
                      : 'Arrastra una imagen o haz clic para seleccionar'}
                  </p>
                  <p className="mt-2 text-xs text-white/45">
                    Máx {MAX_LOGO_SIZE_MB}MB · JPG, PNG, WebP
                  </p>
                </div>
              </Glass>

              {logoPreview && (
                <div className="text-center">
                  <img
                    src={logoPreview}
                    alt="Preview"
                    className="mx-auto max-h-20 max-w-[200px] rounded-xl bg-white/5 object-contain p-2 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.2)]"
                  />
                  <p className="mt-2 text-sm text-white/60">{logoFile?.name}</p>
                </div>
              )}

              {status && <p className="text-sm text-white/80">{status}</p>}

              <div className="flex gap-2">
                <GlassButton onClick={handleUploadLogo} disabled={!logoFile || uploadingLogo} selected className="flex-1">
                  {uploadingLogo ? 'Subiendo...' : 'Confirmar'}
                </GlassButton>
                <GlassButton onClick={handleCancelLogo} disabled={uploadingLogo}>
                  Cancelar
                </GlassButton>
              </div>
            </div>
          )}

          {/* Ocultar o eliminar el evento */}
          <Glass radius={20} frost="regular" refraction={0} className="mt-6 space-y-3 p-4">
            <div>
              <p className="text-sm font-medium text-white/90">{selectedEvent.oculto ? 'Evento oculto' : 'Ocultar o eliminar'}</p>
              <p className="mt-1 text-xs text-white/50">
                {selectedEvent.oculto
                  ? 'No sale en la galería ni al subir fotos. Sus fotos se conservan y aquí se pueden seguir moderando.'
                  : 'Ocultar lo quita de la galería y de la subida sin borrar nada. Eliminar borra el evento, sus fotos y sus registros para siempre.'}
              </p>
            </div>

            {!showDelete ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <GlassButton onClick={handleToggleHidden} disabled={updatingHidden}>
                  {updatingHidden ? 'Guardando...' : selectedEvent.oculto ? 'Mostrar evento' : 'Ocultar evento'}
                </GlassButton>
                <GlassButton onClick={() => setShowDelete(true)} className="text-red-300">
                  Eliminar evento
                </GlassButton>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-300">
                  Esto no se puede deshacer. Escribe <span className="font-semibold">{selectedEvent.ruta}</span> para confirmar.
                </p>
                <GlassInput
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={selectedEvent.ruta}
                  disabled={deleting}
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <GlassButton
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirm !== selectedEvent.ruta}
                    className="flex-1 text-red-300"
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar para siempre'}
                  </GlassButton>
                  <GlassButton onClick={() => { setShowDelete(false); setDeleteConfirm('') }} disabled={deleting}>
                    Cancelar
                  </GlassButton>
                </div>
              </div>
            )}
            {eventStatus && <p className="text-xs text-white/80">{eventStatus}</p>}
          </Glass>
          </div>
          )}
        </Glass>
      )}
    </>
  )
}
