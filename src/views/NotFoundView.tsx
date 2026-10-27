import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  Terminal, 
  ShoppingBag, 
  HelpCircle, 
  ArrowLeft, 
  FileQuestion
} from 'lucide-react';
import { PromptCommunityIcon } from '../components/icons/PromptHubIcons';
import { useApp } from '../context/AppContext';

export const NotFoundView: React.FC = () => {
  const { setActiveTab } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('community');
    }
  };

  const quickLinks = [
    {
      title: 'Prompt IDE Workspace',
      desc: 'Test and benchmark prompts across 10 top AI foundation models.',
      icon: Terminal,
      tab: 'workspace' as const,
      tag: 'Studio',
    },
    {
      title: 'Prompt Marketplace',
      desc: 'Discover verified, high-performance commercial prompt templates.',
      icon: ShoppingBag,
      tab: 'marketplace' as const,
      tag: 'Catalog',
    },
    {
      title: 'Community Feed',
      desc: 'Browse, run, and share public prompt architectures with fellow engineers.',
      icon: PromptCommunityIcon,
      tab: 'community' as const,
      tag: 'Ecosystem',
    },
    {
      title: 'Developer Support',
      desc: 'Get direct technical assistance, report issues, or read FAQs.',
      icon: HelpCircle,
      tab: 'support' as const,
      tag: 'Help Center',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-primary text-text-primary px-4 py-8 md:py-16 selection:bg-brand-primary-light selection:text-brand-primary">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center items-center text-center">
        
        {/* Visual Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex items-center justify-center"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-bg-secondary border border-border-default shadow-sm flex items-center justify-center text-brand-primary">
              <FileQuestion className="w-10 h-10 stroke-[1.5]" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-brand-primary text-white font-mono text-xs font-bold shadow-xs">
              404
            </span>
          </div>
        </motion.div>

        {/* Heading & Context */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3 mb-8"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-text-primary tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm sm:text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
            The studio route or prompt asset you requested does not exist, was moved, or requires elevated permissions.
          </p>
        </motion.div>

        {/* Quick Search Bar */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handleSearchSubmit}
          className="w-full max-w-md mb-10"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts, categories, or models..."
              className="w-full pl-10 pr-24 py-2.5 min-h-[44px] bg-bg-secondary border border-border-default rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 shadow-xs transition-all"
            />
            <button
              type="submit"
              className="absolute right-1 px-3.5 py-1.5 min-h-[36px] rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Search
            </button>
          </div>
        </motion.form>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-3 mb-12"
        >
          <button
            onClick={() => setActiveTab('home')}
            className="btn-primary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                const prev = sessionStorage.getItem('ph_last_valid_tab');
                if (prev && prev !== '404') {
                  setActiveTab(prev as any);
                  return;
                }
              }
              setActiveTab('home');
            }}
            className="btn-secondary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </motion.div>

        {/* Suggested Directory Bento Grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left"
        >
          {quickLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => setActiveTab(item.tab)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(item.tab);
                  }
                }}
                className="p-4 rounded-xl bg-bg-secondary hover:bg-bg-tertiary/70 border border-border-default hover:border-brand-primary/30 transition-all duration-200 cursor-pointer group shadow-2xs flex flex-col justify-between"
                role="button"
                tabIndex={0}
                aria-label={`Navigate to ${item.title}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary-light text-brand-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded bg-bg-tertiary border border-border-default">
                    {item.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>

      </div>
    </div>
  );
};

export default NotFoundView;