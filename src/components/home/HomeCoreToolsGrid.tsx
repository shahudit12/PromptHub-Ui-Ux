import React from 'react';
import {
  Sparkles,
  Laptop,
  FolderKanban,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HomeCoreToolsGrid: React.FC = () => {
  const { setActiveTab } = useApp();

  const tools = [
    {
      id: 'workspace',
      title: 'Creation Workspace',
      description: 'Write, test, and run prompts with live AI generation and parameter tuning.',
      icon: Sparkles,
      iconBg: 'bg-[#E8F1ED] dark:bg-emerald-950/60',
      iconColor: 'text-[#2F604F] dark:text-emerald-400',
      badgeColor: 'border-[#2F604F]/20 dark:border-emerald-800/40',
    },
    {
      id: 'work',
      title: 'Autonomous Work IDE',
      description: 'Execute multi-step tasks, tools, and autonomous agent workflows.',
      icon: Laptop,
      iconBg: 'bg-[#E8F2FA] dark:bg-blue-950/60',
      iconColor: 'text-[#2563EB] dark:text-blue-400',
      badgeColor: 'border-[#2563EB]/20 dark:border-blue-800/40',
    },
    {
      id: 'library',
      title: 'Prompt Library',
      description: 'Organize, version, and manage your private and team prompts.',
      icon: FolderKanban,
      iconBg: 'bg-[#F5E8E8] dark:bg-rose-950/60',
      iconColor: 'text-[#C4674A] dark:text-rose-400',
      badgeColor: 'border-[#C4674A]/20 dark:border-rose-800/40',
    },
    {
      id: 'agents',
      title: 'AI Agents Studio',
      description: 'Build custom AI agents with autonomous tools, system instructions, and memory.',
      icon: Bot,
      iconBg: 'bg-[#FAF3E7] dark:bg-amber-950/60',
      iconColor: 'text-[#D97706] dark:text-amber-400',
      badgeColor: 'border-[#D97706]/20 dark:border-amber-800/40',
    },
  ];

  return (
    <section className="py-6 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full select-none text-left font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => setActiveTab(tool.id as any)}
              className="p-4 rounded-xl border border-border-default bg-bg-secondary hover:border-border-hover hover:shadow-xs transition-all duration-150 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`w-9 h-9 rounded-lg ${tool.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${tool.iconColor}`} />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted/60 group-hover:text-text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>

              <div className="mt-3.5">
                <p className="font-semibold text-text-primary text-[13.5px] tracking-tight group-hover:text-brand-primary transition-colors">
                  {tool.title}
                </p>
                <p className="text-xs text-text-muted leading-relaxed mt-1 font-sans">
                  {tool.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
