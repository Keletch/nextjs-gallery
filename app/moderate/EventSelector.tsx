'use client'
import { useEffect, useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import styles from './ModeratePage.module.css'

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

      setStatus('✅ Logo actualizado correctamente')
      setShowLogoUpload(false)
      setLogoFile(null)
      setLogoPreview(null)
      await fetchEvents()
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : 'Error al actualizar logo'}`)
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

      setStatus('✅ Color actualizado correctamente')
      setShowColorPicker(false)
      await fetchEvents()
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : 'Error al actualizar color'}`)
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
      <div className={styles.panel}>
        <label>Selecciona evento:</label>
        <select
          value={selected}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          className={styles.select}
        >
          <option value="">-- Selecciona --</option>
          {eventos.map(ev => (
            <option key={ev.id} value={ev.ruta}>
              {ev.nombre}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <div className={styles.panel} style={{ marginTop: '1rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: '#eaeaea' }}>
            Configuración actual del evento
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Color Section */}
            <div>
              <label style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem', display: 'block' }}>
                Color de fondo:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: selectedEvent.color || '#000000',
                  border: '2px solid #444',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }} />
                <span style={{ fontSize: '0.9rem', color: '#eaeaea' }}>
                  {selectedEvent.color || '#000000'}
                </span>
              </div>
            </div>

            {/* Logo Section */}
            <div>
              <label style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.5rem', display: 'block' }}>
                Logotipo:
              </label>
              {selectedEvent.logo ? (
                <div style={{
                  width: '100%',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '8px',
                  border: '1px solid #444'
                }}>
                  <img
                    src={`https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/logos/${selectedEvent.logo}.webp`}
                    alt="Logo del evento"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                  Sin logo personalizado
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {!showColorPicker && !showLogoUpload && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => setShowColorPicker(true)}
                className={styles.button}
              >
                Cambiar color
              </button>
              <button
                onClick={() => setShowLogoUpload(true)}
                className={styles.button}
              >
                {selectedEvent.logo ? 'Reemplazar logo' : 'Agregar logo'}
              </button>
            </div>
          )}

          {/* Color Picker UI */}
          {showColorPicker && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  style={{ width: '60px', height: '60px', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                  disabled={updatingColor}
                />
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className={styles.input}
                    placeholder="#000000"
                    disabled={updatingColor}
                    style={{ marginBottom: 0 }}
                  />
                </div>
              </div>

              {status && (
                <p style={{ fontSize: '0.9rem', color: status.includes('✅') ? '#4caf50' : '#ff6b6b', marginBottom: '1rem' }}>
                  {status}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleUpdateColor}
                  className={styles.button}
                  disabled={updatingColor}
                  style={{ flex: 1 }}
                >
                  {updatingColor ? 'Actualizando...' : 'Confirmar'}
                </button>
                <button
                  onClick={handleCancelColor}
                  className={styles.button}
                  disabled={updatingColor}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Logo Upload UI */}
          {showLogoUpload && (
            <div style={{ marginTop: '1rem' }}>
              <div
                {...getRootProps()}
                style={{
                  border: isDragActive ? '2px dashed #4caf50' : '2px dashed #444',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s ease',
                  marginBottom: '1rem'
                }}
              >
                <input {...getInputProps()} disabled={uploadingLogo} />
                <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                  {isDragActive
                    ? 'Suelta el logo aquí...'
                    : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
                  Máx {MAX_LOGO_SIZE_MB}MB • JPG, PNG, WebP
                </p>
              </div>

              {logoPreview && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <img
                    src={logoPreview}
                    alt="Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '80px',
                      objectFit: 'contain',
                      border: '1px solid #444',
                      borderRadius: '8px',
                      padding: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }}
                  />
                  <p style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '8px' }}>
                    {logoFile?.name}
                  </p>
                </div>
              )}

              {status && (
                <p style={{ fontSize: '0.9rem', color: status.includes('✅') ? '#4caf50' : '#ff6b6b', marginBottom: '1rem' }}>
                  {status}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleUploadLogo}
                  className={styles.button}
                  disabled={!logoFile || uploadingLogo}
                  style={{ flex: 1 }}
                >
                  {uploadingLogo ? 'Subiendo...' : 'Confirmar'}
                </button>
                <button
                  onClick={handleCancelLogo}
                  className={styles.button}
                  disabled={uploadingLogo}
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