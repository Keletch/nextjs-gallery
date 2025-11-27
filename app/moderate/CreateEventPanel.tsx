'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

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
        setStatus('Evento creado correctamente')
        setSuccess(true)
        if (onCreated) onCreated(ruta)
      } else {
        setStatus(`Error: ${result.error}`)
      }
    } catch (err) {
      setStatus(`${err instanceof Error ? err.message : 'Error al crear evento'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowPopup(true)}
        className="px-6 py-3 rounded-xl font-mono font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-green-500/30 border-2 border-cyan-500/50 cursor-pointer transition-all duration-300 hover:scale-105 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
      >
        + Crear evento
      </button>

      {showPopup && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => !loading && resetForm()}>
          <div
            className="w-full max-w-2xl mx-4 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-2xl font-bold text-white mb-6 font-mono">Nuevo evento</h4>

            {!success ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-sm font-semibold text-white/90 mb-2">Nombre:</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Shift 2025"
                      className="w-full px-4 py-3 rounded-xl font-mono bg-white/5 backdrop-blur-md border border-white/10 text-white transition-all duration-300 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-sm font-semibold text-white/90 mb-2">Ruta:</label>
                    <input
                      type="text"
                      value={ruta}
                      onChange={e => setRuta(e.target.value.replace(/\s/g, ''))}
                      placeholder="shift2025"
                      className="w-full px-4 py-3 rounded-xl font-mono bg-white/5 backdrop-blur-md border border-white/10 text-white transition-all duration-300 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-sm font-semibold text-white/90 mb-2">Color de fondo:</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-16 h-16 rounded-lg cursor-pointer border-2 border-white/20"
                        disabled={loading}
                      />
                      <span className="font-mono text-white">{color}</span>
                    </div>
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

                  <div>
                    <label className="block font-mono text-sm font-semibold text-white/90 mb-2">Logotipo del evento (opcional):</label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-white/20 bg-white/5 hover:border-cyan-500/40'
                        }`}
                    >
                      <input {...getInputProps()} disabled={loading} />
                      <p className="font-mono text-white/70">
                        {isDragActive
                          ? 'Suelta el logo aquí...'
                          : 'Arrastra una imagen o haz clic para seleccionar'}
                      </p>
                      <p className="text-xs text-white/50 mt-2">
                        Máx {MAX_LOGO_SIZE_MB}MB • JPG, PNG, WebP
                      </p>
                    </div>

                    {logoPreview && (
                      <div className="mt-4 text-center">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="max-w-[200px] max-h-[100px] mx-auto object-contain border border-white/20 rounded-lg p-2 bg-white/5"
                        />
                        <p className="text-sm text-white/70 font-mono mt-2">{logoFile?.name}</p>
                      </div>
                    )}
                  </div>

                  {confirming && !loading && (
                    <p className="p-4 bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-xl text-white font-mono text-sm">
                      ¿Confirmas crear el evento <strong>{nombre}</strong> con ruta <strong>{ruta}</strong>?
                    </p>
                  )}

                  {loading && (
                    <div className="text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-r-transparent"></div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleCreate}
                      disabled={loading}
                      className="flex-1 px-6 py-3 rounded-xl font-mono font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-green-500/30 border-2 border-cyan-500/50 cursor-pointer transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                    >
                      {loading ? 'Creando...' : confirming ? 'Confirmar creación' : 'Crear'}
                    </button>
                    <button
                      onClick={resetForm}
                      disabled={loading}
                      className="px-6 py-3 rounded-xl font-mono font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-2xl mb-6 text-green-400 font-mono font-bold">
                  ¡Evento creado con éxito!
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReload}
                    className="px-6 py-3 rounded-xl font-mono font-semibold text-white bg-gradient-to-r from-green-500/30 to-cyan-500/30 border-2 border-green-500/50 cursor-pointer transition-all duration-300 hover:scale-105"
                  >
                    Recargar página
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-6 py-3 rounded-xl font-mono font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {status && !success && <p className="mt-4 text-center font-mono text-sm text-white/80">{status}</p>}
          </div>
        </div>
      )}
    </div>
  )
}