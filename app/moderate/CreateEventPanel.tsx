'use client'
import { useState } from 'react'
import styles from './ModeratePage.module.css'

export default function CreateEventPanel({
  onCreated,
}: {
  onCreated?: (ruta: string) => void
}) {
  const [showPopup, setShowPopup] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ruta, setRuta] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [status, setStatus] = useState('')

  const resetForm = () => {
    setNombre('')
    setRuta('')
    setConfirming(false)
    setStatus('')
    setShowPopup(false)
  }

  const handleCreate = async () => {
    if (!nombre || !ruta) return

    if (!confirming) {
      setConfirming(true)
      return
    }

    try {
      const res = await fetch('/api/create-event', {
        method: 'POST',
        body: JSON.stringify({ nombre, ruta }),
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()
      if (res.ok) {
        setStatus('✅ Evento creado correctamente')
        if (onCreated) onCreated(ruta)
        resetForm()
      } else {
        setStatus(`❌ Error: ${result.error}`)
      }
    } catch (err) {
      setStatus('❌ Error al crear evento')
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.createEventTrigger}>
        <button onClick={() => setShowPopup(true)} className={styles.button}>
          Crear evento
        </button>
      </div>

      {showPopup && (
        <div className={styles.panel}>
          <h4>Nuevo evento</h4>
          <label>Nombre:</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Shift 2025"
            className={styles.input}
          />
          <label>Ruta:</label>
          <input
            type="text"
            value={ruta}
            onChange={e => setRuta(e.target.value)}
            placeholder="shift2025"
            className={styles.input}
          />
          {confirming && (
            <p className={styles.status}>
              ¿Confirmas crear el evento <strong>{nombre}</strong> con ruta <strong>{ruta}</strong>?
            </p>
          )}
          <div className={styles.buttonRow}>
            <button onClick={handleCreate} className={styles.button}>
              {confirming ? 'Confirmar creación' : 'Crear'}
            </button>
            <button onClick={resetForm} className={styles.button}>
              Cancelar
            </button>
          </div>
          {status && <p className={styles.status}>{status}</p>}
        </div>
      )}
    </div>
  )
}