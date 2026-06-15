import React, { useState } from 'react';
import { AppState, Species, Log, SawnTimber, Frame, SaleRecord } from './types';
import DashboardView from './components/DashboardView';
import PurchasesView from './components/PurchasesView';
import SawmillView from './components/SawmillView';
import FramesView from './components/FramesView';
import SalesView from './components/SalesView';
import AuditView from './components/AuditView';
import ConfigView from './components/ConfigView';
import { initialAppState } from './data/mockData';
import { LayoutDashboard, Trees, Hammer, PackageOpen, Banknote, ClipboardList, Settings } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [state, setState] = useState<AppState>(initialAppState);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'purchases', label: 'Purchases (Logs)', icon: Trees },
    { id: 'sawmill', label: 'Sawmill (Sawn Sizes)', icon: Hammer },
    { id: 'frames', label: 'Door & Window Frames', icon: PackageOpen },
    { id: 'sales', label: 'Sales', icon: Banknote },
    { id: 'audit', label: 'History & Audit Log', icon: ClipboardList },
    { id: 'config', label: 'Master Config', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-100 flex flex-col shadow-xl z-10">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trees className="text-emerald-400" />
            ST Wood ERP
          </h1>
          <p className="text-xs text-slate-400 mt-1">Simplified Operations</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto p-8 h-full pb-20">
          {activeTab === 'dashboard' && <DashboardView state={state} />}
          {activeTab === 'purchases' && <PurchasesView state={state} setState={setState} />}
          {activeTab === 'sawmill' && <SawmillView state={state} setState={setState} />}
          {activeTab === 'frames' && <FramesView state={state} setState={setState} />}
          {activeTab === 'sales' && <SalesView state={state} setState={setState} />}
          {activeTab === 'audit' && <AuditView state={state} />}
          {activeTab === 'config' && <ConfigView state={state} setState={setState} />}
        </div>
      </main>
    </div>
  );
}
