'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import styles from './ModeratePage.module.css'

const MAX_LOGO_SIZE_MB = 10
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function CreateEventPanel({
  onCreated,
}: {
  onCreated?: (ruta: string) => void
}) {
  const [showPopup, setShowPopup] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ruta, setRuta] = useState('')
  const [color, setColor] = useState('#000000')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [honeypot, setHoneypot] = useState('') // Anti-bot
  const [confirming, setConfirming] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const resetForm = () => {
    setNombre('')
    setRuta('')
    setColor('#000000')
    setLogoFile(null)
    setLogoPreview(null)
    setHoneypot('')
    setConfirming(false)
    setStatus('')
    setShowPopup(false)
    setLoading(false)
    setSuccess(false)
  }

  const onLogoDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0]
    if (!selected) return

    if (!ALLOWED_LOGO_TYPES.includes(selected.type)) {
      setStatus('Tipo de archivo no permitido para logo')
      return
    }

    if (selected.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setStatus(`Logo demasiado grande (máx ${MAX_LOGO_SIZE_MB}MB)`)
      return
    }

    setLogoFile(selected)
    setLogoPreview(URL.createObjectURL(selected))
    setStatus('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onLogoDrop,
    multiple: false,
    accept: ALLOWED_LOGO_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_LOGO_SIZE_MB * 1024 * 1024,
  })

  const handleCreate = async () => {
    // Honeypot check
    if (honeypot) {
      console.warn('Bot detectado')
      setStatus('Error al procesar solicitud')
      return
    }

    if (!nombre || !ruta) return

    if (!confirming) {
      setConfirming(true)
      return
    }

    setLoading(true)
    setStatus('Creando evento...')

    try {
      let logoHash: string | null = null

      // 1. Si hay logo, subirlo primero
      if (logoFile) {
        setStatus('Subiendo logo...')
        const formData = new FormData()
        formData.append('logo', logoFile)

        const logoRes = await fetch('/api/upload-logo', {
          method: 'POST',
          body: formData,
        })

        const logoResult = await logoRes.json()
        if (!logoRes.ok) {
          throw new Error(logoResult.error || 'Error al subir logo')
        }

        logoHash = logoResult.hash
      }

      // 2. Crear evento con el hash del logo (si existe)
      setStatus('Creando evento...')
      const res = await fetch('/api/create-event', {
        method: 'POST',
        body: JSON.stringify({ nombre, ruta, color, logo: logoHash }),
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()
      if (res.ok) {
        setStatus('✅ Evento creado correctamente')
        setSuccess(true)
        if (onCreated) onCreated(ruta)
      } else {
        setStatus(`❌ Error: ${result.error}`)
      }
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : 'Error al crear evento'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.createEventTrigger}>
        <button onClick={() => setShowPopup(true)} className={styles.button}>
          Crear evento
        </button>
      </div>

      {showPopup && (
        <div className={styles.panel}>
          <h4>Nuevo evento</h4>

          {!success ? (
            <>
              <label>Nombre:</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Shift 2025"
                className={styles.input}
                disabled={loading}
              />

              <label>Ruta:</label>
              <input
                type="text"
                value={ruta}
                onChange={e => setRuta(e.target.value.replace(/\s/g, ''))}
                placeholder="shift2025"
                className={styles.input}
                disabled={loading}
              />

              <label>Color de fondo:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  style={{ width: '50px', height: '50px', border: 'none', cursor: 'pointer' }}
                  disabled={loading}
                />
                <span>{color}</span>
              </div>

              {/* Honeypot oculto */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <label>Logotipo del evento (opcional):</label>
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
                  marginBottom: '15px'
                }}
              >
                <input {...getInputProps()} disabled={loading} />
                <p style={{ margin: 0, color: '#aaa' }}>
                  {isDragActive
                    ? 'Suelta el logo aquí...'
                    : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                  Máx {MAX_LOGO_SIZE_MB}MB • JPG, PNG, WebP
                </p>
              </div>

              {logoPreview && (
                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '100px',
                      objectFit: 'contain',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      padding: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }}
                  />
                  <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '8px' }}>
                    {logoFile?.name}
                  </p>
                </div>
              )}

              {confirming && !loading && (
                <p className={styles.status}>
                  ¿Confirmas crear el evento <strong>{nombre}</strong> con ruta <strong>{ruta}</strong>?
                </p>
              )}

              {loading && (
                <div className={styles.spinner}></div>
              )}

              <div className={styles.buttonRow}>
                <button onClick={handleCreate} className={styles.button} disabled={loading}>
                  {loading ? 'Creando...' : confirming ? 'Confirmar creación' : 'Crear'}
                </button>
                <button onClick={resetForm} className={styles.button} disabled={loading}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#4caf50' }}>
                ¡Evento creado con éxito!
              </p>
              <div className={styles.buttonRow} style={{ justifyContent: 'center' }}>
                <button onClick={handleReload} className={styles.button} style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50', border: '1px solid #4caf50' }}>
                  Recargar página
                </button>
                <button onClick={resetForm} className={styles.button}>
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {status && !success && <p className={styles.status}>{status}</p>}
        </div>
      )}
    </div>
  )
}