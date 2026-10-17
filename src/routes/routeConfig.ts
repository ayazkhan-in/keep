import { ActiveView } from '../types';
import { UserRole } from '../types/expense';

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  APP_LEGACY: '/app',

  // Employee Portal
  EMPLOYEE: {
    ROOT: '/employee',
    EXPENSES: '/employee/expenses',
    SUBMIT: '/employee/submit',
    ALLOWANCES: '/employee/allowances',
    CAPS_ALIAS: '/employee/caps',
    TRIPS: '/employee/trips',
    SETTINGS: '/employee/settings',
  },

  // Auditor Portal
  AUDITOR: {
    ROOT: '/auditor',
    REVIEW_QUEUE: '/auditor/review-queue',
    ALL_EXPENSES: '/auditor/all-expenses',
    CLAIMS_ALIAS: '/auditor/claims',
    POLICIES: '/auditor/policies',
    EMPLOYEES: '/auditor/employees',
    REPORTS: '/auditor/reports',
    SIMULATOR: '/auditor/simulator',
    EXPORTS: '/auditor/exports',
    SCORECARD: '/auditor/scorecard',
    SETTINGS: '/auditor/settings',

    // Manage Tools
    MANAGE_DASHBOARD: '/auditor/manage/dashboard',
    MANAGE_PURCHASES: '/auditor/manage/purchases',
    MANAGE_WARRANTIES: '/auditor/manage/warranties',
    MANAGE_RETURNS: '/auditor/manage/returns',
    MANAGE_VAULT: '/auditor/manage/vault',
    MANAGE_ANALYTICS: '/auditor/manage/analytics',
    MANAGE_TIMELINE: '/auditor/manage/timeline',
    MANAGE_INVOICES: '/auditor/manage/invoices',
    MANAGE_CREATE_INVOICE: '/auditor/manage/invoices/new',
  },
} as const;

export const VIEW_TO_PATH: Record<ActiveView, string> = {
  // Employee Views
  'my-expenses': ROUTES.EMPLOYEE.EXPENSES,
  'submit-expense': ROUTES.EMPLOYEE.SUBMIT,
  'my-caps': ROUTES.EMPLOYEE.ALLOWANCES,
  'trips': ROUTES.EMPLOYEE.TRIPS,
  'messages': ROUTES.EMPLOYEE.EXPENSES,

  // Auditor Views
  'review-queue': ROUTES.AUDITOR.REVIEW_QUEUE,
  'all-expenses': ROUTES.AUDITOR.ALL_EXPENSES,
  'policy-studio': ROUTES.AUDITOR.POLICIES,
  'employees': ROUTES.AUDITOR.EMPLOYEES,
  'reports': ROUTES.AUDITOR.REPORTS,
  'simulator': ROUTES.AUDITOR.SIMULATOR,
  'export-view': ROUTES.AUDITOR.EXPORTS,
  'analytics-scorecard': ROUTES.AUDITOR.SCORECARD,
  'duplicates-view': ROUTES.AUDITOR.REVIEW_QUEUE,

  // Manage Views
  'dashboard': ROUTES.AUDITOR.MANAGE_DASHBOARD,
  'purchases': ROUTES.AUDITOR.MANAGE_PURCHASES,
  'warranties': ROUTES.AUDITOR.MANAGE_WARRANTIES,
  'returns': ROUTES.AUDITOR.MANAGE_RETURNS,
  'vault': ROUTES.AUDITOR.MANAGE_VAULT,
  'analytics': ROUTES.AUDITOR.MANAGE_ANALYTICS,
  'timeline': ROUTES.AUDITOR.MANAGE_TIMELINE,
  'invoices': ROUTES.AUDITOR.MANAGE_INVOICES,
  'create-invoice': ROUTES.AUDITOR.MANAGE_CREATE_INVOICE,

  // Settings
  'settings': ROUTES.EMPLOYEE.SETTINGS,
};

export function getPathToView(pathname: string): ActiveView {
  const cleanPath = pathname.toLowerCase().replace(/\/$/, '') || '/';

  if (cleanPath.startsWith('/employee/submit')) return 'submit-expense';
  if (cleanPath.startsWith('/employee/allowances') || cleanPath.startsWith('/employee/caps')) return 'my-caps';
  if (cleanPath.startsWith('/employee/trips')) return 'trips';
  if (cleanPath.startsWith('/employee/settings')) return 'settings';
  if (cleanPath.startsWith('/employee')) return 'my-expenses';

  if (cleanPath.startsWith('/auditor/all-expenses') || cleanPath.startsWith('/auditor/claims')) return 'all-expenses';
  if (cleanPath.startsWith('/auditor/policies') || cleanPath.startsWith('/auditor/policy')) return 'policy-studio';
  if (cleanPath.startsWith('/auditor/employees')) return 'employees';
  if (cleanPath.startsWith('/auditor/reports')) return 'reports';
  if (cleanPath.startsWith('/auditor/simulator')) return 'simulator';
  if (cleanPath.startsWith('/auditor/exports')) return 'export-view';
  if (cleanPath.startsWith('/auditor/scorecard')) return 'analytics-scorecard';
  if (cleanPath.startsWith('/auditor/settings')) return 'settings';

  if (cleanPath.startsWith('/auditor/manage/dashboard')) return 'dashboard';
  if (cleanPath.startsWith('/auditor/manage/purchases')) return 'purchases';
  if (cleanPath.startsWith('/auditor/manage/warranties')) return 'warranties';
  if (cleanPath.startsWith('/auditor/manage/returns')) return 'returns';
  if (cleanPath.startsWith('/auditor/manage/vault')) return 'vault';
  if (cleanPath.startsWith('/auditor/manage/analytics')) return 'analytics';
  if (cleanPath.startsWith('/auditor/manage/timeline')) return 'timeline';
  if (cleanPath.startsWith('/auditor/manage/invoices/new')) return 'create-invoice';
  if (cleanPath.startsWith('/auditor/manage/invoices')) return 'invoices';

  if (cleanPath.startsWith('/auditor')) return 'review-queue';

  return 'my-expenses';
}

export function getDefaultPortalRoute(role: UserRole): string {
  if (role === 'finance' || role === 'admin') {
    return ROUTES.AUDITOR.REVIEW_QUEUE;
  }
  return ROUTES.EMPLOYEE.EXPENSES;
}
