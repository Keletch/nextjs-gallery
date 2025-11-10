'use client'
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
    <div style={{ marginBottom: '1rem' }}>
      {folders.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          style={{
            marginRight: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: selected === value ? '#333' : '#eee',
            color: selected === value ? '#fff' : '#000',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}