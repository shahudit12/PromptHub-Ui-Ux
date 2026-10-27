import React from 'react';
import { Trophy, Copy, GitBranch, Play, Check, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { normalizeError } from '../utils/errorMessages';
import { UserAvatar } from './UserAvatar';

export const PromptOfTheDaySection: React.FC = React.memo(() => {
  const { 
    promptOfTheDay, 
    copyPrompt, 
    forkPrompt, 
    setActiveTab, 
    setActivePromptId, 
    showToast,
    isLoggedIn,
    setShowAuthModal
  } = useApp();
  const { sendToWork } = useWorkspace();
  const [copied, setCopied] = React.useState(false);

  if (!promptOfTheDay) return null;

  const score = Math.round(
    ((promptOfTheDay.likesCount || 0) * 3) + 
    ((promptOfTheDay.copiesCount || 0) * 3) + 
    ((promptOfTheDay.forksCount || 0) * 2) + 
    ((promptOfTheDay.viewsCount || 0) * 0.1)
  );

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      setShowAuthModal(true);
      showToast('Please sign in to copy this prompt.', 'info');
      return;
    }
    copyPrompt(promptOfTheDay.id);
    navigator.clipboard.writeText(promptOfTheDay.rawContent);
    setCopied(true);
    showToast('Prompt copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFork = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      setShowAuthModal(true);
      showToast('Please sign in to fork prompts.', 'info');
      return;
    }
    try {
      const forked = await forkPrompt(promptOfTheDay.id);
      if (forked && forked.id) {
        setActivePromptId(forked.id);
      }
      const target = forked || promptOfTheDay;
      try {
        sessionStorage.setItem('ph_active_prompt_id', target.id);
        sessionStorage.setItem('ph_creation_workspace_prompt', target.rawContent || '');
        sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
          title: target.title,
          prompt: target.rawContent,
          category: target.category,
        }));
      } catch {}
      sendToWork({
        title: target.title,
        prompt: target.rawContent,
      });
      setActiveTab('workspace');
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    }
  };

  const handleExecute = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      showToast('Please sign in to open prompts in Creation Workspace.', 'info');
      return;
    }
    try {
      sessionStorage.setItem('ph_active_prompt_id', promptOfTheDay.id);
      sessionStorage.setItem('ph_creation_workspace_prompt', promptOfTheDay.rawContent || '');
      sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
        title: promptOfTheDay.title,
        prompt: promptOfTheDay.rawContent,
        category: promptOfTheDay.category,
      }));
    } catch {}
    setActivePromptId(promptOfTheDay.id);
    sendToWork({
      title: promptOfTheDay.title,
      prompt: promptOfTheDay.rawContent,
    });
    setActiveTab('workspace');
  };

  return (
    <div className="relative w-full rounded-xl bg-bg-secondary border border-border-default p-5 sm:p-6 shadow-xs overflow-hidden mb-6 text-left">
      <div className="space-y-4 relative z-10">
        {/* Header Badge */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-md">
              <Trophy className="w-3.5 h-3.5 text-amber-600" /> PROMPT OF THE DAY
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 text-text-secondary bg-bg-tertiary px-2.5 py-0.5 rounded-md border border-border-default">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>Engagement: {score} pts</span>
            </span>
          </div>
        </div>

        {/* Content & Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2 space-y-2.5">
            <h3 
              onClick={handleExecute}
              className="text-base sm:text-lg font-bold font-display text-text-primary hover:text-brand-primary transition-colors cursor-pointer leading-snug"
            >
              {promptOfTheDay.title}
            </h3>

            <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
              {promptOfTheDay.description || 'Top community prompt selected based on quality score, forks, and execution ratings.'}
            </p>

            {/* Author & Model Details */}
            <div className="flex items-center gap-2.5 pt-1 text-xs text-text-muted flex-wrap font-mono">
              <div className="flex items-center gap-1.5">
                <UserAvatar
                  src={promptOfTheDay.authorAvatar}
                  name={promptOfTheDay.authorName}
                  username={promptOfTheDay.authorName}
                  size="xs"
                  shape="circle"
                  className="!w-5 !h-5 !text-[9px]"
                />
                <span className="text-text-primary font-medium">@{promptOfTheDay.authorName || 'prompthub'}</span>
              </div>
              <span>·</span>
              <span className="text-text-secondary bg-bg-tertiary px-1.5 py-0.2 rounded border border-border-default">
                {promptOfTheDay.model}
              </span>
              <span>·</span>
              <span className="text-text-muted">
                {promptOfTheDay.category}
              </span>
            </div>
          </div>

          {/* Action Card & Stats */}
          <div className="bg-bg-tertiary border border-border-default rounded-lg p-3 space-y-3 flex flex-col justify-between">
            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono">
              <div className="bg-bg-secondary p-2 rounded-md border border-border-default">
                <span className="font-bold text-text-primary block">{promptOfTheDay.likesCount || 0}</span>
                <span className="text-[9px] text-text-muted uppercase">Likes</span>
              </div>
              <div className="bg-bg-secondary p-2 rounded-md border border-border-default">
                <span className="font-bold text-text-primary block">{promptOfTheDay.copiesCount || 0}</span>
                <span className="text-[9px] text-text-muted uppercase">Copies</span>
              </div>
              <div className="bg-bg-secondary p-2 rounded-md border border-border-default">
                <span className="font-bold text-text-primary block">{promptOfTheDay.forksCount || 0}</span>
                <span className="text-[9px] text-text-muted uppercase">Forks</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={handleCopy}
                className="py-1.5 px-2 rounded-md bg-bg-secondary hover:bg-border-subtle text-text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer border border-border-default"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleFork}
                className="py-1.5 px-2 rounded-md bg-bg-secondary hover:bg-border-subtle text-text-primary text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer border border-border-default"
              >
                <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                <span>Fork</span>
              </button>

              <button
                onClick={handleExecute}
                className="py-1.5 px-2 rounded-md bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PromptOfTheDaySection;
