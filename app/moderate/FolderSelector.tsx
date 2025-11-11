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
    <div className={styles.folderSelector}>
      {folders.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`${styles.folderButton} ${
            selected === value ? styles.folderActive : styles.folderInactive
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}