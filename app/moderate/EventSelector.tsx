'use client'
import { useEffect, useState } from 'react'

type Event = {
  id: string
  nombre: string
  ruta: string
}

export default function EventSelector({
  selected,
  onChange,
}: {
  selected: string
  onChange: (ruta: string) => void
}) {
  const [eventos, setEventos] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events')
        const data = await res.json()
        setEventos(data)
      } catch (err) {
        console.error('❌ Error al cargar eventos:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label>Selecciona evento:</label>
      <select
        value={selected}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
        style={{ marginLeft: '0.5rem', padding: '0.5rem' }}
      >
        <option value="">-- Selecciona --</option>
        {eventos.map(ev => (
          <option key={ev.id} value={ev.ruta}>
            {ev.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}