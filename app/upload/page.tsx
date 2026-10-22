'use client'
import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import GhostFibers from '@/components/GhostFibers'
import { randomColors, randomFiberParams } from '@/lib/background'
import Glass, { GlassButton, GlassSelect, GlassTextarea } from '@/components/Glass'

const MAX_SIZE_MB = 50
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Fondo: parámetros y colores aleatorios en cada visita
function generateFiberParams() {
  const [glowColor, secondaryColor] = randomColors(2)
  return { ...randomFiberParams({ interactive: true }), glowColor, secondaryColor }
}

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
  const [honeypot, setHoneypot] = useState<string>('') // Anti-bot honeypot
  const [fiberParams, setFiberParams] = useState<ReturnType<typeof generateFiberParams> | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showContent, setShowContent] = useState(false)

  const router = useRouter()
  const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(window.navigator.userAgent)

  useEffect(() => {
    setFiberParams(generateFiberParams())
    setMounted(true)

    const timer = setTimeout(() => {
      setShowContent(true)
    }, 300)

    fetch('/api/events')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Error al cargar eventos:', err))

    return () => {
      clearTimeout(timer)
    }
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
    // Honeypot check
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

  if (!mounted || !fiberParams) {
    return <main className="relative min-h-screen w-full overflow-hidden bg-black" />
  }

  return (
    <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black scrollbar-hide">
      {/* Background effects */}
      <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
        <GhostFibers {...fiberParams} />
      </div>

      {/* Back button */}
      <GlassButton onClick={() => router.push('/gallery')} className="!fixed left-4 top-4 z-[10000]">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12.5 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Galería
      </GlassButton>

      {/* Content */}
      <div className={`relative z-50 flex min-h-screen items-center justify-center px-4 py-20 transition-all duration-1000 ease-out ${showContent ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'}`}>
        <Glass radius={34} frost="heavy" className="w-full max-w-2xl p-6 sm:p-9">
          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Subir imagen</h1>
              <p className="text-sm text-white/55">Tu foto aparecerá en la galería cuando un moderador la apruebe</p>
            </div>

            {/* Event selector */}
            <div className="space-y-2">
              <label className="pl-1 text-sm font-medium text-white/75">Evento</label>
              <GlassSelect value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                <option value="">Selecciona un evento</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre}
                  </option>
                ))}
              </GlassSelect>
            </div>

            {/* Honeypot */}
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
                {/* Dropzone */}
                <Glass
                  radius={22}
                  frost="regular"
                  selected={isDragActive}
                  className="cursor-pointer transition-colors duration-300 hover:bg-white/[0.08]"
                >
                  {/* Las props del dropzone van aquí: traen su propio ref y no deben pisar el del vidrio */}
                  <div {...getRootProps()} className="m-2 rounded-[16px] border border-dashed border-white/20 px-6 py-10 text-center outline-none">
                    <input {...getInputProps()} />
                    <svg viewBox="0 0 24 24" className="mx-auto mb-3 h-7 w-7 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-white/80">
                      {isDragActive ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                    </p>
                  </div>
                </Glass>

                {/* Camera button for mobile */}
                {isMobile && (
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-xs uppercase tracking-widest text-white/40">o</span>
                    <GlassButton as="label" htmlFor="cameraInput" size="lg">
                      Tomar foto
                    </GlassButton>
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

                {/* Preview and description */}
                {preview && (
                  <>
                    <div className="overflow-hidden rounded-[22px] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.18)]">
                      <img src={preview} alt="Vista previa" className="max-h-96 w-full object-contain" />
                    </div>

                    <div className="space-y-2">
                      <GlassTextarea
                        placeholder="Descripción (obligatoria)"
                        value={description}
                        onChange={e => {
                          setDescription(e.target.value)
                          setDescriptionError(false)
                        }}
                        rows={4}
                        maxLength={500}
                        className={descriptionError ? 'ring-1 ring-white/70' : ''}
                      />
                      {descriptionError && (
                        <p className="pl-1 text-sm text-white/80">La descripción es obligatoria</p>
                      )}
                    </div>
                  </>
                )}

                {/* Upload button */}
                {file && (
                  <GlassButton onClick={handleUpload} size="lg" selected className="w-full">
                    Subir imagen
                  </GlassButton>
                )}
              </>
            )}

            {/* Progress bar */}
            {progress !== 'idle' && (
              <div className="space-y-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-600 ease-out"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: progress === 'error' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
                    }}
                  />
                </div>
                <p className="text-center text-sm text-white/75">
                  {progress === 'processing' && 'Procesando imagen...'}
                  {progress === 'uploading' && 'Subiendo imagen...'}
                  {progress === 'done' && 'Imagen subida exitosamente'}
                  {progress === 'error' && 'Error al subir imagen'}
                </p>
              </div>
            )}

            {/* Status message */}
            {status && (
              <Glass radius={16} frost="regular" className="px-4 py-3 text-center text-sm text-white/80">
                {status}
              </Glass>
            )}
          </div>
        </Glass>
      </div>
    </main>
  )
}
