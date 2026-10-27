import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
  Heart,
  GitFork,
  MessageSquare,
  Sparkles,
  Terminal,
  Wallet,
  ArrowRight,
  X,
  Clock,
  ShieldCheck,
  Inbox,
  Users
} from 'lucide-react';
import type { Notification } from '../db/schema';
import { FollowButton } from '../components/FollowButton';

type NotificationFilter = 'all' | 'unread' | 'studio' | 'social' | 'system';

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    markNotificationsAsRead,
    markNotificationAsRead,
    clearAllNotifications,
    deleteNotification,
    setActiveTab,
    setActivePromptId,
    prompts,
  } = useApp();

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Categorize helper
  const getNotificationCategory = (not: Notification): 'studio' | 'social' | 'system' => {
    if (not.category) {
      if (not.category === 'social') return 'social';
      if (not.category === 'studio') return 'studio';
      return 'system';
    }
    if (['like', 'comment', 'fork', 'follow', 'copy'].includes(not.type)) return 'social';
    if (['success', 'info'].includes(not.type) && (not.promptTitle || not.promptId || not.senderName?.includes('Studio'))) return 'studio';
    return 'system';
  };

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(not => {
      // Category filter
      if (filter === 'unread' && not.read) return false;
      if (filter === 'studio' && getNotificationCategory(not) !== 'studio') return false;
      if (filter === 'social' && getNotificationCategory(not) !== 'social') return false;
      if (filter === 'system' && getNotificationCategory(not) !== 'system') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${not.message || ''} ${not.promptTitle || ''} ${not.senderName || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [notifications, filter, searchQuery]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    const now = new Date();
    const todayDateStr = now.toDateString();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateStr = yesterdayDate.toDateString();

    filteredNotifications.forEach(not => {
      const notDate = new Date(not.createdAt);
      const notDateStr = notDate.toDateString();

      if (notDateStr === todayDateStr) {
        today.push(not);
      } else if (notDateStr === yesterdayDateStr) {
        yesterday.push(not);
      } else {
        earlier.push(not);
      }
    });

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Earlier', items: earlier },
    ].filter(g => g.items.length > 0);
  }, [filteredNotifications]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay === 1) return 'Yesterday';
      if (diffDay < 7) return `${diffDay}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getIcon = (type: Notification['type'], category: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-rose-500/20" />;
      case 'fork':
        return <GitFork className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'purchase':
        return <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'follow':
        return <Users className="w-4 h-4 text-brand-primary dark:text-emerald-400" />;
      default:
        if (category === 'studio') return <Terminal className="w-4 h-4 text-brand-primary dark:text-emerald-400" />;
        return <Bell className="w-4 h-4 text-text-secondary" />;
    }
  };

  const handleActionClick = (not: Notification) => {
    markNotificationAsRead(not.id);

    if (not.promptId) {
      const exists = prompts.some(p => p.id === not.promptId);
      if (exists) {
        setActivePromptId(not.promptId);
        setActiveTab('workspace');
        return;
      }
    }

    if (not.message?.toLowerCase().includes('wallet') || not.message?.toLowerCase().includes('credit') || not.type === 'purchase') {
      setActiveTab('pricing');
      return;
    }

    if (not.message?.toLowerCase().includes('arena')) {
      setActiveTab('workspace');
      return;
    }

    if (not.message?.toLowerCase().includes('collection')) {
      setActiveTab('collections');
      return;
    }

    if (not.message?.toLowerCase().includes('team')) {
      setActiveTab('teams');
      return;
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary px-4 sm:px-6 lg:px-8 py-8 font-sans selection:bg-brand-primary selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#132435] text-brand-primary dark:text-[#41A2D9] flex items-center justify-center border border-brand-primary/20 shadow-2xs">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-text-primary font-display">
                    Notification Center
                  </h1>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-semibold font-mono rounded-full bg-brand-primary text-white">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">
                  Real-time alerts, prompt updates, studio events, and system notifications.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {unreadCount > 0 && (
              <button
                onClick={markNotificationsAsRead}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-bg-tertiary hover:bg-brand-primary/10 text-brand-primary border border-border-default hover:border-brand-primary/30 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-bg-tertiary hover:bg-rose-500/10 text-text-muted hover:text-rose-600 border border-border-default hover:border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
                title="Clear all notification history"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All', count: notifications.length },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'studio', label: 'Studio & IDE', count: notifications.filter(n => getNotificationCategory(n) === 'studio').length },
              { id: 'social', label: 'Social & Community', count: notifications.filter(n => getNotificationCategory(n) === 'social').length },
              { id: 'system', label: 'System & Billing', count: notifications.filter(n => getNotificationCategory(n) === 'system').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as NotificationFilter)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1.5 min-h-[44px] ${
                  filter === tab.id
                    ? 'bg-brand-primary text-white shadow-2xs font-semibold'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-default hover:bg-bg-tertiary'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-bg-tertiary text-text-muted border border-border-default'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search within notifications */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-bg-secondary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary min-h-[36px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List Content */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-bg-secondary border border-border-default rounded-2xl p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center mx-auto text-text-muted border border-border-default">
              <Inbox className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-bold text-text-primary">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {searchQuery
                  ? `No notifications matched "${searchQuery}". Try clearing your search query.`
                  : filter === 'unread'
                  ? "You're all caught up! When actions occur in the Studio, IDE, or Community, they will appear here."
                  : 'All notifications, system alerts, prompt executions, and user activities will be logged in this center.'}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveTab('workspace')}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px] shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Launch Prompt IDE</span>
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className="px-4 py-2 rounded-xl bg-bg-tertiary border border-border-default hover:bg-bg-secondary text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                <span>Explore Prompts</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div key={group.label} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-text-muted">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-border-default" />
                  <span className="text-[10px] font-mono text-text-muted">
                    {group.items.length} {group.items.length === 1 ? 'alert' : 'alerts'}
                  </span>
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {group.items.map((not) => {
                      const category = getNotificationCategory(not);
                      return (
                        <motion.div
                          key={not.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                          onClick={() => handleActionClick(not)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer group flex items-start gap-3.5 relative overflow-hidden ${
                            !not.read
                              ? 'bg-white dark:bg-[#0E1721] border-brand-primary/40 dark:border-brand-primary/50 shadow-sm ring-1 ring-brand-primary/10'
                              : 'bg-white dark:bg-[#070B0F] hover:bg-slate-50 dark:hover:bg-[#0B1118] border-border-default hover:border-border-hover shadow-2xs'
                          }`}
                        >
                          {/* Unread Indicator Bar */}
                          {!not.read && (
                            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-primary" />
                          )}

                          {/* Icon Container */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                            not.type === 'error'
                              ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-[#200B0F] dark:border-rose-900/60 dark:text-rose-400'
                              : not.type === 'success' || category === 'studio'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-[#091C14] dark:border-emerald-900/60 dark:text-emerald-400'
                              : not.type === 'like'
                              ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-[#200B0F] dark:border-rose-900/60 dark:text-rose-400'
                              : not.type === 'fork'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-[#11162B] dark:border-indigo-900/60 dark:text-indigo-400'
                              : not.type === 'comment'
                              ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-[#211606] dark:border-amber-900/60 dark:text-amber-400'
                              : 'bg-bg-tertiary border-border-default text-text-secondary dark:bg-[#141E28]'
                          }`}>
                            {getIcon(not.type, category)}
                          </div>

                          {/* Text Body */}
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5">
                              <span className="text-xs font-bold text-text-primary font-sans">
                                {not.senderName || 'PromptHub System'}
                              </span>
                              <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatRelativeTime(not.createdAt)}
                              </span>
                              {!not.read && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                  NEW
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-text-secondary leading-relaxed font-sans break-words">
                              {not.message || (
                                <>
                                  {not.type === 'like' && 'liked your template'}
                                  {not.type === 'follow' && 'followed your creator profile'}
                                  {not.type === 'comment' && 'commented on your prompt'}
                                  {not.type === 'copy' && 'copied template instructions for'}{' '}
                                  {not.promptTitle && <strong className="text-text-primary font-medium">"{not.promptTitle}"</strong>}
                                </>
                              )}
                            </p>

                            {/* Deep-link Action Hints */}
                            {not.type === 'follow' && not.senderId ? (
                              <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <FollowButton
                                  targetUserId={not.senderId}
                                  targetUserName={not.senderName}
                                  size="xs"
                                />
                              </div>
                            ) : (not.promptId || not.type === 'fork' || not.type === 'like' || not.type === 'comment') && (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-brand-primary flex items-center gap-1 group-hover:underline">
                                  <span>View Prompt Architecture</span>
                                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Quick Delete Single Notification Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(not.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-rose-600 cursor-pointer absolute right-2 top-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Delete notification"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Advisory & Persistence Badge */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0B1118] border border-border-default flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-primary shrink-0" />
            <span>Notifications are cryptographically session-synced and stored securely in local vault storage.</span>
          </div>
          <span className="font-mono text-[10px] shrink-0">Storage: {notifications.length}/50 events</span>
        </div>

      </div>
    </div>
  );
};

export default NotificationsView;
