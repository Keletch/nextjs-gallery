'use client'
import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Glass, { GlassButton, GlassInput } from '@/components/Glass'
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
      <GlassButton onClick={() => setShowPopup(true)} size="lg">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 4v12M4 10h12" strokeLinecap="round" />
        </svg>
        Crear evento
      </GlassButton>

      {/* En un portal: dentro del panel (z-50) quedaba debajo de la barra de sesión */}
      {showPopup && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={() => !loading && resetForm()}>
          <Glass
            radius={32}
            frost="heavy"
            className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-8 scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-6 text-2xl font-semibold tracking-tight">Nuevo evento</h4>

            {!success ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block pl-1 text-sm font-medium text-white/75">Nombre</label>
                    <GlassInput
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Shift 2025"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block pl-1 text-sm font-medium text-white/75">Ruta</label>
                    <GlassInput
                      type="text"
                      value={ruta}
                      onChange={e => setRuta(e.target.value.replace(/\s/g, ''))}
                      placeholder="shift2025"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block pl-1 text-sm font-medium text-white/75">Color de fondo</label>
                    <Glass radius={16} frost="regular" refraction={24} className="flex items-center gap-3 p-2 pr-4">
                      <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="h-11 w-11 cursor-pointer rounded-[10px] border-0 bg-transparent p-0"
                        disabled={loading}
                      />
                      <span className="text-sm tabular-nums text-white/80">{color}</span>
                    </Glass>
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
                    <label className="mb-2 block pl-1 text-sm font-medium text-white/75">Logotipo del evento (opcional)</label>
                    <Glass radius={20} frost="regular" selected={isDragActive} className="cursor-pointer transition-colors hover:bg-white/[0.08]">
                      {/* Las props del dropzone van aquí: traen su propio ref y no deben pisar el del vidrio */}
                      <div {...getRootProps()} className="m-2 rounded-[14px] border border-dashed border-white/20 p-6 text-center outline-none">
                        <input {...getInputProps()} disabled={loading} />
                        <p className="text-white/75">
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
                      <div className="mt-4 text-center">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="mx-auto max-h-[100px] max-w-[200px] rounded-xl bg-white/5 object-contain p-2 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.2)]"
                        />
                        <p className="mt-2 text-sm text-white/60">{logoFile?.name}</p>
                      </div>
                    )}
                  </div>

                  {confirming && !loading && (
                    <Glass radius={16} frost="regular" className="p-4 text-sm text-white/85">
                      ¿Confirmas crear el evento <strong>{nombre}</strong> con ruta <strong>{ruta}</strong>?
                    </Glass>
                  )}

                  {loading && (
                    <div className="text-center">
                      <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white/80 border-r-transparent"></div>
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <GlassButton onClick={handleCreate} disabled={loading} size="lg" selected className="flex-1">
                      {loading ? 'Creando...' : confirming ? 'Confirmar creación' : 'Crear'}
                    </GlassButton>
                    <GlassButton onClick={resetForm} disabled={loading} size="lg">
                      Cancelar
                    </GlassButton>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="mb-6 text-2xl font-semibold tracking-tight">
                  Evento creado con éxito
                </p>
                <div className="flex justify-center gap-3">
                  <GlassButton onClick={handleReload} size="lg" selected>
                    Recargar página
                  </GlassButton>
                  <GlassButton onClick={resetForm} size="lg">
                    Cerrar
                  </GlassButton>
                </div>
              </div>
            )}

            {status && !success && <p className="mt-4 text-center text-sm text-white/75">{status}</p>}
          </Glass>
        </div>,
        document.body
      )}
    </div>
  )
}
