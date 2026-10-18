import { Employee, UserRole } from '../types/expense';

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: 'emp_101',
    orgId: 'org_acme',
    identity: { email: 'alice.walker@acme.com', name: 'Alice Walker' },
    role: 'employee',
    department: 'Engineering',
    grade: 'L4',
    homeCity: 'Bengaluru',
  },
  {
    id: 'emp_102',
    orgId: 'org_acme',
    identity: { email: 'bob.martin@acme.com', name: 'Bob Martin' },
    role: 'employee',
    department: 'Sales',
    grade: 'L5',
    homeCity: 'Mumbai',
  },
  {
    id: 'emp_103',
    orgId: 'org_acme',
    identity: { email: 'carol.danvers@acme.com', name: 'Carol Danvers' },
    role: 'employee',
    department: 'Marketing',
    grade: 'Executive',
    homeCity: 'Delhi',
  },
  {
    id: 'emp_104',
    orgId: 'org_acme',
    identity: { email: 'david.miller@acme.com', name: 'David Miller' },
    role: 'employee',
    department: 'Product',
    grade: 'L4',
    homeCity: 'Pune',
  },
  {
    id: 'emp_105',
    orgId: 'org_acme',
    identity: { email: 'elena.rostova@acme.com', name: 'Elena Rostova' },
    role: 'employee',
    department: 'Operations',
    grade: 'L3',
    homeCity: 'Jaipur',
  },
  {
    id: 'emp_106',
    orgId: 'org_acme',
    identity: { email: 'frank.castle@acme.com', name: 'Frank Castle (Finance)' },
    role: 'finance',
    department: 'Finance & Audit',
    grade: 'Finance Officer',
    homeCity: 'Bengaluru',
  },
];

export const SEEDED_ACCOUNTS: Employee[] = [
  {
    id: 'pXmBbGDnDwTsrErsGuad8r4Gz4S2',
    orgId: 'org_acme',
    identity: { email: 'employee@keepr.com', name: 'Alice Walker' },
    role: 'employee',
    department: 'Engineering',
    grade: 'L4',
    homeCity: 'Bengaluru',
  },
  {
    id: 'nEqzcEzb0zPDjsvy4tfL8tm2QHl1',
    orgId: 'org_acme',
    identity: { email: 'alice.walker@acme.com', name: 'Alice Walker' },
    role: 'employee',
    department: 'Engineering',
    grade: 'L4',
    homeCity: 'Bengaluru',
  },
  {
    id: '3OcwLiDA6vURaNXWvXXv8ZONgQs2',
    orgId: 'org_acme',
    identity: { email: 'auditor@keepr.com', name: 'Frank Castle' },
    role: 'finance',
    department: 'Finance & Audit',
    grade: 'Finance Officer',
    homeCity: 'Bengaluru',
  },
  {
    id: 'NaFwF6pXaHfTJJWhOyD4NjHbBLQ2',
    orgId: 'org_acme',
    identity: { email: 'frank.castle@acme.com', name: 'Frank Castle' },
    role: 'finance',
    department: 'Finance & Audit',
    grade: 'Finance Officer',
    homeCity: 'Bengaluru',
  },
];

export function getAllEmployeesList(): Employee[] {
  return [...SEEDED_ACCOUNTS, ...DEMO_EMPLOYEES];
}

const STORAGE_KEY_CURRENT_EMPLOYEE = 'keepr_active_employee_id';
const STORAGE_KEY_CURRENT_ROLE = 'keepr_active_role';
const STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE = 'keepr_active_employee_profile';

export function setActiveEmployeeProfile(emp: Employee): void {
  try {
    const raw = JSON.stringify(emp);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE, raw);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE, raw);
    setActiveEmployee(emp.id);
    setActiveRole(emp.role);
  } catch (e) {}
}

export function clearActiveEmployeeProfile(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE);
      sessionStorage.removeItem(STORAGE_KEY_CURRENT_EMPLOYEE);
      sessionStorage.removeItem(STORAGE_KEY_CURRENT_ROLE);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE);
      localStorage.removeItem(STORAGE_KEY_CURRENT_EMPLOYEE);
      localStorage.removeItem(STORAGE_KEY_CURRENT_ROLE);
    }
  } catch (e) {}
}

export function getActiveEmployee(): Employee {
  try {
    const savedObj =
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE) : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE) : null);
    if (savedObj) {
      const parsed = JSON.parse(savedObj);
      if (parsed && parsed.id && parsed.identity) return parsed;
    }

    const savedId =
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_CURRENT_EMPLOYEE) : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CURRENT_EMPLOYEE) : null);
    if (savedId) {
      const all = getAllEmployeesList();
      const found = all.find((e) => e.id === savedId || e.identity.email === savedId);
      if (found) return found;
    }
  } catch (err) {
    console.error('Error reading active employee from storage:', err);
  }
  return SEEDED_ACCOUNTS[0] || DEMO_EMPLOYEES[0]; // Alice Walker default
}

export function setActiveEmployee(employeeId: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY_CURRENT_EMPLOYEE, employeeId);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_CURRENT_EMPLOYEE, employeeId);
  } catch (e) {}
  const all = getAllEmployeesList();
  const found = all.find((e) => e.id === employeeId || e.identity.email === employeeId);
  if (found) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY_CURRENT_ROLE, found.role);
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_CURRENT_ROLE, found.role);
    } catch (e) {}
  }
}

export function getActiveRole(): UserRole {
  try {
    const role = (
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_CURRENT_ROLE) : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CURRENT_ROLE) : null)
    ) as UserRole;
    if (role) return role;
  } catch (err) {
    console.error('Error reading active role:', err);
  }
  return getActiveEmployee().role;
}

export function setActiveRole(role: UserRole): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY_CURRENT_ROLE, role);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_CURRENT_ROLE, role);
  } catch (e) {}
}
