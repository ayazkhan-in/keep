import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  ShieldCheck,
  RotateCcw,
  Vault,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
  Loader2,
  FileSpreadsheet,
  FilePlus2,
} from 'lucide-react';
import { PurchaseItem, ActiveView } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: PurchaseItem[];
  setActiveView: (view: ActiveView) => void;
  onSelectPurchase: (item: PurchaseItem) => void;
  openScanner: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  purchases,
  setActiveView,
  onSelectPurchase,
  openScanner,
}) => {
  const [query, setQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<any[] | null>(null);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trigger semantic search when query looks like a natural language prompt
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSemanticResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (query.includes(' ') || query.length > 8) {
        setIsSearchingSemantic(true);
        try {
          const res = await fetch('/api/gemini/semantic-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, purchases }),
          });
          const data = await res.json();
          if (data.success && data.matches) {
            setSemanticResults(data.matches);
          }
        } catch (e) {
          console.warn('Semantic search error:', e);
        } finally {
          setIsSearchingSemantic(false);
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query, purchases]);

  const basicMatches = query
    ? purchases.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.vendor.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : purchases.slice(0, 4);

  const navActions: Array<{
    label: string;
    icon: any;
    action: () => void;
  }> = [
    {
      label: 'Create New Invoice (PDF)',
      icon: FilePlus2,
      action: () => {
        setActiveView('create-invoice');
        onClose();
      },
    },
    {
      label: 'View Invoices & Billing History',
      icon: FileSpreadsheet,
      action: () => {
        setActiveView('invoices');
        onClose();
      },
    },
    {
      label: 'Scan & Ingest Receipt (AI)',
      icon: Sparkles,
      action: () => {
        onClose();
        openScanner();
      },
    },
    {
      label: 'Go to Dashboard',
      icon: ShoppingBag,
      action: () => {
        setActiveView('dashboard');
        onClose();
      },
    },
    {
      label: 'View Warranties & Protection',
      icon: ShieldCheck,
      action: () => {
        setActiveView('warranties');
        onClose();
      },
    },
    {
      label: 'View Return Deadlines',
      icon: RotateCcw,
      action: () => {
        setActiveView('returns');
        onClose();
      },
    },
    {
      label: 'Open Document Vault',
      icon: Vault,
      action: () => {
        setActiveView('vault');
        onClose();
      },
    },
    {
      label: 'View Spending Analytics',
      icon: BarChart3,
      action: () => {
        setActiveView('analytics');
        onClose();
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-20 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white rounded-2xl max-w-xl w-full border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3.5 border-b border-[#E2E8F0] flex items-center gap-3">
              {isSearchingSemantic ? (
                <Loader2 className="w-4 h-4 text-[#0F172A] animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-[#94A3B8]" />
              )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a query (e.g. 'workstation electronics' or 'expiring warranties')..."
            autoFocus
            className="flex-1 text-[13px] text-[#0F172A] bg-transparent focus:outline-none placeholder:text-[#94A3B8]"
          />
          {semanticResults && (
            <span className="flex items-center gap-1 font-mono-code text-[10px] text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
              <Sparkles className="w-3 h-3" /> AI Matched
            </span>
          )}
          <kbd className="font-mono-code text-[10px] text-[#76777D] bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2.5 divide-y divide-[#F1F5F9] text-[13px]">
          {/* AI Semantic Search Results if available */}
          {semanticResults && semanticResults.length > 0 && (
            <div className="pb-2">
              <span className="px-2 py-1 flex items-center gap-1 text-[10px] font-mono-code uppercase text-[#0F172A] font-semibold">
                <Sparkles className="w-3 h-3" />
                Gemini Semantic Matches ({semanticResults.length})
              </span>
              {semanticResults.map((match) => {
                const item = purchases.find((p) => p.id === match.id);
                if (!item) return null;
                return (
                  <button
                    key={match.id}
                    onClick={() => {
                      onClose();
                      onSelectPurchase(item);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F9F9FB] text-left transition-colors cursor-pointer group"
                  >
                    <div>
                      <p className="font-medium text-[#0F172A]">{item.name}</p>
                      <p className="text-[11px] text-[#76777D]">
                        {match.matchReason || `${item.vendor} · $${item.price.toFixed(2)}`}
                      </p>
                    </div>
                    <span className="font-mono-code text-[11px] text-[#10B981] font-semibold">
                      {Math.round((match.relevanceScore || 0.9) * 100)}% Match
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          {!query && (
            <div className="pb-2">
              <span className="px-2 py-1 block text-[10px] font-mono-code uppercase text-[#76777D] font-semibold">
                Navigation & Actions
              </span>
              {navActions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F9F9FB] text-left text-[#0F172A] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#76777D] group-hover:text-[#0F172A]" />
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#0F172A]" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Regular Matches */}
          {(!semanticResults || semanticResults.length === 0) && (
            <div className="pt-2">
              <span className="px-2 py-1 block text-[10px] font-mono-code uppercase text-[#76777D] font-semibold">
                Purchases ({basicMatches.length})
              </span>
              {basicMatches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onClose();
                    onSelectPurchase(p);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F9F9FB] text-left transition-colors cursor-pointer group"
                >
                  <div>
                    <p className="font-medium text-[#0F172A]">{p.name}</p>
                    <p className="text-[11px] text-[#76777D]">
                      {p.vendor} · ${p.price.toFixed(2)}
                    </p>
                  </div>
                  <span className="font-mono-code text-[11px] text-[#76777D]">
                    {p.purchaseDate}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
