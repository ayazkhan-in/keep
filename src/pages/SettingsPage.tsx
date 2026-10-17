import React from 'react';
import { Settings, Sliders, Shield, Bell } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export const SettingsPage: React.FC = () => {
  const { setIsSettingsOpen, currentRole } = useWorkspace();

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto shadow-xs">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A]">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">Application Preferences & Settings</h2>
          <p className="text-[13px] text-[#64748B]">
            Configure currency defaults, automated audit thresholds, and AI scanning parameters.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-[#E2E8F0] pt-6 space-y-4">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">Modal Preferences Hub</p>
              <p className="text-xs text-[#64748B]">Open comprehensive settings dialog to adjust base currencies and OCR sensitivity.</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-[13px] font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Open Preferences
          </button>
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-semibold text-[#0F172A]">Current Clearance Level</p>
          </div>
          <p className="text-xs text-[#64748B]">
            Active Role: <span className="font-mono-code font-bold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{currentRole}</span>. Switch between Employee and Auditor views using the corporate header.
          </p>
        </div>
      </div>
    </div>
  );
};
