'use client'
import { useState, useEffect } from 'react'
import AuthGate from './AuthGate'
import EventSelector from './EventSelector'
import DefaultViewPanel from './DefaultViewPanel'
import FolderSelector from './FolderSelector'
import ModerationPanel from './ModerationPanel'
import LogsPanel from './LogsPanel'
import CreateEventPanel from './CreateEventPanel'
import { useModeration } from './UseModeration'
import GhostFibers from '@/components/GhostFibers'
import { randomColors, randomFiberParams } from '@/lib/background'
import Glass, { GlassButton } from '@/components/Glass'

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
  // Confirmación antes de mover o borrar una foto (antes era el confirm() del navegador)
  const [confirming, setConfirming] = useState<{ message: string; filename: string; run: () => void } | null>(null)
  const ask = (message: string, filename: string, run: () => void) => setConfirming({ message, filename, run })
  useEffect(() => {
    if (!confirming) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirming(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming])

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
              ask(`¿Aprobar esta foto?`, filename, () => handleAction('/api/approved', { filename }, `Aprobada: ${filename}`))
            },
          },
          {
            label: 'Rechazar',
            handler: filename => {
              ask(`¿Rechazar esta foto?`, filename, () => handleAction('/api/reject', { filename }, `Rechazada: ${filename}`))
            },
          },
        ]
      case 'approved':
        return [
          {
            label: 'Mover a rechazadas',
            handler: filename => {
              ask(`¿Mover esta foto a rechazadas?`, filename, () => handleAction('/api/move-to-rejected', { filename, from: 'approved' }, `Movida a rechazadas: ${filename}`))
            },
          },
          {
            label: 'Eliminar',
            handler: filename => {
              ask(`¿Eliminar esta foto para siempre?`, filename, () => handleAction('/api/delete-image', { filename, folder: 'approved' }, `Eliminada: ${filename}`))
            },
          },
        ]
      case 'rejected':
        return [
          {
            label: 'Mover a aprobadas',
            handler: filename => {
              ask(`¿Mover esta foto a aprobadas?`, filename, () => handleAction('/api/move-to-approved', { filename, from: 'rejected' }, `Movida a aprobadas: ${filename}`))
            },
          },
          {
            label: 'Eliminar',
            handler: filename => {
              ask(`¿Eliminar esta foto para siempre?`, filename, () => handleAction('/api/delete-image', { filename, folder: 'rejected' }, `Eliminada: ${filename}`))
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
          <GhostFibers {...fiberParams} />
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

          <DefaultViewPanel />

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

        {confirming && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setConfirming(null)}
          >
            <Glass
              radius={28}
              frost="heavy"
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm p-6 text-center animate-in zoom-in-95 fade-in duration-200"
              onClick={e => e.stopPropagation()}
            >
              {urls[confirming.filename]?.thumb && (
                <img
                  src={urls[confirming.filename].thumb}
                  alt=""
                  className="mx-auto mb-4 max-h-48 rounded-[18px] object-contain"
                />
              )}
              <p className="mb-5 text-base font-medium text-white">{confirming.message}</p>
              <div className="flex gap-2">
                <GlassButton onClick={() => setConfirming(null)} className="flex-1">
                  Cancelar
                </GlassButton>
                <GlassButton
                  selected
                  autoFocus
                  className="flex-1"
                  onClick={() => { confirming.run(); setConfirming(null) }}
                >
                  Confirmar
                </GlassButton>
              </div>
            </Glass>
          </div>
        )}
      </>
    </AuthGate>
  )
}