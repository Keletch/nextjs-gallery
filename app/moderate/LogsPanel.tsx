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
    <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <h3 className="text-2xl font-bold text-white mb-6 font-mono">Historial de Logs</h3>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setLogView('moderation')}
          className={`px-6 py-3 rounded-xl font-mono text-sm font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${logView === 'moderation'
              ? 'bg-gradient-to-r from-cyan-500/30 to-green-500/30 text-white border-2 border-cyan-500/50 scale-105'
              : 'bg-white/5 backdrop-blur-xl text-white/70 border-2 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-105'
            }`}
        >
          Moderación
        </button>
        <button
          onClick={() => setLogView('uploads')}
          className={`px-6 py-3 rounded-xl font-mono text-sm font-semibold cursor-pointer transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${logView === 'uploads'
              ? 'bg-gradient-to-r from-cyan-500/30 to-green-500/30 text-white border-2 border-cyan-500/50 scale-105'
              : 'bg-white/5 backdrop-blur-xl text-white/70 border-2 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-105'
            }`}
        >
          Subidas
        </button>
      </div>

      <div className="overflow-x-auto">
        {logView === 'moderation' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Archivo</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Acción</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">De</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">A</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logs
                .filter((log) => log.action !== 'upload-image')
                .map((log, i) => (
                  <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-white/80">{log.filename}</td>
                    <td className="px-4 py-3 font-mono text-sm text-cyan-400">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/60">{log.from}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/60">{log.to}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {logView === 'uploads' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Archivo</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Fecha</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Dispositivo</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Navegador</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">SO</th>
                <th className="px-4 py-3 text-left font-mono text-sm font-bold text-white/90">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {logs
                .filter((log) => log.action === 'upload-image')
                .map((log, i) => (
                  <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-white/80">{log.filename}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/60">{log.device || '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/60">{log.browser || '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/60">{log.os || '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white/60">{log.location || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}