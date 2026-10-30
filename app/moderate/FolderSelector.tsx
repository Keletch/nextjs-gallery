'use client'
import Glass, { GlassButton } from '@/components/Glass'

type Folder = 'pending' | 'approved' | 'rejected' | 'logs'

export default function FolderSelector({
  selected,
  onChange,
}: {
  selected: Folder
  onChange: (folder: Folder) => void
}) {
  const folders: { label: string; value: Folder }[] = [
    { label: 'Pendientes', value: 'pending' },
    { label: 'Aprobadas', value: 'approved' },
    { label: 'Rechazadas', value: 'rejected' },
    { label: 'Logs', value: 'logs' },
  ]

  return (
    // Una sola fila en celular (antes "Logs" bajaba a otro renglón y la píldora se deformaba): columnas
    // iguales a todo lo ancho y menos relleno en los botones
    <Glass radius={999} frost="clear" className="mb-6 grid w-full grid-cols-4 gap-1 p-1.5 sm:inline-grid sm:w-auto">
      {folders.map(({ label, value }) => (
        <GlassButton
          key={value}
          onClick={() => onChange(value)}
          selected={selected === value}
          className={`whitespace-nowrap !px-0.5 text-[clamp(11px,3.4vw,13px)] sm:!px-5 sm:text-sm ${selected === value ? '' : '!bg-transparent !shadow-none !outline-transparent text-white/60 hover:text-white'}`}
        >
          {label}
        </GlassButton>
      ))}
    </Glass>
  )
}
