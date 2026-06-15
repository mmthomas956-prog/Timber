import React, { useState, useMemo } from 'react';
import { AppState, Log, Species, QualityGrade, CalculationMethod, AuditEntry } from '../types';
import { Plus, Trash2, Camera, Edit2, Save, X } from 'lucide-react';

const CURRENT_USER = 'System-Admin'; // Mock user

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function PurchasesView({ state, setState }: Props) {
  const [species, setSpecies] = useState<Species>('Merbau');
  const [quality, setQuality] = useState<QualityGrade>('Grade A (Premium)');
  const [lengthFeet, setLengthFeet] = useState<number>(20);
  const [girthInches, setGirthInches] = useState<number>(40);
  const [calcMethod, setCalcMethod] = useState<CalculationMethod>('Hoppus');
  const [hoppusBuyingRate, setHoppusBuyingRate] = useState<number>(250);
  const [volumetricDeductionsCFT, setVolumetricDeductionsCFT] = useState<number>(0.5);
  const [batchExtraCosts, setBatchExtraCosts] = useState<number>(1000);
  const [supplier, setSupplier] = useState<string>('Global Timber Co.');
  const [images, setImages] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Log>>({});

  const startEdit = (log: Log) => {
    setEditingId(log.id);
    setEditForm(log);
  };

  const recalculateLot = (lotCodeToUpdate: string, logsToUpdate: Log[]): Log[] => {
    const lotLogs = logsToUpdate.filter(l => l.lotCode === lotCodeToUpdate && !l.isDeleted);
    const totalLotActualVol = lotLogs.reduce((sum, l) => sum + l.actualVolumeCFT, 0);

    return logsToUpdate.map(l => {
      if (l.lotCode !== lotCodeToUpdate || l.isDeleted) return l;
      
      const apportionedExt = totalLotActualVol > 0 ? (l.batchExtraCosts * (l.actualVolumeCFT / totalLotActualVol)) : 0;
      const tVal = l.baseLogCost + apportionedExt;
      const uVol = l.usableVolumeCFT;
      const aRate = uVol > 0 ? (tVal / uVol) : 0;
      
      return {
        ...l,
        apportionedExtraCost: apportionedExt,
        totalLogLandedValue: tVal,
        actualLandedAverageRate: aRate,
        cost: tVal
      } as Log;
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    const targetLog = state.logs.find(l => l.id === editingId);
    if (!targetLog) return;
    
    let updatedLogs = state.logs.map(l => l.id === editingId ? { ...l, ...editForm } as Log : l);
    updatedLogs = recalculateLot(targetLog.lotCode, updatedLogs);
    
    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'EDITED',
      entityId: editingId,
      entityType: 'Log',
      details: `Edited log ${editingId} and recalculated lot apportionments.`
    };
    setState({ ...state, logs: updatedLogs, auditLogs: [auditEntry, ...(state.auditLogs || [])] });
    setEditingId(null);
  };

  // Derived Values
  const { 
    lotCode, 
    primaryApp, 
    hoppusVol, 
    actualVol, 
    usableVol, 
    serialPrefix 
  } = useMemo(() => {
    // 1. Classification Matrix
    const gbhFeet = girthInches / 12;
    let rank = '';
    
    if (quality === 'Grade A (Premium)') rank = 'A';
    else if (quality === 'Grade B (Commercial)') rank = 'B';
    else rank = 'C';

    let cl = '';
    if (gbhFeet > 2.95) cl = '1';
    else if (gbhFeet >= 1.97) cl = '2';
    else cl = '3';

    const lc = `${rank}${cl}`;

    const apps: Record<string, string> = {
      'A1': 'Slicing, veneer, luxury structural timber',
      'A2': 'High-end sawmills, furniture manufacturing',
      'A3': 'High-strength scaffolding, luxury fencing',
      'B1': 'Commercial building construction, packaging',
      'B2': 'Baseline commercial plywood cores, crates',
      'B3': 'Minor curves, small structural poles or thick billets',
      'C1': 'Industrial fiber extraction, chipped pulp, MDF',
      'C2': 'Medium logs with deep hollows, heavy splitting',
      'C3': 'Small-girth crooked branches, heavy knots, waste wood'
    };

    // 2. Volumes
    const hVol = Math.pow(girthInches / 4, 2) * (lengthFeet / 144);
    const aVol = (Math.pow(girthInches, 2) * lengthFeet) / 1809.56;
    const uVol = Math.max(0, aVol - volumetricDeductionsCFT);

    // 3. Serial Prefix
    const spcCode: Record<string, string> = {
      'Teak': 'TEK', 'Merbau': 'MRB', 'Mahogany': 'MHG', 'Pine': 'PIN'
    };

    return {
      lotCode: lc,
      primaryApp: apps[lc] || 'General Utility',
      hoppusVol: hVol,
      actualVol: aVol,
      usableVol: uVol,
      serialPrefix: spcCode[species] || 'UNK'
    };
  }, [species, quality, lengthFeet, girthInches, volumetricDeductionsCFT]);

  const decoratedLogs = state.logs;

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();

    const spcCode: Record<string, string> = {
      'Merbau': 'MRB',
      'Mahogany': 'MHG',
      'Teak': 'TEK',
      'Pine': 'PNE'
    };

    const nSeq = (state.logs.length + 1).toString().padStart(4, '0');
    const newId = `${spcCode[species] || 'UNK'}-${lotCode}-${nSeq}`;
    
    let currentLotTotalVol = 0;
    state.logs.forEach(l => {
      if (l.lotCode === lotCode && !l.isDeleted) {
        currentLotTotalVol += l.actualVolumeCFT || ((Math.pow(l.girthInches, 2) * l.lengthFeet) / 1809.56);
      }
    });

    const priceBand = state.priceListBands?.find(p => p.species === species && girthInches >= p.girthBandMin && girthInches <= p.girthBandMax);
    const stdPrice = priceBand ? priceBand.standardPricePerCFT : undefined;

    const newLog: Log = {
      id: newId,
      date: new Date().toISOString().split('T')[0],
      species,
      quality,
      lengthFeet,
      girthInches,
      hoppusBuyingRate,
      volumetricDeductionsCFT,
      batchExtraCosts,
      calcMethod,
      hoppusVolumeCFT: parseFloat(hoppusVol.toFixed(2)),
      actualVolumeCFT: parseFloat(actualVol.toFixed(2)),
      purchaseAllowanceCFT: volumetricDeductionsCFT,
      usableVolumeCFT: parseFloat(usableVol.toFixed(2)),
      cost: 0, 
      baseLogCost: hoppusVol * (hoppusBuyingRate || 0),
      apportionedExtraCost: 0,
      totalLogLandedValue: 0,
      actualLandedAverageRate: 0,
      standardBaselinePriceRef: stdPrice,
      status: 'In Yard',
      supplier,
      lotCode,
      primaryApplication: primaryApp,
      images,
      isDeleted: false
    };

    const updatedLogsWithNew = [...state.logs, newLog];
    const finalLogs = recalculateLot(lotCode, updatedLogsWithNew).sort((a,b) => b.id.localeCompare(a.id));

    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'CREATED',
      entityId: newId,
      entityType: 'Log',
      details: `Purchased Log ${newId} (${species}). Evaluated as Lot ${lotCode}. Usable Vol: ${usableVol.toFixed(2)} CFT`
    };

    setState({ ...state, logs: finalLogs, auditLogs: [auditEntry, ...(state.auditLogs || [])] });
    setImages([]);
  };

  const handleDelete = (id: string) => {
    const targetLog = state.logs.find(l => l.id === id);
    if (!targetLog) return;
    
    let updatedLogs = state.logs.map(l => l.id === id ? { ...l, isDeleted: true } : l);
    updatedLogs = recalculateLot(targetLog.lotCode, updatedLogs);

    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'DELETED',
      entityId: id,
      entityType: 'Log',
      details: `Soft deleted log ${id} and reapportioned lot costs.`
    };
    setState({ ...state, logs: updatedLogs, auditLogs: [auditEntry, ...(state.auditLogs || [])] });
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
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Procurement & Purchases</h2>
          <p className="text-slate-500 text-sm mt-1">Record, classify, and serialize incoming raw logs based on exact dimensions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-900 mb-4 pb-2 border-b">New Log Intake & Classification</h3>
          <form onSubmit={handleAddPurchase} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Supplier</label>
                <select 
                  value={supplier} 
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                >
                  <option value="Global Timber Co.">Global Timber Co.</option>
                  <option value="Rainforest Logging Ltd.">Rainforest Logging Ltd.</option>
                  <option value="Pacific Woods">Pacific Woods</option>
                  <option value="Local Mill">Local Mill</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Species</label>
                <select 
                  value={species} 
                  onChange={(e) => setSpecies(e.target.value as Species)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                >
                  {state.speciesList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quality Grade Evaluated</label>
              <select 
                value={quality} 
                onChange={e => setQuality(e.target.value as QualityGrade)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                required
              >
                <option value="Grade A (Premium)">Grade A (Premium)</option>
                <option value="Grade B (Commercial)">Grade B (Commercial)</option>
                <option value="Grade C (Defective)">Grade C (Defective)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Length (Feet)</label>
                <input 
                  type="number" step="any"
                  value={lengthFeet} 
                  onChange={e => setLengthFeet(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mid-Girth (Inches)</label>
                <input 
                  type="number" step="any"
                  value={girthInches} 
                  onChange={e => setGirthInches(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
              <div className="flex justify-between items-center text-blue-900 border-b border-blue-200 pb-2 mb-2">
                <span className="font-semibold">Classification:</span>
                <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-mono font-bold text-xs">Lot {lotCode}</span>
              </div>
              <div className="text-blue-800 text-xs">Primary Use: <span className="font-medium">{primaryApp}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hoppus Buying Rate ($/CFT)</label>
                <input 
                  type="number" step="any"
                  value={hoppusBuyingRate} 
                  onChange={e => setHoppusBuyingRate(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Basis</label>
                <select 
                  value={calcMethod} 
                  onChange={e => setCalcMethod(e.target.value as CalculationMethod)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                >
                  <option value="Hoppus">Hoppus Volume</option>
                  <option value="Actual">Actual Volume</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 flex justify-between">
                  <span>Deductions (Bark/Taper) CFT</span>
                  <span className="text-orange-600 font-bold">-{volumetricDeductionsCFT}</span>
                </label>
                <input 
                  type="number" step="any"
                  value={volumetricDeductionsCFT} 
                  onChange={e => setVolumetricDeductionsCFT(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-orange-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Lot Extra Costs ($)</label>
                <input 
                  type="number" step="any"
                  value={batchExtraCosts} 
                  onChange={e => setBatchExtraCosts(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-100 p-3 rounded border border-slate-200 text-xs grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-slate-500 mb-1">Hoppus <span className="text-[10px] block opacity-75">(1/4 Girth)</span></div>
                <div className="font-bold text-slate-900">{hoppusVol.toFixed(2)}</div>
              </div>
              <div className="border-l border-slate-200">
                <div className="text-slate-500 mb-1">Actual <span className="text-[10px] block opacity-75">(Geometric)</span></div>
                <div className="font-bold text-slate-900">{actualVol.toFixed(2)}</div>
              </div>
              <div className="border-l border-emerald-200 bg-emerald-50 rounded -m-1 p-1">
                <div className="text-emerald-700 mb-1">Ledger Qty <span className="text-[10px] block opacity-75">(Usable)</span></div>
                <div className="font-bold text-emerald-800">{usableVol.toFixed(2)}</div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Stage 1 Photo Evidence (End-cuts, bark)</label>
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded p-4 flex flex-col items-center justify-center text-slate-500 transition-colors">
                  <Camera size={20} className="mb-1" />
                  <span className="text-xs">Upload Images</span>
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

            <button type="submit" className="w-full bg-slate-900 text-white rounded-lg py-3 font-medium flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors">
              <Plus size={16} /> Enter to Yard as <span className="font-mono tracking-wider bg-white/20 px-2 rounded">{serialPrefix}-{lotCode}-X</span>
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Yard Log Inventory Ledger</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4 border-b">Serial Tag</th>
                <th className="p-4 border-b">Species / Supplier</th>
                <th className="p-4 border-b">Class</th>
                <th className="p-4 border-b">Usable Vol</th>
                <th className="p-4 border-b">Valuation</th>
                <th className="p-4 border-b text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {decoratedLogs.filter(l => !l.isDeleted).length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No logs purchased yet.</td></tr>
              ) : (
                decoratedLogs.filter(l => !l.isDeleted).map(log => 
                  editingId === log.id ? (
                    <tr key={log.id} className="bg-blue-50/50">
                      <td colSpan={6} className="p-4">
                        <div className="flex flex-wrap gap-4 items-end">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Species</label>
                            <select className="border border-slate-300 rounded p-1 text-sm bg-white" value={editForm.species as string} onChange={e => setEditForm({...editForm, species: e.target.value as Species})}>
                              {state.speciesList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Usable Vol (CFT)</label>
                            <input type="number" step="0.01" className="border border-slate-300 rounded p-1 text-sm bg-white w-24" value={editForm.usableVolumeCFT || 0} onChange={e => setEditForm({...editForm, usableVolumeCFT: parseFloat(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Cost ($)</label>
                            <input type="number" step="0.01" className="border border-slate-300 rounded p-1 text-sm bg-white w-24" value={editForm.cost || 0} onChange={e => setEditForm({...editForm, cost: parseFloat(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Status</label>
                            <select className="border border-slate-300 rounded p-1 text-sm bg-white" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}>
                              <option value="In Yard">In Yard</option>
                              <option value="Converted">Converted</option>
                            </select>
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
                    <tr key={log.id} className="hover:bg-slate-50 group">
                      <td className="p-4">
                        <div className="font-mono font-bold text-blue-700 tracking-wider text-xs">{log.id}</div>
                        <div className="text-xs text-slate-400 mt-1">{log.date}</div>
                        {log.images && log.images.length > 0 && <div className="text-[10px] mt-1 bg-yellow-100 text-yellow-800 px-1 rounded inline-block">{log.images.length} photos</div>}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{log.species}</div>
                        <div className="text-xs text-slate-500 mt-1">{log.supplier}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{log.lotCode}</div>
                        <div className="text-[10px] text-slate-400">{log.calcMethod} Paid</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{log.usableVolumeCFT} cft</div>
                        <div className="text-xs text-orange-500 mt-1">-{log.purchaseAllowanceCFT} loss</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-emerald-600">${log.cost.toLocaleString()}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${log.status === 'In Yard' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2 h-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(log)} className="text-slate-400 hover:text-blue-500 p-1" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(log.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete">
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
