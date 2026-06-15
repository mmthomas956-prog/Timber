import React, { useState } from 'react';
import { AppState, SizeIntelligence, CustomerRegistry, SupplierRegistry, YieldStandard, PriceListBand } from '../types';
import { Plus, Trash2, Settings, ListTree } from 'lucide-react';

export default function ConfigView({ state, setState }: { state: AppState, setState: (state: AppState) => void }) {
  const [newSpecies, setNewSpecies] = useState('');
  const [newFrameType, setNewFrameType] = useState('');

  const handleAddSpecies = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecies.trim()) return;
    setState({ ...state, speciesList: [...state.speciesList, newSpecies.trim()] });
    setNewSpecies('');
  };

  const handleRemoveSpecies = (species: string) => {
    setState({ ...state, speciesList: state.speciesList.filter(s => s !== species) });
  };

  const handleAddFrameType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrameType.trim()) return;
    setState({ 
      ...state, 
      frameTypes: [...state.frameTypes, newFrameType.trim()],
      frameTypesConfig: [...(state.frameTypesConfig || []), { name: newFrameType.trim(), minTargetQty: 0 }] 
    });
    setNewFrameType('');
  };

  const handleRemoveFrameType = (frameType: string) => {
    setState({ 
      ...state, 
      frameTypes: state.frameTypes.filter(f => f !== frameType),
      frameTypesConfig: (state.frameTypesConfig || []).filter(fc => fc.name !== frameType) 
    });
  };

  const handleRemoveSize = (sizeName: string) => {
    setState({
      ...state,
      sizeIntelligence: state.sizeIntelligence.filter(s => s.sizeName !== sizeName)
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="text-slate-500" />
          Master Configuration
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage timber species, frame varieties, and pre-load intelligence sizes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timber Species List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <ListTree className="text-emerald-600" size={20} />
            Timber Varieties (Species)
          </h2>
          <form onSubmit={handleAddSpecies} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="E.g., Oak, Mahogany"
              className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={newSpecies}
              onChange={e => setNewSpecies(e.target.value)}
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-1">
              <Plus size={16} /> Add
            </button>
          </form>
          <ul className="space-y-2">
            {state.speciesList.map((sp, idx) => (
              <li key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-md border border-slate-100">
                <span className="font-medium text-slate-700">{sp}</span>
                <button onClick={() => handleRemoveSpecies(sp)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {state.speciesList.length === 0 && (
              <li className="text-slate-400 text-sm italic">No timber varieties found. Add one above.</li>
            )}
          </ul>
        </div>

        {/* Frame Types List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Frame Types</h2>
          <form onSubmit={handleAddFrameType} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="E.g., Window Frame, Large Door"
              className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={newFrameType}
              onChange={e => setNewFrameType(e.target.value)}
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-1">
              <Plus size={16} /> Add
            </button>
          </form>
          <ul className="space-y-2">
            {state.frameTypesConfig?.map((ft, idx) => (
              <li key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-md border border-slate-100">
                <span className="font-medium text-slate-700">{ft.name}</span>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Min Qty:</span>
                    <input type="number" className="border border-slate-300 w-16 p-1 text-xs rounded" value={ft.minTargetQty} onChange={e => {
                      const upd = [...state.frameTypesConfig];
                      upd[idx].minTargetQty = parseInt(e.target.value) || 0;
                      setState({ ...state, frameTypesConfig: upd });
                    }} />
                  </div>
                  <button onClick={() => handleRemoveFrameType(ft.name)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
            {(!state.frameTypesConfig || state.frameTypesConfig.length === 0) && (
              <li className="text-slate-400 text-sm italic">No frame types found. Add one above.</li>
            )}
          </ul>
        </div>
      </div>

      <SizeDefaultsView state={state} setState={setState} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <CustomerRegistryView state={state} setState={setState} />
        <SupplierRegistryView state={state} setState={setState} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <YieldStandardsView state={state} setState={setState} />
        <PriceListView state={state} setState={setState} />
      </div>
    </div>
  );
}

function SizeDefaultsView({ state, setState }: { state: AppState, setState: (state: AppState) => void }) {
  const [form, setForm] = useState<Partial<SizeIntelligence>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sizeName || !form.dimensionsMm) return;

    setState({
      ...state,
      sizeIntelligence: [
        ...state.sizeIntelligence,
        form as SizeIntelligence
      ]
    });
    setForm({});
  };

  const handleRemoveSize = (sizeName: string) => {
    setState({
      ...state,
      sizeIntelligence: state.sizeIntelligence.filter(s => s.sizeName !== sizeName)
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Standard Sawn Sizes & Intelligence</h2>
      <div className="grid grid-cols-1 gap-6">
        
        {/* Form add new dimension */}
        <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Add New Size Target</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Size Reference (e.g. 3x4)</label>
              <input required type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" 
                value={form.sizeName || ''} onChange={e => setForm({...form, sizeName: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Dimensions (mm)</label>
              <input required type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" placeholder="75x100"
                value={form.dimensionsMm || ''} onChange={e => setForm({...form, dimensionsMm: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Standard Min Stock Qty</label>
              <input type="number" className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                value={form.minTargetQty || ''} onChange={e => setForm({...form, minTargetQty: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Market Use / Recommendation</label>
              <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" 
                value={form.marketUseCase || ''} onChange={e => setForm({...form, marketUseCase: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Durability</label>
              <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" 
                value={form.durabilityClass || ''} onChange={e => setForm({...form, durabilityClass: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Working Difficulty</label>
              <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" 
                value={form.workingDifficulty || ''} onChange={e => setForm({...form, workingDifficulty: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Treatment / Finishing Specs</label>
              <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" 
                value={form.treatmentSpecs || ''} onChange={e => setForm({...form, treatmentSpecs: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Save Size Configuration
          </button>
        </form>

        <div className="overflow-x-auto shadow-sm border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-3 border-b">Size Name</th>
                <th className="p-3 border-b">Mm</th>
                <th className="p-3 border-b">Min Target Qty</th>
                <th className="p-3 border-b">Primary Use Case</th>
                <th className="p-3 border-b">Durability</th>
                <th className="p-3 border-b text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.sizeIntelligence.map((size, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{size.sizeName}</td>
                  <td className="p-3 font-mono text-xs">{size.dimensionsMm}</td>
                  <td className="p-3 font-bold text-slate-600">{size.minTargetQty || '-'}</td>
                  <td className="p-3">{size.marketUseCase}</td>
                  <td className="p-3">{size.durabilityClass}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleRemoveSize(size.sizeName)} className="text-slate-400 hover:text-red-500" title="Delete Size">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {state.sizeIntelligence.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">No standard sizes defined.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomerRegistryView({ state, setState }: { state: AppState, setState: (state: AppState) => void }) {
  const [form, setForm] = useState<Partial<CustomerRegistry>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName) return;
    const newCust: CustomerRegistry = {
      id: `CUST-${Date.now()}`,
      companyName: form.companyName || '',
      contactPerson: form.contactPerson || '',
      phoneNumber: form.phoneNumber || '',
      email: form.email || '',
      taxRegistration: form.taxRegistration || '',
      billingAddress: form.billingAddress || ''
    };
    setState({ ...state, customers: [...(state.customers || []), newCust] });
    setForm({});
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Customer Registry</h2>
      <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Company Name</label>
            <input required type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.companyName || ''} onChange={e => setForm({...form, companyName: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Contact Person</label>
            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.contactPerson || ''} onChange={e => setForm({...form, contactPerson: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Phone Number (Intl Format)</label>
            <input type="tel" pattern="^\+?[1-9]\d{1,14}$" title="Country code required. E.g., +1234567890" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.phoneNumber || ''} onChange={e => setForm({...form, phoneNumber: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tax/GST No</label>
            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.taxRegistration || ''} onChange={e => setForm({...form, taxRegistration: e.target.value})} />
          </div>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Add Customer
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="p-3 border-b">Company</th>
              <th className="p-3 border-b">Contact</th>
              <th className="p-3 border-b">Phone</th>
              <th className="p-3 border-b text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {(state.customers || []).map(c => (
              <tr key={c.id} className="border-b">
                <td className="p-3 font-medium text-slate-800">{c.companyName}</td>
                <td className="p-3">{c.contactPerson}</td>
                <td className="p-3 font-mono">{c.phoneNumber}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setState({...state, customers: state.customers.filter(x => x.id !== c.id)})} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupplierRegistryView({ state, setState }: { state: AppState, setState: (state: AppState) => void }) {
  const [form, setForm] = useState<Partial<SupplierRegistry>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierName) return;
    const newSupp: SupplierRegistry = {
      id: `SUPP-${Date.now()}`,
      supplierName: form.supplierName || '',
      contactPerson: form.contactPerson || '',
      phoneNumber: form.phoneNumber || '',
      alternativePhone: form.alternativePhone || '',
      paymentTermsDays: form.paymentTermsDays || 0,
      bankDetails: form.bankDetails || ''
    };
    setState({ ...state, suppliers: [...(state.suppliers || []), newSupp] });
    setForm({});
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Supplier Registry</h2>
      <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Supplier Name</label>
            <input required type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.supplierName || ''} onChange={e => setForm({...form, supplierName: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Contact Person</label>
            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.contactPerson || ''} onChange={e => setForm({...form, contactPerson: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Phone Number (Intl Format)</label>
            <input type="tel" pattern="^\+?[1-9]\d{1,14}$" title="Country code required. E.g., +1234567890" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.phoneNumber || ''} onChange={e => setForm({...form, phoneNumber: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Payment Terms (Days)</label>
            <input type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.paymentTermsDays || ''} onChange={e => setForm({...form, paymentTermsDays: parseInt(e.target.value) || 0})} />
          </div>
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Add Supplier
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="p-3 border-b">Supplier</th>
              <th className="p-3 border-b">Contact</th>
              <th className="p-3 border-b">Terms</th>
              <th className="p-3 border-b text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {(state.suppliers || []).map(s => (
              <tr key={s.id} className="border-b">
                <td className="p-3 font-medium text-slate-800">{s.supplierName}</td>
                <td className="p-3">{s.contactPerson}</td>
                <td className="p-3">{s.paymentTermsDays} Days</td>
                <td className="p-3 text-right">
                  <button onClick={() => setState({...state, suppliers: state.suppliers.filter(x => x.id !== s.id)})} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YieldStandardsView({ state, setState }: { state: AppState, setState: (state: AppState) => void }) {
  const [form, setForm] = useState<Partial<YieldStandard>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newStd: YieldStandard = {
      id: `YIELD-${Date.now()}`,
      species: form.species || state.speciesList[0],
      girthBandMin: form.girthBandMin || 0,
      girthBandMax: form.girthBandMax || 0,
      expectedYieldPct: form.expectedYieldPct || 0
    };
    setState({ ...state, yieldStandards: [...(state.yieldStandards || []), newStd] });
    setForm({});
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Yield Conversion Standards</h2>
      <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Species</label>
            <select required className="w-full border border-slate-300 rounded p-2 text-sm" value={form.species || ''} onChange={e => setForm({...form, species: e.target.value})}>
              <option value="">--Select--</option>
              {state.speciesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Expected Yield %</label>
            <input required type="number" step="0.1" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.expectedYieldPct || ''} onChange={e => setForm({...form, expectedYieldPct: parseFloat(e.target.value)})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Girth Min (inches)</label>
            <input required type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.girthBandMin || ''} onChange={e => setForm({...form, girthBandMin: parseInt(e.target.value)})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Girth Max (inches)</label>
            <input required type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.girthBandMax || ''} onChange={e => setForm({...form, girthBandMax: parseInt(e.target.value)})} />
          </div>
        </div>
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Add Yield Standard
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="p-3 border-b">Species</th>
              <th className="p-3 border-b">Band (in)</th>
              <th className="p-3 border-b">Exp Yield %</th>
              <th className="p-3 border-b text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {(state.yieldStandards || []).map(y => (
              <tr key={y.id} className="border-b">
                <td className="p-3 font-medium text-slate-800">{y.species}</td>
                <td className="p-3 font-mono">{y.girthBandMin} - {y.girthBandMax}</td>
                <td className="p-3 font-mono text-emerald-600 font-bold">{y.expectedYieldPct}%</td>
                <td className="p-3 text-right">
                  <button onClick={() => setState({...state, yieldStandards: state.yieldStandards.filter(x => x.id !== y.id)})} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceListView({ state, setState }: { state: AppState, setState: (state: AppState) => void }) {
  const [form, setForm] = useState<Partial<PriceListBand>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newBand: PriceListBand = {
      id: `PRICE-${Date.now()}`,
      species: form.species || state.speciesList[0],
      girthBandMin: form.girthBandMin || 0,
      girthBandMax: form.girthBandMax || 0,
      standardPricePerCFT: form.standardPricePerCFT || 0
    };
    setState({ ...state, priceListBands: [...(state.priceListBands || []), newBand] });
    setForm({});
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Girth-Band Price Matrix</h2>
      <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Species</label>
            <select required className="w-full border border-slate-300 rounded p-2 text-sm" value={form.species || ''} onChange={e => setForm({...form, species: e.target.value})}>
              <option value="">--Select--</option>
              {state.speciesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Standard Cost ($/CFT)</label>
            <input required type="number" step="0.01" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.standardPricePerCFT || ''} onChange={e => setForm({...form, standardPricePerCFT: parseFloat(e.target.value)})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Girth Min (inches)</label>
            <input required type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.girthBandMin || ''} onChange={e => setForm({...form, girthBandMin: parseInt(e.target.value)})} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Girth Max (inches)</label>
            <input required type="number" className="w-full border border-slate-300 rounded p-2 text-sm" value={form.girthBandMax || ''} onChange={e => setForm({...form, girthBandMax: parseInt(e.target.value)})} />
          </div>
        </div>
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Add Price Band
        </button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="p-3 border-b">Species</th>
              <th className="p-3 border-b">Band (in)</th>
              <th className="p-3 border-b">Std Rate ($)</th>
              <th className="p-3 border-b text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {(state.priceListBands || []).map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-3 font-medium text-slate-800">{p.species}</td>
                <td className="p-3 font-mono">{p.girthBandMin} - {p.girthBandMax}</td>
                <td className="p-3 font-mono text-emerald-600 font-bold">${p.standardPricePerCFT.toFixed(2)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setState({...state, priceListBands: state.priceListBands.filter(x => x.id !== p.id)})} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
