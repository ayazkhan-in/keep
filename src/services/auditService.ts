import { AuditActor, AuditEvent } from '../types/expense';

const STORAGE_KEY_AUDIT_LOG = 'keepr_audit_log_v1';

export function getAuditEventsForExpense(expenseId: string): AuditEvent[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_AUDIT_LOG}_${expenseId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading audit events:', err);
  }
  return [];
}

export function logAuditEvent(params: {
  orgId: string;
  expenseId: string;
  correlationId?: string;
  actor: AuditActor;
  action: string;
  entity: AuditEvent['entity'];
  details: Record<string, any>;
  changeSummary?: string;
}): AuditEvent {
  const event: AuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    correlationId: params.correlationId || `corr_${Date.now()}`,
    orgId: params.orgId,
    expenseId: params.expenseId,
    timestamp: new Date().toISOString(),
    actor: params.actor,
    action: params.action,
    entity: params.entity,
    details: params.details,
    changeSummary: params.changeSummary,
  };

  try {
    const key = `${STORAGE_KEY_AUDIT_LOG}_${params.expenseId}`;
    const existing = getAuditEventsForExpense(params.expenseId);
    existing.push(event);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed appending audit event:', err);
  }

  return event;
}
