'use client'
import styles from './ModeratePage.module.css'

export default function LogsPanel({
  logs,
  logView,
  setLogView,
}: {
  logs: any[]
  logView: 'moderation' | 'uploads'
  setLogView: (view: 'moderation' | 'uploads') => void
}) {
  return (
    <div className={styles.panel}>
      <h3>Historial de Logs</h3>
      <div className={styles.logToggle}>
        <button onClick={() => setLogView('moderation')}>Moderación</button>
        <button onClick={() => setLogView('uploads')}>Subidas</button>
      </div>

      {logView === 'moderation' && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Acción</th>
              <th>De</th>
              <th>A</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {logs
              .filter((log) => log.action !== 'upload-image')
              .map((log, i) => (
                <tr key={i}>
                  <td>{log.filename}</td>
                  <td>{log.action}</td>
                  <td>{log.from}</td>
                  <td>{log.to}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {logView === 'uploads' && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Fecha</th>
              <th>Dispositivo</th>
              <th>Navegador</th>
              <th>SO</th>
              <th>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {logs
              .filter((log) => log.action === 'upload-image')
              .map((log, i) => (
                <tr key={i}>
                  <td>{log.filename}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.device || '—'}</td>
                  <td>{log.browser || '—'}</td>
                  <td>{log.os || '—'}</td>
                  <td>{log.location || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}