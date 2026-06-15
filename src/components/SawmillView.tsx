import React, { useState } from 'react';
import { AppState, SawnTimber, Frame, AuditEntry } from '../types';
import { Scissors, Plus, Trash, Camera, Edit2, Save, X, Trash2 } from 'lucide-react';

const CURRENT_USER = 'System-Admin';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

type OutputItem = {
  id: string;
  category: 'Sawn' | 'Frame';
  profile: string; // size for sawn, type for frame
  pieces: number;
  volumePerPiece: number; // For sawn
};

export default function SawmillView({ state, setState }: Props) {
  const [selectedLogId, setSelectedLogId] = useState<string>('');
  
  // Costs
  const [conversionAllowance, setConversionAllowance] = useState<number>(0);
  const [millingCharges, setMillingCharges] = useState<number>(0);
  const [peelingCharges, setPeelingCharges] = useState<number>(0);
  const [laborCosts, setLaborCosts] = useState<number>(0);

  // Outputs
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  
  // Consumption Engine
  const [consumptionType, setConsumptionType] = useState<'Full' | 'Partial'>('Full');
  const [partialVolumeUsedCFT, setPartialVolumeUsedCFT] = useState<number>(0);
  
  // Temp Output Form
  const [outCat, setOutCat] = useState<'Sawn'|'Frame'>('Sawn');
  const [outProf, setOutProf] = useState<string>('3x4');
  const [outPcs, setOutPcs] = useState<number>(10);
  const [outVol, setOutVol] = useState<number>(1.5);
  const [images, setImages] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SawnTimber>>({});

  const startEdit = (st: SawnTimber) => {
    setEditingId(st.id);
    setEditForm(st);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const updated = state.sawnTimber.map(s => s.id === editingId ? { ...s, ...editForm } as SawnTimber : s);
    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'EDITED',
      entityId: editingId,
      entityType: 'SawnTimber',
      details: `Edited sawn timber ${editingId}`
    };
    setState({ ...state, sawnTimber: updated, auditLogs: [auditEntry, ...(state.auditLogs || [])] });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'DELETED',
      entityId: id,
      entityType: 'SawnTimber',
      details: `Soft deleted sawn timber ${id}`
    };
    const updated = state.sawnTimber.map(s => s.id === id ? { ...s, isDeleted: true } : s);
    setState({ ...state, sawnTimber: updated, auditLogs: [auditEntry, ...(state.auditLogs || [])] });
  };

  const inYardLogs = state.logs.filter(l => l.status === 'In Yard' && !l.isDeleted);

  const handleAddOutput = () => {
    setOutputs([
      ...outputs, 
      { id: Math.random().toString(), category: outCat, profile: outProf, pieces: outPcs, volumePerPiece: outVol }
    ]);
  };

  const handleRemoveOutput = (id: string) => {
    setOutputs(outputs.filter(o => o.id !== id));
  };

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    const targetLog = state.logs.find(l => l.id === selectedLogId);
    if (!targetLog) return;
    if (outputs.length === 0) {
      alert("Please add at least one output item.");
      return;
    }

    const actualMaterialConsumed = consumptionType === 'Full' ? targetLog.usableVolumeCFT : partialVolumeUsedCFT;
    
    if (consumptionType === 'Partial' && (actualMaterialConsumed <= 0 || actualMaterialConsumed > targetLog.usableVolumeCFT)) {
      alert("Partial volume used must be greater than 0 and less than or equal to the log's usable volume.");
      return;
    }

    const totalOutputVolume = outputs.reduce((sum, o) => sum + (o.pieces * o.volumePerPiece), 0);
    const actualWorkingVolume = actualMaterialConsumed - conversionAllowance;
    const wastage = actualWorkingVolume - totalOutputVolume;
    
    if (wastage < 0) {
      alert("Output volume + allowances cannot exceed the actual material consumed!");
      return;
    }

    // Apportion input cost if partial
    const consumedProportion = consumptionType === 'Full' ? 1 : (actualMaterialConsumed / targetLog.usableVolumeCFT);
    const consumedCost = targetLog.cost * consumedProportion;
    const cumulativeCost = consumedCost + millingCharges + peelingCharges + laborCosts;
    
    // Efficiency tracking based on actual material consumed
    const actualYieldPct = (totalOutputVolume / actualMaterialConsumed) * 100;
    
    // Find expected yield via standard matrix
    const yieldBand = state.yieldStandards?.find(y => y.species === targetLog.species && targetLog.girthInches >= y.girthBandMin && targetLog.girthInches <= y.girthBandMax);
    const expectedYieldPct = yieldBand ? yieldBand.expectedYieldPct : undefined;

    // Dynamic Apportionment Engine
    const newSawn: SawnTimber[] = [];
    const newFrames: Frame[] = [];

    outputs.forEach((out, idx) => {
      const outVolTotal = out.pieces * out.volumePerPiece;
      const proportion = outVolTotal / totalOutputVolume;
      const apportionedTotalCost = cumulativeCost * proportion;
      const costPerPiece = apportionedTotalCost / out.pieces;

      if (out.category === 'Sawn') {
        newSawn.push({
          id: `SAWN-${targetLog.id}-${idx}-${Date.now().toString().slice(-4)}`,
          parentLogId: targetLog.id,
          date: new Date().toISOString().split('T')[0],
          species: targetLog.species,
          size: out.profile,
          piecesInitial: out.pieces,
          piecesAvailable: out.pieces,
          volumeCFTPerPiece: out.volumePerPiece,
          costPerPiece: parseFloat(costPerPiece.toFixed(2)),
          conversionStandardYieldPct: expectedYieldPct,
          conversionActualYieldPct: parseFloat(actualYieldPct.toFixed(1)),
          isDeleted: false
        });
      } else {
        // Produced directly from log
        for (let i = 0; i < out.pieces; i++) {
          newFrames.push({
            id: `FRAME-${targetLog.id}-${idx}-${i}-${Date.now().toString().slice(-4)}`,
            date: new Date().toISOString().split('T')[0],
            type: out.profile as any,
            species: targetLog.species,
            parentLogId: targetLog.id,
            piecesUsed: 0,
            totalCost: parseFloat(costPerPiece.toFixed(2)),
            status: 'In Stock',
            isDeleted: false
          });
        }
      }
    });

    const remainingProportion = 1 - consumedProportion;
    const updatedLogs = state.logs.map(l => {
      if (l.id === targetLog.id) {
        if (consumptionType === 'Full') {
           return { ...l, status: 'Converted' as const, conversionImages: images, usableVolumeCFT: 0, actualVolumeCFT: 0, hoppusVolumeCFT: 0 };
        } else {
           return {
             ...l,
             actualVolumeCFT: parseFloat((l.actualVolumeCFT * remainingProportion).toFixed(2)),
             usableVolumeCFT: parseFloat((l.usableVolumeCFT * remainingProportion).toFixed(2)),
             purchaseAllowanceCFT: parseFloat((l.purchaseAllowanceCFT * remainingProportion).toFixed(2)),
             hoppusVolumeCFT: parseFloat((l.hoppusVolumeCFT * remainingProportion).toFixed(2)),
             baseLogCost: parseFloat((l.baseLogCost * remainingProportion).toFixed(2)),
             apportionedExtraCost: parseFloat((l.apportionedExtraCost * remainingProportion).toFixed(2)),
             totalLogLandedValue: parseFloat((l.totalLogLandedValue * remainingProportion).toFixed(2)),
             cost: parseFloat((l.cost * remainingProportion).toFixed(2))
           };
        }
      }
      return l;
    });

    const auditEntry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: CURRENT_USER,
      action: 'CONVERTED',
      entityId: targetLog.id,
      entityType: 'Log',
      details: `Converted ${consumptionType === 'Full' ? 'Full Log' : 'Partial Log'} ${targetLog.id} into ${outputs.length} batches. Act Yield: ${actualYieldPct.toFixed(1)}%. Wastage: ${(wastage + conversionAllowance).toFixed(1)} CFT`
    };

    setState({
      ...state,
      logs: updatedLogs,
      sawnTimber: [...newSawn, ...state.sawnTimber],
      frames: [...newFrames, ...state.frames],
      totalWastageCFT: state.totalWastageCFT + wastage + conversionAllowance,
      auditLogs: [auditEntry, ...(state.auditLogs || [])]
    });

    setSelectedLogId('');
    setOutputs([]);
    setMillingCharges(0);
    setPeelingCharges(0);
    setLaborCosts(0);
    setConversionAllowance(0);
    setPartialVolumeUsedCFT(0);
    setConsumptionType('Full');
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

  const targetLog = state.logs.find(l => l.id === selectedLogId);
  const totalOutVol = outputs.reduce((sum, o) => sum + (o.pieces * o.volumePerPiece), 0);
  const actualMaterialConsumedForUI = consumptionType === 'Full' ? (targetLog?.usableVolumeCFT || 0) : partialVolumeUsedCFT;
  const consumedProportionForUI = consumptionType === 'Full' ? 1 : (actualMaterialConsumedForUI / (targetLog?.usableVolumeCFT || 1));
  const consumedCostForUI = (targetLog?.cost || 0) * consumedProportionForUI;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Sawmill Conversion & Apportionment</h2>
        <p className="text-slate-500 text-sm mt-1">Split single logs into multiple profiles. Allocates material, milling, and labor costs proportionally to actual volumes.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Converter Form */}
        <div className="xl:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 pb-2 border-b">Execute Milling Run</h3>
          <form onSubmit={handleConvert} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Yard Log</label>
              <select 
                value={selectedLogId} 
                onChange={e => setSelectedLogId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                required
              >
                <option value="" disabled>-- Choose a log --</option>
                {inYardLogs.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.id} - {l.species} ({l.usableVolumeCFT} Usable CFT)
                  </option>
                ))}
              </select>
            </div>
            
            {targetLog && (
              <div className="bg-blue-50 text-blue-900 p-3 rounded border border-blue-100 text-xs flex justify-between">
                <div>Usable Vol: <span className="font-bold">{targetLog.usableVolumeCFT} CFT</span></div>
                <div>Log Cost: <span className="font-bold border-b border-blue-300">${targetLog.cost.toLocaleString()}</span></div>
              </div>
            )}

            <div className="flex flex-col gap-3 py-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase">Log Consumption Type</label>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="radio" name="consumptionType" checked={consumptionType === 'Full'} onChange={() => setConsumptionType('Full')} className="text-blue-600 focus:ring-blue-500" />
                  Full Log Used
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="radio" name="consumptionType" checked={consumptionType === 'Partial'} onChange={() => setConsumptionType('Partial')} className="text-blue-600 focus:ring-blue-500" />
                  Partial Log Used
                </label>
              </div>
              {consumptionType === 'Partial' && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Actual Log Volume Used (CFT)</label>
                  <input 
                    type="number" step="any" value={partialVolumeUsedCFT || ''} 
                    onChange={e => setPartialVolumeUsedCFT(parseFloat(e.target.value) || 0)}
                    className="w-full border border-blue-300 rounded-lg p-2 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 5.5"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-b border-slate-100 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Shrink/Handling Loss (CFT)</label>
                <input 
                  type="number" step="any" value={conversionAllowance} 
                  onChange={e => setConversionAllowance(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-orange-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Milling Charges ($)</label>
                <input 
                  type="number" step="any" value={millingCharges} 
                  onChange={e => setMillingCharges(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Peeling Charges ($)</label>
                <input 
                  type="number" step="any" value={peelingCharges} 
                  onChange={e => setPeelingCharges(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Labor Costs ($)</label>
                <input 
                  type="number" step="any" value={ laborCosts} 
                  onChange={e => setLaborCosts(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                />
              </div>
            </div>

            {/* Output Item Builder */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Add Production Output</h4>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select value={outCat} onChange={e => {setOutCat(e.target.value as any); setOutProf('');}} className="border border-slate-300 rounded p-1.5 text-xs">
                  <option value="Sawn">Sawn Planks</option>
                  <option value="Frame">Direct Frame</option>
                </select>
                {outCat === 'Sawn' ? (
                  <>
                    <input list="standardSizes" type="text" placeholder="Profile (e.g. 3x4)" value={outProf} onChange={e => setOutProf(e.target.value)} className="border border-slate-300 rounded p-1.5 text-xs" />
                    <datalist id="standardSizes">
                      {state.sizeIntelligence.map(s => <option key={s.sizeName} value={s.sizeName} />)}
                    </datalist>
                  </>
                ) : (
                  <select value={outProf} onChange={e => setOutProf(e.target.value)} className="border border-slate-300 rounded p-1.5 text-xs">
                    <option value="" disabled>--Select Frame Type--</option>
                    {state.frameTypes.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="flex flex-col">
                   <span className="text-[10px] text-slate-500 uppercase font-semibold">Pieces</span>
                   <input type="number" min="1" value={outPcs} onChange={e => setOutPcs(parseInt(e.target.value)||1)} className="border border-slate-300 rounded p-1 text-sm bg-white" />
                </div>
                <div className="flex flex-col col-span-2">
                   <span className="text-[10px] text-slate-500 uppercase font-semibold">CFT / Piece</span>
                   <input type="number" step="any" value={outVol} onChange={e => setOutVol(parseFloat(e.target.value)||0)} className="border border-slate-300 rounded p-1 text-sm bg-white" />
                </div>
              </div>
              <button type="button" onClick={handleAddOutput} className="w-full bg-blue-100 text-blue-700 font-semibold py-1.5 rounded text-xs hover:bg-blue-200">
                + Append Output
              </button>
            </div>

            {/* Staged Outputs */}
            {outputs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase">Staged For Apportionment</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {outputs.map((o) => (
                    <div key={o.id} className="flex justify-between items-center text-xs bg-white border border-slate-200 p-2 rounded">
                      <div>
                        <span className="font-bold text-slate-700">{o.pieces}x {o.category} ({o.profile})</span>
                        <div className="text-slate-500">{(o.pieces * o.volumePerPiece).toFixed(2)} total CFT</div>
                      </div>
                      <button type="button" onClick={() => handleRemoveOutput(o.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {targetLog && (
              <div className="bg-slate-100 p-3 rounded border border-slate-200 text-xs">
                 <div className="flex justify-between"><span>Cumulative Costs (Apportioned):</span> <span className="font-bold">${(consumedCostForUI + millingCharges + peelingCharges + laborCosts).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                 <div className="flex justify-between mt-1"><span>Target Output Volume:</span> <span className="font-bold">{totalOutVol.toFixed(2)} CFT</span></div>
                 <div className="flex justify-between mt-1 text-orange-600"><span>Derived Wastage/Loss:</span> <span className="font-bold">{(actualMaterialConsumedForUI - conversionAllowance - totalOutVol).toFixed(2)} CFT</span></div>
              </div>
            )}
            
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Stage 2 Photo Evidence (Internal Grain)</label>
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded p-4 flex flex-col items-center justify-center text-slate-500 transition-colors">
                  <Camera size={20} className="mb-1" />
                  <span className="text-xs">Upload Conversion Pics</span>
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

            <button type="submit" disabled={!selectedLogId || outputs.length === 0} className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium flex justify-center items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50 mt-4">
              <Scissors size={16} /> Process & Apportion
            </button>
          </form>
        </div>

        {/* Existing Sawn Inventory */}
        <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Current Sawn Timber Inventory</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4 border-b">Batch ID</th>
                <th className="p-4 border-b">Species / Size</th>
                <th className="p-4 border-b">Available</th>
                <th className="p-4 border-b">Apportioned Cost / Pc</th>
                <th className="p-4 border-b text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.sawnTimber.filter(st => !st.isDeleted).length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No sawn inventory available.</td></tr>
              ) : (
                state.sawnTimber.filter(st => !st.isDeleted).map(st => 
                  editingId === st.id ? (
                    <tr key={st.id} className="bg-blue-50/50">
                      <td colSpan={5} className="p-4">
                        <div className="flex flex-wrap gap-4 items-end">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Pcs Available</label>
                            <input type="number" className="border border-slate-300 rounded p-1 text-sm bg-white w-24" value={editForm.piecesAvailable || 0} onChange={e => setEditForm({...editForm, piecesAvailable: parseInt(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Vol/Piece (CFT)</label>
                            <input type="number" step="0.01" className="border border-slate-300 rounded p-1 text-sm bg-white w-24" value={editForm.volumeCFTPerPiece || 0} onChange={e => setEditForm({...editForm, volumeCFTPerPiece: parseFloat(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Cost/Piece ($)</label>
                            <input type="number" step="0.01" className="border border-slate-300 rounded p-1 text-sm bg-white w-24" value={editForm.costPerPiece || 0} onChange={e => setEditForm({...editForm, costPerPiece: parseFloat(e.target.value)})} />
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
                    <tr key={st.id} className="hover:bg-slate-50 group">
                      <td className="p-4">
                        <div className="font-mono text-xs font-bold text-slate-900">{st.id}</div>
                        <div className="text-[10px] text-slate-500">Log: {st.parentLogId}</div>
                      </td>
                      <td className="p-4 font-medium">{st.species} <span className="text-slate-400 ml-1">({st.size})</span></td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900">{st.piecesAvailable}</span> / {st.piecesInitial} pcs
                        <div className="text-[10px] text-slate-400">Vol: {(st.volumeCFTPerPiece * st.piecesAvailable).toFixed(2)} CFT</div>
                      </td>
                      <td className="p-4 font-medium text-emerald-600">${st.costPerPiece.toFixed(2)}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-2 h-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(st)} className="text-slate-400 hover:text-blue-500 p-1" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(st.id)} className="text-slate-400 hover:text-red-500 p-1" title="Delete">
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
