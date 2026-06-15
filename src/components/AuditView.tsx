import React, { useState } from 'react';
import { AppState } from '../types';
import { Ban } from 'lucide-react';

export default function AuditView({ state }: { state: AppState }) {
  const [voidedIds, setVoidedIds] = useState<Set<string>>(new Set());

  const logs = [...state.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleVoid = (id: string) => {
    const newSet = new Set(voidedIds);
    newSet.add(id);
    setVoidedIds(newSet);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">History & Audit Log</h2>
        <p className="text-slate-500 text-sm mt-1">Immutable workspace history containing all creation, conversion, editing, and soft-delete activities.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="p-4 border-b">Timestamp</th>
              <th className="p-4 border-b">User</th>
              <th className="p-4 border-b">Action</th>
              <th className="p-4 border-b">Entity Type</th>
              <th className="p-4 border-b">Details</th>
              <th className="p-4 border-b text-right">Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">No history available.</td></tr>
            ) : (
              logs.map(log => {
                const isVoided = voidedIds.has(log.id);
                return (
                  <tr key={log.id} className={`hover:bg-slate-50 group ${isVoided ? 'opacity-40' : ''}`}>
                    <td className={`p-4 whitespace-nowrap text-xs ${isVoided ? 'line-through text-slate-400' : 'text-slate-500'}`}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className={`p-4 font-medium ${isVoided ? 'line-through text-slate-400' : 'text-slate-700'}`}>{log.userId}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                        isVoided ? 'bg-slate-100 text-slate-400' :
                        log.action === 'CREATED' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'CONVERTED' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'SOLD' ? 'bg-purple-100 text-purple-700' :
                        log.action === 'DELETED' ? 'bg-red-100 text-red-700' :
                        log.action === 'EDITED' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {isVoided ? 'VOID' : log.action}
                      </span>
                    </td>
                    <td className={`p-4 ${isVoided ? 'line-through text-slate-400' : 'text-slate-600'}`}>{log.entityType || '-'}</td>
                    <td className={`p-4 ${isVoided ? 'line-through text-slate-400' : 'text-slate-600'}`}>{log.details}</td>
                    <td className="p-4 text-right">
                      {!isVoided && (
                        <button onClick={() => handleVoid(log.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Void Entry">
                          <Ban size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
