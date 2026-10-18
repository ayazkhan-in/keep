import React, { useState } from 'react';
import {
  X,
  MessageSquare,
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
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Fix Missing Information
              </h3>
              <p className="text-[11px] text-slate-500">
                Provide requested details to resolve policy holds and receive approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Missing Fields Banner */}
        <div className="p-3.5 bg-amber-50/50 border-b border-amber-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-semibold text-amber-950 block">
              Required Details for Reimbursement
            </span>
            <p className="text-xs text-amber-900/90 mt-0.5">
              {expense.verdict?.missingFields && expense.verdict.missingFields.length > 0
                ? `Policy requires: ${expense.verdict.missingFields.join(', ')}.`
                : 'Please clarify the business purpose and attendees for this claim.'}
            </p>
          </div>
        </div>

        {/* Message Thread History */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-[200px] bg-slate-50/50">
          {/* System initial message */}
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs space-y-1 shadow-2xs">
            <span className="text-[10px] font-mono-code font-semibold text-slate-500 uppercase tracking-wider">
              System Auditor • Automated Policy Request
            </span>
            <p className="text-slate-700">
              Your claim at{' '}
              <strong className="text-slate-900">{expense.extracted?.merchant?.value || 'the vendor'}</strong> on{' '}
              {expense.expenseDate} requires additional documentation. Please provide the client organization name, business context, or attendee count.
            </p>
          </div>

          {(expense.thread || []).map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl text-xs space-y-1 ${
                msg.sender === 'employee'
                  ? 'bg-slate-900 text-white ml-6 shadow-2xs'
                  : 'bg-white border border-slate-200/80 mr-6 text-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono-code font-semibold uppercase ${
                  msg.sender === 'employee' ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {msg.sender === 'employee' ? 'You' : msg.sender}:
                </span>
                <span className={`text-[10px] font-mono-code ${
                  msg.sender === 'employee' ? 'text-slate-400' : 'text-slate-400'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className={msg.sender === 'employee' ? 'text-slate-100' : 'text-slate-700'}>{msg.message}</p>

              {msg.proposedPatch && msg.status === 'pending' && (
                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                  <span className="text-[10px] font-mono-code font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                    Structured Context Proposal:
                  </span>
                  <div className="text-[11px] font-mono-code space-y-0.5 text-slate-700">
                    {Object.entries(msg.proposedPatch).map(([k, v]) => (
                      <div key={k}>
                        • {k}: <strong className="text-slate-900">{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleApplyPatch(msg.id)}
                    className="mt-2 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirm & Apply Proposal</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              placeholder="e.g. Dinner with Acme Partner, 2 attendees discussing Q4 expansion..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
            />
            <button
              onClick={handleSendReply}
              disabled={isSubmitting || !replyInput.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Natural language input will be converted into structured policy fields for your review.
          </span>
        </div>
      </div>
    </div>
  );
};
