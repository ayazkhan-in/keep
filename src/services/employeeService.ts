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

const STORAGE_KEY_CURRENT_EMPLOYEE = 'keepr_active_employee_id';
const STORAGE_KEY_CURRENT_ROLE = 'keepr_active_role';

export function getActiveEmployee(): Employee {
  try {
    const savedId =
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_CURRENT_EMPLOYEE) : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CURRENT_EMPLOYEE) : null);
    if (savedId) {
      const found = DEMO_EMPLOYEES.find((e) => e.id === savedId);
      if (found) return found;
    }
  } catch (err) {
    console.error('Error reading active employee from storage:', err);
  }
  return DEMO_EMPLOYEES[0]; // Alice Walker default
}

export function setActiveEmployee(employeeId: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY_CURRENT_EMPLOYEE, employeeId);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_CURRENT_EMPLOYEE, employeeId);
  } catch (e) {}
  const found = DEMO_EMPLOYEES.find((e) => e.id === employeeId);
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
