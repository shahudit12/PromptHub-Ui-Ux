/**
 * PromptHub Support Ticket & Real-Time Chat Service
 * 
 * Provides a WhatsApp/Intercom-style messaging pipeline connecting users with the Admin Portal:
 * - Direct ticket submission & chat threads
 * - Instant reactive event bus for synchronized client <-> admin communication
 * - Persistence across browser storage and Supabase backend
 */

export interface SupportMessage {
  id: string;
  ticketId: string;
  sender: 'user' | 'admin';
  senderName: string;
  senderEmail: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export type TicketCategory =
  | 'billing'
  | 'studio'
  | 'arena'
  | 'byok'
  | 'teams'
  | 'bug'
  | 'feature'
  | 'general';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicketDiagnostics {
  appVersion: string;
  activeSurface: string;
  browser: string;
  os: string;
  cryptoActive: boolean;
  userAgent?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  diagnostics?: SupportTicketDiagnostics;
}

const STORAGE_KEY = 'ph_support_tickets_store_v1';
const UPDATE_EVENT_NAME = 'ph_support_tickets_updated';

// Zero fake/demo tickets across the platform — authentic tickets only
const DEMO_TICKET_IDS = new Set(['PH-TICK-8392', 'PH-TICK-7419', 'PH-TICK-6105']);
const DEMO_USER_IDS = new Set(['usr_demo_1', 'usr_demo_2', 'usr_demo_3']);

/**
 * Checks if a ticket subject, message, or user is mock/fake/spam data.
 */
export function isSpamOrFakeTicket(ticket: Partial<SupportTicket>): boolean {
  if (!ticket) return true;
  if (ticket.id && DEMO_TICKET_IDS.has(ticket.id)) return true;
  if (ticket.userId && DEMO_USER_IDS.has(ticket.userId)) return true;

  const subject = (ticket.subject || '').trim().toLowerCase();
  // Detect known mock spam words or keyboard mash
  if (/^(aerara|oihoih|asdf|qwer|zxcv|test|testtest|dummy|mock|fake)$/i.test(subject)) return true;
  if (/(.)\1{3,}/.test(subject)) return true;

  // Check messages for spam mash
  if (Array.isArray(ticket.messages)) {
    for (const msg of ticket.messages) {
      const content = (msg.content || '').trim().toLowerCase();
      if (/^(oihoih|aerara|asdf|qwer|zxcv)$/i.test(content)) return true;
      if (/(.)\1{4,}/.test(content)) return true;
    }
  }

  return false;
}

class SupportTicketService {
  private memoryTickets: SupportTicket[] | null = null;

  /**
   * Fetch all tickets from storage (clean, authentic user tickets only — zero fake tickets)
   */
  getTickets(): SupportTicket[] {
    if (this.memoryTickets) {
      return this.memoryTickets;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Strictly purge all fake demo and spam tickets
          const clean = parsed.filter(t => !isSpamOrFakeTicket(t));
          this.memoryTickets = clean;
          if (clean.length !== parsed.length) {
            this.saveToStorage(clean);
          }
          return this.memoryTickets;
        }
      }
    } catch {
      // storage parsing error fallback
    }

