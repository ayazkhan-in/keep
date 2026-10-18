import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Receipt,
  PieChart,
  Plus,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import { ROUTES } from '../../routes/routeConfig';
import { useWorkspace } from '../../context/WorkspaceContext';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  isAction?: boolean;
  matches: (pathname: string) => boolean;
}

export const EmployeeBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setActiveView } = useWorkspace();

  const navItems: NavItem[] = [
    {
      id: 'my-expenses',
      label: 'Claims',
      path: ROUTES.EMPLOYEE.EXPENSES,
      icon: Receipt,
      matches: (p) => p === '/employee' || p === '/employee/' || p.startsWith('/employee/expenses'),
    },
    {
      id: 'my-caps',
      label: 'Allowances',
      path: ROUTES.EMPLOYEE.ALLOWANCES,
      icon: PieChart,
      matches: (p) => p.startsWith('/employee/allowances') || p.startsWith('/employee/caps'),
    },
    {
      id: 'submit-expense',
      label: 'Submit',
      path: ROUTES.EMPLOYEE.SUBMIT,
      icon: Plus,
      isAction: true,
      matches: (p) => p.startsWith('/employee/submit'),
    },
    {
      id: 'trips',
      label: 'Trips',
      path: ROUTES.EMPLOYEE.TRIPS,
      icon: Briefcase,
      matches: (p) => p.startsWith('/employee/trips'),
    },
    {
      id: 'employee-policies',
      label: 'Policies',
      path: ROUTES.EMPLOYEE.POLICIES,
      icon: BookOpen,
      matches: (p) => p.startsWith('/employee/policies') || p.startsWith('/employee/policy'),
    },
  ];

  const handleNavClick = (item: NavItem) => {
    setActiveView(item.id as any);
    if (location.pathname !== item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.25rem)] max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl rounded-2xl px-2 py-1.5 flex items-center justify-around select-none transition-all pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]"
      aria-label="Employee Navigation"
    >
      {navItems.map((item) => {
        const isActive = item.matches(location.pathname);
        const Icon = item.icon;

        if (item.isAction) {
          return (
            <div key={item.id} className="relative -top-3.5 flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleNavClick(item)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95 cursor-pointer border-2 border-white ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-emerald-700/40 ring-2 ring-emerald-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                }`}
                title="Submit Claim"
                aria-label="Submit Claim"
              >
                <Plus className="w-6 h-6 stroke-[2.75]" />
              </button>
              <span className={`text-[10px] mt-0.5 tracking-tight font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-600'}`}>
                {item.label}
              </span>
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all active:scale-95 cursor-pointer min-w-[56px] ${
              isActive
                ? 'text-emerald-700 font-semibold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={`w-5 h-5 transition-transform duration-150 ${
                isActive ? 'scale-110 text-emerald-600' : 'text-slate-400'
              }`}
            />
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            {isActive ? (
              <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
            ) : (
              <span className="w-1 h-1 rounded-full bg-transparent mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
