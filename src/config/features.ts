export interface FeatureFlags {
  /** When true, shows legacy views */
  legacyKeepr: boolean;
  /** When true, activates the corporate expense reimbursement auditor workspace */
  expenseAudit: boolean;
  /** When true, exposes judge-friendly role switching and synthetic demo reset */
  demoMode: boolean;
  /** Enforces server validation on role and org permissions */
  strictServerAuth: boolean;
}

export const FEATURES: FeatureFlags = {
  legacyKeepr: false,
  expenseAudit: true,
  demoMode: true,
  strictServerAuth: false,
};