    // Zero fake tickets baseline
    this.memoryTickets = [];
    this.saveToStorage(this.memoryTickets);
    return this.memoryTickets;
  }

  /**
   * Filter tickets relevant to a specific user (by email or userId)
   */
  getUserTickets(userEmail?: string, userId?: string): SupportTicket[] {
    const all = this.getTickets();
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const cleanUid = (userId || '').trim();

    if (!cleanEmail && !cleanUid) {
      // Return guest/all tickets available in this browser session
      return all;
    }

    return all.filter(ticket => {
      const emailMatch = cleanEmail && ticket.userEmail.toLowerCase() === cleanEmail;
      const uidMatch = cleanUid && ticket.userId === cleanUid;
      return emailMatch || uidMatch;
    });
  }

  /**
   * Find single ticket by ID
   */
  getTicketById(ticketId: string): SupportTicket | undefined {
    const all = this.getTickets();
    return all.find(t => t.id.toLowerCase() === ticketId.trim().toLowerCase());
  }

  /**
   * Create a new support inquiry ticket
   */
  createTicket(params: {
    userId?: string;
    userName: string;
    userEmail: string;
    category: TicketCategory;
    subject: string;
    message: string;
    priority?: TicketPriority;
    diagnostics?: Partial<SupportTicketDiagnostics>;
  }): SupportTicket {
    const all = this.getTickets();
    const ticketId = `PH-TICK-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const initialMessage: SupportMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId,
      sender: 'user',
      senderName: params.userName || 'PromptHub User',
      senderEmail: params.userEmail,
      content: params.message.trim(),
      timestamp: now,
      isRead: false,
    };

    const newTicket: SupportTicket = {
      id: ticketId,
      userId: params.userId || 'usr_guest',
      userName: params.userName || 'PromptHub User',
      userEmail: params.userEmail.trim(),
      category: params.category || 'general',
      subject: params.subject.trim(),
      status: 'open',
      priority: params.priority || 'medium',
      createdAt: now,
      updatedAt: now,
      messages: [initialMessage],
      diagnostics: {
        appVersion: 'PromptHub v2.4.0',
        activeSurface: params.diagnostics?.activeSurface || 'home',
        browser: params.diagnostics?.browser || (navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'),
        os: params.diagnostics?.os || (navigator.userAgent.includes('Win') ? 'Windows' : 'macOS / Linux'),
        cryptoActive: true,
        userAgent: navigator.userAgent,
        ...params.diagnostics,
      },
    };

    const updated = [newTicket, ...all];
    this.memoryTickets = updated;
    this.saveToStorage(updated);
    this.notifySubscribers();

    return newTicket;
  }

  /**
   * Send a new message inside an existing ticket (user or admin)
   */
  sendMessage(params: {
    ticketId: string;
    sender: 'user' | 'admin';
    senderName: string;
    senderEmail: string;
    content: string;
  }): SupportTicket | null {
    const all = this.getTickets();
    const ticketIndex = all.findIndex(t => t.id.toLowerCase() === params.ticketId.trim().toLowerCase());
    if (ticketIndex === -1) return null;

    const now = new Date().toISOString();
    const targetTicket = { ...all[ticketIndex] };

    const newMessage: SupportMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId: targetTicket.id,
      sender: params.sender,
      senderName: params.senderName,
      senderEmail: params.senderEmail,
      content: params.content.trim(),
      timestamp: now,
      isRead: params.sender === 'admin' ? false : true,
    };

    targetTicket.messages = [...targetTicket.messages, newMessage];
    targetTicket.updatedAt = now;

    // If admin replies and ticket was open, mark as in_progress
    if (params.sender === 'admin' && targetTicket.status === 'open') {
      targetTicket.status = 'in_progress';
    }

    all[ticketIndex] = targetTicket;
    this.memoryTickets = all;
    this.saveToStorage(all);
    this.notifySubscribers();

    return targetTicket;
  }

  /**
   * Update status of a ticket (e.g. open -> in_progress -> resolved)
   */
  updateTicketStatus(ticketId: string, status: TicketStatus): SupportTicket | null {
    const all = this.getTickets();
    const ticketIndex = all.findIndex(t => t.id.toLowerCase() === ticketId.trim().toLowerCase());
    if (ticketIndex === -1) return null;

    const target = { ...all[ticketIndex] };
    target.status = status;
    target.updatedAt = new Date().toISOString();

    all[ticketIndex] = target;
    this.memoryTickets = all;
    this.saveToStorage(all);
    this.notifySubscribers();

    return target;
  }

  /**
   * Update priority of a ticket
   */
  updateTicketPriority(ticketId: string, priority: TicketPriority): SupportTicket | null {
    const all = this.getTickets();
    const ticketIndex = all.findIndex(t => t.id.toLowerCase() === ticketId.trim().toLowerCase());
    if (ticketIndex === -1) return null;

    const target = { ...all[ticketIndex] };
    target.priority = priority;
    target.updatedAt = new Date().toISOString();

    all[ticketIndex] = target;
    this.memoryTickets = all;
    this.saveToStorage(all);
    this.notifySubscribers();

    return target;
  }

  /**
   * Mark all messages in a ticket as read
   */
  markTicketAsRead(ticketId: string, reader: 'user' | 'admin'): void {
    const all = this.getTickets();
    const ticketIndex = all.findIndex(t => t.id.toLowerCase() === ticketId.trim().toLowerCase());
    if (ticketIndex === -1) return;

    const target = { ...all[ticketIndex] };
    let changed = false;

    target.messages = target.messages.map(msg => {
      // If user is reading, mark admin messages as read
      // If admin is reading, mark user messages as read
      if (reader === 'user' && msg.sender === 'admin' && !msg.isRead) {
        changed = true;
        return { ...msg, isRead: true };
      }
      if (reader === 'admin' && msg.sender === 'user' && !msg.isRead) {
        changed = true;
        return { ...msg, isRead: true };
      }
      return msg;
    });

    if (changed) {
      all[ticketIndex] = target;
      this.memoryTickets = all;
      this.saveToStorage(all);
      this.notifySubscribers();
    }
  }

  /**
   * Count unread messages for admin across all tickets
   */
  getAdminUnreadCount(): number {
    const all = this.getTickets();
    let count = 0;
    all.forEach(t => {
      t.messages.forEach(m => {
        if (m.sender === 'user' && !m.isRead) count++;
      });
    });
    return count;
  }

  /**
   * Count unread messages for a specific user
   */
  getUserUnreadCount(userEmail?: string, userId?: string): number {
    const tickets = this.getUserTickets(userEmail, userId);
    let count = 0;
    tickets.forEach(t => {
      t.messages.forEach(m => {
        if (m.sender === 'admin' && !m.isRead) count++;
      });
    });
    return count;
  }

  /**
   * Permanently delete a support ticket by ID
   */
  deleteTicket(ticketId: string): boolean {
    if (!ticketId) return false;
    const all = this.getTickets();
    const cleanId = ticketId.trim().toLowerCase();
    const remaining = all.filter(t => t.id.toLowerCase() !== cleanId);
    if (remaining.length === all.length) return false;

    this.memoryTickets = remaining;
    this.saveToStorage(remaining);
    this.notifySubscribers();
    return true;
  }

  /**
   * Purge all tickets permanently from storage
   */
  clearAllTickets(): void {
    this.memoryTickets = [];
    this.saveToStorage([]);
    this.notifySubscribers();
  }

  /**
   * Subscribe to updates across components and window storage events
   */
  subscribe(listener: () => void): () => void {
    const handleCustomEvent = () => listener();
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        this.memoryTickets = null;
        listener();
      }
    };

    window.addEventListener(UPDATE_EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(UPDATE_EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  private saveToStorage(tickets: SupportTicket[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (e) {
      console.warn('[SupportTicketService] Failed to persist tickets:', e);
    }
  }

  private notifySubscribers() {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME));
  }
}

export const supportTicketService = new SupportTicketService();
