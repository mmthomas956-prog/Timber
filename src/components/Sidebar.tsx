/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  TrendingUp, 
  Layers, 
  Boxes, 
  Wrench, 
  FileCheck, 
  BarChart3, 
  Database, 
  BookOpen,
  Trees
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'CEO Dashboard', icon: BarChart3, category: 'EXECUTIVE' },
    { id: 'procurement', label: 'Log Procurement', icon: Trees, category: 'OPERATIONS' },
    { id: 'sawmill', label: 'Sawmill & Sawn conversion', icon: Layers, category: 'OPERATIONS' },
    { id: 'inventory', label: 'Sawn Inventory', icon: Boxes, category: 'OPERATIONS' },
    { id: 'assembly', label: 'Custom Joinery', icon: Wrench, category: 'OPERATIONS' },
    { id: 'quotation', label: 'Quotation Sandbox', icon: FileCheck, category: 'SALES' },
    { id: 'schema', label: 'Database Blueprint', icon: Database, category: 'APPSHEET ENG' },
    { id: 'build-guide', label: 'AppSheet Build-Guide', icon: BookOpen, category: 'APPSHEET ENG' },
  ];

  const categories = ['EXECUTIVE', 'OPERATIONS', 'SALES', 'APPSHEET ENG'];

  return (
    <aside className="w-64 bg-[#16191D] border-r border-[#2A2E35] text-[#E0E2E5] flex flex-col h-screen sticky top-0 font-sans" id="erp-sidebar">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#2A2E35] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#D97706] rounded flex items-center justify-center font-bold text-black font-mono">
          ST
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-white tracking-tight uppercase">WOOD ERP</h1>
          <p className="text-[10px] font-mono text-[#D97706] uppercase tracking-wider">Matter & Margin</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {categories.map((category) => (
          <div key={category} className="space-y-1.5">
            <h3 className="text-[10px] font-mono font-semibold tracking-widest text-[#6B7280] px-3 uppercase">
              {category}
            </h3>
            <ul className="space-y-1">
              {menuItems
                .filter((item) => item.category === category)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        id={`nav-btn-${item.id}`}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[#2A2E35] text-white font-bold'
                            : 'hover:bg-[#2A2E35]/40 hover:text-white text-[#9CA3AF]'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-[#D97706]' : 'text-[#6B7280]'} />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      {/* Standard Meta Info in margins */}
      <div className="p-6 border-t border-[#2A2E35] text-[10px] font-mono text-[#6B7280] space-y-1">
        <div className="uppercase mb-0.5">Matter & Margin Engine</div>
        <div className="text-[#9CA3AF]">v4.2.1-PROD</div>
      </div>
    </aside>
  );
}
