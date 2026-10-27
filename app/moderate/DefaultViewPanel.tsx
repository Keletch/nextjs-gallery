'use client'

import { useEffect, useState } from 'react'
import Glass, { GlassButton } from '@/components/Glass'

type ViewMode = 'wall' | 'dome' | 'flight'
const OPTIONS: [ViewMode, string][] = [['wall', 'Muro'], ['dome', 'Globo'], ['flight', 'Vuelo']]

// Vista con la que abre la galería para quien la visita (cada quien puede cambiarla después)
export default function DefaultViewPanel() {
  const [view, setView] = useState<ViewMode | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch('/api/default-view')
      .then(res => res.json())
      .then(data => setView(data.view ?? 'wall'))
      .catch(() => setStatus('No se pudo cargar la vista actual'))
  }, [])

  const save = async (next: ViewMode) => {
    if (next === view || saving) return
    setSaving(true)
    setStatus('')
    try {
      const res = await fetch('/api/default-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar la vista')
      setView(next)
      setStatus('Guardado. Se aplica a quien abra la galería desde ahora.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Error al guardar la vista')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Glass radius={28} frost="heavy" className="mb-6 flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-medium text-white/90">Vista de la galería por defecto</p>
        <p className="mt-1 text-xs text-white/50">Con la que abre la galería. Cada visitante puede cambiarla después.</p>
        {status && <p className="mt-2 text-xs text-white/80">{status}</p>}
      </div>
      <div role="radiogroup" aria-label="Vista por defecto" className="flex shrink-0 rounded-[14px] bg-black/20 p-1">
        {OPTIONS.map(([mode, label]) => (
          <GlassButton
            key={mode}
            role="radio"
            aria-checked={view === mode}
            size="sm"
            radius={10}
            selected={view === mode}
            disabled={view === null || saving}
            onClick={() => save(mode)}
            className={view === mode ? '' : '!bg-transparent !shadow-none text-white/65'}
          >
            {label}
          </GlassButton>
        ))}
      </div>
    </Glass>
  )
}
