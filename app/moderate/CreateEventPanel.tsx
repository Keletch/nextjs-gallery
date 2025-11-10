'use client'
import { useState } from 'react'

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
    <div style={{ marginBottom: '1rem' }}>
      <button onClick={() => setShowPopup(true)}>Crear evento</button>

      {showPopup && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem' }}>
          <h4>Nuevo evento</h4>
          <label>Nombre:</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Shift 2025"
            style={{ marginLeft: '0.5rem' }}
          />
          <br />
          <label>Ruta:</label>
          <input
            type="text"
            value={ruta}
            onChange={e => setRuta(e.target.value)}
            placeholder="shift2025"
            style={{ marginLeft: '0.5rem', marginTop: '0.5rem' }}
          />
          <br />
          {confirming && (
            <p style={{ marginTop: '1rem' }}>
              ¿Confirmas crear el evento <strong>{nombre}</strong> con ruta <strong>{ruta}</strong>?
            </p>
          )}
          <button onClick={handleCreate} style={{ marginTop: '1rem' }}>
            {confirming ? 'Confirmar creación' : 'Crear'}
          </button>
          <button onClick={resetForm} style={{ marginLeft: '0.5rem' }}>
            Cancelar
          </button>
          {status && <p style={{ marginTop: '1rem' }}>{status}</p>}
        </div>
      )}
    </div>
  )
}