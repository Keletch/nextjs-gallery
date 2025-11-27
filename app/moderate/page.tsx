'use client'
import { useState, useEffect } from 'react'
import AuthGate from './AuthGate'
import EventSelector from './EventSelector'
import FolderSelector from './FolderSelector'
import ModerationPanel from './ModerationPanel'
import LogsPanel from './LogsPanel'
import CreateEventPanel from './CreateEventPanel'
import { useModeration } from './UseModeration'
import ColorBends from '@/components/ColorBends'
import Noise from '@/components/Noise'

type Folder = 'pending' | 'approved' | 'rejected' | 'logs'

function generateColorBendsParams() {
  return {
    rotation: Math.random() * 360,
    speed: 0.2 + Math.random() * 0.5,
    scale: Math.random() * 2,
    frequency: 1 + Math.random() * 2,
    warpStrength: 1,
    mouseInfluence: 0,
    parallax: 0,
    noise: 0,
  }
}

export default function ModeratePage() {
  const [evento, setEvento] = useState<string>('')
  const [folder, setFolder] = useState<Folder>('pending')
  const [colorBendsParams, setColorBendsParams] = useState<ReturnType<typeof generateColorBendsParams> | null>(null)
  const [mounted, setMounted] = useState(false)

  const {
    images,
    urls,
    logs,
    logView,
    setLogView,
    status,
    handleAction,
    refreshImages,
  } = useModeration(evento, folder)

  useEffect(() => {
    setColorBendsParams(generateColorBendsParams())
    setMounted(true)
  }, [])

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
                handleAction('/api/move-to-approved', { filename, from: 'rejected' }, `Movida a aprobadas: ${filename}`)
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

  if (!mounted || !colorBendsParams) {
    return <main className="relative min-h-screen w-full overflow-hidden bg-black" />
  }

  return (
    <AuthGate>
      <>
        {/* Background effects - absolute con h-screen: reescala en móvil pero NO se estira */}
        <div className="fixed top-0 left-0 w-full h-screen z-0">
          <ColorBends {...colorBendsParams} transparent />
          <Noise patternSize={250} patternScaleX={1} patternScaleY={1} patternAlpha={15} />
        </div>

        {/* Content */}
        <div className="relative z-50 w-full max-w-7xl mx-auto pb-8">
          <h1 className="text-4xl font-bold text-white mb-8 font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            Panel de Moderación
          </h1>

          <CreateEventPanel onCreated={(ruta) => setEvento(ruta)} />

          <div className="mb-6 p-6 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <EventSelector selected={evento} onChange={setEvento} />
          </div>

          <FolderSelector selected={folder} onChange={setFolder} />

          {status && (
            <p className="my-4 px-4 py-3 bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-xl text-white font-mono text-sm shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
              {status}
            </p>
          )}

          {folder !== 'logs' && evento && (
            <ModerationPanel
              folder={folder}
              images={images}
              urls={urls}
              actions={getActions()}
              evento={evento}
              onUpdate={refreshImages}
            />
          )}

          {folder === 'logs' && (
            <LogsPanel logs={logs} logView={logView} setLogView={setLogView} />
          )}
        </div>
      </>
    </AuthGate>
  )
}