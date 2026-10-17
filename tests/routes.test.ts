import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  VIEW_TO_PATH,
  getPathToView,
  getDefaultPortalRoute,
} from '../src/routes/routeConfig';

describe('Corporate Portal Routing & View Resolution', () => {
  it('correctly maps canonical Employee routes to respective views', () => {
    expect(getPathToView('/employee')).toBe('my-expenses');
    expect(getPathToView('/employee/expenses')).toBe('my-expenses');
    expect(getPathToView('/employee/submit')).toBe('submit-expense');
    expect(getPathToView('/employee/allowances')).toBe('my-caps');
    expect(getPathToView('/employee/caps')).toBe('my-caps');
    expect(getPathToView('/employee/trips')).toBe('trips');
    expect(getPathToView('/employee/settings')).toBe('settings');
  });

  it('correctly maps canonical Auditor routes to respective views', () => {
    expect(getPathToView('/auditor')).toBe('review-queue');
    expect(getPathToView('/auditor/review-queue')).toBe('review-queue');
    expect(getPathToView('/auditor/all-expenses')).toBe('all-expenses');
    expect(getPathToView('/auditor/claims')).toBe('all-expenses');
    expect(getPathToView('/auditor/policies')).toBe('policy-studio');
    expect(getPathToView('/auditor/employees')).toBe('employees');
    expect(getPathToView('/auditor/reports')).toBe('reports');
    expect(getPathToView('/auditor/simulator')).toBe('simulator');
    expect(getPathToView('/auditor/exports')).toBe('export-view');
    expect(getPathToView('/auditor/scorecard')).toBe('analytics-scorecard');
  });

  it('correctly maps Manage routes under auditor tools to views', () => {
    expect(getPathToView('/auditor/manage/dashboard')).toBe('dashboard');
    expect(getPathToView('/auditor/manage/purchases')).toBe('purchases');
    expect(getPathToView('/auditor/manage/warranties')).toBe('warranties');
    expect(getPathToView('/auditor/manage/returns')).toBe('returns');
    expect(getPathToView('/auditor/manage/vault')).toBe('vault');
    expect(getPathToView('/auditor/manage/analytics')).toBe('analytics');
    expect(getPathToView('/auditor/manage/timeline')).toBe('timeline');
    expect(getPathToView('/auditor/manage/invoices')).toBe('invoices');
    expect(getPathToView('/auditor/manage/invoices/new')).toBe('create-invoice');
  });

  it('resolves bidirectional view paths accurately', () => {
    expect(VIEW_TO_PATH['my-expenses']).toBe(ROUTES.EMPLOYEE.EXPENSES);
    expect(VIEW_TO_PATH['submit-expense']).toBe(ROUTES.EMPLOYEE.SUBMIT);
    expect(VIEW_TO_PATH['review-queue']).toBe(ROUTES.AUDITOR.REVIEW_QUEUE);
    expect(VIEW_TO_PATH['policy-studio']).toBe(ROUTES.AUDITOR.POLICIES);
    expect(VIEW_TO_PATH['purchases']).toBe(ROUTES.AUDITOR.MANAGE_PURCHASES);
  });

  it('routes to the appropriate default portal based on authenticated role', () => {
    expect(getDefaultPortalRoute('employee')).toBe(ROUTES.EMPLOYEE.EXPENSES);
    expect(getDefaultPortalRoute('finance')).toBe(ROUTES.AUDITOR.REVIEW_QUEUE);
    expect(getDefaultPortalRoute('admin')).toBe(ROUTES.AUDITOR.REVIEW_QUEUE);
  });
});
