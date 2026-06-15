import React, { useState } from 'react';
import { AppState, Frame, AuditEntry } from '../types';
import { Hammer, Camera, Edit2, Save, X, Trash2 } from 'lucide-react';

const CURRENT_USER = 'System-Admin';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function FramesView({ state, setState }: Props) {
  const [selectedSawnId, setSelectedSawnId] = useState<string>('');
  const [type, setType] = useState<Frame['type']>('Door Frame');
  const [piecesRequired, setPiecesRequired] = useState<number>(5);
  const [laborCost, setLaborCost] = useState<number>(50);
  const [images, setImages] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Frame>>({});

  const startEdit = (f: Frame) => {
    setEditingId(f.id);
    setEditForm(f);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const updated = state.frames.map(f => f.id === editingId ? { ...f, ...editForm } as Frame : f);
    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'EDITED',
      entityId: editingId,
      entityType: 'Frame',
      details: `Edited frame ${editingId}`
    };
    setState({ ...state, frames: updated, auditLogs: [auditEntry, ...(state.auditLogs || [])] });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'DELETED',
      entityId: id,
      entityType: 'Frame',
      details: `Soft deleted frame ${id}`
    };
    const updated = state.frames.map(f => f.id === id ? { ...f, isDeleted: true } : f);
    setState({ ...state, frames: updated, auditLogs: [auditEntry, ...(state.auditLogs || [])] });
  };

  const availableSawn = state.sawnTimber.filter(s => s.piecesAvailable > 0 && !s.isDeleted);

  const handleAssemble = (e: React.FormEvent) => {
    e.preventDefault();
    const sawnBatch = state.sawnTimber.find(s => s.id === selectedSawnId);
    if (!sawnBatch) return;

    if (sawnBatch.piecesAvailable < piecesRequired) {
      alert("Not enough pieces in this batch!");
      return;
    }

    const materialCost = sawnBatch.costPerPiece * piecesRequired;
    const totalCost = materialCost + laborCost;

    const newFrame: Frame = {
      id: `FRAME-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString().split('T')[0],
      type,
      species: sawnBatch.species,
      consumedSawnTimberId: sawnBatch.id,
      piecesUsed: piecesRequired,
      totalCost,
      status: 'In Stock',
      images,
      isDeleted: false
    };

    const updatedSawn = state.sawnTimber.map(s => 
      s.id === sawnBatch.id ? { ...s, piecesAvailable: s.piecesAvailable - piecesRequired } : s
    );

    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'CREATED',
      entityId: newFrame.id,
      entityType: 'Frame',
      details: `Assembled ${newFrame.type} from ${sawnBatch.id}`
    };

    setState({
      ...state,
      sawnTimber: updatedSawn,
      frames: [newFrame, ...state.frames],
      auditLogs: [auditEntry, ...(state.auditLogs || [])]
    });
    setSelectedSawnId('');
    setImages([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
           setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Custom Frame Assembly</h2>
        <p className="text-slate-500 text-sm mt-1">Consume sawn planks from inventory to manufacture high-value door and window frames.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Assembly Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 pb-2 border-b">Produce New Frame</h3>
          <form onSubmit={handleAssemble} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Sawn Board Batch</label>
              <select 
                value={selectedSawnId} 
                onChange={e => setSelectedSawnId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                required
              >
                <option value="" disabled>-- Choose sawn timber --</option>
                {availableSawn.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.species} {s.size} ({s.piecesAvailable} pcs left) @ ${s.costPerPiece.toFixed(2)}/pc
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Frame Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
              >
                {state.frameTypes.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pieces Req.</label>
                <input 
                  type="number" 
                  value={piecesRequired} 
                  onChange={e => setPiecesRequired(parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Labor Cost ($)</label>
                <input 
                  type="number" 
                  value={laborCost} 
                  onChange={e => setLaborCost(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                />
              </div>
            </div>

            {selectedSawnId && (() => {
              const sb = state.sawnTimber.find(s => s.id === selectedSawnId)!;
              const materialCost = sb.costPerPiece * piecesRequired;
              return (
                <div className="bg-slate-100 p-3 rounded border border-slate-200 text-xs mt-2">
                  Material Cost: <span className="font-semibold">${materialCost.toFixed(2)}</span><br/>
                  Total Cost (BOM + Labor): <span className="font-semibold text-slate-900">${(materialCost + laborCost).toFixed(2)}</span>
                </div>
              );
            })()}

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Stage 3 Photo Evidence (Stacked / Profile)</label>
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded p-4 flex flex-col items-center justify-center text-slate-500 transition-colors">
                  <Camera size={20} className="mb-1" />
                  <span className="text-xs">Upload Finish Pics</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto p-1 bg-slate-50 border border-slate-200 rounded">
                    {images.map((img, idx) => (
                      <div key={idx} className="h-16 w-16 bg-cover flex-shrink-0 rounded shadow-sm border border-slate-200" style={{ backgroundImage: `url(${img})` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={!selectedSawnId} className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50">
              <Hammer size={16} /> Assemble Frame
            </button>
          </form>
        </div>

        {/* Existing Frames Inventory */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Custom Frames Inventory</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4 border-b">Frame ID / Date</th>
                <th className="p-4 border-b">Type / Species</th>
                <th className="p-4 border-b">Material Source</th>
                <th className="p-4 border-b">Total Cost Floor</th>
                <th className="p-4 border-b">Status</th>
                <th className="p-4 border-b text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.frames.filter(f => !f.isDeleted).length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No frames assembled yet.</td></tr>
              ) : (
                state.frames.filter(f => !f.isDeleted).map(frame => 
                  editingId === frame.id ? (
                    <tr key={frame.id} className="bg-blue-50/50">
                      <td colSpan={6} className="p-4">
                        <div className="flex flex-wrap gap-4 items-end">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Status</label>
                            <select className="border border-slate-300 rounded p-1 text-sm bg-white" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}>
                              <option value="In Stock">In Stock</option>
                              <option value="Sold">Sold</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Total Cost ($)</label>
                            <input type="number" step="0.01" className="border border-slate-300 rounded p-1 text-sm bg-white w-28" value={editForm.totalCost || 0} onChange={e => setEditForm({...editForm, totalCost: parseFloat(e.target.value)})} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 hover:bg-emerald-700">
                              <Save size={14} /> Save
                            </button>
                            <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 hover:bg-slate-300">
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={frame.id} className="hover:bg-slate-50 group">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{frame.id}</div>
                        <div className="text-xs text-slate-500">{frame.date}</div>
                        {frame.images && frame.images.length > 0 && <div className="text-[10px] mt-1 bg-yellow-100 text-yellow-800 px-1 rounded inline-block">{frame.images.length} photos</div>}
                      </td>
                      <td className="p-4 font-medium">{frame.type} <span className="text-slate-400 block text-xs font-normal">({frame.species})</span></td>
                      <td className="p-4 text-xs font-mono">{frame.piecesUsed} pcs from<br/>{frame.consumedSawnTimberId}</td>
                      <td className="p-4 font-medium text-emerald-600">${frame.totalCost.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${frame.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {frame.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2 h-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(frame)} className="text-slate-400 hover:text-blue-500 p-1" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(frame.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
