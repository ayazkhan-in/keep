import React, { useState } from 'react';
import {
  Plane,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Trip, Expense } from '../../types/expense';
import { bundleExpensesIntoTrips } from '../../engine';
import { getAllExpenses } from '../../services/expenseService';
import { getActivePolicy } from '../../services/policyService';
import { getActiveEmployee } from '../../services/employeeService';

export const TripsView: React.FC = () => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();
  const allExpenses = getAllExpenses();

  const [trips] = useState<Trip[]>(() =>
    bundleExpensesIntoTrips({
      expenses: allExpenses,
      cityTiers: policy.cityTiers,
    })
  );

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(trips[0] || null);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
          Business Travel & Trip Bundles
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
          Deterministic clustering of transit, lodging, and local expenses grouped by city & travel dates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Trips List */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
            Bundled Trips ({trips.length})
          </span>

          {trips.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] text-center text-xs text-[#64748B]">
              No travel clusters detected in current claims.
            </div>
          ) : (
            trips.map((t) => {
              const isSelected = selectedTrip?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrip(t)}
                  className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'border-[#0F172A] ring-1 ring-[#0F172A]'
                      : 'border-[#E2E8F0] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-blue-600" />
                      {t.destinationCity}
                    </span>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                      {t.cityTier}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#64748B] mt-2">
                    <span>{t.startDate} → {t.endDate}</span>
                    <span className="font-bold text-[#0F172A]">
                      ₹{(t.totalSpendMinor / 100).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8] font-mono-code block mt-1">
                    {t.expenseIds.length} bundled expense receipts
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-2">
          {selectedTrip ? (
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {selectedTrip.name}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {selectedTrip.startDate} to {selectedTrip.endDate} • {selectedTrip.destinationCity} ({selectedTrip.cityTier})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#64748B] block">Total Trip Spend</span>
                  <span className="text-lg font-bold text-[#0F172A]">
                    ₹{(selectedTrip.totalSpendMinor / 100).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Expense Receipts in this trip */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#0F172A] block">
                  Associated Receipts ({selectedTrip.expenseIds.length}):
                </span>

                {selectedTrip.expenseIds.map((id) => {
                  const exp = allExpenses.find((e) => e.id === id);
                  if (!exp) return null;
                  const amt = (exp.normalizedCurrency?.targetAmountMinor || 0) / 100;

                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#64748B]" />
                        <div>
                          <span className="font-bold text-[#0F172A] block">
                            {exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Receipt'}
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            {exp.expenseDate} • {exp.extracted?.lineItems?.[0]?.category || 'Travel'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-[#0F172A] block">₹{amt.toLocaleString()}</span>
                        <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {exp.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] text-center text-xs text-[#64748B]">
              Select a trip to view clustered receipts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
