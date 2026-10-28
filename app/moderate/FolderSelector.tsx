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
    <Glass radius={999} frost="clear" className="mb-6 inline-flex flex-wrap gap-1 p-1.5">
      {folders.map(({ label, value }) => (
        <GlassButton
          key={value}
          onClick={() => onChange(value)}
          selected={selected === value}
          className={selected === value ? '' : '!bg-transparent !shadow-none !outline-transparent text-white/60 hover:text-white'}
        >
          {label}
        </GlassButton>
      ))}
    </Glass>
  )
}
