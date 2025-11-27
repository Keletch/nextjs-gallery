'use client'
import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import ColorBends from '@/components/ColorBends'
import Noise from '@/components/Noise'

const MAX_SIZE_MB = 50
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function generateColorBendsParams() {
  return {
    rotation: Math.random() * 360,
    speed: 0.2 + Math.random() * 0.5,
    scale: Math.random() * 2,
    frequency: 1 + Math.random() * 2,
    warpStrength: 1,
    mouseInfluence: 1.2,
    parallax: Math.random(),
    noise: 0,
  }
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
  const [colorBendsParams, setColorBendsParams] = useState<ReturnType<typeof generateColorBendsParams> | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showContent, setShowContent] = useState(false)

  const router = useRouter()
  const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(window.navigator.userAgent)

  useEffect(() => {
    setColorBendsParams(generateColorBendsParams())
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

  if (!mounted || !colorBendsParams) {
    return <main className="relative min-h-screen w-full overflow-hidden bg-black" />
  }

  return (
    <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black scrollbar-hide">
      {/* Background effects */}
      <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
        <ColorBends {...colorBendsParams} transparent />
        <Noise patternSize={250} patternScaleX={1} patternScaleY={1} patternAlpha={15} />
      </div>

      {/* Content */}
      <div className={`relative z-50 flex min-h-screen items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-1000 ease-out ${showContent ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-sm'}`}>
        <div className="w-full max-w-3xl mt-16 md:mt-0">
          {/* Back button */}
          <button
            onClick={() => router.push('/gallery')}
            className="fixed top-4 left-4 z-[10000] px-4 py-2 rounded-lg font-mono font-semibold text-white bg-gray-800/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-gray-800/60 hover:scale-105 cursor-pointer"
          >
            ← Galería
          </button>

          {/* Main panel */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 via-green-500/20 to-yellow-500/20 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] sm:rounded-3xl sm:p-8 md:p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/0 via-green-600/0 to-yellow-600/0 opacity-0 transition-all duration-500" />

            <div className="relative space-y-6">
              {/* Title */}
              <h1 className="font-mono text-3xl font-black text-[#00ffa3] text-center sm:text-4xl md:text-5xl">
                Subir Imagen
              </h1>

              {/* Event selector */}
              <div className="space-y-2">
                <label className="font-mono text-sm font-semibold text-white/90">Selecciona evento:</label>
                <select
                  value={selectedEvent}
                  onChange={e => setSelectedEvent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl font-mono bg-gray-800/60 backdrop-blur-md border border-white/10 text-white transition-all duration-300 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                >
                  <option value="">-- Selecciona un evento --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nombre}
                    </option>
                  ))}
                </select>
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
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${isDragActive
                      ? 'border-cyan-500/60 bg-cyan-500/10'
                      : 'border-white/20 bg-gray-800/30 hover:border-cyan-500/40 hover:bg-gray-800/40'
                      }`}
                  >
                    <input {...getInputProps()} />
                    <p className="font-mono text-white/80">
                      {isDragActive ? 'Suelta la imagen aquí...' : 'Arrastra una imagen o haz clic para seleccionar'}
                    </p>
                  </div>

                  {/* Camera button for mobile */}
                  {isMobile && (
                    <div className="text-center">
                      <span className="font-mono text-white/60 font-bold">— o —</span>
                      <br />
                      <label
                        htmlFor="cameraInput"
                        className="inline-block mt-3 px-6 py-3 rounded-xl font-mono font-semibold text-white bg-gradient-to-r from-cyan-500/20 to-green-500/20 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:from-cyan-500/30 hover:to-green-500/30 hover:scale-105"
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

                  {/* Preview and description */}
                  {preview && (
                    <>
                      <div className="rounded-xl overflow-hidden border border-white/10">
                        <img src={preview} alt="Vista previa" className="w-full max-h-96 object-contain" />
                      </div>

                      <div className="space-y-2">
                        <textarea
                          placeholder="Descripción (obligatoria)"
                          value={description}
                          onChange={e => {
                            setDescription(e.target.value)
                            setDescriptionError(false)
                          }}
                          className={`w-full px-4 py-3 rounded-xl font-mono bg-gray-800/60 backdrop-blur-md border text-white resize-vertical min-h-[100px] transition-all duration-300 focus:outline-none focus:ring-2 ${descriptionError
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/20'
                            }`}
                          maxLength={500}
                        />
                        {descriptionError && (
                          <p className="font-mono text-red-400 text-sm">La descripción es obligatoria</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Upload button */}
                  {file && (
                    <button
                      onClick={handleUpload}
                      className="w-full px-6 py-4 rounded-xl font-mono font-bold text-lg text-white bg-gradient-to-r from-cyan-500/30 to-green-500/30 backdrop-blur-md border border-white/20 transition-all duration-300 hover:from-cyan-500/40 hover:to-green-500/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,255,163,0.3)] cursor-pointer"
                    >
                      Subir imagen
                    </button>
                  )}
                </>
              )}

              {/* Progress bar */}
              {progress !== 'idle' && (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-gray-800/60 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-600 ease-out"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor:
                          progress === 'error' ? '#ef4444' : progress === 'done' ? '#00ffa3' : '#06b6d4',
                      }}
                    />
                  </div>
                  <p className="font-mono text-center text-white/90 text-sm">
                    {progress === 'processing' && 'Procesando imagen...'}
                    {progress === 'uploading' && 'Subiendo imagen...'}
                    {progress === 'done' && 'Imagen subida exitosamente'}
                    {progress === 'error' && 'Error al subir imagen'}
                  </p>
                </div>
              )}

              {/* Status message */}
              {status && (
                <p className="font-mono text-center text-white/80 bg-gray-800/40 backdrop-blur-md rounded-lg px-4 py-3 border border-white/10">
                  {status}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}