'use client'
import { useState, useEffect } from 'react'
import AuthGate from './AuthGate'
import EventSelector from './EventSelector'
import FolderSelector from './FolderSelector'
import ModerationPanel from './ModerationPanel'
import LogsPanel from './LogsPanel'
import CreateEventPanel from './CreateEventPanel'
import { useModeration } from './UseModeration'
import GhostFibers from '@/components/GhostFibers'
import { randomColors, randomFiberParams } from '@/lib/background'
import Noise from '@/components/Noise'
import Glass from '@/components/Glass'

type Folder = 'pending' | 'approved' | 'rejected' | 'logs'

// Fondo: parámetros y colores aleatorios en cada visita
function generateFiberParams() {
  const [glowColor, secondaryColor] = randomColors(2)
  return { ...randomFiberParams({ interactive: false }), glowColor, secondaryColor }
}

export default function ModeratePage() {
  const [evento, setEvento] = useState<string>('')
  const [folder, setFolder] = useState<Folder>('pending')
  const [fiberParams, setFiberParams] = useState<ReturnType<typeof generateFiberParams> | null>(null)
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
    setFiberParams(generateFiberParams())
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

  if (!mounted || !fiberParams) {
    return <main className="relative min-h-screen w-full overflow-hidden bg-black" />
  }

  return (
    <AuthGate>
      <>
        {/* Background effects - absolute con h-screen: reescala en móvil pero NO se estira */}
        <div className="fixed top-0 left-0 w-full h-screen z-0">
          <GhostFibers {...fiberParams} dpr={1.5} />
          <Noise patternSize={250} patternScaleX={1} patternScaleY={1} patternAlpha={15} />
        </div>

        {/* Content */}
        <div className="relative z-50 w-full max-w-7xl mx-auto pb-8">
          <h1 className="mb-8 text-4xl font-semibold tracking-tight text-white">
            Panel de moderación
          </h1>

          <CreateEventPanel onCreated={(ruta) => setEvento(ruta)} />

          <Glass radius={28} frost="heavy" className="mb-6 p-6">
            <EventSelector selected={evento} onChange={setEvento} />
          </Glass>

          <FolderSelector selected={folder} onChange={setFolder} />

          {status && (
            <Glass radius={16} frost="regular" className="my-4 px-4 py-3 text-sm text-white/85">
              {status}
            </Glass>
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