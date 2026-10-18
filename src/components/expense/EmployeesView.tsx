import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Sliders,
  Sparkles,
  DollarSign,
  Calendar,
  RotateCcw,
  Save,
  Lock,
  Unlock,
  Info,
  Percent,
  Briefcase,
  SlidersHorizontal,
  Check,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { Employee, Expense, CityTier, UserRole, PolicyVersion } from '../../types/expense';
import {
  getAllEmployeesList,
  updateEmployee,
  resetEmployeeFinanceProfile,
  subscribeEmployees,
  addEmployee,
  deleteEmployee,
} from '../../services/employeeService';
import { getAllExpenses, subscribeExpenses } from '../../services/expenseService';
import {
  getActivePolicy,
  saveActivePolicy,
  updatePolicyAllowances,
  subscribePolicy,
} from '../../services/policyService';

type DrawerTab = 'finance' | 'claims' | 'analytics';

export const EmployeesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [inspectEmployee, setInspectEmployee] = useState<Employee | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('finance');

  const [employeesList, setEmployeesList] = useState<Employee[]>(() => getAllEmployeesList());
  const [expenses, setExpenses] = useState<Expense[]>(() => getAllExpenses());
  const [policy, setPolicy] = useState<PolicyVersion>(() => getActivePolicy());

  // Global Corporate Allowances Modal State
  const [isOrgAllowancesOpen, setIsOrgAllowancesOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state for editing currently inspected employee
  const [formCustomAllowanceEnabled, setFormCustomAllowanceEnabled] = useState(false);
  const [formDailyMealAllowance, setFormDailyMealAllowance] = useState('3000');
  const [formMonthlySpendCap, setFormMonthlySpendCap] = useState('60000');
  const [formPerClaimMealLimit, setFormPerClaimMealLimit] = useState('2000');
  const [formClientDiningPerAttendee, setFormClientDiningPerAttendee] = useState('2500');
  const [formMileageRate, setFormMileageRate] = useState('15');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formGrade, setFormGrade] = useState('L4');
  const [formHomeCity, setFormHomeCity] = useState('Bengaluru');
  const [formCityTierOverride, setFormCityTierOverride] = useState<string>('default');
  const [formRole, setFormRole] = useState<UserRole>('employee');
  const [formAutoApproveEligible, setFormAutoApproveEligible] = useState(true);
  const [formReimbursementHold, setFormReimbursementHold] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  // Global Org Allowances Form State
  const [orgTier1Cap, setOrgTier1Cap] = useState('3000');
  const [orgTier2Cap, setOrgTier2Cap] = useState('1800');
  const [orgTier3Cap, setOrgTier3Cap] = useState('1200');
  const [orgIntlCap, setOrgIntlCap] = useState('6500');
  const [orgSingleMealCap, setOrgSingleMealCap] = useState('2000');
  const [orgClientAttendeeCap, setOrgClientAttendeeCap] = useState('2500');
  const [orgRiskThreshold, setOrgRiskThreshold] = useState('25');
  const [orgMinConfidence, setOrgMinConfidence] = useState('80');
  const [orgSubmissionDays, setOrgSubmissionDays] = useState('30');

  // Add Employee Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('employee');
  const [addDepartment, setAddDepartment] = useState('Engineering');
  const [addGrade, setAddGrade] = useState('L4');
  const [addHomeCity, setAddHomeCity] = useState('Bengaluru');
  const [addCustomAllowance, setAddCustomAllowance] = useState(false);
  const [addDailyCap, setAddDailyCap] = useState('3000');
  const [addMonthlyCap, setAddMonthlyCap] = useState('60000');
  const [addAutoApprove, setAddAutoApprove] = useState(true);

  // Delete Employee Confirmation State
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Subscriptions to live updates
  useEffect(() => {
    const unsubExp = subscribeExpenses((updated) => setExpenses(updated));
    const unsubEmp = subscribeEmployees((updated) => {
      setEmployeesList(updated);
      if (inspectEmployee) {
        const found = updated.find((e) => e.id === inspectEmployee.id);
        if (found) setInspectEmployee(found);
      }
    });
    const unsubPol = subscribePolicy((updated) => setPolicy(updated));

    return () => {
      unsubExp();
      unsubEmp();
      unsubPol();
    };
  }, [inspectEmployee]);

  // Sync Form State when inspectEmployee changes
  useEffect(() => {
    if (inspectEmployee) {
      const fp = inspectEmployee.financeProfile;
      setFormCustomAllowanceEnabled(Boolean(fp?.customAllowanceEnabled));

      const cityTier = fp?.cityTierOverride || policy.cityTiers[inspectEmployee.homeCity] || 'Tier-1';
      const defaultDailyCap = cityTier === 'Tier-1' ? 3000 : cityTier === 'Tier-2' ? 1800 : 1200;

      setFormDailyMealAllowance(fp?.dailyMealAllowanceMinor ? String(fp.dailyMealAllowanceMinor / 100) : String(defaultDailyCap));
      setFormMonthlySpendCap(fp?.monthlySpendCapMinor ? String(fp.monthlySpendCapMinor / 100) : String(defaultDailyCap * 20));
      setFormPerClaimMealLimit(fp?.perClaimMealLimitMinor ? String(fp.perClaimMealLimitMinor / 100) : '2000');
      setFormClientDiningPerAttendee(fp?.clientDiningPerAttendeeMinor ? String(fp.clientDiningPerAttendeeMinor / 100) : '2500');
      setFormMileageRate(fp?.mileageRateMinor ? String(fp.mileageRateMinor / 100) : '15');
      setFormDepartment(inspectEmployee.department || 'Engineering');
      setFormGrade(inspectEmployee.grade || 'L4');
      setFormHomeCity(inspectEmployee.homeCity || 'Bengaluru');
      setFormCityTierOverride(fp?.cityTierOverride || 'default');
      setFormRole(inspectEmployee.role || 'employee');
      setFormAutoApproveEligible(fp?.autoApproveEligible !== false);
      setFormReimbursementHold(Boolean(fp?.reimbursementHold));
      setFormNotes(fp?.notes || '');
    }
  }, [inspectEmployee, policy]);

  // Sync Global Org Allowances Form State when policy changes
  useEffect(() => {
    const t1 = policy.rules.find((r) => r.id === 'rule_cap_tier1_daily_meal')?.parameters.capAmountMinor;
    const t2 = policy.rules.find((r) => r.id === 'rule_cap_tier2_daily_meal')?.parameters.capAmountMinor;
    const t3 = policy.rules.find((r) => r.id === 'rule_cap_tier3_daily_meal')?.parameters.capAmountMinor;
    const single = policy.rules.find((r) => r.id === 'rule_cap_tx_meal')?.parameters.capAmountMinor;
    const attendee = policy.rules.find((r) => r.id === 'rule_cap_client_attendee')?.parameters.capAmountMinor;

    setOrgTier1Cap(t1 ? String(t1 / 100) : '3000');
    setOrgTier2Cap(t2 ? String(t2 / 100) : '1800');
    setOrgTier3Cap(t3 ? String(t3 / 100) : '1200');
    setOrgIntlCap('6500');
    setOrgSingleMealCap(single ? String(single / 100) : '2000');
    setOrgClientAttendeeCap(attendee ? String(attendee / 100) : '2500');
    setOrgRiskThreshold(String(policy.settings.autoApproveRiskThreshold ?? 25));
    setOrgMinConfidence(String(Math.round((policy.settings.autoApproveMinConfidence ?? 0.8) * 100)));
    setOrgSubmissionDays(String(policy.settings.lateSubmissionWindowDays ?? 30));
  }, [policy]);

  // Handle keyboard Escape and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectEmployee(null);
        setIsOrgAllowancesOpen(false);
        setIsAddUserModalOpen(false);
        setEmployeeToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (inspectEmployee || isOrgAllowancesOpen || isAddUserModalOpen || employeeToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [inspectEmployee, isOrgAllowancesOpen, isAddUserModalOpen, employeeToDelete]);

  // Helper for showing a temporary toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to get claims for an employee
  const getEmployeeClaims = (emp: Employee) => {
    const isAlice =
      emp.id === 'emp_101' ||
      emp.id === 'pXmBbGDnDwTsrErsGuad8r4Gz4S2' ||
      emp.id === 'nEqzcEzb0zPDjsvy4tfL8tm2QHl1' ||
      emp.identity.email.toLowerCase() === 'employee@keepr.com' ||
      emp.identity.email.toLowerCase() === 'alice.walker@jpmorgan.com' ||
      emp.identity.email.toLowerCase() === 'alice.walker@acme.com' ||
      emp.identity.name.toLowerCase() === 'alice walker';

    const isFrank =
      emp.id === 'emp_106' ||
      emp.id === '3OcwLiDA6vURaNXWvXXv8ZONgQs2' ||
      emp.id === 'NaFwF6pXaHfTJJWhOyD4NjHbBLQ2' ||
      emp.identity.email.toLowerCase() === 'auditor@keepr.com' ||
      emp.identity.email.toLowerCase() === 'frank.castle@jpmorgan.com' ||
      emp.identity.email.toLowerCase() === 'frank.castle@acme.com' ||
      emp.identity.name.toLowerCase().startsWith('frank castle');

    return expenses.filter((e) => {
      if (isAlice) {
        return (
          e.employeeId === 'emp_101' ||
          e.employeeId === 'pXmBbGDnDwTsrErsGuad8r4Gz4S2' ||
          e.employeeId === 'nEqzcEzb0zPDjsvy4tfL8tm2QHl1' ||
          (e as any).employeeAlias === 'emp_101' ||
          (e as any).employeeEmail?.toLowerCase() === 'alice.walker@jpmorgan.com' ||
          (e as any).employeeEmail?.toLowerCase() === 'alice.walker@acme.com' ||
          (e as any).employeeEmail?.toLowerCase() === 'employee@keepr.com'
        );
      }
      if (isFrank) {
        return (
          e.employeeId === 'emp_106' ||
          e.employeeId === '3OcwLiDA6vURaNXWvXXv8ZONgQs2' ||
          e.employeeId === 'NaFwF6pXaHfTJJWhOyD4NjHbBLQ2' ||
          (e as any).employeeAlias === 'emp_106' ||
          (e as any).employeeEmail?.toLowerCase() === 'frank.castle@jpmorgan.com' ||
          (e as any).employeeEmail?.toLowerCase() === 'frank.castle@acme.com' ||
          (e as any).employeeEmail?.toLowerCase() === 'auditor@keepr.com'
        );
      }
      return (
        e.employeeId === emp.id ||
        (e as any).employeeAlias === emp.id ||
        (e as any).employeeEmail?.toLowerCase() === emp.identity.email.toLowerCase()
      );
    });
  };

  // Compute metrics per employee
  const employeeData = useMemo(() => {
    // Unique employees by canonical corporate person
    const seen = new Set<string>();
    const uniqueEmployees: Employee[] = [];

    for (const emp of employeesList) {
      const email = (emp.identity?.email || '').trim().toLowerCase();
      const name = (emp.identity?.name || '').trim().toLowerCase();

      let canonicalKey = email;
      if (email === 'employee@keepr.com' || email === 'alice.walker@jpmorgan.com' || email === 'alice.walker@acme.com' || name === 'alice walker') {
        canonicalKey = 'person:alice_walker';
      } else if (email === 'auditor@keepr.com' || email === 'frank.castle@jpmorgan.com' || email === 'frank.castle@acme.com' || name.startsWith('frank castle')) {
        canonicalKey = 'person:frank_castle';
      }

      if (seen.has(canonicalKey)) continue;
      seen.add(canonicalKey);

      if (canonicalKey === 'person:alice_walker') {
        uniqueEmployees.push({
          ...emp,
          id: emp.id.startsWith('emp_') ? emp.id : 'emp_101',
          identity: {
            ...emp.identity,
            name: 'Alice Walker',
            email: 'alice.walker@jpmorgan.com',
          },
          role: 'employee',
          department: emp.department || 'Engineering',
          grade: emp.grade || 'L4',
          homeCity: emp.homeCity || 'Bengaluru',
        });
      } else if (canonicalKey === 'person:frank_castle') {
        uniqueEmployees.push({
          ...emp,
          id: emp.id.startsWith('emp_') ? emp.id : 'emp_106',
          identity: {
            ...emp.identity,
            name: 'Frank Castle',
            email: 'frank.castle@jpmorgan.com',
          },
          role: 'finance',
          department: emp.department || 'Finance & Audit',
          grade: emp.grade || 'Finance Officer',
          homeCity: emp.homeCity || 'Bengaluru',
        });
      } else {
        uniqueEmployees.push(emp);
      }
    }

    return uniqueEmployees.map((emp) => {
      const empExpenses = getEmployeeClaims(emp);

      let totalSubmitted = empExpenses.length;
      let approvedAmountMinor = 0;
      let inReviewAmountMinor = 0;
      let rejectedCount = 0;

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

      // Allowance estimate based on custom overrides or home city tier
      const fp = emp.financeProfile;
      const isCustomAllowance = Boolean(fp?.customAllowanceEnabled);
      const cityTier = fp?.cityTierOverride || policy.cityTiers[emp.homeCity] || 'Tier-1';

      const tier1Cap = policy.rules.find((r) => r.id === 'rule_cap_tier1_daily_meal')?.parameters.capAmountMinor ?? 300000;
      const tier2Cap = policy.rules.find((r) => r.id === 'rule_cap_tier2_daily_meal')?.parameters.capAmountMinor ?? 180000;
      const tier3Cap = policy.rules.find((r) => r.id === 'rule_cap_tier3_daily_meal')?.parameters.capAmountMinor ?? 120000;
      const defaultDailyCapMinor = cityTier === 'Tier-1' ? tier1Cap : cityTier === 'Tier-2' ? tier2Cap : tier3Cap;

      const dailyCapMinor = isCustomAllowance && fp?.dailyMealAllowanceMinor ? fp.dailyMealAllowanceMinor : defaultDailyCapMinor;
      const monthlyAllowanceMinor = isCustomAllowance && fp?.monthlySpendCapMinor ? fp.monthlySpendCapMinor : dailyCapMinor * 20;

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
        monthlyAllowance: monthlyAllowanceMinor / 100,
        allowancePercent,
        isCustomAllowance,
        reimbursementHold: Boolean(fp?.reimbursementHold),
        autoApproveEligible: fp?.autoApproveEligible !== false,
        topCategories: Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      };
    });
  }, [employeesList, expenses, policy]);

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

  // Claims for the currently inspected employee
  const inspectClaims = useMemo(() => {
    if (!inspectEmployee) return [];
    return getEmployeeClaims(inspectEmployee).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }, [inspectEmployee, expenses]);

  // Inspected employee active stats
  const inspectStats = useMemo(() => {
    if (!inspectEmployee) return null;
    return employeeData.find((d) => d.employee.id === inspectEmployee.id) || null;
  }, [inspectEmployee, employeeData]);

  // Handle Save Employee Finance Profile
  const handleSaveEmployeeFinance = () => {
    if (!inspectEmployee) return;

    const updated = updateEmployee(inspectEmployee.id, {
      department: formDepartment,
      grade: formGrade,
      homeCity: formHomeCity,
      role: formRole,
      financeProfile: {
        customAllowanceEnabled: formCustomAllowanceEnabled,
        dailyMealAllowanceMinor: Math.round(Number(formDailyMealAllowance || 0) * 100),
        monthlySpendCapMinor: Math.round(Number(formMonthlySpendCap || 0) * 100),
        perClaimMealLimitMinor: Math.round(Number(formPerClaimMealLimit || 0) * 100),
        clientDiningPerAttendeeMinor: Math.round(Number(formClientDiningPerAttendee || 0) * 100),
        mileageRateMinor: Math.round(Number(formMileageRate || 0) * 100),
        cityTierOverride: formCityTierOverride === 'default' ? undefined : (formCityTierOverride as CityTier),
        autoApproveEligible: formAutoApproveEligible,
        reimbursementHold: formReimbursementHold,
        notes: formNotes,
      },
    });

    setInspectEmployee(updated);
    triggerToast(`Allowances & finance settings saved for ${inspectEmployee.identity.name}!`);
  };

  // Handle Reset Employee Finance Profile to Corporate Defaults
  const handleResetEmployeeFinance = () => {
    if (!inspectEmployee) return;
    const reset = resetEmployeeFinanceProfile(inspectEmployee.id);
    setInspectEmployee(reset);
    triggerToast(`Reset ${inspectEmployee.identity.name}'s allowances to company policy defaults.`);
  };

  // Handle Create New Employee
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      triggerToast('Please provide both employee name and corporate email.');
      return;
    }

    if (!addEmail.includes('@') || !addEmail.includes('.')) {
      triggerToast('Please provide a valid corporate email address.');
      return;
    }

    const created = addEmployee({
      name: addName.trim(),
      email: addEmail.trim().toLowerCase(),
      role: addRole,
      department: addDepartment,
      grade: addGrade,
      homeCity: addHomeCity,
      financeProfile: addCustomAllowance
        ? {
            customAllowanceEnabled: true,
            dailyMealAllowanceMinor: Math.round(Number(addDailyCap || 3000) * 100),
            monthlySpendCapMinor: Math.round(Number(addMonthlyCap || 60000) * 100),
            autoApproveEligible: addAutoApprove,
          }
        : {
            autoApproveEligible: addAutoApprove,
          },
    });

    setIsAddUserModalOpen(false);
    setAddName('');
    setAddEmail('');
    setAddCustomAllowance(false);
    triggerToast(`Added ${created.identity.name} to corporate employee directory!`);
  };

  // Handle Confirm Delete Employee
  const handleConfirmDeleteEmployee = () => {
    if (!employeeToDelete) return;
    const name = employeeToDelete.identity.name;
    const id = employeeToDelete.id;

    deleteEmployee(id);
    if (inspectEmployee?.id === id) {
      setInspectEmployee(null);
    }
    setEmployeeToDelete(null);
    triggerToast(`Removed ${name} from corporate directory.`);
  };

  // Handle Save Global Organization Allowances
  const handleSaveOrgAllowances = () => {
    updatePolicyAllowances({
      tier1MealCapMinor: Math.round(Number(orgTier1Cap) * 100),
      tier2MealCapMinor: Math.round(Number(orgTier2Cap) * 100),
      tier3MealCapMinor: Math.round(Number(orgTier3Cap) * 100),
      singleMealCapMinor: Math.round(Number(orgSingleMealCap) * 100),
      clientAttendeeCapMinor: Math.round(Number(orgClientAttendeeCap) * 100),
      autoApproveRiskThreshold: Number(orgRiskThreshold),
      autoApproveMinConfidence: Number(orgMinConfidence) / 100,
      lateSubmissionWindowDays: Number(orgSubmissionDays),
    });

    setIsOrgAllowancesOpen(false);
    triggerToast('Company-wide expense allowances and audit thresholds updated!');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <span>Employees & Spend Allowances</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Directory of corporate employees, historical claim submissions, and allowance consumption meters.
          </p>
        </div>

        {/* Global actions and metrics */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer group shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            <span>Add Employee</span>
          </button>

          <button
            onClick={() => setIsOrgAllowancesOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer group shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Policy Allowances & Caps</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs shadow-2xs shrink-0">
            <span className="text-slate-500">Active Staff:</span>
            <span className="font-semibold text-slate-900">{employeeData.length} Members</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono-code font-bold text-emerald-700">
              ₹{Math.round(employeeData.reduce((acc, d) => acc + d.approvedAmount, 0)).toLocaleString()} Reimbursed
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Department Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedDepartment('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedDepartment === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50/70 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredEmployees.map((data) => {
          const emp = data.employee;
          const initials = (emp.identity?.name || 'Employee')
            .split(' ')
            .map((n) => n[0] || '')
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'EM';

          return (
            <div
              key={emp.id}
              onClick={() => {
                setInspectEmployee(emp);
                setDrawerTab('finance');
              }}
              className="bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs rounded-xl p-3.5 transition-all duration-150 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header: Avatar, Name & Role */}
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-xs sm:text-[13px] text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                          {emp.identity.name}
                        </h3>
                        {data.isCustomAllowance && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" title="Custom allowance profile active" />
                        )}
                        {data.reimbursementHold && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Reimbursement hold active" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {emp.department} · {emp.homeCity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      emp.role === 'finance'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}>
                      {emp.role === 'finance' ? 'Finance' : emp.grade}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmployeeToDelete(emp);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                      title={`Delete ${emp.identity.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Inline Compact Stats */}
                <div className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-slate-50/80 border border-slate-100 rounded-lg my-2 font-mono-code">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-sans text-[10px]">Approved:</span>
                    <span className="font-semibold text-emerald-700">₹{Math.round(data.approvedAmount).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-400 font-sans text-[10px]">
                    {data.totalSubmitted} claims
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700">{data.allowancePercent}%</span>
                    <span className="text-slate-400 font-sans text-[10px]">used</span>
                  </div>
                </div>

                {/* Mini Allowance Bar */}
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      data.allowancePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, data.allowancePercent))}%` }}
                  />
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${data.rejectedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="text-slate-500 text-[11px]">
                    {data.rejectedCount > 0 ? `${data.rejectedCount} flagged` : 'Compliant'}
                  </span>
                </span>
                <span className="font-medium text-emerald-600 group-hover:text-emerald-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all text-[11px]">
                  <span>Configure</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Centered Responsive Modal for Selected Employee */}
      {inspectEmployee &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto transition-all"
            onClick={() => setInspectEmployee(null)}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header: Clean & Understated */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/70 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0">
                    {((inspectEmployee.identity?.name || 'Employee').split(' ').map((n) => n[0] || '').join('') || 'EM').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-base text-slate-900 truncate">
                        {inspectEmployee.identity.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        {inspectEmployee.role === 'finance' ? 'Auditor' : inspectEmployee.grade}
                      </span>
                      {inspectEmployee.financeProfile?.customAllowanceEnabled && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                          Custom Policy
                        </span>
                      )}
                      {inspectEmployee.financeProfile?.reimbursementHold && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                          Hold Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {inspectEmployee.identity.email} · {inspectEmployee.department} · {inspectEmployee.homeCity}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectEmployee(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Minimal Tab Bar */}
              <div className="px-5 border-b border-slate-100 flex items-center gap-6 bg-white shrink-0">
                <button
                  onClick={() => setDrawerTab('finance')}
                  className={`py-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'finance'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Policy & Allowances
                </button>
                <button
                  onClick={() => setDrawerTab('claims')}
                  className={`py-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'claims'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Submitted Claims ({inspectClaims.length})
                </button>
                <button
                  onClick={() => setDrawerTab('analytics')}
                  className={`py-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                    drawerTab === 'analytics'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Spend Analytics
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-5 overflow-y-auto space-y-6 overscroll-contain">
                {/* TAB 1: POLICY & ALLOWANCES (MINIMAL & PREMIUM) */}
                {drawerTab === 'finance' && (
                  <div className="space-y-6">
                    {/* Section 1: Corporate Profile & Assignment */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Corporate Assignment
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Department
                          </label>
                          <select
                            value={formDepartment}
                            onChange={(e) => setFormDepartment(e.target.value)}
                            className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                          >
                            {['Engineering', 'Sales', 'Marketing', 'Product', 'Operations', 'Finance & Audit', 'Executive', 'Legal', 'HR'].map(
                              (dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Corporate Grade
                          </label>
                          <select
                            value={formGrade}
                            onChange={(e) => setFormGrade(e.target.value)}
                            className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                          >
                            {['L1', 'L2', 'L3', 'L4', 'L5', 'Executive', 'Staff', 'Principal', 'Director', 'VP', 'CFO', 'Finance Officer'].map(
                              (g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Home Station Hub
                          </label>
                          <select
                            value={formHomeCity}
                            onChange={(e) => setFormHomeCity(e.target.value)}
                            className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                          >
                            {['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Goa'].map(
                              (c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            City Tier Override
                          </label>
                          <select
                            value={formCityTierOverride}
                            onChange={(e) => setFormCityTierOverride(e.target.value)}
                            className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                          >
                            <option value="default">Default from Home Station ({policy.cityTiers[formHomeCity] || 'Tier-1'})</option>
                            <option value="Tier-1">Tier-1 (₹3,000 / day standard)</option>
                            <option value="Tier-2">Tier-2 (₹1,800 / day standard)</option>
                            <option value="Tier-3">Tier-3 (₹1,200 / day standard)</option>
                            <option value="International">International (₹6,500 / day)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            System Role Clearance
                          </label>
                          <select
                            value={formRole}
                            onChange={(e) => setFormRole(e.target.value as UserRole)}
                            className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                          >
                            <option value="employee">Standard Employee</option>
                            <option value="finance">Finance Auditor / Officer</option>
                            <option value="admin">System Administrator</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    {/* Section 2: Spend Allowances & Caps */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-xs font-medium text-slate-900">
                            Custom Spend Allowances
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Override corporate per-diem and monthly caps for this employee.
                          </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formCustomAllowanceEnabled}
                            onChange={(e) => setFormCustomAllowanceEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                        </label>
                      </div>

                      {/* If custom is disabled, clean minimal readout */}
                      {!formCustomAllowanceEnabled && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-6">
                            <div>
                              <div className="text-[10px] text-slate-400 font-medium">Daily Meal</div>
                              <div className="font-semibold text-slate-800 font-mono-code">₹{inspectStats?.dailyCap.toLocaleString()}/day</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-medium">Single Meal Cap</div>
                              <div className="font-semibold text-slate-800 font-mono-code">₹2,000/claim</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 font-medium">Monthly Cap</div>
                              <div className="font-semibold text-slate-800 font-mono-code">₹{inspectStats?.monthlyAllowance.toLocaleString()}/mo</div>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Inheriting policy baseline
                          </span>
                        </div>
                      )}

                      {/* Custom Allowances Grid */}
                      {formCustomAllowanceEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Daily Meal Allowance (₹/day)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={formDailyMealAllowance}
                                onChange={(e) => setFormDailyMealAllowance(e.target.value)}
                                className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                              <span>Quick presets:</span>
                              {['2000', '3000', '5000'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setFormDailyMealAllowance(preset)}
                                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                >
                                  ₹{Number(preset).toLocaleString()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Monthly Spend Cap (₹/month)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={formMonthlySpendCap}
                                onChange={(e) => setFormMonthlySpendCap(e.target.value)}
                                className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                              <span>Quick presets:</span>
                              {['40000', '60000', '100000'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setFormMonthlySpendCap(preset)}
                                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                >
                                  ₹{Number(preset).toLocaleString()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Single Meal Limit (₹/claim)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={formPerClaimMealLimit}
                                onChange={(e) => setFormPerClaimMealLimit(e.target.value)}
                                className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Client Dining / Attendee (₹)
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                              <input
                                type="number"
                                value={formClientDiningPerAttendee}
                                onChange={(e) => setFormClientDiningPerAttendee(e.target.value)}
                                className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100" />

                    {/* Section 3: Compliance & Payout Rules */}
                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Audit Governance
                      </div>

                      {/* Row 1: Touchless Auto-Approval */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                        <div>
                          <div className="text-xs font-medium text-slate-900">Touchless Auto-Approval</div>
                          <div className="text-[11px] text-slate-400">
                            Automatically approve low-risk claims (risk score ≤ 25) without manual auditor action.
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={formAutoApproveEligible}
                            onChange={(e) => setFormAutoApproveEligible(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                        </label>
                      </div>

                      {/* Row 2: Reimbursement Hold */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                        <div>
                          <div className="text-xs font-medium text-slate-900">Reimbursement Payout Hold</div>
                          <div className="text-[11px] text-slate-400">
                            Hold disbursements for this employee while retaining full submission records.
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={formReimbursementHold}
                            onChange={(e) => setFormReimbursementHold(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                        </label>
                      </div>

                      {/* Auditor Compliance Notes */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Auditor Notes
                        </label>
                        <textarea
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          rows={2}
                          placeholder="Internal compliance notes or rationale for custom limits..."
                          className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: SUBMITTED CLAIMS (CLEAN LIST) */}
                {drawerTab === 'claims' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-500">
                        {inspectClaims.length} total submissions
                      </span>
                      <span className="font-mono-code font-semibold text-slate-900">
                        Total: ₹{inspectClaims.reduce((acc, c) => acc + (c.verdict?.approvedAmountMinor || c.normalizedCurrency.targetAmountMinor) / 100, 0).toLocaleString()}
                      </span>
                    </div>

                    {inspectClaims.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No claims filed by this employee yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                        {inspectClaims.map((exp) => (
                          <div
                            key={exp.id}
                            className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">
                                {exp.extracted?.merchant?.value || exp.id}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {exp.expenseDate} · {exp.extracted?.lineItems?.[0]?.category || 'General'}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-semibold font-mono-code text-slate-900">
                                ₹{(exp.normalizedCurrency.targetAmountMinor / 100).toLocaleString()}
                              </div>
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${
                                  exp.status === 'auto_approved'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : exp.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : exp.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {exp.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: SPEND ANALYTICS (MINIMAL) */}
                {drawerTab === 'analytics' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Reimbursed</span>
                        <div className="font-bold text-base text-slate-900 mt-0.5 font-mono-code">
                          ₹{inspectStats?.approvedAmount.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{inspectClaims.length} submissions</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Monthly Budget</span>
                        <div className="font-bold text-base text-slate-900 mt-0.5 font-mono-code">
                          ₹{inspectStats?.monthlyAllowance.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inspectStats?.isCustomAllowance ? 'Custom limit' : 'Policy baseline'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700">Allowance Consumption</span>
                        <span className="font-mono-code text-slate-500">{inspectStats?.allowancePercent}% used</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (inspectStats?.allowancePercent || 0) > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(4, inspectStats?.allowancePercent || 0)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-code text-right">
                        ₹{Math.max(0, (inspectStats?.monthlyAllowance || 0) - (inspectStats?.approvedAmount || 0)).toLocaleString()} remaining
                      </div>
                    </div>

                    {/* Top Categories */}
                    {inspectStats?.topCategories && inspectStats.topCategories.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-slate-700">Top Categories</span>
                        <div className="space-y-1.5">
                          {inspectStats.topCategories.map(([cat, amtMinor]) => (
                            <div key={cat} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50">
                              <span className="text-slate-600">{cat}</span>
                              <span className="font-mono-code font-semibold text-slate-900">
                                ₹{(amtMinor / 100).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer: Clean, Minimal, Non-Bloated */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEmployeeToDelete(inspectEmployee)}
                    className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Delete employee
                  </button>
                  <span className="text-slate-200">·</span>
                  <button
                    type="button"
                    onClick={handleResetEmployeeFinance}
                    className="text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Reset defaults
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectEmployee(null)}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveEmployeeFinance}
                    className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Global Organization Allowances & Caps Modal Mounted via createPortal */}
      {isOrgAllowancesOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
            onClick={() => setIsOrgAllowancesOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base text-slate-900">
                    Company Policy Allowances
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Baseline daily per-diem limits and touchless audit thresholds.
                  </p>
                </div>

                <button
                  onClick={() => setIsOrgAllowancesOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* City Tier Allowances */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Daily Meal Allowance by City Tier
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Tier-1 (₹/day)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          value={orgTier1Cap}
                          onChange={(e) => setOrgTier1Cap(e.target.value)}
                          className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">BLR, BOM, DEL</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Tier-2 (₹/day)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          value={orgTier2Cap}
                          onChange={(e) => setOrgTier2Cap(e.target.value)}
                          className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">PUN, CCU, HYD</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Tier-3 (₹/day)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          value={orgTier3Cap}
                          onChange={(e) => setOrgTier3Cap(e.target.value)}
                          className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Others</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                {/* Per-Claim & Attendee Caps */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Transaction Limits
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Single Meal Cap (₹/claim)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          value={orgSingleMealCap}
                          onChange={(e) => setOrgSingleMealCap(e.target.value)}
                          className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Standard single receipt limit</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Client Dining / Attendee (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          value={orgClientAttendeeCap}
                          onChange={(e) => setOrgClientAttendeeCap(e.target.value)}
                          className="w-full h-9 pl-6 pr-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Multiplied by attendee count</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                {/* Audit & Auto-Approval Thresholds */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Touchless Auto-Approval Rules
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Max Risk Score
                      </label>
                      <input
                        type="number"
                        value={orgRiskThreshold}
                        onChange={(e) => setOrgRiskThreshold(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Threshold: &le; 25</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Min Confidence
                      </label>
                      <input
                        type="number"
                        value={orgMinConfidence}
                        onChange={(e) => setOrgMinConfidence(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Min: 80%</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Submission Window
                      </label>
                      <input
                        type="number"
                        value={orgSubmissionDays}
                        onChange={(e) => setOrgSubmissionDays(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Days from receipt</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrgAllowancesOpen(false)}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrgAllowances}
                  className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Save Policy
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add Employee Modal Mounted via createPortal */}
      {isAddUserModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto transition-all"
            onClick={() => setIsAddUserModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base text-slate-900">
                    Add New Employee
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Register a corporate user and configure their spend policy.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee}>
                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        placeholder="David Zhang"
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Corporate Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        placeholder="david.zhang@jpmorgan.com"
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white font-mono-code text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Department
                      </label>
                      <select
                        value={addDepartment}
                        onChange={(e) => setAddDepartment(e.target.value)}
                        className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      >
                        {['Engineering', 'Sales', 'Marketing', 'Product', 'Operations', 'Finance & Audit', 'Executive', 'Legal', 'HR'].map(
                          (dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Grade
                      </label>
                      <select
                        value={addGrade}
                        onChange={(e) => setAddGrade(e.target.value)}
                        className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      >
                        {['L1', 'L2', 'L3', 'L4', 'L5', 'Executive', 'Staff', 'Principal', 'Director', 'VP', 'CFO', 'Finance Officer'].map(
                          (g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Station Hub
                      </label>
                      <select
                        value={addHomeCity}
                        onChange={(e) => setAddHomeCity(e.target.value)}
                        className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      >
                        {['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Goa'].map(
                          (c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Clearance Role
                    </label>
                    <select
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as UserRole)}
                      className="w-full h-9 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                    >
                      <option value="employee">Standard Employee (Expense Submissions)</option>
                      <option value="finance">Finance Auditor / Officer (Review & Approvals)</option>
                      <option value="admin">System Administrator (Full Access)</option>
                    </select>
                  </div>

                  {/* Custom Allowances Setup */}
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900">
                        Custom Spend Limits
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addCustomAllowance}
                          onChange={(e) => setAddCustomAllowance(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                      </label>
                    </div>

                    {addCustomAllowance ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Daily Meal Allowance (₹/day)
                          </label>
                          <input
                            type="number"
                            value={addDailyCap}
                            onChange={(e) => setAddDailyCap(e.target.value)}
                            className="w-full h-9 px-3 text-xs rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-slate-900 font-mono-code"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Monthly Budget (₹/month)
                          </label>
                          <input
                            type="number"
                            value={addMonthlyCap}
                            onChange={(e) => setAddMonthlyCap(e.target.value)}
                            className="w-full h-9 px-3 text-xs rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-slate-900 font-mono-code"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Inherits company tier allowances for {policy.cityTiers[addHomeCity] || 'Tier-1'}.
                      </p>
                    )}
                  </div>

                  {/* Auto-Approval Checkbox */}
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={addAutoApprove}
                      onChange={(e) => setAddAutoApprove(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                    />
                    <span>Eligible for touchless auto-approval (risk score &le; 25)</span>
                  </label>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                  >
                    Create Employee
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Employee Confirmation Dialog Mounted via createPortal */}
      {employeeToDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
            onClick={() => setEmployeeToDelete(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5 space-y-3.5 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-semibold text-sm text-slate-900">
                  Delete Employee Record?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Remove <span className="font-medium text-slate-800">{employeeToDelete.identity.name}</span> (<span className="text-slate-600">{employeeToDelete.identity.email}</span>) from the corporate directory?
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEmployeeToDelete(null)}
                  className="flex-1 h-8 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteEmployee}
                  className="flex-1 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
