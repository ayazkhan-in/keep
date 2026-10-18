import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Building2,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  X,
  CreditCard,
  PieChart,
  Shield,
  Layers,
  ArrowRight,
  Receipt,
  FileText,
} from 'lucide-react';
import { Employee, Expense } from '../../types/expense';
import { getAllEmployeesList } from '../../services/employeeService';
import { getAllExpenses, subscribeExpenses } from '../../services/expenseService';
import { getActivePolicy } from '../../services/policyService';

export const EmployeesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [inspectEmployee, setInspectEmployee] = useState<Employee | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>(() => getAllExpenses());
  const policy = useMemo(() => getActivePolicy(), []);

  // Real-time Firestore sync
  React.useEffect(() => {
    const unsubscribe = subscribeExpenses((updated) => {
      setExpenses(updated);
    });
    return () => unsubscribe();
  }, []);

  // Compute metrics per employee
  const employeeData = useMemo(() => {
    const allEmps = getAllEmployeesList();
    // Unique employees by email
    const seen = new Set<string>();
    const uniqueEmployees = allEmps.filter((emp) => {
      const email = emp.identity.email.toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });

    return uniqueEmployees.map((emp) => {
      const empExpenses = expenses.filter(
        (e) =>
          e.employeeId === emp.id ||
          (e as any).employeeAlias === emp.id ||
          ((emp.id === 'emp_101' || emp.identity.email.includes('employee@keepr') || emp.identity.email.includes('alice.walker')) &&
           (e.employeeId === 'emp_101' || e.employeeId === 'pXmBbGDnDwTsrErsGuad8r4Gz4S2' || e.employeeId === 'nEqzcEzb0zPDjsvy4tfL8tm2QHl1'))
      );

      let totalSubmitted = empExpenses.length;
      let approvedAmountMinor = 0;
      let inReviewAmountMinor = 0;
      let rejectedCount = 0;

      // Category breakdown
      const categoryMap = new Map<string, number>();

      for (const exp of empExpenses) {
        const approved = exp.verdict?.approvedAmountMinor ?? 0;
        const targetAmt = exp.normalizedCurrency.targetAmountMinor;
        const category = exp.extracted?.lineItems?.[0]?.category || 'General';

        approvedAmountMinor += approved;
        categoryMap.set(category, (categoryMap.get(category) || 0) + approved);

        if (exp.status === 'in_review' || exp.status === 'needs_info') {
          inReviewAmountMinor += targetAmt;
        } else if (exp.status === 'rejected') {
          rejectedCount++;
        }
      }

      // Allowance estimate based on home city tier
      const cityTier = policy.cityTiers[emp.homeCity] || 'Tier-1';
      const dailyCapMinor = cityTier === 'Tier-1' ? 300000 : cityTier === 'Tier-2' ? 180000 : 120000;
      const monthlyAllowanceMinor = dailyCapMinor * 20; // estimate 20 working days
      const allowancePercent = Math.min(100, Math.round((approvedAmountMinor / (monthlyAllowanceMinor || 1)) * 100));

      return {
        employee: emp,
        expenses: empExpenses,
        totalSubmitted,
        approvedAmount: approvedAmountMinor / 100,
        inReviewAmount: inReviewAmountMinor / 100,
        rejectedCount,
        cityTier,
        dailyCap: dailyCapMinor / 100,
        allowancePercent,
        topCategories: Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      };
    });
  }, [expenses, policy]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employeeData.filter((data) => {
      if (selectedDepartment !== 'all' && data.employee.department !== selectedDepartment) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        data.employee.identity.name.toLowerCase().includes(q) ||
        data.employee.identity.email.toLowerCase().includes(q) ||
        data.employee.department.toLowerCase().includes(q) ||
        data.employee.homeCity.toLowerCase().includes(q) ||
        data.employee.id.toLowerCase().includes(q)
      );
    });
  }, [employeeData, selectedDepartment, searchQuery]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employeeData.forEach((d) => set.add(d.employee.department));
    return Array.from(set);
  }, [employeeData]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-600" />
            Employees & Spend Allowances
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Directory of corporate employees, historical claim submissions, and allowance consumption meters.
          </p>
        </div>

        {/* Global summary badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs shadow-2xs">
          <span className="text-[#64748B]">Active Staff:</span>
          <span className="font-bold text-[#0F172A]">{employeeData.length} Members</span>
          <span className="text-[#94A3B8]">•</span>
          <span className="font-mono-code font-bold text-emerald-700">
            ₹{employeeData.reduce((acc, d) => acc + d.approvedAmount, 0).toLocaleString()} Reimbursed
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Department Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedDepartment === 'all'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedDepartment === dept
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, city..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#F8FAFC] border border-[#E2E8F0] focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEmployees.map((data) => {
          const emp = data.employee;

          return (
            <div
              key={emp.id}
              onClick={() => setInspectEmployee(emp)}
              className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs rounded-xl p-3.5 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header: Avatar, Name & Role */}
                <div className="flex items-start justify-between gap-2.5 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                      {(emp.identity?.name || 'Employee').split(' ').map((n) => n[0] || '').join('').slice(0, 2) || 'EM'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                        {emp.identity.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        {emp.department} • {emp.homeCity}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                    emp.role === 'finance'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {emp.role === 'finance' ? 'Finance' : emp.grade}
                  </span>
                </div>

                {/* Compact Financial Stats Row */}
                <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center mb-3">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono-code">Claims</div>
                    <div className="font-bold text-xs text-slate-900">{data.totalSubmitted}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono-code">Approved</div>
                    <div className="font-bold text-xs text-emerald-700 font-mono-code">₹{Math.round(data.approvedAmount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono-code">Pending</div>
                    <div className="font-bold text-xs text-amber-700 font-mono-code">₹{Math.round(data.inReviewAmount).toLocaleString()}</div>
                  </div>
                </div>

                {/* Minimal Allowance Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Daily Meal Allowance</span>
                    <span className="font-mono-code font-bold text-slate-800">{data.allowancePercent}% used</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.allowancePercent > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(4, data.allowancePercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">
                  {data.rejectedCount > 0 ? `${data.rejectedCount} flagged` : 'No flags'}
                </span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                  <span>History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Detail Drawer for Selected Employee */}
      {inspectEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-base font-bold text-emerald-700">
                    {((inspectEmployee.identity?.name || 'Employee').split(' ').map((n) => n[0] || '').join('') || 'EM').slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-[#0F172A]">
                      {inspectEmployee.identity.name}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      {inspectEmployee.identity.email} • {inspectEmployee.department} ({inspectEmployee.grade})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectEmployee(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Employee Overview Info */}
              <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-mono-code">Home Station</span>
                  <div className="font-bold text-slate-900 mt-0.5">{inspectEmployee.homeCity}</div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    Corporate Hub
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 text-[10px] uppercase font-mono-code">Employee ID</span>
                  <div className="font-bold text-slate-900 mt-0.5 font-mono-code">{inspectEmployee.id}</div>
                  <div className="text-[11px] text-slate-500 font-medium">Acme Enterprise Identity</div>
                </div>
              </div>

              {/* Claims History Stream */}
              <h3 className="font-bold text-sm text-[#0F172A] mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Submitted Claims ({expenses.filter((e) => e.employeeId === inspectEmployee.id).length})</span>
              </h3>

              <div className="space-y-2.5">
                {expenses
                  .filter((e) => e.employeeId === inspectEmployee.id)
                  .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
                  .map((exp) => (
                    <div key={exp.id} className="p-3 rounded-xl border border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-[#0F172A]">
                          {exp.extracted?.merchant?.value || exp.id}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {exp.expenseDate} • {exp.extracted?.lineItems?.[0]?.category || 'General'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-xs text-[#0F172A]">
                          ₹{(exp.normalizedCurrency.targetAmountMinor / 100).toFixed(2)}
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          exp.status === 'auto_approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : exp.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : exp.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {exp.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 mt-6">
              <button
                onClick={() => setInspectEmployee(null)}
                className="w-full py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
