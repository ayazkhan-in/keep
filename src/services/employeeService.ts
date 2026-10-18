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

const STORAGE_KEY_CUSTOM_EMPLOYEES = 'keepr_custom_employees';
const STORAGE_KEY_ADDED_EMPLOYEES = 'keepr_added_employees';
const STORAGE_KEY_DELETED_EMPLOYEES = 'keepr_deleted_employees';

function getCustomEmployeesMap(): Record<string, Partial<Employee>> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CUSTOM_EMPLOYEES) : null;
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading custom employees from storage:', err);
  }
  return {};
}

function saveCustomEmployeesMap(map: Record<string, Partial<Employee>>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CUSTOM_EMPLOYEES, JSON.stringify(map));
    }
  } catch (err) {
    console.error('Failed saving custom employees to storage:', err);
  }
}

function getAddedEmployees(): Employee[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ADDED_EMPLOYEES) : null;
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading added employees from storage:', err);
  }
  return [];
}

function saveAddedEmployees(list: Employee[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ADDED_EMPLOYEES, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Failed saving added employees to storage:', err);
  }
}

function getDeletedEmployeeIds(): string[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DELETED_EMPLOYEES) : null;
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading deleted employee ids:', err);
  }
  return [];
}

function saveDeletedEmployeeIds(ids: string[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DELETED_EMPLOYEES, JSON.stringify(ids));
    }
  } catch (err) {
    console.error('Failed saving deleted employee ids:', err);
  }
}

export function getAllEmployeesList(): Employee[] {
  const base = [...SEEDED_ACCOUNTS, ...DEMO_EMPLOYEES];
  const added = getAddedEmployees();
  const deletedIds = new Set(getDeletedEmployeeIds());

  // Filter out any employees marked as deleted
  const combined = [...added, ...base].filter(
    (emp) => !deletedIds.has(emp.id) && !deletedIds.has(emp.identity.email.toLowerCase())
  );

  const customMap = getCustomEmployeesMap();
  if (!Object.keys(customMap).length) return combined;

  return combined.map((emp) => {
    const override = customMap[emp.id] || customMap[emp.identity.email.toLowerCase()];
    if (!override) return emp;
    return {
      ...emp,
      ...override,
      identity: {
        ...emp.identity,
        ...(override.identity || {}),
      },
      financeProfile: override.financeProfile
        ? {
            ...(emp.financeProfile || {}),
            ...override.financeProfile,
          }
        : emp.financeProfile,
    };
  });
}

export function addEmployee(data: {
  name: string;
  email: string;
  role?: UserRole;
  department: string;
  grade: string;
  homeCity: string;
  financeProfile?: EmployeeFinanceProfile;
}): Employee {
  const id = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanEmail = data.email.trim().toLowerCase();

  const newEmp: Employee = {
    id,
    orgId: 'org_acme',
    identity: {
      name: data.name.trim(),
      email: cleanEmail,
    },
    role: data.role || 'employee',
    department: data.department || 'Engineering',
    grade: data.grade || 'L4',
    homeCity: data.homeCity || 'Bengaluru',
    financeProfile: data.financeProfile,
  };

  const added = getAddedEmployees();
  const existingIdx = added.findIndex(
    (e) => e.identity.email.toLowerCase() === cleanEmail
  );
  if (existingIdx >= 0) {
    added[existingIdx] = newEmp;
  } else {
    added.unshift(newEmp);
  }
  saveAddedEmployees(added);

  // If this email or id was previously deleted, remove it from deleted list
  const deleted = getDeletedEmployeeIds();
  const filteredDeleted = deleted.filter(
    (d) => d !== id && d !== cleanEmail
  );
  if (filteredDeleted.length !== deleted.length) {
    saveDeletedEmployeeIds(filteredDeleted);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('keepr:employees-updated', {
        detail: { employeeId: newEmp.id, employee: newEmp, action: 'add' },
      })
    );
  }

  return newEmp;
}

export function getRelatedEmployeeIdentifiers(idOrEmail: string): string[] {
  const norm = idOrEmail.trim().toLowerCase();
  if (
    norm === 'emp_101' ||
    norm === 'pxmbbgdndwtsrersguad8r4gz4s2' ||
    norm === 'neqzcezb0zpdjsvy4tfl8tm2qhl1' ||
    norm === 'employee@keepr.com' ||
    norm === 'alice.walker@acme.com' ||
    norm === 'alice walker'
  ) {
    return [
      'emp_101',
      'pXmBbGDnDwTsrErsGuad8r4Gz4S2',
      'nEqzcEzb0zPDjsvy4tfL8tm2QHl1',
      'employee@keepr.com',
      'alice.walker@acme.com',
    ];
  }
  if (
    norm === 'emp_106' ||
    norm === '3ocwlidda6vuranxwvxxv8zongqs2' ||
    norm === 'nafwf6pxahftjjwhoyd4njhbblq2' ||
    norm === 'auditor@keepr.com' ||
    norm === 'frank.castle@acme.com' ||
    norm === 'frank castle' ||
    norm.startsWith('frank castle')
  ) {
    return [
      'emp_106',
      '3OcwLiDA6vURaNXWvXXv8ZONgQs2',
      'NaFwF6pXaHfTJJWhOyD4NjHbBLQ2',
      'auditor@keepr.com',
      'frank.castle@acme.com',
    ];
  }
  return [idOrEmail];
}

