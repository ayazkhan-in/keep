import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Shield, Receipt, Home } from 'lucide-react';
import { ROUTES } from '../routes/routeConfig';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTheme } from '../context/ThemeContext';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useWorkspace();
  const { theme } = useTheme();

  return (
    <div
      className="flex h-[100dvh] w-full text-[#1A1C1D] dark:text-[#F1F5F9] overflow-hidden font-sans p-3 sm:p-5 md:p-6 bg-cover bg-center bg-no-repeat dark:bg-none bg-[#F8F9FA] dark:bg-[#080C0F] items-center justify-center transition-colors"
      style={{ backgroundImage: theme === 'dark' ? 'none' : "url('/bg.jpg')" }}
    >
      <div className="max-w-md w-full bg-white dark:bg-[#0D1217] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-xl p-6 sm:p-8 text-center relative overflow-hidden transition-colors">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <FileQuestion className="w-7 h-7" />
        </div>

        <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md inline-block mb-3">
          404 • Not Found
        </span>

        <h1 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-2 tracking-tight">
          Page Does Not Exist
        </h1>

        <p className="text-[13px] text-[#64748B] dark:text-[#94A3B8] mb-6 leading-relaxed">
          The requested URL path was not recognized. Please use one of the verified workspace portals below.
        </p>

        <div className="space-y-2.5">
          {currentRole === 'employee' ? (
            <button
              onClick={() => navigate(ROUTES.EMPLOYEE.EXPENSES)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-white" />
              <span>Go to My Expenses</span>
            </button>
          ) : (
            <button
              onClick={() => navigate(ROUTES.AUDITOR.REVIEW_QUEUE)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-white" />
              <span>Go to Auditor Review Queue</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => navigate(ROUTES.EMPLOYEE.EXPENSES)}
              className="py-2 px-3 bg-[#F8FAFC] dark:bg-[#151B22] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#212C36] text-[#334155] dark:text-[#CBD5E1] rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
              <span>Employee Portal</span>
            </button>

            <button
              onClick={() => navigate(ROUTES.AUDITOR.REVIEW_QUEUE)}
              className="py-2 px-3 bg-[#F8FAFC] dark:bg-[#151B22] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#212C36] text-[#334155] dark:text-[#CBD5E1] rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
              <span>Auditor Portal</span>
            </button>
          </div>

          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="w-full py-2 px-4 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Landing Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};

