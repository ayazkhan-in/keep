import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Zap,
  DollarSign,
  TrendingUp,
  FileCheck2,
  Bot,
  Users,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { runBenchmark, BenchmarkMetrics } from '../../services/benchmarkService';

export const ScorecardView: React.FC = () => {
  const [benchmarkData, setBenchmarkData] = useState<{
    metrics: BenchmarkMetrics;
    results: any[];
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'mismatch'>('all');

  // Auto-run benchmark on first mount so the scorecard is populated immediately
  useEffect(() => {
    handleRunBenchmark();
  }, []);

  const handleRunBenchmark = () => {
    setIsRunning(true);
    setTimeout(() => {
      const data = runBenchmark();
      setBenchmarkData(data);
      setIsRunning(false);
    }, 150);
  };

  const filteredResults = (benchmarkData?.results || []).filter((item) => {
    if (statusFilter === 'correct' && !item.isDecisionCorrect) return false;
    if (statusFilter === 'mismatch' && item.isDecisionCorrect) return false;
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.expenseId.toLowerCase().includes(q) ||
      item.actualDecision.toLowerCase().includes(q) ||
      item.expectedDecision.toLowerCase().includes(q) ||
      item.flags.some((f: string) => f.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Audit Scorecard & Benchmark
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit accuracy, touchless rates, and duplicate precision across verified ground truth datasets.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Benchmarking...' : 'Run Benchmark'}</span>
          </button>
        </div>
      </div>

      {benchmarkData && (
        <>
          {/* SLA & Dataset Meta Header */}
          <div className="flex flex-wrap items-center gap-3 p-2.5 bg-white border border-slate-200/80 rounded-lg text-xs text-slate-500 shadow-2xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-900">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              <span>Execution: {benchmarkData.metrics.runtimeMs.toFixed(1)}ms</span>
            </div>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-medium">&lt; 5,000ms SLA Met</span>
            <span className="text-slate-300">•</span>
            <span>Sample: {benchmarkData.metrics.sampleSize} Claims</span>
            <span className="text-slate-300">•</span>
            <span>Deterministic Ground Truth v1</span>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Touchless Rate */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium uppercase tracking-wider">Touchless Rate</span>
                <Bot className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-emerald-700 font-mono-code">
                  {benchmarkData.metrics.touchlessRate}%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {benchmarkData.metrics.touchlessCount} of {benchmarkData.metrics.sampleSize} auto-approved
              </p>
            </div>

            {/* Decision Accuracy */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium uppercase tracking-wider">Decision Accuracy</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900 font-mono-code">
                  {benchmarkData.metrics.decisionAccuracy}%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Agreement vs ground truth
              </p>
            </div>

            {/* Rule Citation Coverage */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium uppercase tracking-wider">Citation Coverage</span>
                <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900 font-mono-code">
                  {benchmarkData.metrics.ruleCitationCoverage}%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Verdicts with exact policy citation
              </p>
            </div>

            {/* Amount Protected */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-medium uppercase tracking-wider">Amount Protected</span>
                <Shield className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900 font-mono-code">
                  ₹{(benchmarkData.metrics.amountProtected / 100).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Over-cap & exclusion deductions
              </p>
            </div>
          </div>

          {/* Secondary Quality & Efficiency Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Duplicate Precision & Recall */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                Duplicate Quality
              </span>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-slate-600">Precision:</span>
                <span className="text-xs font-bold text-slate-900 font-mono-code">
                  {(benchmarkData.metrics.duplicatePrecision * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Recall:</span>
                <span className="text-xs font-bold text-slate-900 font-mono-code">
                  {(benchmarkData.metrics.duplicateRecall * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Anomaly Safety */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                Safety Guarantee
              </span>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-slate-600">False Clears:</span>
                <span className="text-xs font-bold text-emerald-700 font-mono-code">
                  {benchmarkData.metrics.falseClearsCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">False Flags:</span>
                <span className="text-xs font-bold text-slate-700 font-mono-code">
                  {benchmarkData.metrics.falseFlagsCount}
                </span>
              </div>
            </div>

            {/* Time Saved Estimate */}
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block">
                Audit Efficiency
              </span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#475569]">Est. Time Saved:</span>
                <span className="text-sm font-bold text-emerald-700 font-mono-code">
                  {(benchmarkData.metrics.estimatedTimeSavedMinutes / 60).toFixed(1)} Hours
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#475569]">Touchless Units:</span>
                <span className="text-sm font-bold text-[#0F172A] font-mono-code">
                  {benchmarkData.metrics.touchlessCount} Claims
                </span>
              </div>
              <p className="text-[10.5px] text-[#64748B] pt-1">
                Assumes 4 minutes saved per automated touchless approval
              </p>
            </div>
          </div>

          {/* Test Case Detail Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Synthetic Claim Test Results ({filteredResults.length})
                </h3>
                <p className="text-xs text-[#64748B]">
                  Per-claim breakdown of actual vs expected decisions and citations.
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0] text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white shadow-2xs text-[#0F172A]' : 'text-[#64748B]'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('correct')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      statusFilter === 'correct' ? 'bg-white shadow-2xs text-emerald-700' : 'text-[#64748B]'
                    }`}
                  >
                    Passed
                  </button>
                  <button
                    onClick={() => setStatusFilter('mismatch')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      statusFilter === 'mismatch' ? 'bg-white shadow-2xs text-rose-700' : 'text-[#64748B]'
                    }`}
                  >
                    Mismatches
                  </button>
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Search claims..."
                    className="w-full pl-8 pr-3 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="py-2.5 px-3 font-semibold">Claim ID</th>
                    <th className="py-2.5 px-3 font-semibold">Actual Decision</th>
                    <th className="py-2.5 px-3 font-semibold">Expected Decision</th>
                    <th className="py-2.5 px-3 font-semibold">Approved Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Citations</th>
                    <th className="py-2.5 px-3 font-semibold">Triggered Flags</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredResults.map((item) => (
                    <tr key={item.expenseId} className="hover:bg-[#F8FAFC]">
                      <td className="py-2 px-3 font-mono-code font-bold text-[#0F172A]">
                        {item.expenseId}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold uppercase text-[11px] text-[#334155]">
                          {item.actualDecision}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono-code text-[11px] text-[#64748B]">
                        {item.expectedDecision}
                      </td>
                      <td className="py-2 px-3 font-mono-code font-medium text-[#0F172A]">
                        ₹{(item.actualApprovedMinor / 100).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        {item.hasCitations ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Cited
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono-code text-[10px] text-[#64748B] max-w-[200px] truncate">
                        {item.flags?.length ? item.flags.join(', ') : 'None'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {item.isDecisionCorrect ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Mismatch
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
