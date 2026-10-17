import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Expense } from '../../types/expense';
import { appendThreadMessage, applyThreadPatch } from '../../services/expenseService';
import { getActiveEmployee } from '../../services/employeeService';

interface FixItModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  onRefresh: () => void;
}

export const FixItModal: React.FC<FixItModalProps> = ({
  isOpen,
  onClose,
  expense,
  onRefresh,
}) => {
  const [replyInput, setReplyInput] = useState('');
  const [proposedPatch, setProposedPatch] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeEmp = getActiveEmployee();

  if (!isOpen) return null;

  const handleSendReply = async () => {
    if (!replyInput.trim()) return;
    setIsSubmitting(true);

    try {
      // 1. Ask parse-reply API to extract structured fields
      const res = await fetch('/api/expense/parse-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: replyInput }),
      });
      const data = await res.json();
      const patch = data.ok ? data.data.proposedPatch : { purpose: replyInput };

      // 2. Append employee message with proposed patch
      appendThreadMessage({
        expenseId: expense.id,
        sender: 'employee',
        message: replyInput,
        proposedPatch: patch,
      });

      setProposedPatch(patch);
      setReplyInput('');
      onRefresh();
    } catch (err: any) {
      alert(`Error parsing reply: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPatch = (msgId?: string) => {
    if (!proposedPatch) return;
    try {
      applyThreadPatch({
        expenseId: expense.id,
        messageId: msgId || 'latest',
        patch: proposedPatch,
        actor: {
          id: activeEmp.id,
          name: activeEmp.identity.name,
          role: activeEmp.role,
        },
      });
      setProposedPatch(null);
      onRefresh();
      alert('Missing information confirmed and applied! Claim has been re-evaluated.');
      onClose();
    } catch (err: any) {
      alert(`Error applying update: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#E2E8F0] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Fix Missing Information
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Provide requested details to resolve policy holds and receive approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Missing Fields Banner */}
        <div className="p-4 bg-amber-50/70 border-b border-amber-200">
          <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Required Details for Reimbursement:
          </span>
          <p className="text-xs text-amber-900">
            {expense.verdict?.missingFields && expense.verdict.missingFields.length > 0
              ? `Policy requires: ${expense.verdict.missingFields.join(', ')}.`
              : 'Please clarify the business purpose and attendees for this claim.'}
          </p>
        </div>

        {/* Message Thread History */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-[200px]">
          {/* System initial message */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs space-y-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              System Auditor • Automated Policy Request
            </span>
            <p className="text-[#334155]">
              Your claim at{' '}
              <strong>{expense.extracted?.merchant?.value || 'the vendor'}</strong> on{' '}
              {expense.expenseDate} requires additional documentation. Please provide the client organization name, business context, or attendee count.
            </p>
          </div>

          {(expense.thread || []).map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                msg.sender === 'employee'
                  ? 'bg-blue-50/70 border-blue-200 ml-6 text-blue-950'
                  : 'bg-white border-[#E2E8F0] mr-6 text-[#334155]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#64748B]">
                  {msg.sender === 'employee' ? 'You' : msg.sender}:
                </span>
                <span className="text-[10px] font-mono-code text-[#94A3B8]">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p>{msg.message}</p>

              {msg.proposedPatch && msg.status === 'pending' && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-blue-200">
                  <span className="text-[10px] font-semibold text-blue-800 block mb-1">
                    Structured Context Proposal:
                  </span>
                  <div className="text-[11px] font-mono-code space-y-0.5 text-slate-700">
                    {Object.entries(msg.proposedPatch).map(([k, v]) => (
                      <div key={k}>
                        • {k}: <strong>{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleApplyPatch(msg.id)}
                    className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Apply Proposal</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              placeholder="e.g. Dinner with Acme Partner, 2 attendees discussing Q4 expansion..."
              className="flex-1 px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
            />
            <button
              onClick={handleSendReply}
              disabled={isSubmitting || !replyInput.trim()}
              className="px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
          <span className="text-[10px] text-[#64748B] block">
            Natural language input will be converted into structured policy fields for your review.
          </span>
        </div>
      </div>
    </div>
  );
};
