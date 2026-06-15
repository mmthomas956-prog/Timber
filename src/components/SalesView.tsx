import React, { useState } from 'react';
import { AppState, SaleRecord, AuditEntry } from '../types';
import { Banknote } from 'lucide-react';

const CURRENT_USER = 'System-Admin';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function SalesView({ state, setState }: Props) {
  const [saleType, setSaleType] = useState<'Sawn Timber' | 'Frame'>('Frame');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantityToSell, setQuantityToSell] = useState<number>(1);
  const [revenue, setRevenue] = useState<number>(1000);
  const [salesAgent, setSalesAgent] = useState<string>('Alice Johnson');

  const availableFrames = state.frames.filter(f => f.status === 'In Stock' && !f.isDeleted);
  const availableSawn = state.sawnTimber.filter(s => s.piecesAvailable > 0 && !s.isDeleted);

  const handleSale = (e: React.FormEvent) => {
    e.preventDefault();

    let costBasis = 0;
    let actualQuantitySold = quantityToSell;

    if (saleType === 'Frame') {
      const frame = state.frames.find(f => f.id === selectedItemId);
      if (!frame) return;
      costBasis = frame.totalCost;
      actualQuantitySold = 1; // 1 frame per ID exactly

      const updatedFrames = state.frames.map(f =>
        f.id === frame.id ? { ...f, status: 'Sold' as const } : f
      );

      const newSaleId = `SALE-${Math.floor(Math.random() * 10000)}`;
      const entry: SaleRecord = {
        id: newSaleId,
        date: new Date().toISOString().split('T')[0],
        itemType: 'Frame',
        itemRefId: frame.id,
        quantitySold: 1,
        revenue,
        costBasis,
        salesAgent,
        isDeleted: false
      };
      
      const auditEntry: AuditEntry = {
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: CURRENT_USER,
        action: 'SOLD',
        entityId: newSaleId,
        entityType: 'Sale',
        details: `Sold Frame ${frame.id} for $${revenue}`
      };

      setState(prev => ({
        ...prev,
        frames: updatedFrames,
        sales: [entry, ...prev.sales],
        auditLogs: [auditEntry, ...(prev.auditLogs || [])]
      }));

    } else {
      const sawn = state.sawnTimber.find(s => s.id === selectedItemId);
      if (!sawn) return;
      
      if (sawn.piecesAvailable < quantityToSell) {
        alert("Not enough pieces in this batch!");
        return;
      }
      
      costBasis = sawn.costPerPiece * quantityToSell;

      const updatedSawn = state.sawnTimber.map(s =>
        s.id === sawn.id ? { ...s, piecesAvailable: s.piecesAvailable - quantityToSell } : s
      );

      const newSaleId = `SALE-${Math.floor(Math.random() * 10000)}`;
      const entry: SaleRecord = {
        id: newSaleId,
        date: new Date().toISOString().split('T')[0],
        itemType: 'Sawn Timber',
        itemRefId: sawn.id,
        quantitySold: quantityToSell,
        revenue,
        costBasis,
        salesAgent,
        isDeleted: false
      };

      const auditEntry: AuditEntry = {
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: CURRENT_USER,
        action: 'SOLD',
        entityId: newSaleId,
        entityType: 'Sale',
        details: `Sold ${quantityToSell}x ${sawn.species} boards for $${revenue}`
      };

      setState(prev => ({
        ...prev,
        sawnTimber: updatedSawn,
        sales: [entry, ...prev.sales],
        auditLogs: [auditEntry, ...(prev.auditLogs || [])]
      }));
    }

    setSelectedItemId('');
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Retail & Commercial Sales</h2>
        <p className="text-slate-500 text-sm mt-1">Execute sales of Sawn Timber pieces or fully assembled Frames. Logs revenue instantly into the dashboard.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sales Terminal */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-900 mb-4 pb-2 border-b">Register Sale</h3>
          <form onSubmit={handleSale} className="space-y-4">
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                type="button"
                onClick={() => { setSaleType('Frame'); setSelectedItemId(''); }}
                className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition-colors ${saleType === 'Frame' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sell Frame
              </button>
              <button 
                type="button"
                onClick={() => { setSaleType('Sawn Timber'); setSelectedItemId(''); }}
                className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition-colors ${saleType === 'Sawn Timber' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sell Boards
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Item from Inventory</label>
              <select 
                value={selectedItemId} 
                onChange={e => setSelectedItemId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                required
              >
                <option value="" disabled>-- Choose {saleType} --</option>
                {saleType === 'Frame' && availableFrames.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.type} ({f.species}) - Cost Basis: ${f.totalCost.toFixed(2)}
                  </option>
                ))}
                {saleType === 'Sawn Timber' && availableSawn.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.species} {s.size} ({s.piecesAvailable} pcs) - Cost: ${s.costPerPiece.toFixed(2)}/pc
                  </option>
                ))}
              </select>
            </div>

            {saleType === 'Sawn Timber' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity (Pieces)</label>
                <input 
                  type="number" 
                  value={quantityToSell} 
                  onChange={e => setQuantityToSell(parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Total Sales Revenue ($)</label>
              <input 
                type="number" 
                value={revenue} 
                onChange={e => setRevenue(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-emerald-50 text-emerald-900 border-emerald-200"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sales Agent</label>
              <select 
                value={salesAgent} 
                onChange={e => setSalesAgent(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50"
              >
                <option value="Alice Johnson">Alice Johnson</option>
                <option value="Bob Smith">Bob Smith</option>
                <option value="Charlie Davis">Charlie Davis</option>
              </select>
            </div>

            {selectedItemId && (() => {
              const costBasis = saleType === 'Frame' 
                ? state.frames.find(f => f.id === selectedItemId)?.totalCost || 0
                : (state.sawnTimber.find(s => s.id === selectedItemId)?.costPerPiece || 0) * quantityToSell;
              
              const profit = revenue - costBasis;
              return (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                  Estimated Cost Basis: <span className="font-semibold">${costBasis.toFixed(2)}</span>
                  <div className={`mt-1 font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Est. Gross Profit: ${profit.toFixed(2)}
                  </div>
                </div>
              );
            })()}

            <button type="submit" disabled={!selectedItemId} className="w-full bg-emerald-600 text-white rounded-lg py-2.5 font-medium flex justify-center items-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50">
              <Banknote size={16} /> Confirm Sale
            </button>
          </form>
        </div>

        {/* Ledger */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Sales Ledger & Revenue</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4 border-b">Receipt ID / Date</th>
                <th className="p-4 border-b">Item Sold</th>
                <th className="p-4 border-b">Sales Agent</th>
                <th className="p-4 border-b">Revenue</th>
                <th className="p-4 border-b">Cost Basis</th>
                <th className="p-4 border-b">Gross Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.sales.filter(s => !s.isDeleted).length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No sales recorded yet.</td></tr>
              ) : (
                state.sales.filter(s => !s.isDeleted).map(sale => {
                  const profit = sale.revenue - sale.costBasis;
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{sale.id}</div>
                        <div className="text-xs text-slate-500">{sale.date}</div>
                      </td>
                      <td className="p-4">
                        <div>{sale.itemType}</div>
                        <div className="text-xs text-slate-500 font-mono">Ref: {sale.itemRefId} (Qty: {sale.quantitySold})</div>
                      </td>
                      <td className="p-4 text-slate-700 font-medium">{sale.salesAgent}</td>
                      <td className="p-4 font-bold text-emerald-600">${sale.revenue.toLocaleString()}</td>
                      <td className="p-4 text-slate-600">${sale.costBasis.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
