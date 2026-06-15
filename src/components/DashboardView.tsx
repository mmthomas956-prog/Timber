import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { TrendingUp, Layers, Trash2, Factory, User, MessageSquareHeart, AlertTriangle, Search, Bot, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DashboardView({ state }: { state: AppState }) {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [selectedAgent, setSelectedAgent] = useState<string>('All');
  const [chatInput, setChatInput] = useState<string>('');

  const {
    supplierList,
    agentList,
    supplierStats,
    agentStats,
    totalRevenue,
    totalProfit,
    volumeVarianceData,
    priceVarianceData,
    yieldVarianceData,
    categoryYieldData,
    lotCodeYieldData,
    totalWastageCFT,
    logsProcessed,
    valuation
  } = useMemo(() => {
    // 1. Filter sets
    const slist = new Set<string>();
    const alist = new Set<string>();
    state.logs.forEach(l => { if (!l.isDeleted) slist.add(l.supplier); });
    state.sales.forEach(s => { if (!s.isDeleted) alist.add(s.salesAgent); });
    
    // Filtering 
    let filteredLogs = state.logs.filter(l => !l.isDeleted);
    let filteredSales = state.sales.filter(s => !s.isDeleted);

    if (selectedSupplier !== 'All') {
      filteredLogs = filteredLogs.filter(l => l.supplier === selectedSupplier);
      filteredSales = filteredSales.filter(s => {
        let supp = 'Unknown';
        if (s.itemType === 'Sawn Timber') {
          const st = state.sawnTimber.find(t => t.id === s.itemRefId && !t.isDeleted);
          if (st) {
             const log = state.logs.find(l => l.id === st.parentLogId && !l.isDeleted);
             if (log) supp = log.supplier;
          }
        } else {
          const fr = state.frames.find(f => f.id === s.itemRefId && !f.isDeleted);
          if (fr) {
             let log;
             if (fr.parentLogId) {
                log = state.logs.find(l => l.id === fr.parentLogId && !l.isDeleted);
             } else {
                const st = state.sawnTimber.find(t => t.id === fr.consumedSawnTimberId && !t.isDeleted);
                if (st) log = state.logs.find(l => l.id === st.parentLogId && !l.isDeleted);
             }
             if (log) supp = log.supplier;
          }
        }
        return supp === selectedSupplier;
      });
    }

    if (selectedAgent !== 'All') {
      filteredSales = filteredSales.filter(s => s.salesAgent === selectedAgent);
    }

    const tRev = filteredSales.reduce((sum, s) => sum + s.revenue, 0);
    const tCogs = filteredSales.reduce((sum, s) => sum + s.costBasis, 0);
    const tProf = tRev - tCogs;

    const sStats: Record<string, any> = {};
    const aStats: Record<string, any> = {};
    const vvMap: Record<string, any> = {};
    let tWastage = 0;
    
    // Calculate Wastage specifically for filtered logs
    filteredLogs.forEach(l => {
      // Find sawn timber and frames that came directly from this log
      const sawnForLog = state.sawnTimber.filter(st => st.parentLogId === l.id);
      const framesForLog = state.frames.filter(f => f.parentLogId === l.id);
      const totalSVol = sawnForLog.reduce((s, st) => s + (st.piecesInitial * st.volumeCFTPerPiece), 0);
      const outputVol = totalSVol; // (Ignoring frame vol here for simplicity as framing derived directly doesn't have cft stored)
      
      if (l.status === 'Converted') {
        const waste = l.usableVolumeCFT - outputVol; 
        if (waste > 0) tWastage += waste;
      }
    })

    filteredLogs.forEach(l => {
      if (!sStats[l.supplier]) sStats[l.supplier] = { purchasedVol: 0, convertedRawVol: 0, convertedSawnVol: 0, revenue: 0, costBase: 0 };
      sStats[l.supplier].purchasedVol += l.hoppusVolumeCFT;
      
      if (l.status === 'Converted') {
        sStats[l.supplier].convertedRawVol += l.usableVolumeCFT;
        const sawnForLog = state.sawnTimber.filter(st => st.parentLogId === l.id);
        const sVol = sawnForLog.reduce((s, st) => s + (st.piecesInitial * st.volumeCFTPerPiece), 0);
        sStats[l.supplier].convertedSawnVol += sVol;
      }

      // Volume Variance Map (by month)
      const month = l.date.substring(0, 7);
      if (!vvMap[month]) vvMap[month] = { name: month, HoppusPaid: 0, ActualReceived: 0, FinalSawnDelivered: 0 };
      vvMap[month].HoppusPaid += l.hoppusVolumeCFT;
      vvMap[month].ActualReceived += l.actualVolumeCFT; // geometric
      
      const stGroup = state.sawnTimber.filter(s => s.parentLogId === l.id);
      vvMap[month].FinalSawnDelivered += stGroup.reduce((sum, s) => sum + (s.piecesInitial * s.volumeCFTPerPiece), 0);
    });

    const cpMap: Record<string, number> = {};
    const lpMap: Record<string, {rev: number, profit: number}> = {};
    const pvMap: Record<string, { name: string, StdPrice: number, ActualPrice: number, count: number }> = {};
    const yvMap: Record<string, { name: string, StdYield: number, ActualYield: number, count: number }> = {};

    filteredLogs.forEach(l => {
      // Month
      const month = l.date.substring(0, 7);
      
      // Price Variance
      if (!pvMap[month]) pvMap[month] = { name: month, StdPrice: 0, ActualPrice: 0, count: 0 };
      if (l.standardBaselinePriceRef && l.standardBaselinePriceRef > 0) {
        pvMap[month].StdPrice += l.standardBaselinePriceRef;
        pvMap[month].ActualPrice += (l.hoppusBuyingRate || 0); // Using Hoppus basis
        pvMap[month].count += 1;
      }
    });

    state.sawnTimber.forEach(st => {
      if (!st.isDeleted && st.conversionStandardYieldPct && st.conversionStandardYieldPct > 0) {
        // Group by month of the conversion (stored in st.date)
        const month = st.date.substring(0, 7);
        if (!yvMap[month]) yvMap[month] = { name: month, StdYield: 0, ActualYield: 0, count: 0 };
        yvMap[month].StdYield += st.conversionStandardYieldPct;
        yvMap[month].ActualYield += st.conversionActualYieldPct || 0;
        yvMap[month].count += 1;
      }
    });

    filteredSales.forEach(sale => {
      if (!aStats[sale.salesAgent]) aStats[sale.salesAgent] = { volSold: 0, revenue: 0, profit: 0 };
      aStats[sale.salesAgent].revenue += sale.revenue;
      aStats[sale.salesAgent].profit += (sale.revenue - sale.costBasis);

      let saleVol = 0;
      let logProvider = 'Unknown';
      let species = 'Unknown';
      let lotCode = 'Unk';

      if (sale.itemType === 'Sawn Timber') {
        const sawn = state.sawnTimber.find(s => s.id === sale.itemRefId && !s.isDeleted);
        if (sawn) {
           saleVol = sawn.volumeCFTPerPiece * sale.quantitySold;
           species = sawn.species;
           const l = state.logs.find(lg => lg.id === sawn.parentLogId && !lg.isDeleted);
           if (l) { logProvider = l.supplier; lotCode = l.lotCode; }
        }
      } else {
         const frame = state.frames.find(f => f.id === sale.itemRefId && !f.isDeleted);
         if (frame) {
           species = frame.species;
           saleVol = 1.5 * sale.quantitySold; // Approximation
           let log;
           if (frame.parentLogId) {
              log = state.logs.find(lg => lg.id === frame.parentLogId && !lg.isDeleted);
           } else {
              const sawn = state.sawnTimber.find(s => s.id === frame.consumedSawnTimberId && !s.isDeleted);
              if (sawn) {
                 saleVol = sawn.volumeCFTPerPiece * frame.piecesUsed * sale.quantitySold;
                 log = state.logs.find(lg => lg.id === sawn.parentLogId && !lg.isDeleted);
              }
           }
           if (log) { logProvider = log.supplier; lotCode = log.lotCode; }
         }
      }
      
      aStats[sale.salesAgent].volSold += saleVol;

      if (sStats[logProvider]) {
         sStats[logProvider].revenue += sale.revenue;
         sStats[logProvider].costBase += sale.costBasis;
      }

      const profit = sale.revenue - sale.costBasis;
      cpMap[species] = (cpMap[species] || 0) + profit;
      
      if (!lpMap[lotCode]) lpMap[lotCode] = { rev: 0, profit: 0 };
      lpMap[lotCode].rev += sale.revenue;
      lpMap[lotCode].profit += profit;
    });

    const lotCodeMargins = Object.keys(lpMap).map(k => {
       const margin = lpMap[k].rev > 0 ? (lpMap[k].profit / lpMap[k].rev) * 100 : 0;
       return { name: k, margin: parseFloat(margin.toFixed(1)) };
    }).filter(d => !isNaN(d.margin) && (d.margin > 0 || d.name !== 'Unk')).sort((a,b) => b.margin - a.margin);

    const priceVarianceData = Object.values(pvMap).filter(d => d.count > 0).map(d => ({
        name: d.name,
        StandardBaselinePrice: parseFloat((d.StdPrice / d.count).toFixed(2)),
        ActualPurchasePrice: parseFloat((d.ActualPrice / d.count).toFixed(2))
    })).sort((a,b) => a.name.localeCompare(b.name));

    const yieldVarianceData = Object.values(yvMap).filter(d => d.count > 0).map(d => ({
        name: d.name,
        StandardYield: parseFloat((d.StdYield / d.count).toFixed(1)),
        ActualYield: parseFloat((d.ActualYield / d.count).toFixed(1))
    })).sort((a,b) => a.name.localeCompare(b.name));

    const valuation = {
      logs: state.logs.filter(l => !l.isDeleted && l.status === 'In Yard').reduce((acc, l) => acc + (l.cost || 0), 0),
      sawn: state.sawnTimber.filter(s => !s.isDeleted).reduce((acc, s) => acc + ((s.piecesAvailable || 0) * (s.costPerPiece || 0)), 0),
      frames: state.frames.filter(f => !f.isDeleted && f.status === 'In Stock').reduce((acc, f) => acc + (f.totalCost || 0), 0),
    };

    return {
      supplierList: Array.from(slist).sort(),
      agentList: Array.from(alist).sort(),
      supplierStats: sStats,
      agentStats: aStats,
      totalRevenue: tRev,
      totalProfit: tProf,
      volumeVarianceData: Object.values(vvMap).filter((d:any) => d.HoppusPaid !== undefined).sort((a:any, b:any) => a.name.localeCompare(b.name)),
      priceVarianceData,
      yieldVarianceData,
      categoryYieldData: Object.keys(cpMap).map(k => ({ name: k, profit: cpMap[k] })).filter(d => d.profit > 0),
      lotCodeYieldData: lotCodeMargins,
      totalWastageCFT: tWastage,
      logsProcessed: filteredLogs.filter(l => l.status === 'Converted').length,
      valuation
    };
  }, [state, selectedSupplier, selectedAgent]);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  const procurementAlerts = useMemo(() => {
    return Object.entries(supplierStats).filter(([name, stats]: [string, any]) => {
      if (stats.convertedRawVol > 0) {
        return (stats.convertedSawnVol / stats.convertedRawVol) < 0.65;
      }
      return false;
    });
  }, [supplierStats]);

  const matchingSizes = useMemo(() => {
    if (!chatInput.trim()) return [];
    const q = chatInput.toLowerCase();
    return (state.sizeIntelligence || []).filter(s => 
      s.sizeName.toLowerCase().includes(q) || 
      s.marketUseCase.toLowerCase().includes(q) ||
      s.dimensionsMm.toLowerCase().includes(q) ||
      s.durabilityClass.toLowerCase().includes(q)
    );
  }, [chatInput, state.sizeIntelligence]);

  const lowStockAlerts = useMemo(() => {
    const alerts = [];
    
    // Check Sizes
    if (state.sizeIntelligence) {
      state.sizeIntelligence.forEach(st => {
        if (st.minTargetQty && st.minTargetQty > 0) {
          const currentStock = state.sawnTimber.filter(s => !s.isDeleted && s.size === st.sizeName).reduce((acc, curr) => acc + curr.piecesAvailable, 0);
          if (currentStock < st.minTargetQty) {
            alerts.push({
              code: st.sizeName,
              type: 'Sawn Size',
              current: currentStock,
              target: st.minTargetQty,
              shortage: st.minTargetQty - currentStock
            });
          }
        }
      });
    }

    // Check Frames
    if (state.frameTypesConfig) {
      state.frameTypesConfig.forEach(fc => {
        if (fc.minTargetQty && fc.minTargetQty > 0) {
          const currentStock = state.frames.filter(f => !f.isDeleted && f.type === fc.name && f.status === 'In Stock').length;
          if (currentStock < fc.minTargetQty) {
            alerts.push({
              code: fc.name,
              type: 'Frame',
              current: currentStock,
              target: fc.minTargetQty,
              shortage: fc.minTargetQty - currentStock
            });
          }
        }
      });
    }

    return alerts;
  }, [state.sizeIntelligence, state.frameTypesConfig, state.sawnTimber, state.frames]);

  return (
    <div className="space-y-6">

      {/* Dynamic Low Stock Alert System */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-rose-600" size={20} />
            <h2 className="text-lg font-bold text-rose-800">Critical Inventory Shortages</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {lowStockAlerts.map((alert, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-rose-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{alert.type}</span>
                    <h3 className="font-bold text-slate-900 mt-1">{alert.code}</h3>
                  </div>
                  <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded">
                    Short: {alert.shortage}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-slate-500">Current: </span>
                    <span className="font-semibold text-rose-600">{alert.current}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Target: </span>
                    <span className="font-semibold text-slate-700">{alert.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Inventory Valuation (NEW) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 opacity-5 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6 relative z-10">
          <Layers className="text-emerald-400" size={24} />
          Current Inventory Capitalization Analytics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-slate-800/80 border border-slate-700/50 p-5 rounded-xl flex flex-col">
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">Stage 1: Raw Yard Logs</span>
            <span className="text-3xl font-bold text-white">${valuation.logs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-500 text-xs mt-2">Capital locked in unconverted timber.</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/50 p-5 rounded-xl flex flex-col relative">
            <div className="absolute top-1/2 -left-3 -mt-3 w-6 h-6 bg-slate-900 border-2 border-slate-700 rounded-full flex items-center justify-center text-slate-500 z-20">
              <span className="text-[10px]">▶</span>
            </div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">Stage 2: Sawn Timber</span>
            <span className="text-3xl font-bold text-emerald-400">${valuation.sawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-500 text-xs mt-2">Value stored after sawmill conversion.</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/50 p-5 rounded-xl flex flex-col relative">
            <div className="absolute top-1/2 -left-3 -mt-3 w-6 h-6 bg-slate-900 border-2 border-slate-700 rounded-full flex items-center justify-center text-slate-500 z-20">
              <span className="text-[10px]">▶</span>
            </div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">Stage 3: Finished Frames</span>
            <span className="text-3xl font-bold text-blue-400">${valuation.frames.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-500 text-xs mt-2">Value-added finished stock awaiting sale.</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex justify-between items-center relative z-10">
           <span className="text-slate-400 text-sm">Total Current Locked Capital:</span>
           <span className="text-2xl font-bold text-white">${(valuation.logs + valuation.sawn + valuation.frames).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Top Panel: Procurement Insights */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <Sparkles className="text-amber-400" size={24} />
          Procurement Insights
        </h2>
        
        {procurementAlerts.length > 0 ? (
          <div className="space-y-3">
            {procurementAlerts.map(([sName, stats]: [string, any]) => {
              const yieldPct = ((stats.convertedSawnVol / stats.convertedRawVol) * 100).toFixed(1);
              return (
                <div key={sName} className="flex items-start gap-3 bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <AlertTriangle className="text-rose-500 mt-1 shrink-0" size={20} />
                  <div>
                    <div className="text-slate-200 font-medium">{sName} - Yield efficiency is below the 65% benchmark.</div>
                    <div className="text-slate-400 text-sm mt-1">
                      Current yield: <span className="text-rose-400 font-bold">{yieldPct}%</span>. Reconsider procurement terms.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-slate-400 text-sm bg-slate-800/50 p-4 rounded-lg border border-slate-800">
            Yield efficiency for all suppliers is holding above the 65% baseline.
          </div>
        )}
      </div>
      
      {/* Middle Panel: Live Inventory & Sales */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Enterprise Dashboard & Analytics</h2>
          <p className="text-slate-500 text-sm">Multi-dimensional operational and profit metrics.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Supplier Ref.</label>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 min-w-[150px]"
            >
              <option value="All">All Suppliers</option>
              {supplierList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Sales Personnel</label>
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 min-w-[150px]"
            >
              <option value="All">All Agents</option>
              {agentList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={24} /></div>
          <div>
            <div className="text-slate-500 text-sm font-medium">Filtered Gross Profit</div>
            <div className="text-2xl font-bold text-slate-900">${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Layers size={24} /></div>
          <div>
            <div className="text-slate-500 text-sm font-medium">Filtered Revenue</div>
            <div className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><Trash2 size={24} /></div>
          <div>
            <div className="text-slate-500 text-sm font-medium">Global Wastage (CFT)</div>
            <div className="text-2xl font-bold text-slate-900">{totalWastageCFT.toFixed(2)}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Factory size={24} /></div>
          <div>
            <div className="text-slate-500 text-sm font-medium">Logs Processed</div>
            <div className="text-2xl font-bold text-slate-900">{logsProcessed}</div>
          </div>
        </div>
      </div>

      {/* Financial Physical Ledger Layer (NEW) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">High-Value Financial Analysis Ledger</h3>
          <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">Volumetric Margin Intelligence</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 uppercase text-xs font-bold text-slate-600">
                <th className="p-3 border-b text-slate-900 border-r border-slate-200" colSpan={2}>Asset</th>
                <th className="p-3 border-b bg-slate-100 text-slate-700 border-r border-slate-200" colSpan={3}>Commercial Purchase Ledger (Contract)</th>
                <th className="p-3 border-b bg-blue-50 text-blue-900 border-r border-slate-200" colSpan={3}>True Physical Ledger (Actual)</th>
                <th className="p-3 border-b bg-emerald-50 text-emerald-900" colSpan={3}>Landed Margin Ledger (Usable)</th>
              </tr>
              <tr className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                <th className="p-2 pl-3">Log ID</th>
                <th className="p-2 border-r border-slate-200">Lot</th>
                {/* Commercial */}
                <th className="p-2 bg-slate-50">Hoppus Vol</th>
                <th className="p-2 bg-slate-50">Buy Rate ($/CFT)</th>
                <th className="p-2 bg-slate-50 border-r border-slate-200">Base Cost</th>
                {/* Physical */}
                <th className="p-2 bg-blue-50/50">Actual Vol</th>
                <th className="p-2 bg-blue-50/50">+ Extra Cost</th>
                <th className="p-2 bg-blue-50/50 border-r border-slate-200">Total Value</th>
                {/* Landed */}
                <th className="p-2 bg-emerald-50/50">- Deductions</th>
                <th className="p-2 bg-emerald-50/50">Net Usable Vol</th>
                <th className="p-2 bg-emerald-50/50 pr-3">True Base Rate ($/CFT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.logs.filter(l => !l.isDeleted).map(log => {
                const bRate = log.hoppusBuyingRate || 0;
                const hVol = log.hoppusVolumeCFT || 0;
                const aVol = log.actualVolumeCFT || 0;
                const baseC = log.baseLogCost || (hVol * bRate);
                const aXtra = log.apportionedExtraCost || 0;
                const tVal = log.totalLogLandedValue || (baseC + aXtra);
                
                const ded = log.volumetricDeductionsCFT || log.purchaseAllowanceCFT || 0;
                const nVol = log.usableVolumeCFT || (aVol - ded);
                const tRate = log.actualLandedAverageRate || (nVol > 0 ? (tVal / nVol) : 0);

                const marginPct = tRate > 0 && bRate > 0 ? (((bRate - tRate) / bRate) * 100) : 0;
                
                return (
                  <tr key={log.id} className="hover:bg-slate-50 group">
                    <td className="p-2 pl-3 font-mono text-xs font-semibold text-slate-700">{log.id}</td>
                    <td className="p-2 border-r border-slate-200">
                      <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded">{log.lotCode}</span>
                    </td>
                    
                    {/* Commercial */}
                    <td className="p-2 font-mono text-xs">{hVol.toFixed(2)}</td>
                    <td className="p-2 font-mono text-xs text-slate-500">${bRate.toFixed(2)}</td>
                    <td className="p-2 font-mono text-xs font-semibold border-r border-slate-200">${baseC.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    
                    {/* Physical */}
                    <td className="p-2 font-mono text-xs bg-blue-50/30 font-medium text-blue-900">{aVol.toFixed(2)}</td>
                    <td className="p-2 font-mono text-xs bg-blue-50/30 text-blue-600">${aXtra.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="p-2 font-mono text-xs bg-blue-50/30 font-bold text-blue-900 border-r border-slate-200">${tVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    
                    {/* Landed Margin */}
                    <td className="p-2 font-mono text-xs bg-emerald-50/30 text-orange-600">-{ded.toFixed(1)}</td>
                    <td className="p-2 font-mono text-xs bg-emerald-50/30 font-bold text-emerald-700">{nVol.toFixed(2)}</td>
                    <td className="p-2 pr-3 bg-emerald-50/30">
                      <div className="flex items-center justify-between min-w-[100px]">
                        <span className="font-mono text-xs font-bold text-emerald-900">${tRate.toFixed(2)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {state.logs.filter(l => !l.isDeleted).length === 0 && (
                 <tr><td colSpan={11} className="p-6 text-center text-slate-400">No logs processed in the financial ledger yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualizations Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Plot 1: Volume Variance */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-md font-bold text-slate-900 mb-1">Volume Variance (CFT)</h3>
          <p className="text-xs text-slate-500 mb-6">Contrasting Hoppus Paid vs Actual Received vs Final Sawn Output</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeVarianceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHoppus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSawn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                <Area type="monotone" dataKey="HoppusPaid" name="Hoppus (Paid)" stroke="#94a3b8" fillOpacity={1} fill="url(#colorHoppus)" />
                <Area type="monotone" dataKey="ActualReceived" name="Actual (Geometric)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorActual)" />
                <Area type="monotone" dataKey="FinalSawnDelivered" name="Final Sawn Yield" stroke="#10b981" fillOpacity={1} fill="url(#colorSawn)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plot 2: Species Profit Yield Matrix */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-md font-bold text-slate-900 mb-1">Timber Category Yield</h3>
          <p className="text-xs text-slate-500 mb-6">Species percentage contribution to Gross Profit</p>
          <div className="flex-1 h-[280px]">
            {categoryYieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryYieldData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="profit"
                    stroke="none"
                  >
                    {categoryYieldData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">No profit data to chart</div>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Plot 3: Lot Code Profit */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-md font-bold text-slate-900 mb-1">Profit Yield by Lot Code Classification</h3>
          <p className="text-xs text-slate-500 mb-6">Gross margin dominance mapped across timber matrix ranks</p>
          <div className="h-[250px]">
            {lotCodeYieldData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lotCodeYieldData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip formatter={(value: number) => `${value.toLocaleString()}%`} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="margin" name="Gross Margin" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">No profit data to chart</div>
             )}
          </div>
        </div>

        {/* Existing Breakdowns Panel logic replaced/revised below */}
        <div className="grid grid-rows-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <h3 className="text-sm font-bold text-slate-900 flex justify-between items-center mb-3">
                <span className="flex items-center gap-2"><Factory size={16} className="text-blue-500"/> Supplier-Wise Summary</span>
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {Object.keys(supplierStats).length === 0 && <p className="text-xs text-slate-400">No data for selected filters.</p>}
                {Object.entries(supplierStats).map(([sName, data]: [string, any]) => {
                  const m = data.revenue > 0 ? ((data.revenue - data.costBase)/data.revenue)*100 : 0;
                  return ( // Fix for 'map' iteration
                    <div key={sName} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded">
                      <div className="font-medium text-slate-900">{sName}</div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-slate-500">Vol: {data.purchasedVol.toFixed(1)} CFT</span>
                        <span className={`font-bold ${m > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Margin: {m.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <h3 className="text-sm font-bold text-slate-900 flex justify-between items-center mb-3">
                <span className="flex items-center gap-2"><User size={16} className="text-purple-500"/> Sales Agent Breakdown</span>
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {Object.keys(agentStats).length === 0 && <p className="text-xs text-slate-400">No data for selected filters.</p>}
                {Object.entries(agentStats).map(([aName, data]: [string, any]) => {
                  return (
                    <div key={aName} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded">
                      <div className="font-medium text-slate-900">{aName}</div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-slate-500">Sold: {data.volSold.toFixed(1)} CFT</span>
                        <span className={`font-bold ${data.profit >= 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Profit: ${data.profit.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
        </div>

      </div>

      {/* Bottom Panel: Chatbot Assistant */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Bot className="text-blue-600" size={24} />
          Sales & Marketing Intelligence
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Ask about a size (e.g., '4x3' or 'decking')"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
          </div>
        </div>

        {chatInput.trim().length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
            {matchingSizes.length > 0 ? (
              matchingSizes.map((s, i) => (
                <div key={i} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="bg-blue-100 p-2 rounded-full shrink-0">
                    <MessageSquareHeart size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {s.sizeName} ({s.dimensionsMm})
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      <strong>Expert Tip:</strong> This size is optimized for <span className="font-medium text-slate-900">{s.marketUseCase.toLowerCase()}</span>. 
                      Recommended for environments requiring <span className="font-medium text-slate-900">{s.durabilityClass.toLowerCase()}</span>. 
                      Suggest applying <span className="font-medium text-slate-900">{s.treatmentSpecs.toLowerCase()}</span>.
                    </div>
                    <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                      Difficulty: {s.workingDifficulty}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-4 text-sm">
                No matching insights found for "{chatInput}".
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Plot 3: Procurement Cost Variance */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-md font-bold text-slate-900 mb-1">Procurement Cost Variance</h3>
          <p className="text-xs text-slate-500 mb-6">Standard Price Basis vs Actual Paid Rate ($/CFT)</p>
          <div className="h-[280px]">
            {priceVarianceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceVarianceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Bar dataKey="StandardBaselinePrice" name="Std Price Matrix" fill="#cbd5e1" radius={[4,4,0,0]} barSize={30} />
                  <Bar dataKey="ActualPurchasePrice" name="Actual Rate Paid" fill="#6366f1" radius={[4,4,0,0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Not enough data. Please configure Girth-Band prices and log purchases.</div>
            )}
          </div>
        </div>

        {/* Plot 4: Standard Loss Variance */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-md font-bold text-slate-900 mb-1">Standard Conversion Yield Variance</h3>
          <p className="text-xs text-slate-500 mb-6">Expected Yield % vs Actual Sawn Yield %</p>
          <div className="h-[280px]">
            {yieldVarianceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yieldVarianceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStdYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Area type="monotone" dataKey="StandardYield" name="Standard Expectation %" stroke="#94a3b8" fillOpacity={1} fill="url(#colorStdYield)" />
                  <Area type="monotone" dataKey="ActualYield" name="Actual Yield %" stroke="#10b981" fillOpacity={1} fill="url(#colorActYield)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Not enough data. Please configure expected yields and convert stocks.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
