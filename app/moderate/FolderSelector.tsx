'use client'
import styles from './ModeratePage.module.css'

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
    <div className="flex flex-wrap gap-3 mb-6">
      {folders.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-6 py-3 rounded-xl font-mono text-sm font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${selected === value
              ? 'bg-gradient-to-r from-cyan-500/30 to-green-500/30 text-white border-2 border-cyan-500/50 scale-105'
              : 'bg-white/5 backdrop-blur-xl text-white/70 border-2 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-105'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}