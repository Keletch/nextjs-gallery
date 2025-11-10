'use client'

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
    <div style={{ marginTop: '2rem' }}>
      <h3>Historial de Logs</h3>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setLogView('moderation')} style={{ marginRight: '1rem' }}>
          Moderación
        </button>
        <button onClick={() => setLogView('uploads')}>Subidas</button>
      </div>

      {logView === 'moderation' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              .filter((log) => log.action !== 'upload-image') // ✅ corregido
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              .filter((log) => log.action === 'upload-image') // ✅ corregido
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