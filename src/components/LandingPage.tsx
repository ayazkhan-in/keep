import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowRight,
  Layers,
  Scan,
  ShieldCheck,
  FileText,
  DollarSign,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Receipt,
  Bot,
  Calendar,
  Check,
  ExternalLink,
  Zap,
  Menu,
  X,
  Users,
  BookOpen,
  Download,
  Fingerprint,
  PieChart,
  Briefcase,
  Sliders,
  Mail,
  Printer,
  Shield,
  FileSpreadsheet,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToApp?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToAuth,
  onNavigateToApp,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'claims' | 'ocr' | 'policy' | 'reports'>('claims');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: 'How does Keepr verify corporate expense policy compliance?',
      a: 'Keepr uses a deterministic policy engine that evaluates every receipt against company guidelines—including daily meal per diems, travel allowances, alcohol restrictions, and mandatory receipt thresholds. Unlike probabilistic LLM chatbots, Keepr executes verifiable mathematical rules with zero hallucination.',
    },
    {
      q: 'How does Keepr prevent duplicate claims and altered receipts?',
      a: 'Upon upload, every receipt image generates a cryptographic SHA-256 hash and a perceptual image hash (dHash). Keepr immediately flags duplicate submissions—even across different employees or dates—and detects image modifications (such as photoshopped numbers or dates) before reimbursement approval.',
    },
    {
      q: 'How is the workflow split between Employees and Finance Auditors?',
      a: 'Keepr features tailored role-based portals. Employees use a fast mobile-ready interface to snap receipts, track their 5-stage reimbursement progress, and view per diem allowance meters. Finance Auditors get an executive command console with an AI Review Queue for high-risk exceptions, a date-sorted All Claims stream with paper receipt overlays, a card-based Policy Studio, and one-click PDF audit reporting.',
    },
    {
      q: 'Can we upload our existing corporate policy documents?',
      a: 'Yes. Keepr’s Policy Studio includes a document parser that ingests corporate PDF handbooks and plain text policies. It automatically translates prose into structured, executable policy cards with spend caps, category rules, and conflict detection.',
    },
    {
      q: 'How are audit reports and payroll disbursements generated?',
      a: 'Keepr’s Reports generator creates comprehensive corporate audit packages formatted with formal company letterhead, compliance breakdowns, and itemized disbursement schedules. You can print or save high-fidelity PDFs via one click or dispatch reports directly via email to finance leaders and payroll departments.',
    },
    {
      q: 'Is our corporate financial and receipt data secure?',
      a: 'Yes. Keepr operates with bank-grade AES-256 encryption at rest and TLS 1.3 in transit. Financial records, employee allowances, and receipt evidence are stored in an isolated enclave with an immutable cryptographic audit ledger for complete enterprise governance.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1D] font-sans selection:bg-[#0F172A] selection:text-white">
      {/* Top Navigation Bar with Blur Appear Animation */}
      <motion.header
        initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="sticky top-0 z-40 bg-[#F8F9FA]/95 backdrop-blur-md border-b border-[#E2E8F0]/80"
      >
        <div className="max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center overflow-hidden">
              <img src="/abstract.png" alt="Keepr Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-lg sm:text-xl text-[#0F172A] tracking-tight">Keepr</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider hidden sm:inline-block">
                Auditor
              </span>
            </div>
          </div>

          {/* Desktop Center Links */}
          <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#45464D]">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-[#0F172A] font-semibold transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('roles')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Workflows
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Audit Engine
            </button>
            <button
              onClick={() => scrollToSection('showcase')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Live Console
            </button>
            <button
              onClick={() => scrollToSection('workflow')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              How it Works
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onNavigateToAuth}
              className="text-xs sm:text-[13px] font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-[#45464D] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
              exit={{ opacity: 0, height: 0, filter: 'blur(8px)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="md:hidden bg-white/95 backdrop-blur-xl border-b border-[#E2E8F0] px-4 py-3.5 space-y-2 shadow-lg overflow-hidden"
            >
              <nav className="flex flex-col space-y-1">
                {[
                  { label: 'Home', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                  { label: 'Role Workflows', action: () => scrollToSection('roles') },
                  { label: 'Audit Engine Features', action: () => scrollToSection('features') },
                  { label: 'Interactive Console Showcase', action: () => scrollToSection('showcase') },
                  { label: 'Reimbursement Lifecycle', action: () => scrollToSection('workflow') },
                  { label: 'FAQ', action: () => scrollToSection('faq') },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left px-3.5 py-2 rounded-xl text-sm font-medium text-[#45464D] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="pt-2 border-t border-[#E2E8F0] flex gap-2">
                  <button
                    onClick={() => {
                      onNavigateToAuth();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 text-center text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl transition-all shadow-xs"
                  >
                    Open Workspace
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto p-3.5 sm:p-5 md:p-6 lg:p-7 space-y-16 sm:space-y-24 lg:space-y-28 w-full">
        {/* SECTION 1: HERO SECTION */}
        <motion.section
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(16px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.75, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative w-full h-[calc(100dvh-4.5rem-2rem)] sm:h-[calc(100dvh-5rem-2.5rem)] md:h-[calc(100dvh-5rem-3rem)] min-h-[460px] max-h-[820px] flex flex-col"
        >
          {/* Main Hero Card with bg.jpg */}
          <div className="relative w-full h-full rounded-2xl sm:rounded-3xl md:rounded-[32px] lg:rounded-[38px] overflow-hidden flex flex-col justify-between p-5 sm:p-8 md:p-10 lg:p-12 xl:p-14 bg-[#F8F9FA] border-0 outline-none ring-0 shadow-none">
            {/* Background Image Layer */}
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-300"
              style={{ backgroundImage: "url('/bg.jpg')" }}
            />

            {/* Ambient Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30 pointer-events-none" />

            {/* Top Label inside Hero */}
            <motion.div
              initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="relative z-10 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-white/90 text-xs sm:text-sm font-medium tracking-wide font-mono-code uppercase">
                Next-Gen Corporate Expense & Financial Auditor
              </p>
            </motion.div>

            {/* Main Headline with Word-by-Word Blur Appear Animation */}
            <div className="relative z-10 max-w-xl lg:max-w-2xl xl:max-w-3xl mt-auto pb-1 sm:pb-3 lg:pb-4">
              <h1 className="font-heading font-normal text-2xl sm:text-4xl md:text-5xl lg:text-[46px] xl:text-[54px] 2xl:text-[60px] text-white tracking-tight leading-[1.08] sm:leading-[1.06]">
                <span className="flex flex-wrap gap-x-2.5 sm:gap-x-3.5">
                  {['Autonomous', 'Corporate', 'Expense'].map((word, i) => (
                    <motion.span
                      key={`w1-${i}`}
                      initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        duration: 0.65,
                        delay: 0.15 + i * 0.08,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                      className="inline-block"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
                <span className="flex flex-wrap gap-x-2.5 sm:gap-x-3.5">
                  {['&', 'Financial', 'Auditor'].map((word, i) => (
                    <motion.span
                      key={`w2-${i}`}
                      initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{
                        duration: 0.65,
                        delay: 0.42 + i * 0.08,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                      className="inline-block font-semibold text-emerald-300"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.55, ease: 'easeOut' }}
                className="text-white/80 text-xs sm:text-sm md:text-[15px] mt-3 sm:mt-4 max-w-xl leading-relaxed"
              >
                Eliminate expense fraud, automate reimbursement pipelines, and enforce company spend policies with sub-second multimodal AI and cryptographic ledger verification.
              </motion.p>

              {/* Bottom-left action links */}
              <motion.div
                initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, delay: 0.65, ease: 'easeOut' }}
                className="flex items-center gap-5 sm:gap-8 mt-5 sm:mt-7"
              >
                <button
                  onClick={onNavigateToAuth}
                  className="inline-flex items-center gap-1.5 text-white hover:text-emerald-200 font-semibold text-xs sm:text-sm md:text-[15px] pb-0.5 border-b-2 border-emerald-400 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <span>Launch Workspace</span>
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('roles')}
                  className="inline-flex items-center gap-1.5 text-white/90 hover:text-white font-normal text-xs sm:text-sm md:text-[15px] pb-0.5 border-b border-white/50 hover:border-white transition-all cursor-pointer"
                >
                  <span>Role Workflows</span>
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </motion.div>
            </div>

            {/* Desktop Signature Cutout Features Box */}
            <motion.div
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, delay: 0.5, ease: 'easeOut' }}
              className="hidden lg:flex absolute -bottom-[2px] -right-[2px] bg-[#F8F9FA] rounded-tl-[32px] pl-8 xl:pl-10 pr-6 xl:pr-8 pt-5 xl:pt-6 pb-5 xl:pt-6 z-20 items-center gap-6 xl:gap-8 border-0 outline-none ring-0 shadow-none"
            >
              {/* Top-right concave inverse fillet */}
              <svg
                className="absolute -top-[32px] -right-[1px] w-[33px] h-[33px] pointer-events-none fill-[#F8F9FA] border-0 outline-none"
                viewBox="0 0 33 33"
                style={{ shapeRendering: 'geometricPrecision' }}
              >
                <path d="M0,33 A32,32 0 0,0 33,0 L33,33 Z" fill="#F8F9FA" />
              </svg>

              {/* Bottom-left concave inverse fillet */}
              <svg
                className="absolute -bottom-[1px] -left-[32px] w-[33px] h-[33px] pointer-events-none fill-[#F8F9FA] border-0 outline-none"
                viewBox="0 0 33 33"
                style={{ shapeRendering: 'geometricPrecision' }}
              >
                <path d="M33,0 A32,32 0 0,1 0,33 L33,33 Z" fill="#F8F9FA" />
              </svg>

              {/* Feature 1 */}
              <div>
                <ShieldCheck className="w-7 h-7 xl:w-8 xl:h-8 text-emerald-600 mb-2" strokeWidth={1.75} />
                <h4 className="font-heading font-semibold text-sm xl:text-base text-[#0F172A] tracking-tight whitespace-nowrap">
                  Deterministic Policy
                </h4>
                <p className="text-[11px] text-[#76777D] font-mono-code">Zero-Hallucination Rules</p>
              </div>

              {/* Feature 2 */}
              <div>
                <Fingerprint className="w-7 h-7 xl:w-8 xl:h-8 text-emerald-600 mb-2" strokeWidth={1.75} />
                <h4 className="font-heading font-semibold text-sm xl:text-base text-[#0F172A] tracking-tight whitespace-nowrap">
                  Cryptographic Hashes
                </h4>
                <p className="text-[11px] text-[#76777D] font-mono-code">dHash & SHA-256 Tamper Proof</p>
              </div>

              {/* Feature 3 */}
              <div>
                <Receipt className="w-7 h-7 xl:w-8 xl:h-8 text-emerald-600 mb-2" strokeWidth={1.75} />
                <h4 className="font-heading font-semibold text-sm xl:text-base text-[#0F172A] tracking-tight whitespace-nowrap">
                  Instant Reimbursement
                </h4>
                <p className="text-[11px] text-[#76777D] font-mono-code">5-Stage Live Lifecycle</p>
              </div>
            </motion.div>
          </div>

          {/* Mobile & Tablet Features Row */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.65, delay: 0.45, ease: 'easeOut' }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3.5 sm:pt-4 lg:hidden shrink-0"
          >
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex items-center gap-3 shadow-2xs">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" strokeWidth={1.75} />
              <div>
                <h4 className="font-heading font-semibold text-sm text-[#0F172A]">Deterministic Policy</h4>
                <p className="text-[10px] text-[#76777D] font-mono-code">Zero-Hallucination Rules</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex items-center gap-3 shadow-2xs">
              <Fingerprint className="w-6 h-6 text-emerald-600 shrink-0" strokeWidth={1.75} />
              <div>
                <h4 className="font-heading font-semibold text-sm text-[#0F172A]">Fraud Guard</h4>
                <p className="text-[10px] text-[#76777D] font-mono-code">dHash & SHA-256 Verification</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex items-center gap-3 shadow-2xs">
              <Receipt className="w-6 h-6 text-emerald-600 shrink-0" strokeWidth={1.75} />
              <div>
                <h4 className="font-heading font-semibold text-sm text-[#0F172A]">Fast Reimbursement</h4>
                <p className="text-[10px] text-[#76777D] font-mono-code">5-Stage Live Timeline</p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* SECTION 2: DUAL-TONE SPLIT HEADLINE */}
        <motion.section
          id="about"
          initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="pt-2 sm:pt-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <div className="lg:col-span-6">
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-emerald-600 font-bold">
                Deterministic Accuracy
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-[44px] font-normal leading-[1.15] tracking-tight mt-1.5">
                <span className="text-[#0F172A]">Zero hallucination auditing,</span>{' '}
                <span className="text-[#94A3B8]">zero manual expense paperwork</span>
              </h2>
            </div>
            <div className="lg:col-span-6 text-[#76777D] text-[15px] leading-relaxed lg:pt-2 space-y-3">
              <p>
                Keepr pairs multimodal vision OCR with an immutable deterministic audit engine. Automatically evaluate meal per diems, travel allowances, hotel limits, and duplicate submissions with cryptographic proof.
              </p>
              <p className="text-xs text-[#0F172A] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Empowering employees with instant reimbursements while giving finance leaders complete spend governance.</span>
              </p>
            </div>
          </div>
        </motion.section>

        {/* SECTION 2.5: ROLE-BASED DUAL WORKFLOWS */}
        <motion.section
          id="roles"
          initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="space-y-8"
        >
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-emerald-600 font-bold">
              Tailored Personas
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-normal text-[#0F172A] tracking-tight mt-1">
              Two Dedicated Workflows, One Unified Platform
            </h2>
            <p className="text-[14px] text-[#76777D] mt-2">
              Select your role upon login with our interactive authentication slider for instant, role-scoped entry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Employee Card */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 lg:p-10 shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[80px] -z-0 pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono-code font-bold uppercase mb-4">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Employee Portal</span>
                </div>
                <h3 className="font-heading font-semibold text-2xl text-[#0F172A]">
                  Frictionless Submissions & Live Tracking
                </h3>
                <p className="text-[14px] text-[#76777D] mt-2.5 leading-relaxed">
                  Submit receipts in under 10 seconds. Get clear reimbursement transparency without chasing finance via email.
                </p>

                <ul className="mt-6 space-y-3 text-xs sm:text-[13px] text-[#334155]">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Scan & Submit Receipt:</strong> Multimodal AI OCR parses amounts and categories automatically.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Reimbursement Progress:</strong> 5-step transparent timeline from submission to payroll release.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>My Allowances:</strong> Real-time consumption meters for daily meal caps and monthly limits.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Trips & Travel:</strong> Group flights, hotels, and conveyance under dedicated business trips.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-[#F1F5F9] relative z-10">
                <button
                  onClick={onNavigateToAuth}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F8FAFC] hover:bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Enter as Employee (Alice Walker)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Finance Auditor Card */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 lg:p-10 shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-[80px] -z-0 pointer-events-none" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-mono-code font-bold uppercase mb-4">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Finance Auditor Console</span>
                </div>
                <h3 className="font-heading font-semibold text-2xl text-[#0F172A]">
                  Command Center for Corporate Audit & Fraud
                </h3>
                <p className="text-[14px] text-[#76777D] mt-2.5 leading-relaxed">
                  Focus only on high-risk policy exceptions with automated evidence overlays, employee allowance controls, and instant PDF report generation.
                </p>

                <ul className="mt-6 space-y-3 text-xs sm:text-[13px] text-[#334155]">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Review Queue:</strong> Priority exception triage sorted by deterministic risk score and amount.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Date-Sorted All Claims:</strong> Chronological audit stream with interactive receipt evidence modals.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Card Policy Section:</strong> Upload policy PDFs or customize policy rules manually.</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Employees & Reports:</strong> Directory with allowance meters and one-click PDF / email reports.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-[#F1F5F9] relative z-10">
                <button
                  onClick={onNavigateToAuth}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Enter as Auditor (Frank Castle)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 3: 6-GRID FEATURE SECTION */}
        <motion.section
          id="features"
          initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="space-y-10"
        >
          <div className="text-center max-w-3xl mx-auto">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-emerald-600 font-bold">
              Core Architecture
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-normal tracking-tight mt-1">
              <span className="text-[#0F172A]">Engineered for enterprise scale,</span>{' '}
              <span className="text-[#94A3B8]">powered by verifiable AI</span>
            </h2>
          </div>

          {/* Unified Bento Grid Card Container */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            {/* Top Row of 3 Items */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
              {/* Feature 1 */}
              <motion.div
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="p-5 sm:p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAFAFC] transition-colors group"
              >
                <div>
                  <Scan className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 mb-4 sm:mb-5 group-hover:scale-105 transition-transform" strokeWidth={1.75} />
                  <h3 className="font-heading font-semibold text-base sm:text-lg text-[#0F172A]">
                    Sub-second Multimodal OCR
                  </h3>
                  <p className="text-[13px] text-[#76777D] mt-2 sm:mt-2.5 leading-relaxed">
                    Instantly extracts merchant name, GSTIN/Tax ID, line items, and transaction timestamps from physical receipts or digital invoices in ~400ms.
                  </p>
                </div>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="p-5 sm:p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAFAFC] transition-colors group"
              >
                <div>
                  <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 mb-4 sm:mb-5 group-hover:scale-105 transition-transform" strokeWidth={1.75} />
                  <h3 className="font-heading font-semibold text-base sm:text-lg text-[#0F172A]">
                    Deterministic Policy Engine
                  </h3>
                  <p className="text-[13px] text-[#76777D] mt-2 sm:mt-2.5 leading-relaxed">
                    Evaluates spend caps, alcohol exclusions, per diems, and threshold requirements mathematically with zero hallucination.
                  </p>
                </div>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="p-5 sm:p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAFAFC] transition-colors group"
              >
                <div>
                  <Fingerprint className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 mb-4 sm:mb-5 group-hover:scale-105 transition-transform" strokeWidth={1.75} />
                  <h3 className="font-heading font-semibold text-base sm:text-lg text-[#0F172A]">
                    Cryptographic Fraud Detection
                  </h3>
                  <p className="text-[13px] text-[#76777D] mt-2 sm:mt-2.5 leading-relaxed">
                    Perceptual dHash and SHA-256 fingerprinting catch cross-employee duplicate submissions and pixel-level receipt modifications instantly.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Bottom Row of 3 Items */}
            <div className="border-t border-[#E2E8F0]">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
                {/* Feature 4 */}
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="p-5 sm:p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAFAFC] transition-colors group"
                >
                  <div>
                    <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 mb-4 sm:mb-5 group-hover:scale-105 transition-transform" strokeWidth={1.75} />
                    <h3 className="font-heading font-semibold text-base sm:text-lg text-[#0F172A]">
                      Date-Organized Claims Stream
                    </h3>
                    <p className="text-[13px] text-[#76777D] mt-2 sm:mt-2.5 leading-relaxed">
                      Chronological audit streams with horizontal date dividing lines, claim cards, and full-resolution receipt evidence overlays.
                    </p>
                  </div>
                </motion.div>

                {/* Feature 5 */}
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="p-5 sm:p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAFAFC] transition-colors group"
                >
                  <div>
                    <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 mb-4 sm:mb-5 group-hover:scale-105 transition-transform" strokeWidth={1.75} />
                    <h3 className="font-heading font-semibold text-base sm:text-lg text-[#0F172A]">
                      Card Policy Studio & Ingestion
                    </h3>
                    <p className="text-[13px] text-[#76777D] mt-2 sm:mt-2.5 leading-relaxed">
                      Upload PDF employee handbooks or build manual policy rule cards with automatic conflict detection and Grounded Q&A citations.
                    </p>
                  </div>
                </motion.div>

                {/* Feature 6 */}
                <motion.div
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="p-5 sm:p-8 md:p-10 flex flex-col justify-between hover:bg-[#FAFAFC] transition-colors group"
                >
                  <div>
                    <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 mb-4 sm:mb-5 group-hover:scale-105 transition-transform" strokeWidth={1.75} />
                    <h3 className="font-heading font-semibold text-base sm:text-lg text-[#0F172A]">
                      Executive Reports & ERP Exports
                    </h3>
                    <p className="text-[13px] text-[#76777D] mt-2 sm:mt-2.5 leading-relaxed">
                      Generate official audit reports with clean print-ready PDF styling, direct email dispatch, and SAP/NetSuite ERP data exports.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 4: INTERACTIVE PRODUCT SHOWCASE */}
        <motion.section
          id="showcase"
          initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="space-y-6 sm:space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-emerald-600 font-bold">
                Live Interactive Console
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-normal text-[#0F172A] tracking-tight mt-1">
                Explore the Auditor Workspace
              </h2>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-[#E2E8F0] p-1 sm:p-1.5 rounded-2xl shadow-2xs overflow-x-auto max-w-full">
              {[
                { id: 'claims', label: 'All Claims Stream' },
                { id: 'ocr', label: 'AI Receipt Parser' },
                { id: 'policy', label: 'Card Policy Studio' },
                { id: 'reports', label: 'Reports & PDF' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activePreviewTab === tab.id
                      ? 'bg-[#0F172A] text-white shadow-xs font-semibold'
                      : 'text-[#45464D] hover:bg-[#F8F9FA]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive UI Card Display */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-4 sm:p-8 md:p-10 shadow-sm min-h-[360px] flex items-center">
            <AnimatePresence mode="wait">
              {/* Tab 1: All Claims Stream */}
              {activePreviewTab === 'claims' && (
                <motion.div
                  key="tab-claims"
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full"
                >
                  <div className="lg:col-span-5 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-semibold text-2xl text-[#0F172A]">
                      Date-Organized Audit Stream
                    </h3>
                    <p className="text-[14px] text-[#76777D] leading-relaxed">
                      Every claim is grouped under clean chronological date dividers with total day spend and claim count. Clicking any claim opens a high-fidelity simulated receipt evidence ticket with SHA-256 validation.
                    </p>
                    <button
                      onClick={onNavigateToAuth}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800 pt-2 cursor-pointer"
                    >
                      <span>Inspect Claims in Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="lg:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 shadow-inner space-y-3">
                    {/* Date separator pill */}
                    <div className="relative flex items-center justify-center my-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative px-3 bg-[#F8FAFC] flex items-center gap-2 text-[11px] font-mono-code font-semibold text-[#64748B]">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>October 15, 2026</span>
                        <span>•</span>
                        <span className="text-[#0F172A]">4 claims · ₹18,450</span>
                      </div>
                    </div>

                    {/* Claim card 1 */}
                    <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between hover:border-emerald-300 transition-colors shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold font-mono-code">
                          ME
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0F172A]">Taj Palace Mumbai</p>
                          <p className="text-[11px] text-[#76777D]">Alice Walker · Engineering</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono-code text-xs font-bold text-[#0F172A]">₹2,450</span>
                        <div className="text-[10px] font-mono-code text-emerald-700 font-semibold">✓ Approved (Score: 12)</div>
                      </div>
                    </div>

                    {/* Claim card 2 */}
                    <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between hover:border-emerald-300 transition-colors shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold font-mono-code">
                          TR
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0F172A]">Delta Air Lines</p>
                          <p className="text-[11px] text-[#76777D]">Frank Castle · Audit Lead</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono-code text-xs font-bold text-[#0F172A]">₹12,800</span>
                        <div className="text-[10px] font-mono-code text-amber-700 font-semibold">⚠ Flight Upgrade Review</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: AI Receipt Parser */}
              {activePreviewTab === 'ocr' && (
                <motion.div
                  key="tab-ocr"
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full"
                >
                  <div className="lg:col-span-5 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <Scan className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-semibold text-2xl text-[#0F172A]">
                      Multimodal Receipt Parser
                    </h3>
                    <p className="text-[14px] text-[#76777D] leading-relaxed">
                      Upload any restaurant bill, taxi slip, or flight invoice. Keepr extracts merchant name, GSTIN, itemized line items, and verifies meal caps in under 450ms.
                    </p>
                    <button
                      onClick={onNavigateToAuth}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800 pt-2 cursor-pointer"
                    >
                      <span>Try OCR in Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="lg:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 shadow-inner space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
                      <span className="font-mono-code text-[11px] text-emerald-600 uppercase font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OCR Verified · 99.8% Confidence</span>
                      </span>
                      <span className="text-[11px] font-mono-code text-[#76777D]">0.42s</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl">
                        <span className="text-[#76777D]">Merchant</span>
                        <p className="font-semibold text-[#0F172A] mt-0.5">The Bombay Canteen</p>
                      </div>
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl">
                        <span className="text-[#76777D]">Total Amount</span>
                        <p className="font-semibold text-[#0F172A] mt-0.5">₹3,240.00 INR</p>
                      </div>
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl">
                        <span className="text-[#76777D]">Category</span>
                        <p className="font-semibold text-[#0F172A] mt-0.5">Meals · Corporate Cap</p>
                      </div>
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl">
                        <span className="text-[#76777D]">Policy Evaluation</span>
                        <p className="font-semibold text-emerald-700 mt-0.5">✓ Within ₹3,500 Daily Cap</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px] font-mono-code text-slate-500">
                      <span>SHA-256 Fingerprint:</span>
                      <span className="text-slate-800 font-semibold truncate max-w-[240px]">e8f9b4c0...31c2d9a</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Card Policy Studio */}
              {activePreviewTab === 'policy' && (
                <motion.div
                  key="tab-policy"
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full"
                >
                  <div className="lg:col-span-5 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-semibold text-2xl text-[#0F172A]">
                      Card-Based Policy Studio
                    </h3>
                    <p className="text-[14px] text-[#76777D] leading-relaxed">
                      Manage company rules through visual policy cards. Ingest existing PDF travel handbooks or configure manual meal limits, mileage rates, and receipt thresholds with rule conflict prevention.
                    </p>
                    <button
                      onClick={onNavigateToAuth}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800 pt-2 cursor-pointer"
                    >
                      <span>Explore Policy Section</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="lg:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
                    {/* Policy Card 1 */}
                    <div className="p-4 bg-white border-2 border-emerald-600 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                            Active Policy
                          </span>
                          <span className="text-xs font-mono-code text-slate-500">v1.2</span>
                        </div>
                        <span className="text-xs font-mono-code text-emerald-700 font-semibold">14 Active Rules</span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#0F172A] mt-2">Acme Global Travel & Expense Policy</h4>
                      <p className="text-xs text-[#64748B] mt-1">Daily Meals: ₹3,000/day · Mandatory Receipt &gt; ₹500</p>
                    </div>

                    {/* Policy Card 2 */}
                    <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl opacity-85">
                      <div className="flex items-center justify-between">
                        <span className="font-mono-code text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                          Draft Version
                        </span>
                        <span className="text-xs font-mono-code text-slate-500">v2.0 Draft</span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#0F172A] mt-1.5">Q4 Offsite & Remote Allowance Amendments</h4>
                      <p className="text-xs text-[#64748B] mt-1">Auto-approval for recurring SaaS tools & team lunches under ₹1,500</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 4: Reports & PDF */}
              {activePreviewTab === 'reports' && (
                <motion.div
                  key="tab-reports"
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full"
                >
                  <div className="lg:col-span-5 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-semibold text-2xl text-[#0F172A]">
                      Executive Audit Reports & PDF
                    </h3>
                    <p className="text-[14px] text-[#76777D] leading-relaxed">
                      Generate board-level corporate expense packages with Acme letterhead, compliance metrics, and disbursement schedules. Export to print-ready PDF or dispatch via email directly from the console.
                    </p>
                    <button
                      onClick={onNavigateToAuth}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800 pt-2 cursor-pointer"
                    >
                      <span>Generate Corporate Report</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="lg:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 space-y-4">
                    {/* Simulated letterhead summary */}
                    <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-mono-code text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          ACME CORP · EXPENSE AUDIT REPORT
                        </span>
                        <span className="font-mono-code text-[10px] text-emerald-700 font-bold">
                          94.2% Policy Compliant
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center py-1">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-mono-code">Total Audited</p>
                          <p className="font-semibold text-xs text-[#0F172A] mt-0.5">₹84,250</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-mono-code">Approved</p>
                          <p className="font-semibold text-xs text-emerald-700 mt-0.5">₹72,400</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-mono-code">Exceptions</p>
                          <p className="font-semibold text-xs text-amber-700 mt-0.5">3 Claims</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-slate-600 font-medium">Disbursement Schedule:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code text-[11px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 flex items-center gap-1">
                            <Printer className="w-3 h-3" />
                            <span>PDF Ready</span>
                          </span>
                          <span className="font-mono-code text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                            <Mail className="w-3 h-3" />
                            <span>Email Dispatch</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* SECTION 5: HOW IT WORKS (3-Step Reimbursement Workflow) */}
        <motion.section
          id="workflow"
          initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="space-y-10"
        >
          <div className="text-center max-w-3xl mx-auto">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-emerald-600 font-bold">
              Automated Lifecycle
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-normal text-[#0F172A] tracking-tight mt-1">
              How Keepr Automates Expense Reimbursements
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white border border-[#E2E8F0] rounded-3xl p-8 shadow-xs relative flex flex-col justify-between"
            >
              <div>
                <span className="font-mono-code text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  STAGE 01
                </span>
                <h3 className="font-heading font-semibold text-xl text-[#0F172A] mt-5">
                  Capture & Upload
                </h3>
                <p className="text-[13px] text-[#76777D] mt-2.5 leading-relaxed">
                  Employees snap receipts on mobile or drag and drop digital taxi, flight, and hotel PDFs into Keepr.
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white border border-[#E2E8F0] rounded-3xl p-8 shadow-xs relative flex flex-col justify-between"
            >
              <div>
                <span className="font-mono-code text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  STAGE 02
                </span>
                <h3 className="font-heading font-semibold text-xl text-[#0F172A] mt-5">
                  Deterministic Audit & Fraud Check
                </h3>
                <p className="text-[13px] text-[#76777D] mt-2.5 leading-relaxed">
                  Multimodal vision extracts metadata while the deterministic ledger computes hashes and verifies company policy caps.
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white border border-[#E2E8F0] rounded-3xl p-8 shadow-xs relative flex flex-col justify-between"
            >
              <div>
                <span className="font-mono-code text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  STAGE 03
                </span>
                <h3 className="font-heading font-semibold text-xl text-[#0F172A] mt-5">
                  Approval & Payroll Disbursement
                </h3>
                <p className="text-[13px] text-[#76777D] mt-2.5 leading-relaxed">
                  Clean claims clear instantly. Exceptions surface in the auditor queue for quick sign-off and scheduled bank payout.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 6: ENTERPRISE ENCLAVE SECURITY */}
        <motion.section
          initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="bg-[#0F172A] text-white rounded-3xl p-8 sm:p-14 relative overflow-hidden shadow-xl"
        >
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-[11px] font-mono-code uppercase tracking-wider border border-white/10">
              <Lock className="w-3.5 h-3.5" />
              <span>Enterprise Cryptographic Enclave</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-normal tracking-tight text-white leading-tight">
              Corporate financial records and receipts remain completely confidential.
            </h2>
            <p className="text-white/70 text-[14px] leading-relaxed">
              Every document is encrypted with bank-grade AES-256 and verified through perceptual image hashing. Keepr provides an immutable audit trail that satisfies strict enterprise governance, IRS, and SOC-2 standards.
            </p>
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={onNavigateToAuth}
                className="bg-white text-[#0F172A] hover:bg-slate-100 px-6 py-3 rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Access Auditor Enclave
              </button>
            </div>
          </div>
        </motion.section>

        {/* SECTION 7: FAQ ACCORDION */}
        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="max-w-3xl mx-auto space-y-8 pt-4"
        >
          <div className="text-center">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-emerald-600 font-bold">
              Got Questions?
            </span>
            <h2 className="font-heading text-3xl font-normal text-[#0F172A] tracking-tight mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between font-medium text-[15px] text-[#0F172A] cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#76777D]" /> : <ChevronDown className="w-4 h-4 text-[#76777D]" />}
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                      exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="px-5 pb-5 text-[13px] text-[#76777D] leading-relaxed border-t border-[#F1F5F9] pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* SECTION 8: CALL TO ACTION BOTTOM HERO */}
        <motion.section
          initial={{ opacity: 0, scale: 0.97, filter: 'blur(14px)' }}
          whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden shadow-2xl"
        >
          <div className="max-w-2xl mx-auto space-y-5">
            <h2 className="font-heading text-3xl sm:text-5xl font-normal tracking-tight text-white leading-tight">
              Ready to automate corporate expense audits?
            </h2>
            <p className="text-white/70 text-sm sm:text-base leading-relaxed">
              Equip your employees with fast reimbursements and arm your finance team with deterministic fraud protection.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onNavigateToAuth}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-8 py-3.5 rounded-full shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Launch Auditor Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.section>
      </main>

      {/* FOOTER */}
      <motion.footer
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, filter: 'blur(0px)' }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        id="contact"
        className="border-t border-[#E2E8F0] bg-white mt-24 py-12"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-[#E2E8F0]">
              <img src="/abstract.png" alt="Keepr Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-heading font-semibold text-sm text-[#0F172A]">Keepr Auditor</span>
            <span className="text-[12px] text-[#76777D]">© 2026 Keepr AI Inc. Corporate Intelligence. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-[12px] text-[#76777D]">
            <button onClick={onNavigateToAuth} className="hover:text-[#0F172A] cursor-pointer">
              Sign In
            </button>
            <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="hover:text-[#0F172A]">
              Gemini 3.7 Multimodal API
            </a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};
