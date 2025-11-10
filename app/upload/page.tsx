'use client'
import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'

const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function UploadPage() {
  const [events, setEvents] = useState<{ id: string; nombre: string }[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<string>('')

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
      setStatus('Archivo demasiado grande (máx 5MB)')
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
      setStatus('Archivo demasiado grande (máx 5MB)')
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
    if (!file || !selectedEvent) return

    const formData = new FormData()
    formData.append('image', file)
    formData.append('event', selectedEvent)
    if (description.trim()) {
      formData.append('description', description.trim())
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const text = await res.text()
      setStatus(text)
      setFile(null)
      setPreview(null)
      setDescription('')
    } catch (err) {
      console.error('Error al subir imagen:', err)
      setStatus('Error al subir imagen')
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100vw' }}>
      <button
        onClick={() => router.push('/gallery')}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          padding: '0.5rem 1rem',
          background: '#333',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        Ir a galería
      </button>

      <div
        style={{
          padding: '2rem',
          fontFamily: 'sans-serif',
          maxWidth: '600px',
          margin: 'auto',
        }}
      >
        <h2>Sube tu imagen</h2>

        <label>Selecciona evento:</label>
        <select
          value={selectedEvent}
          onChange={e => setSelectedEvent(e.target.value)}
          style={{ marginBottom: '1rem', padding: '0.5rem', width: '100%' }}
        >
          <option value="">-- Selecciona --</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.nombre}
            </option>
          ))}
        </select>

        {selectedEvent && (
          <>
            <div
              {...getRootProps()}
              style={{
                border: '2px dashed #888',
                padding: '2rem',
                textAlign: 'center',
                background: isDragActive ? '#eee' : '#fafafa',
                cursor: 'pointer',
              }}
            >
              <input {...getInputProps()} />
              <p>{isDragActive ? 'Suelta la imagen aquí...' : 'Arrastra una imagen o haz clic para seleccionar'}</p>
            </div>

            {isMobile && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span style={{ fontWeight: 'bold' }}>— o —</span>
                <br />
                <label
                  htmlFor="cameraInput"
                  style={{
                    display: 'inline-block',
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#0070f3',
                    color: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
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
                <div style={{ marginTop: '1rem' }}>
                  <img src={preview} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '300px' }} />
                </div>

                <textarea
                  placeholder="Descripción (opcional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ marginTop: '1rem', width: '100%', padding: '0.5rem' }}
                />
              </>
            )}

            {file && (
              <button
                onClick={handleUpload}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Subir
              </button>
            )}
          </>
        )}

        {status && <p style={{ marginTop: '1rem' }}>{status}</p>}
      </div>
    </div>
  )
}