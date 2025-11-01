'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0]
    if (!selected) return

    // Validación frontend
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: ALLOWED_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_SIZE_MB * 1024 * 1024,
  })

  const handleUpload = async () => {
    if (!file) {
      setStatus('Selecciona una imagen primero')
      return
    }

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const text = await res.text()
      setStatus(text)
      setFile(null)
      setPreview(null)
    } catch (err) {
      console.error('Error al subir imagen:', err)
      setStatus('Error al subir imagen')
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Sube tu imagen</h2>
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

      {preview && (
        <div style={{ marginTop: '1rem' }}>
          <img src={preview} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '300px' }} />
        </div>
      )}

      <button
        onClick={handleUpload}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
      >
        Subir
      </button>

      {status && <p style={{ marginTop: '1rem' }}>{status}</p>}
    </div>
  )
}