'use client'
import { useState } from 'react'
import AuthGate from './AuthGate'
import EventSelector from './EventSelector'
import FolderSelector from './FolderSelector'
import ModerationPanel from './ModerationPanel'
import LogsPanel from './LogsPanel'
import CreateEventPanel from './CreateEventPanel'
import { useModeration } from './UseModeration'
import styles from './ModeratePage.module.css'

type Folder = 'pending' | 'approved' | 'rejected' | 'logs'

export default function ModeratePage() {
  const [evento, setEvento] = useState<string>('')
  const [folder, setFolder] = useState<Folder>('pending')

  const {
    images,
    urls,
    logs,
    logView,
    setLogView,
    status,
    handleAction,
  } = useModeration(evento, folder)

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

  return (
    <AuthGate>
      <div className={styles.container}>
        <h1 className={styles.heading}>Panel de Moderación</h1>

        <CreateEventPanel onCreated={(ruta) => setEvento(ruta)} />

        <div className={styles.panel}>
          <EventSelector selected={evento} onChange={setEvento} />
        </div>

        <FolderSelector selected={folder} onChange={setFolder} />

        {status && <p className={styles.status}>{status}</p>}

        {folder !== 'logs' && evento && (
          <ModerationPanel folder={folder} images={images} urls={urls} actions={getActions()} />
        )}

        {folder === 'logs' && (
          <LogsPanel logs={logs} logView={logView} setLogView={setLogView} />
        )}
      </div>
    </AuthGate>
  )
}