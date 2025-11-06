'use client'
import { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'
import type { Session } from '@supabase/supabase-js'

type Folder = 'pending' | 'approved' | 'rejected' | 'logs'

export default function ModeratePage() {
  const [session, setSession] = useState<Session | null>(null)
  const [folder, setFolder] = useState<Folder>('pending')
  const [logView, setLogView] = useState<'moderation' | 'uploads'>('moderation')
  const [images, setImages] = useState<string[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [logs, setLogs] = useState<any[]>([])
  const [status, setStatus] = useState<string>('')

  // 🔐 Obtener sesión al montar
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession()
      setSession(data.session)
    }
    getSession()
  }, [])

  // 📦 Cargar imágenes o logs si hay sesión
  useEffect(() => {
    if (!session) return

    const fetchImagesOrLogs = async () => {
      if (folder === 'logs') {
        const res = await fetch('/api/get-logs')
        const allLogs = await res.json()
        setLogs(allLogs)
        return
      }

      try {
        const res = await fetch(`/api/${folder}-index`)
        const list = await res.json()

        const validImages = Array.isArray(list)
          ? list
              .filter((f: unknown): f is string => typeof f === 'string')
              .filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f) && f !== '.emptyFolderPlaceholder')
          : []

        setImages(validImages)

        const entries = await Promise.all(
          validImages.map(async (filename) => {
            try {
              const res = await fetch('/api/get-signed-url', {
                method: 'POST',
                body: JSON.stringify({ folder, filename }),
                headers: { 'Content-Type': 'application/json' },
              })
              const json = await res.json()
              return [filename, json.url || '']
            } catch {
              return [filename, '']
            }
          })
        )
        setUrls(Object.fromEntries(entries))
      } catch (err) {
        console.error('Error al cargar imágenes:', err)
        setStatus('No se pudieron cargar las imágenes')
      }
    }

    fetchImagesOrLogs()
  }, [folder, session])

  // 🔑 Iniciar sesión con Google
  const handleLogin = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/moderate`,
      },
    })
    if (error) console.error('Error al iniciar sesión:', error.message)
  }

  // 🚪 Cerrar sesión
  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut()
    if (error) console.error('Error al cerrar sesión:', error.message)
    window.location.href = '/moderate'
  }

  // 🧭 Render condicional
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      {!session ? (
        <>
          <h2>No has iniciado sesión</h2>
          <button
            onClick={handleLogin}
            style={{ backgroundColor: 'green', color: 'white', padding: '0.5rem 1rem' }}
          >
            Iniciar sesión con Google
          </button>
        </>
      ) : (
        <>
          <h2>Panel de Moderación</h2>
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={async () => {
                if (window.confirm('¿Seguro que quieres cerrar sesión?')) await handleLogout()
              }}
              style={{ marginRight: '1rem', backgroundColor: 'red', color: 'white' }}
            >
              Logout
            </button>
            <button onClick={() => setFolder('pending')} style={{ marginRight: '1rem' }}>Pendientes</button>
            <button onClick={() => setFolder('approved')} style={{ marginRight: '1rem' }}>Aprobadas</button>
            <button onClick={() => setFolder('rejected')} style={{ marginRight: '1rem' }}>Rechazadas</button>
            <button onClick={() => setFolder('logs')}>Logs</button>
          </div>
          {status && <p>{status}</p>}

          {folder !== 'logs' && (
            <ModerationPanel folder={folder} images={images} urls={urls} actions={getActions()} />
          )}

          {folder === 'logs' && (
            <LogsPanel logs={logs} logView={logView} setLogView={setLogView} />
          )}
        </>
      )}
    </div>
  )

  function getActions(): { label: string; handler: (filename: string) => void }[] {
    switch (folder) {
      case 'pending':
        return [
          {
            label: 'Aprobar',
            handler: filename => {
              if (confirm(`¿Aprobar "${filename}"?`)) {
                handleAction('/api/approved', { filename }, `Aprobada: ${filename}`)
              }
            },
          },
          {
            label: 'Rechazar',
            handler: filename => {
              if (confirm(`¿Rechazar "${filename}"?`)) {
                handleAction('/api/reject', { filename }, `Rechazada: ${filename}`)
              }
            },
          },
        ]
      case 'approved':
        return [
          {
            label: 'Mover a rechazadas',
            handler: filename => {
              if (confirm(`¿Mover "${filename}" a rechazadas?`)) {
                handleAction('/api/move-to-rejected', { filename, from: 'approved' }, `Movida a rechazadas: ${filename}`)
              }
            },
          },
          {
            label: 'Eliminar',
            handler: filename => {
              if (confirm(`¿Eliminar "${filename}" permanentemente?`)) {
                handleAction('/api/delete-image', { filename, folder: 'approved' }, `Eliminada: ${filename}`)
              }
            },
          },
        ]
      case 'rejected':
        return [
          {
            label: 'Mover a aprobadas',
            handler: filename => {
              if (confirm(`¿Mover "${filename}" a aprobadas?`)) {
                handleAction('/api/move-to-approved', { filename, from:'rejected' }, `Movida a aprobadas: ${filename}`)
              }
            },
          },
          {
            label: 'Eliminar',
            handler: filename => {
              if (confirm(`¿Eliminar "${filename}" permanentemente?`)) {
                handleAction('/api/delete-image', { filename, folder: 'rejected' }, `Eliminada: ${filename}`)
              }
            },
          },
        ]
      default:
        return []
    }
  }

  async function handleAction(endpoint: string, payload: any, successMsg: string) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (res.ok) {
        setImages(prev => prev.filter(img => img !== payload.filename))
        setStatus(successMsg)
      } else {
        setStatus('Error en la operación')
      }
    } catch (err) {
      console.error(err)
      setStatus('Error en la operación')
    }
  }
}

function ModerationPanel({
  folder,
  images,
  urls,
  actions,
}: {
  folder: string
  images: string[]
  urls: Record<string, string>
  actions: { label: string; handler: (filename: string) => void }[]
}) {
  if (images.length === 0) return <p>No hay imágenes en esta sección.</p>

  return (
    <div
      style={{
        display: 'grid',
        gap: '2rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      }}
    >
      {images.map(filename => {
        const url = urls[filename]
        if (!url) return null

        return (
          <div
            key={filename}
            style={{ border: '1px solid #ccc', padding: '1rem' }}
          >
            <img
              src={url}
              alt={filename}
              style={{ maxWidth: '100%', maxHeight: '200px' }}
            />
            <p style={{ wordBreak: 'break-word' }}>{filename}</p>
            {actions.map(action => (
              <button
                key={action.label}
                onClick={() => action.handler(filename)}
                style={{ marginRight: '0.5rem', marginTop: '0.5rem' }}
              >
                {action.label}
              </button>
                        ))}
          </div>
        )
      })}
    </div>
  )
}

function LogsPanel({
  logs,
  logView,
  setLogView,
}: {
  logs: any[]
  logView: 'moderation' | 'uploads'
  setLogView: (view: 'moderation' | 'uploads') => void
}) {
  return (
    <div style={{ marginTop: '2rem' }}>
      <h3>Historial de Logs</h3>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setLogView('moderation')} style={{ marginRight: '1rem' }}>
          Moderación
        </button>
        <button onClick={() => setLogView('uploads')}>Subidas</button>
      </div>

      {logView === 'moderation' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Acción</th>
              <th>De</th>
              <th>A</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {logs
              .filter(log => log.action !== 'upload')
              .map((log, i) => (
                <tr key={i}>
                  <td>{log.filename}</td>
                  <td>{log.action}</td>
                  <td>{log.from}</td>
                  <td>{log.to}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {logView === 'uploads' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Fecha</th>
              <th>Dispositivo</th>
              <th>Navegador</th>
              <th>SO</th>
              <th>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {logs
              .filter(log => log.action === 'upload')
              .map((log, i) => (
                <tr key={i}>
                  <td>{log.filename}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.device || '—'}</td>
                  <td>{log.browser || '—'}</td>
                  <td>{log.os || '—'}</td>
                  <td>{log.location || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}