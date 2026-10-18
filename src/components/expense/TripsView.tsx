import React, { useState, useEffect } from 'react';
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
import { getAllExpenses, subscribeExpenses } from '../../services/expenseService';
import { getActivePolicy } from '../../services/policyService';
import { getActiveEmployee } from '../../services/employeeService';

export const TripsView: React.FC = () => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();

  const [allExpenses, setAllExpenses] = useState<Expense[]>(() => getAllExpenses());
  const [trips, setTrips] = useState<Trip[]>(() =>
    bundleExpensesIntoTrips({
      expenses: getAllExpenses(),
      cityTiers: policy.cityTiers,
    })
  );

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(trips[0] || null);

  useEffect(() => {
    const unsubscribe = subscribeExpenses((updated) => {
      setAllExpenses(updated);
      const rebundled = bundleExpensesIntoTrips({
        expenses: updated,
        cityTiers: policy.cityTiers,
      });
      setTrips(rebundled);
      if (selectedTrip) {
        const found = rebundled.find((t) => t.id === selectedTrip.id);
        setSelectedTrip(found || rebundled[0] || null);
      } else if (rebundled.length > 0) {
        setSelectedTrip(rebundled[0]);
      }
    });
    return () => unsubscribe();
  }, [policy.cityTiers]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          Business Travel & Itineraries
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Clustered transit, lodging, and meals grouped by trip destination and dates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Trips List */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Trip Bundles ({trips.length})
          </span>

          {trips.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 text-center text-xs text-slate-500">
              No travel clusters detected in current claims.
            </div>
          ) : (
            trips.map((t) => {
              const isSelected = selectedTrip?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrip(t)}
                  className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'border-slate-900 ring-1 ring-slate-900'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-slate-600" />
                      {t.destinationCity}
                    </span>
                    <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {t.expenseIds.length} {t.expenseIds.length === 1 ? 'claim' : 'claims'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <span className="text-[11px]">{t.startDate} → {t.endDate}</span>
                    <span className="font-semibold text-slate-900 font-mono-code">
                      ₹{(t.totalSpendMinor / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-2">
          {selectedTrip ? (
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                    {selectedTrip.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTrip.startDate} to {selectedTrip.endDate} • {selectedTrip.destinationCity}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Total Spend</span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 font-mono-code">
                    ₹{(selectedTrip.totalSpendMinor / 100).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Expense Receipts in this trip */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-600 block">
                  Associated Receipts ({selectedTrip.expenseIds.length})
                </span>

                {selectedTrip.expenseIds.map((id) => {
                  const exp = allExpenses.find((e) => e.id === id);
                  if (!exp) return null;
                  const amt = (exp.normalizedCurrency?.targetAmountMinor || 0) / 100;

                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200/70 bg-slate-50/50 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <span className="font-medium text-slate-900 block">
                            {exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Receipt'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {exp.expenseDate} • {exp.extracted?.lineItems?.[0]?.category || 'Travel'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2.5">
                        <span className="font-semibold text-slate-900 font-mono-code">₹{amt.toLocaleString()}</span>
                        <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {exp.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200/80 text-center text-xs text-slate-500">
              Select a trip to view clustered receipts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
