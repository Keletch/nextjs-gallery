'use client'
import Glass, { GlassButton } from '@/components/Glass'

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
    <Glass radius={28} frost="heavy" className="p-6">
      <h3 className="mb-6 text-2xl font-semibold tracking-tight">Historial de logs</h3>

      <div className="mb-6 inline-flex gap-1 rounded-full bg-black/20 p-1.5">
        <GlassButton
          onClick={() => setLogView('moderation')}
          selected={logView === 'moderation'}
          className={logView === 'moderation' ? '' : '!bg-transparent !shadow-none !outline-transparent text-white/60 hover:text-white'}
        >
          Moderación
        </GlassButton>
        <GlassButton
          onClick={() => setLogView('uploads')}
          selected={logView === 'uploads'}
          className={logView === 'uploads' ? '' : '!bg-transparent !shadow-none !outline-transparent text-white/60 hover:text-white'}
        >
          Subidas
        </GlassButton>
      </div>

      <div className="overflow-x-auto">
        {logView === 'moderation' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/15">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Archivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">De</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">A</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logs
                .filter((log) => log.action !== 'upload-image')
                .map((log, i) => (
                  <tr key={i} className="border-b border-white/[0.07] hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 text-sm text-white/80">{log.filename}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{log.from}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{log.to}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {logView === 'uploads' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/15">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Archivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Dispositivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Navegador</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">SO</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/50">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {logs
                .filter((log) => log.action === 'upload-image')
                .map((log, i) => (
                  <tr key={i} className="border-b border-white/[0.07] hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 text-sm text-white/80">{log.filename}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{log.device || '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{log.browser || '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{log.os || '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{log.location || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </Glass>
  )
}