'use client'
import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import styles from './UploadPage.module.css'

const MAX_SIZE_MB = 50
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function UploadPage() {
  const [events, setEvents] = useState<{ id: string; nombre: string }[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [progress, setProgress] = useState<'idle' | 'processing' | 'uploading' | 'done' | 'error'>('idle')
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [descriptionError, setDescriptionError] = useState<boolean>(false)
  const [honeypot, setHoneypot] = useState<string>('') // ✅ Anti-bot honeypot

  const router = useRouter()
  const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(window.navigator.userAgent)

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Error al cargar eventos:', err))
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0]
    if (!selected) return

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setStatus('Tipo de archivo no permitido')
      return
    }

    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setStatus('Archivo demasiado grande (máx 50MB)')
      return
    }

    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setStatus('')
  }, [])

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const captured = e.target.files?.[0]
    if (!captured) return

    if (!ALLOWED_TYPES.includes(captured.type)) {
      setStatus('Tipo de archivo no permitido')
      return
    }

    if (captured.size > MAX_SIZE_MB * 1024 * 1024) {
      setStatus('Archivo demasiado grande (máx 50MB)')
      return
    }

    setFile(captured)
    setPreview(URL.createObjectURL(captured))
    setStatus('')
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: ALLOWED_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_SIZE_MB * 1024 * 1024,
  })

  const handleUpload = async () => {
    // ✅ Honeypot check (anti-bot)
    if (honeypot) {
      console.warn('Bot detectado')
      setStatus('Error al procesar solicitud')
      return
    }

    if (!file || !selectedEvent || !description.trim()) {
      setDescriptionError(true)
      return
    }

    setProgress('processing')
    setProgressPercent(25)
    await new Promise(r => setTimeout(r, 500))

    const formData = new FormData()
    formData.append('image', file)
    formData.append('event', selectedEvent)
    formData.append('description', description.trim())

    try {
      setProgress('uploading')
      setProgressPercent(65)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const text = await res.text()

      if (res.ok) {
        setStatus(text)
        setProgress('done')
        setProgressPercent(100)
        setFile(null)
        setPreview(null)
        setDescription('')
        setDescriptionError(false)
      } else {
        setStatus(text)
        setProgress('error')
        setProgressPercent(100)
      }
    } catch (err) {
      console.error('Error al subir imagen:', err)
      setStatus('Error al subir imagen')
      setProgress('error')
      setProgressPercent(100)
    }
  }

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/gallery')} className={styles.backButton}>
        ← Galería
      </button>

      <div className={styles.panel}>
        <h2 className={styles.heading}>Sube tu imagen</h2>

        <label>Selecciona evento:</label>
        <select
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
          className={styles.select}
        >
          <option value="">-- Selecciona --</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.nombre}
            </option>
          ))}
        </select>

        {/* ✅ Honeypot oculto (anti-bot) */}
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

        {selectedEvent && (
          <>
            <div
              {...getRootProps()}
              className={isDragActive ? styles.dropzoneActive : styles.dropzone}
            >
              <input {...getInputProps()} />
              <p>{isDragActive ? 'Suelta la imagen aquí...' : 'Arrastra una imagen o haz clic para seleccionar'}</p>
            </div>

            {isMobile && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span style={{ fontWeight: 'bold' }}>— o —</span>
                <br />
                <label htmlFor="cameraInput" className={styles.cameraLabel}>
                  Tomar foto
                </label>
                <input
                  id="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleCameraCapture}
                />
              </div>
            )}

            {preview && (
              <>
                <div style={{ marginTop: '1.5rem' }}>
                  <img src={preview} alt="Vista previa" className={styles.preview} />
                </div>

                <textarea
                  placeholder="Descripción (obligatoria)"
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value)
                    setDescriptionError(false)
                  }}
                  className={`${styles.textarea} ${descriptionError ? styles.textareaError : ''}`}
                  maxLength={500}
                />
                {descriptionError && (
                  <p className={styles.errorText}>La descripción es obligatoria</p>
                )}
              </>
            )}

            {file && (
              <button onClick={handleUpload} className={styles.button}>
                Subir imagen
              </button>
            )}
          </>
        )}

        {progress !== 'idle' && (
          <>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBar}
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor:
                    progress === 'error' ? 'red' : progress === 'done' ? '#4caf50' : 'var(--accent)',
                }}
              />
            </div>
            <p className={styles.progressText}>
              {progress === 'processing' && 'Procesando imagen...'}
              {progress === 'uploading' && 'Subiendo imagen...'}
              {progress === 'done' && 'Imagen subida exitosamente'}
              {progress === 'error' && 'Error al subir imagen'}
            </p>
          </>
        )}

        {status && <p className={styles.status}>{status}</p>}
      </div>
    </div>
  )
}