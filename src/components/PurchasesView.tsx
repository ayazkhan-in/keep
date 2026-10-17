import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Scan,
  LayoutList,
  LayoutGrid,
  Filter,
  Calendar,
  DollarSign,
  Sparkles,
  MoreVertical,
  Laptop,
  Armchair,
  Terminal,
  Printer,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  FileText,
  Trash2,
} from 'lucide-react';
import { PurchaseItem, CategoryType } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { useCurrency } from '../context/CurrencyContext';
import { MinimalSelect } from './ui/MinimalSelect';

interface PurchasesViewProps {
  purchases: PurchaseItem[];
  openScanner: () => void;
  onSelectPurchase: (item: PurchaseItem) => void;
  onDeletePurchase: (id: string) => void;
  onTriggerClaim: (item: PurchaseItem) => void;
  onTriggerReturn: (item: PurchaseItem) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'All Categories', label: 'All Categories' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Office Furniture', label: 'Office Furniture' },
  { value: 'Software', label: 'Software' },
  { value: 'Appliances', label: 'Appliances' },
  { value: 'Home & Living', label: 'Home & Living' },
  { value: 'Other', label: 'Other' },
];

const TIME_OPTIONS = [
  { value: 'All Time', label: 'All Time' },
  { value: 'Last 30 Days', label: 'Last 30 Days' },
  { value: 'Last 90 Days', label: 'Last 90 Days' },
  { value: 'This Year', label: 'This Year' },
];

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  openScanner,
  onSelectPurchase,
  onDeletePurchase,
  onTriggerClaim,
  onTriggerReturn,
}) => {
  const { formatPrice, currency } = useCurrency();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [timeFilter, setTimeFilter] = useState<string>('All Time');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const priceOptions = [
    { value: 'all', label: 'Any Price' },
    { value: 'low', label: currency === 'INR' ? 'Under ₹15,000' : 'Under $200' },
    { value: 'mid', label: currency === 'INR' ? '₹15,000 - ₹80,000' : '$200 - $1,000' },
    { value: 'high', label: currency === 'INR' ? 'Over ₹80,000' : 'Over $1,000' },
  ];

  // Filter purchases
  const filtered = purchases.filter((item) => {
    if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) {
      return false;
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q) ||
        (item.orderNumber && item.orderNumber.toLowerCase().includes(q)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (priceFilter === 'low' && item.price >= (currency === 'INR' ? 15000 : 200)) return false;
    if (
      priceFilter === 'mid' &&
      (item.price < (currency === 'INR' ? 15000 : 200) ||
        item.price > (currency === 'INR' ? 80000 : 1000))
    )
      return false;
    if (priceFilter === 'high' && item.price <= (currency === 'INR' ? 80000 : 1000)) return false;

    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((p) => p.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const itemsToExport =
      selectedIds.length > 0
        ? purchases.filter((p) => selectedIds.includes(p.id))
        : purchases;

    const headers = 'ID,Name,Vendor,Category,Purchase Date,Price,Warranty Expiry,Return Deadline,Serial Number\n';
    const rows = itemsToExport
      .map(
        (p) =>
          `"${p.id}","${p.name}","${p.vendor}","${p.category}","${p.purchaseDate}",${p.price},"${p.warranty.expiryDate || 'N/A'}","${p.returnWindow.deadlineDate || 'N/A'}","${p.serialNumber || 'N/A'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `keepr_purchases_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getItemIcon = (category: string) => {
    switch (category) {
      case 'Electronics':
        return <Laptop className="w-4 h-4 text-[#76777D]" />;
      case 'Office Furniture':
        return <Armchair className="w-4 h-4 text-[#76777D]" />;
      case 'Software':
        return <Terminal className="w-4 h-4 text-[#76777D]" />;
      default:
        return <Printer className="w-4 h-4 text-[#76777D]" />;
    }
  };

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E2E8F0]"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
              Asset Ledger
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
              {purchases.length} Items Managed
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            Purchases & Assets
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-[#E2E8F0] text-[#0F172A] px-3.5 py-2 rounded-xl text-[13px] font-medium hover:bg-[#F9F9FB] transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#76777D]" />
            <span>Export Ledger</span>
          </button>

          <button
            onClick={openScanner}
            className="flex items-center gap-2 bg-[#0F172A] text-white px-3.5 py-2 rounded-xl text-[13px] font-medium hover:bg-[#1E293B] transition-colors shadow-xs cursor-pointer"
          >
            <Scan className="w-4 h-4" />
            <span>Scan Receipt</span>
          </button>
        </div>
      </motion.div>

      {/* Control Bar with Minimal Dropdowns */}
      <motion.div
        initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
        className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 border border-[#E2E8F0] rounded-2xl shadow-2xs"
      >
        {/* Left: View Mode Toggle & Category Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#94A3B8] hover:text-[#0F172A]'
              }`}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#94A3B8] hover:text-[#0F172A]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Category Minimal Dropdown */}
          <MinimalSelect
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            options={CATEGORY_OPTIONS}
            size="md"
          />

          {/* Search box inside filter */}
          <div className="flex items-center bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 w-48 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] mr-1.5 shrink-0" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search receipts..."
              className="bg-transparent text-[12px] w-full focus:outline-none placeholder:text-[#94A3B8]"
            />
          </div>
        </div>

        {/* Right: Date, Price, AI Insights Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <MinimalSelect
            value={timeFilter}
            onChange={(val) => setTimeFilter(val)}
            options={TIME_OPTIONS}
            size="md"
          />

          <MinimalSelect
            value={priceFilter}
            onChange={(val) => setPriceFilter(val)}
            options={priceOptions}
            size="md"
          />

          <button
            onClick={() => setShowAIInsights(!showAIInsights)}
            className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
              showAIInsights
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'text-[#45464D] border-dashed border-[#CBD5E1] bg-[#F9F9FB] hover:border-[#76777D]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Insights</span>
          </button>
        </div>
      </motion.div>

      {/* AI Insights Banner (when toggled) */}
      <AnimatePresence>
        {showAIInsights && (
          <motion.div
            initial={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#0F172A]" />
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0F172A] font-semibold">
                Purchase Intelligence Summary
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px] text-[#45464D]">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                <p className="font-semibold text-[#0F172A]">Tax Deductions Identified</p>
                <p className="mt-0.5 text-[#76777D]">
                  5 hardware items ({formatPrice(7389.5)}) marked tax deductible for FY2026.
                </p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                <p className="font-semibold text-[#0F172A]">Warranty Coverage Rate</p>
                <p className="mt-0.5 text-[#76777D]">
                  87.5% of electronic hardware currently protected under valid warranty.
                </p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
                <p className="font-semibold text-[#0F172A]">Return Velocity</p>
                <p className="mt-0.5 text-[#76777D]">
                  2 items eligible for full refund within the next 48-72 hours.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List View Table */}
      {viewMode === 'list' ? (
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAFAFC]">
                  <th className="py-3 px-4 font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-[#CBD5E1] text-[#0F172A] focus:ring-0 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="py-3 px-4 font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                    Item Details
                  </th>
                  <th className="py-3 px-4 font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                    Vendor
                  </th>
                  <th className="py-3 px-4 font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold text-right">
                    Date
                  </th>
                  <th className="py-3 px-4 font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold text-right">
                    Price
                  </th>
                  <th className="py-3 px-4 font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                    Status
                  </th>
                  <th className="py-3 px-4 font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F9F9FB] transition-colors group cursor-pointer"
                      onClick={() => onSelectPurchase(item)}
                    >
                      <td
                        className="py-3 px-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectItem(item.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-[#CBD5E1] text-[#0F172A] focus:ring-0 cursor-pointer w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#F1F5F9] flex items-center justify-center shrink-0 border border-[#E2E8F0] relative">
                            {getItemIcon(item.category)}
                            {item.aiConfidence && item.aiConfidence > 0.9 && (
                              <div
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center border border-[#E2E8F0]"
                                title="AI Extracted"
                              >
                                <Sparkles className="w-2 h-2 text-[#76777D]" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[#0F172A] text-[13px] flex items-center gap-1.5">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#76777D] mt-0.5">
                              {item.category} {item.tags.length > 0 ? `• ${item.tags[0]}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[13px] text-[#0F172A]">{item.vendor}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono-code text-[12px] text-[#45464D]">
                          {item.purchaseDate}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono-code text-[13px] font-semibold text-[#0F172A]">
                          {formatPrice(item.price)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {item.returnWindow.hasReturn &&
                          item.returnWindow.status === 'expiring_soon' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-mono-code text-[11px] font-medium border border-[#FDE68A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                              Return: {item.returnWindow.returnDays} Days
                            </span>
                          ) : item.warranty.hasWarranty ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] font-mono-code text-[11px] font-medium border border-[#A7F3D0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                              Active Warranty
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#76777D] font-mono-code text-[11px]">
                              N/A
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === item.id ? null : item.id)
                            }
                            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === item.id && (
                            <div className="origin-top-right absolute right-0 mt-1 w-44 rounded-xl shadow-xl bg-white border border-[#E2E8F0] py-1.5 z-30 animate-in fade-in overflow-hidden">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onSelectPurchase(item);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[12px] text-[#0F172A] hover:bg-[#F9F9FB] flex items-center gap-2 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-[#76777D]" />
                                View Details
                              </button>
                              {item.warranty.hasWarranty && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onTriggerClaim(item);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[12px] text-[#0F172A] hover:bg-[#F9F9FB] flex items-center gap-2 cursor-pointer"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                                  Draft AI Claim
                                </button>
                              )}
                              {item.returnWindow.hasReturn && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onTriggerReturn(item);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-[12px] text-[#0F172A] hover:bg-[#F9F9FB] flex items-center gap-2 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-[#F59E0B]" />
                                  Draft Return Email
                                </button>
                              )}
                              <div className="border-t border-[#F1F5F9] my-1" />
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setItemToDelete({ id: item.id, name: item.name });
                                }}
                                className="w-full text-left px-3 py-1.5 text-[12px] text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                                Remove Item
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="border-t border-[#E2E8F0] p-3.5 flex items-center justify-between bg-white">
            <div className="text-[12px] text-[#76777D] font-mono-code">
              Showing 1-{filtered.length} of {purchases.length} items
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled
                className="p-1 rounded-lg text-[#CBD5E1] cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium bg-[#0F172A] text-white">
                1
              </button>
              <button
                disabled
                className="p-1 rounded-lg text-[#CBD5E1] cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Grid View */
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectPurchase(item)}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#94A3B8] transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0] flex items-center justify-center">
                    {getItemIcon(item.category)}
                  </div>
                  <span className="font-mono-code text-[14px] font-semibold text-[#0F172A]">
                    {formatPrice(item.price)}
                  </span>
                </div>
                <h3 className="font-medium text-[14px] text-[#0F172A] line-clamp-1">{item.name}</h3>
                <p className="text-[12px] text-[#76777D] mt-0.5">
                  {item.vendor} · {item.purchaseDate}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                {item.warranty.hasWarranty ? (
                  <span className="text-[11px] font-mono-code text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                    Warranty Active
                  </span>
                ) : (
                  <span className="text-[11px] font-mono-code text-[#76777D] bg-[#F1F5F9] px-2.5 py-0.5 rounded-full">
                    No Warranty
                  </span>
                )}
                <span className="text-[11px] text-[#0F172A] font-medium hover:underline">
                  View →
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <DeleteConfirmationModal
        isOpen={Boolean(itemToDelete)}
        itemName={itemToDelete?.name}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            onDeletePurchase(itemToDelete.id);
          }
          setItemToDelete(null);
        }}
      />
    </div>
  );
};