export function deleteEmployee(employeeId: string): boolean {
  const all = getAllEmployeesList();
  const toDelete = all.find(
    (e) => e.id === employeeId || e.identity.email.toLowerCase() === employeeId.toLowerCase()
  );
  if (!toDelete) return false;

  const related = Array.from(
    new Set([
      ...getRelatedEmployeeIdentifiers(toDelete.id),
      ...getRelatedEmployeeIdentifiers(toDelete.identity.email),
      toDelete.id,
      toDelete.identity.email.toLowerCase(),
    ])
  );

  // Remove from added employees if present
  const added = getAddedEmployees();
  const filteredAdded = added.filter(
    (e) => !related.includes(e.id) && !related.includes(e.identity.email.toLowerCase())
  );
  saveAddedEmployees(filteredAdded);

  // Mark in deleted employees
  const deleted = getDeletedEmployeeIds();
  for (const rel of related) {
    if (!deleted.includes(rel)) deleted.push(rel);
    if (!deleted.includes(rel.toLowerCase())) deleted.push(rel.toLowerCase());
  }
  saveDeletedEmployeeIds(deleted);

  // Remove any custom overrides
  const customMap = getCustomEmployeesMap();
  let mapModified = false;
  for (const rel of related) {
    if (customMap[rel]) {
      delete customMap[rel];
      mapModified = true;
    }
    if (customMap[rel.toLowerCase()]) {
      delete customMap[rel.toLowerCase()];
      mapModified = true;
    }
  }
  if (mapModified) {
    saveCustomEmployeesMap(customMap);
  }

  // If active employee was deleted, fallback to another
  const activeEmp = getActiveEmployee();
  if (related.includes(activeEmp.id) || related.includes(activeEmp.identity.email.toLowerCase())) {
    const remaining = getAllEmployeesList();
    if (remaining.length > 0) {
      setActiveEmployeeProfile(remaining[0]);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('keepr:employees-updated', {
        detail: { employeeId: toDelete.id, action: 'delete' },
      })
    );
  }

  return true;
}

export function getEmployeeById(idOrEmail: string): Employee | undefined {
  const all = getAllEmployeesList();
  const related = getRelatedEmployeeIdentifiers(idOrEmail);
  return all.find(
    (e) =>
      e.id === idOrEmail ||
      e.identity.email.toLowerCase() === idOrEmail.toLowerCase() ||
      related.includes(e.id) ||
      related.includes(e.identity.email.toLowerCase())
  );
}

export function updateEmployee(employeeId: string, updates: Partial<Employee>): Employee {
  const customMap = getCustomEmployeesMap();
  const existingOverride = customMap[employeeId] || {};

  const mergedOverride: Partial<Employee> = {
    ...existingOverride,
    ...updates,
    identity: {
      ...(existingOverride.identity || {}),
      ...(updates.identity || {}),
    },
    financeProfile: {
      ...(existingOverride.financeProfile || {}),
      ...(updates.financeProfile || {}),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Auditor Panel',
    },
  };

  const related = getRelatedEmployeeIdentifiers(employeeId);
  for (const rel of related) {
    customMap[rel] = mergedOverride;
  }
  saveCustomEmployeesMap(customMap);

  const updatedList = getAllEmployeesList();
  const updatedEmp = updatedList.find((e) => e.id === employeeId || related.includes(e.id)) || {
    id: employeeId,
    orgId: 'org_acme',
    identity: { email: `${employeeId}@acme.com`, name: employeeId },
    role: updates.role || 'employee',
    department: updates.department || 'Engineering',
    grade: updates.grade || 'L4',
    homeCity: updates.homeCity || 'Bengaluru',
    ...mergedOverride,
  };

  // If the updated employee matches active employee, update active profile
  const activeEmp = getActiveEmployee();
  if (
    activeEmp.id === employeeId ||
    related.includes(activeEmp.id) ||
    activeEmp.identity.email.toLowerCase() === updatedEmp.identity.email.toLowerCase()
  ) {
    setActiveEmployeeProfile(updatedEmp);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('keepr:employees-updated', { detail: { employeeId, employee: updatedEmp } })
    );
  }

  return updatedEmp;
}

export function resetEmployeeFinanceProfile(employeeId: string): Employee {
  const customMap = getCustomEmployeesMap();
  const related = getRelatedEmployeeIdentifiers(employeeId);
  for (const rel of related) {
    if (customMap[rel]) {
      delete customMap[rel].financeProfile;
    }
  }
  saveCustomEmployeesMap(customMap);

  const updatedList = getAllEmployeesList();
  const resetEmp = updatedList.find((e) => e.id === employeeId || related.includes(e.id))!;

  const activeEmp = getActiveEmployee();
  if (
    activeEmp.id === employeeId ||
    related.includes(activeEmp.id) ||
    activeEmp.identity.email.toLowerCase() === resetEmp.identity.email.toLowerCase()
  ) {
    setActiveEmployeeProfile(resetEmp);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('keepr:employees-updated', { detail: { employeeId, employee: resetEmp } })
    );
  }

  return resetEmp;
}

export function subscribeEmployees(callback: (employees: Employee[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback(getAllEmployeesList());
  };

  window.addEventListener('keepr:employees-updated', handler);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_CUSTOM_EMPLOYEES || e.key === STORAGE_KEY_CURRENT_EMPLOYEE_PROFILE) {
      handler();
    }
  });

  return () => {
    window.removeEventListener('keepr:employees-updated', handler);
  };
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
