/**
 * PromptHub Admin Support & Real-Time WhatsApp-Style Chat Console
 * 
 * Allows platform administrators to manage customer support tickets and reply in real-time:
 * - Live two-way chat stream with user queries
 * - Instant synchronization with user Help Assistant
 * - Status transitions (Open, In Progress, Resolved)
 * - Quick resolution actions (e.g. grant compensatory credits, canned responses)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  supportTicketService,
  type SupportTicket,
  type TicketStatus,
  type TicketCategory,
} from '../../services/supportTicketService';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Zap,
  ShieldCheck,
  Headphones,
  CheckCheck,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useConfirm } from '../../hooks/useConfirm';

interface AdminSupportChatTabProps {
  onGrantCredits?: (userId: string, email: string, amount: number) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminSupportChatTab: React.FC<AdminSupportChatTabProps> = ({
  onGrantCredits,
  showToast,
}) => {
  const confirm = useConfirm();
  const [tickets, setTickets] = useState<SupportTicket[]>(() => supportTicketService.getTickets());
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(() => {
    const all = supportTicketService.getTickets();
    return all.length > 0 ? all[0].id : null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time ticket updates
  useEffect(() => {
    const unsubscribe = supportTicketService.subscribe(() => {
      setTickets(supportTicketService.getTickets());
    });
    return unsubscribe;
  }, []);

  // When selected ticket changes, mark as read by admin & auto-scroll
  useEffect(() => {
    if (selectedTicketId) {
      supportTicketService.markTicketAsRead(selectedTicketId, 'admin');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [selectedTicketId, tickets]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  // Filtered tickets list
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // KPI counts
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const unreadCount = supportTicketService.getAdminUnreadCount();

  // Send admin reply
  const handleSendReply = () => {
    if (!selectedTicket || !replyText.trim()) return;

    setIsSending(true);
    try {
      supportTicketService.sendMessage({
        ticketId: selectedTicket.id,
        sender: 'admin',
        senderName: 'PromptHub Support (Admin)',
        senderEmail: 'prompthub.cloud@gmail.com',
        content: replyText.trim(),
      });

      setReplyText('');
      showToast(`Reply dispatched to ${selectedTicket.userEmail}!`, 'success');
    } catch {
      showToast('Failed to dispatch reply.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    supportTicketService.updateTicketStatus(selectedTicket.id, newStatus);
    showToast(`Ticket ${selectedTicket.id} marked as ${newStatus}!`, 'info');
  };

  const handleApplyCanned = (text: string) => {
    setReplyText(text);
  };

  const handleQuickGrantCredits = () => {
    if (!selectedTicket) return;
    if (onGrantCredits) {
      onGrantCredits(selectedTicket.userId, selectedTicket.userEmail, 100);
    }
    // Also send confirmation message into the ticket
    supportTicketService.sendMessage({
      ticketId: selectedTicket.id,
      sender: 'admin',
      senderName: 'PromptHub Support (Admin)',
      senderEmail: 'prompthub.cloud@gmail.com',
      content: 'Hello! As a courtesy for your feedback, we have credited 100 bonus credits to your PromptHub wallet balance. Thank you for helping us improve!',
    });
    showToast(`100 credits granted to ${selectedTicket.userEmail}!`, 'success');
  };

  const handleDeleteTicket = async (ticketId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Support Ticket',
      message: `Permanently delete support ticket ${ticketId}? This action cannot be undone.`,
      confirmText: 'Delete Ticket',
      variant: 'danger',
    });
    if (isConfirmed) {
      supportTicketService.deleteTicket(ticketId);
      if (selectedTicketId === ticketId) setSelectedTicketId(null);
      showToast(`Ticket ${ticketId} deleted.`, 'info');
    }
  };

  const getCategoryBadgeClass = (category: TicketCategory) => {
    switch (category) {
      case 'billing':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'byok':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'bug':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'teams':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      case 'arena':
      case 'studio':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-[#41A2D9] border-blue-200 dark:border-blue-900';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-2.5 h-2.5" /> Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-50 text-brand-primary dark:bg-blue-950/50 dark:text-[#41A2D9] border border-blue-200 dark:border-blue-800">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left font-sans">
      {/* ── Section Header & Real-Time KPIs ── */}
      <div className="bg-bg-secondary border border-border-default rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-default pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-text-primary">
                  Customer Support Tickets &amp; Live Chat
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Stream Active
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Two-way WhatsApp-style live messaging. Replies dispatched here appear instantaneously in the user’s floating Help Assistant.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTickets(supportTicketService.getTickets());
                showToast('Tickets synchronized!', 'info');
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-bg-tertiary hover:bg-bg-secondary border border-border-default text-xs font-semibold text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-bg-primary border border-border-default">
            <span className="text-[10px] font-mono uppercase text-text-muted font-semibold block">Total Tickets</span>
            <div className="text-xl font-bold font-mono text-text-primary mt-1">{totalCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-bg-primary border border-border-default">
            <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-semibold block">Open Inquiries</span>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{openCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-bg-primary border border-border-default">
            <span className="text-[10px] font-mono uppercase text-brand-primary dark:text-[#41A2D9] font-semibold block">In Progress</span>
            <div className="text-xl font-bold font-mono text-brand-primary dark:text-[#41A2D9] mt-1">{inProgressCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-bg-primary border border-border-default">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-semibold block">Resolved</span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-bg-primary border border-border-default">
            <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-semibold block">Unread User Queries</span>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">{unreadCount}</div>
          </div>
        </div>
      </div>

      {/* ── Two-Column WhatsApp/Intercom Dashboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Ticket Roster & Search Filters (5 cols) */}
        <div className="lg:col-span-5 bg-bg-secondary border border-border-default rounded-2xl overflow-hidden shadow-xs flex flex-col h-[680px]">
          {/* Search & Category Filter Controls */}
          <div className="p-3.5 border-b border-border-default space-y-2.5 bg-bg-primary/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search ticket ID, email, subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-bg-primary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary min-h-[38px]"
              />
            </div>

            {/* Status & Category Filters */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 custom-scrollbar text-[11px]">
              <div className="flex items-center gap-1">
                {(['all', 'open', 'in_progress', 'resolved'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium capitalize cursor-pointer transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-brand-primary text-white font-semibold shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    {st === 'in_progress' ? 'In Progress' : st}
                  </button>
                ))}
              </div>

              <select
                aria-label="Filter tickets by category"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-[11px] px-2 py-1 rounded-lg bg-bg-primary border border-border-default text-text-secondary focus:outline-none focus:border-brand-primary cursor-pointer shrink-0"
              >
                <option value="all">All Topics</option>
                <option value="billing">Billing &amp; Credits</option>
                <option value="byok">BYOK &amp; Keys</option>
                <option value="models">AI Models</option>
                <option value="team">Team Workspaces</option>
                <option value="workspace">Studio &amp; Arena</option>
                <option value="storage">Storage &amp; Backup</option>
                <option value="marketplace">Marketplace</option>
                <option value="other">Other Inquiries</option>
              </select>
            </div>
          </div>

          {/* Ticket List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-default custom-scrollbar">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted space-y-1">
                <MessageSquare className="w-6 h-6 mx-auto text-text-muted/60 mb-2" />
                <p className="font-semibold text-text-primary">No tickets found</p>
                <p>Try modifying your search or filter criteria.</p>
              </div>
            ) : (
              filteredTickets.map(ticket => {
                const isSelected = ticket.id === selectedTicketId;
                const lastMsg = ticket.messages[ticket.messages.length - 1];
                const hasUnread = ticket.messages.some(m => m.sender === 'user' && !m.isRead);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-3.5 transition-colors cursor-pointer text-left space-y-1.5 ${
                      isSelected
                        ? 'bg-brand-primary/10 dark:bg-[#41A2D9]/10 shadow-2xs'
                        : 'hover:bg-bg-tertiary/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {hasUnread && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" title="Unread user message" />
                        )}
                        <span className="font-mono text-[11px] font-bold text-text-primary truncate">
                          {ticket.id}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono uppercase font-semibold border ${getCategoryBadgeClass(ticket.category)}`}>
                          {ticket.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getStatusBadge(ticket.status)}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTicket(ticket.id);
                          }}
                          className="p-1 rounded text-text-muted hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                          title="Delete ticket"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-semibold text-text-primary line-clamp-1 leading-snug">
                      {ticket.subject}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-text-muted">
                      <span className="truncate max-w-[220px] font-mono">
                        {ticket.userName} · {ticket.userEmail}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono">
                        {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {lastMsg && (
                      <p className="text-[11px] text-text-secondary line-clamp-1 italic bg-bg-primary/60 px-2 py-1 rounded border border-border-default/60">
                        {lastMsg.sender === 'admin' ? 'Admin: ' : 'User: '}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time WhatsApp Chat Interface (7 cols) */}
        <div className="lg:col-span-7 bg-bg-secondary border border-border-default rounded-2xl overflow-hidden shadow-xs flex flex-col h-[680px]">
          {selectedTicket ? (
            <>
              {/* Chat Header: Customer Profile & Action Bar */}
              <div className="p-3.5 sm:p-4 border-b border-border-default bg-bg-primary/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    {selectedTicket.userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-text-primary truncate">
                        {selectedTicket.userName}
                      </h3>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono mt-0.5">
                      <span>{selectedTicket.userEmail}</span>
                      <span>·</span>
                      <span className="text-brand-primary dark:text-[#41A2D9]">{selectedTicket.id}</span>
                    </div>
                  </div>
                </div>

                {/* Status Switcher & Quick Resolution Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedTicket.status}
                    onChange={e => handleStatusChange(e.target.value as TicketStatus)}
                    className="min-h-[36px] px-2.5 py-1 text-xs rounded-xl bg-bg-secondary border border-border-default text-text-primary font-mono focus:border-brand-primary outline-none cursor-pointer"
                  >
                    <option value="open">Status: Open</option>
                    <option value="in_progress">Status: In Progress</option>
                    <option value="resolved">Status: Resolved</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleQuickGrantCredits}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Grant 100 bonus credits to resolve inquiry"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>+100 Credits</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    className="min-h-[36px] px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-300 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Delete ticket permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* System Diagnostics Drawer (Collapsible) */}
              {selectedTicket.diagnostics && (
                <div className="px-4 py-2 bg-bg-tertiary/60 border-b border-border-default flex items-center justify-between text-[10.5px] font-mono text-text-muted">
                  <div className="flex items-center gap-3 overflow-x-auto">
                    <span>OS: {selectedTicket.diagnostics.os}</span>
                    <span>·</span>
                    <span>Browser: {selectedTicket.diagnostics.browser}</span>
                    <span>·</span>
                    <span>Surface: {selectedTicket.diagnostics.activeSurface}</span>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Web Crypto AES-GCM Active</span>
                  </div>
                </div>
              )}

              {/* Chat Message Stream (WhatsApp Web Bubble Styling) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50/50 dark:bg-[#000000]/40">
                {/* Date Divider */}
                <div className="flex justify-center my-2">
                  <span className="px-3 py-0.5 rounded-full bg-bg-tertiary border border-border-default text-[10px] font-mono text-text-muted">
                    Ticket opened {new Date(selectedTicket.createdAt).toLocaleDateString()} at {new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {selectedTicket.messages.map(msg => {
                  const isAdmin = msg.sender === 'admin';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <div className="flex items-center gap-1.5 px-1 text-[10px] font-mono text-text-muted">
                        {isAdmin ? (
                          <span className="text-brand-primary dark:text-[#41A2D9] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {msg.senderName}
                          </span>
                        ) : (
                          <span className="font-semibold text-text-primary">
                            {msg.senderName}
                          </span>
                        )}
                        <span>·</span>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                          isAdmin
                            ? 'bg-brand-primary text-white rounded-tr-xs'
                            : 'bg-white dark:bg-[#1A242E] text-slate-900 dark:text-[#FFFFFF] border border-slate-200 dark:border-[#2A3B4D] rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        <div className={`flex items-center justify-end gap-1 mt-1 text-[9.5px] font-mono ${isAdmin ? 'text-blue-100' : 'text-text-muted'}`}>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isAdmin && <CheckCheck className="w-3 h-3 text-sky-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Reply Composer */}
              <div className="p-3 sm:p-4 border-t border-border-default bg-bg-primary space-y-2 shrink-0">
                {/* Canned Quick Response Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[10.5px]">
                  <span className="text-text-muted font-mono shrink-0">Quick replies:</span>
                  {[
                    'Verified & resolved! Please refresh your workspace.',
                    'We credited 100 bonus credits to your wallet.',
                    'Your BYOK keys are encrypted locally and never touch our servers.',
                    'Please clear your browser cache and try again.',
                  ].map((canned, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyCanned(canned)}
                      className="px-2 py-0.5 rounded-full bg-bg-tertiary hover:bg-bg-secondary border border-border-default text-text-secondary hover:text-text-primary whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {canned.slice(0, 36)}...
                    </button>
                  ))}
                </div>

                {/* Textarea & Send Button */}
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type an official response to this user (replies instantly in their Help Assistant)..."
                    className="flex-1 p-3 text-xs sm:text-sm rounded-xl bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary resize-none leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={isSending || !replyText.trim()}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-primary dark:bg-[#41A2D9] text-white dark:text-[#000000] hover:bg-blue-700 dark:hover:bg-[#64B6E3] disabled:opacity-50 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
                <div className="text-[10px] text-text-muted flex items-center justify-between">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  <span>Direct WhatsApp-Style Live Connection</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center text-text-muted">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-text-primary">No ticket selected</h4>
              <p className="text-xs max-w-sm text-text-secondary">
                Select any support ticket on the left to review customer diagnostics and reply in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
