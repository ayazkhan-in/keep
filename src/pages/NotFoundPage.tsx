import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Shield, Receipt, Home } from 'lucide-react';
import { ROUTES } from '../routes/routeConfig';
import { useWorkspace } from '../context/WorkspaceContext';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useWorkspace();

  return (
    <div
      className="flex h-[100dvh] w-full text-[#1A1C1D] overflow-hidden font-sans p-3 sm:p-5 md:p-6 bg-cover bg-center bg-no-repeat items-center justify-center"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <FileQuestion className="w-7 h-7" />
        </div>

        <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-md inline-block mb-3">
          404 • Not Found
        </span>

        <h1 className="text-2xl font-bold text-[#0F172A] mb-2 tracking-tight">
          Page Does Not Exist
        </h1>

        <p className="text-[13px] text-[#64748B] mb-6 leading-relaxed">
          The requested URL path was not recognized. Please use one of the verified workspace portals below.
        </p>

        <div className="space-y-2.5">
          {currentRole === 'employee' ? (
            <button
              onClick={() => navigate(ROUTES.EMPLOYEE.EXPENSES)}
              className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Go to My Expenses</span>
            </button>
          ) : (
            <button
              onClick={() => navigate(ROUTES.AUDITOR.REVIEW_QUEUE)}
              className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Go to Auditor Review Queue</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => navigate(ROUTES.EMPLOYEE.EXPENSES)}
              className="py-2 px-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Employee Portal</span>
            </button>

            <button
              onClick={() => navigate(ROUTES.AUDITOR.REVIEW_QUEUE)}
              className="py-2 px-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Auditor Portal</span>
            </button>
          </div>

          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="w-full py-2 px-4 text-[#64748B] hover:text-[#0F172A] text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Landing Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};
