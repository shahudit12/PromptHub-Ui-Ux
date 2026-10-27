export interface UserSocialLinks {
  twitter?: string;
  github?: string;
  linkedin?: string;
  website?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'follow' | 'copy' | 'comment' | 'fork' | 'system' | 'success' | 'error' | 'info' | 'purchase' | 'reward';
  senderName: string;
  senderAvatar: string;
  promptId?: string;
  promptTitle?: string;
  createdAt: string;
  read: boolean;
  senderId?: string;
  message?: string;
  category?: 'studio' | 'social' | 'system' | 'wallet';
  actionUrl?: string;
}

export type BadgeType =
  | 'bug_hunter'
  | 'top_creator'
  | 'early_pioneer'
  | 'prompt_master'
  | 'pro_member'
  | 'core_contributor'
  // ── Subscription-tier badges (awarded on plan purchase) ──────────────────
  | 'free_explorer'    // Free plan
  | 'starter_member'  // ₹299 Starter plan
  | 'growth_member'   // ₹1,499 Growth plan
  | 'studio_elite'    // ₹5,999 Studio plan
  // ── Credit backer badge (awarded on ₹200+ credit purchase) ───────────────
  | 'power_patron';   // Purchased ₹200+ in AI credits

export interface PendingReward {
  id: string;
  type?: 'bug_report' | 'prompt_submission';
  title: string;
  description?: string;
  promptId?: string;
  category?: string;
  model?: string;
  note?: string;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  daysGranted: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  submittedAt?: string;
}

export interface BugReport {
  id: string;
  userId: string;
  userName?: string;
  userEmail: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  rewardGranted?: boolean;
  createdAt: string;
}

export interface AdminPromptSubmission {
  id: string;
  userId: string;
  userName: string;
  username: string;
  userAvatar?: string;
  userEmail?: string;
  promptId: string;
  promptTitle: string;
  promptDescription?: string;
  promptContent?: string;
  category: string;
  model: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rewardGranted: boolean;
  createdAt: string;
}


export interface User {
  createdAt?: string;
  updatedAt?: string;
  planTier?: string;
  planStatus?: string;
  sellerStatus?: string;
  sellerTier?: string;
  rechargeHistoryCount?: number;
  user_metadata?: Record<string, any>;
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  socialLinks?: UserSocialLinks;

  followersCount: number;
  followingCount: number;
  promptCount: number;
  forkCount: number;
  totalViews: number;
  totalLikes: number;
  totalCopies: number;
  followers: string[]; // User IDs following this user
  following: string[]; // User IDs this user follows
  bookmarks: string[]; // Prompt IDs bookmarked
  joinDate: string;
  role: 'Admin' | 'User';
  achievements: string[];

  // Badges & Pro Reward Eligibility
  badges?: BadgeType[];
  pendingRewards?: PendingReward[];
  hasPremiumAccess?: boolean;
  proUntil?: string | null;
  plan?: 'free' | 'pro' | 'agency' | string;

  // Profile Onboarding & Phone Number
  hasCompletedProfileSetup?: boolean;
  phoneNumber?: string;

  // Identity Change Rate Limiting (Twice per 7-day rolling window)
  nameChangeHistory?: string[];
  usernameChangeHistory?: string[];

  // Credit & BYOK System Fields
  credits: number; // Combined active credits (free + paid + plan)
  freeCredits?: number; // Free allocation credits
  paidCredits?: number; // Permanently purchased top-up credits (never expires)
  planCredits?: number; // Credits allocated from active subscription plan
  totalCreditSpendInr?: number; // Cumulative INR spent on credits
  promotionalCredits?: number;
  promotionalCreditsExpiresAt?: string;
  openrouterCredits?: number;
  promoActivationClaimed?: boolean;
  megaLaunchBonusGranted?: boolean;
  megaLaunchBonusGrantedAt?: string | null;
  launchPromo500Claimed?: boolean;
  launchPromo500ClaimedAt?: string | null;
  launchPromo500ClaimNumber?: number | null;
  promoActivationClaimedAt?: string | null;
  promoActivationPaymentId?: string | null;
  hasBYOK?: boolean;
  byokProvider?: 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'groq';

  // Language / Tone Preference (Professional vs Gen Z)
  tonePreference?: 'professional';

  // Streak Retention & Activity Tracking
  currentStreakDays?: number;
  longestStreakDays?: number;
  lastActiveDate?: string;
  claimedMilestones?: number[];

  // Storage Quota Tracking
  storageBytesUsed?: number;
  storageQuotaBytes?: number;

  // NOTE: No password field — authentication is handled by Supabase Auth
}

export type TonePreference = 'professional';


export interface AIProviderConfig {
  id: 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'groq';
  name: string;
  description: string;
  connected: boolean;
  status: 'Connected' | 'Not Connected';
  docsUrl: string;
}

// Note: User profile is defined in the User interface above.
// CreatorProfile data is derived dynamically from Prompt records.

/**
 * ModelType is a string type accepting any OpenRouter/AICredits-compatible model ID.
 * The catalogue is fetched dynamically from the models-catalog Edge Function.
 */
export type ModelType = string;

export type CategoryType = 'Development' | 'Marketing' | 'Design' | 'Writing' | 'Business' | 'Education' | 'Research' | 'Support' | 'Other';

export type AssetType = 'prompt' | 'workflow' | 'mcp' | 'agent' | 'rag' | 'dataset' | 'automation';

export interface PromptVariable {
  name: string;
  defaultValue: string;
  description: string;
}

export interface ModelComparisonData {
  model: string;
  latency: number;
  cost: number;
  score: number;
  output: string;
}

export interface Prompt {
  isPaid?: boolean;
  forkedFromId?: string;
  id: string;
  title: string;
  description: string;
  rawContent: string;
  variables: PromptVariable[];
  category: CategoryType;
  tags: string[];
  model: ModelType;
  visibility: 'public' | 'private' | 'team';
  authorId: string;
  authorName: string;
  authorAvatar: string;
  likesCount: number;
  forksCount: number;
  viewsCount: number;
  copiesCount: number;
  commentsCount?: number;
  sharesCount?: number;
  isPremium: boolean;
  price?: number; // Price in USD if premium
  priceInr?: number; // Price in INR
  originalAuthorId?: string; // If forked, points to original creator
  originalPromptId?: string; // If forked, points to original prompt
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  assetType: AssetType;
  qualityScore?: number;
  averageRating?: number; // True community average (1–5) based on real ratings
  ratingCount?: number;   // Total count of real ratings submitted
  successRate?: number;
  avgLatency?: number;
  estimatedCost?: number;
  workflowSteps?: string[];
  modelComparison?: ModelComparisonData[];
  
  // Phase 4 extended fields
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  license: 'MIT' | 'Apache-2.0' | 'CC-BY-4.0' | 'Commercial';
  thumbnail?: string; // Gradient key or Unsplash thumbnail link
  coverUrl?: string; // Cloudinary secure upload cover link
  inputImageUrl?: string; // Prompt Input / Before preview image
  outputImageUrl?: string; // Prompt Output / After preview image
  status: 'active' | 'draft' | 'archived';
  isFeatured?: boolean; // Set by admin to feature prompt in community/marketplace
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE GRAPH & GROUNDED CONTEXT (SECTION 69)
// ─────────────────────────────────────────────────────────────────────────────
export type KnowledgeNodeType = 
  | 'prompt'
  | 'version'
  | 'template'
  | 'folder'
  | 'collection'
  | 'tag'
  | 'topic'
  | 'model'
  | 'provider'
  | 'project'
  | 'note'
  | 'document'
  | 'example'
  | 'marketplace_prompt';

export type KnowledgeRelationType = 
  | 'related_to'
  | 'belongs_to'
  | 'tagged_with'
  | 'uses'
  | 'has_version'
  | 'derived_from'
  | 'forked_from'
  | 'references'
  | 'has_example';

export interface KnowledgeNode {
  id: string;
  userId: string;
  type: KnowledgeNodeType;
  title: string;
  slug?: string;
  content?: string;
  summary?: string;
  visibility: 'private' | 'public' | 'team';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEdge {
  id: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KnowledgeRelationType;
  weight?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface GroundedContextSource {
  id: string;
  type: KnowledgeNodeType;
  title: string;
  ownerId: string;
  relevanceScore?: number;
  retrievedAt: string;
  summary?: string;
}

export interface GroundedContextResult {
  contextPrompt: string;
  sourcesUsed: GroundedContextSource[];
  hasConflicts?: boolean;
  conflictDetails?: string;
  isUncertain?: boolean;
  uncertaintyReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER RETENTION & STREAKS (SECTION 25 & 26)
// ─────────────────────────────────────────────────────────────────────────────
export interface UserStreak {
  userId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: string;
  claimedMilestones: number[];
  updatedAt: string;
}

export interface StreakMilestoneReward {
  days: number;
  rewardCredits: number;
  badgeTitle: string;
  description: string;
}

export interface PromptVersion {
  version?: number;
  content?: string;
  authorId?: string;
  id: string;
  promptId: string;
  versionNumber: number;
  rawContent: string;
  updateNotes: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  promptIds: string[];
  authorId: string;
  isPrivate: boolean;
  createdAt: string;
  followers?: string[]; // User IDs following this collection
  bannerUrl?: string; // Cloudinary secure upload banner link
}

export interface Comment {
  id: string;
  promptId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
  replies?: CommentReply[];
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export type TeamMemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  id?: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: TeamMemberRole | 'Admin' | 'Editor' | 'Viewer';
  joinedAt?: string;
}

export interface TeamAuditLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  targetUserId?: string;
  createdAt?: string;
}

export interface Team {
  membersCount?: number;
  planTier?: string;
  id: string;
  name: string;
  members: TeamMember[];
  collectionIds: string[];
  auditLogs: TeamAuditLog[];
  ownerId?: string;
  description?: string;
  fieldOfWork?: string;
  primaryStack?: string;
  industry?: string;
  visibility?: 'public' | 'private';
  createdAt?: string;
  updatedAt?: string;
  memberIds?: string[];
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  inviterUserId: string;
  recipientEmail: string;
  role: TeamMemberRole | 'admin' | 'editor' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface TeamImageAttachment {
  id: string;
  url: string;
  name: string;
  size?: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface TeamFileAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface TeamDocument {
  id: string;
  teamId: string;
  title: string;
  description: string;
  content: string;
  systemInstruction?: string;
  model: string;
  category: string;
  tags: string[];
  variables: PromptVariable[];
  images: TeamImageAttachment[];
  files: TeamFileAttachment[];
  lastOutput?: string;
  lastOutputMeta?: {
    model?: string;
    latencyMs?: number;
    tokens?: number;
    costInr?: number;
    generatedAt?: string;
    executedBy?: string;
  };
  createdBy?: string;
  creatorName?: string;
  lastEditedBy?: string;
  lastEditorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  promptId: string;
  promptTitle: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  createdAt: string;
  currency?: string;
  status?: 'completed' | 'pending' | 'failed' | 'refunded';
  // Stripe reconciliation fields
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  refunded?: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: 'create' | 'fork' | 'like' | 'purchase' | 'edit' | 'comment' | 'copy';
  promptId?: string;
  promptTitle?: string;
  description: string;
  createdAt: string;
}

export interface PromptBounty {
  id: string;
  title: string;
  description: string;
  rewardUsd: number;
  companyName: string;
  companyLogo: string;
  category: CategoryType;
  submissionsCount: number;
  status: 'open' | 'awarded' | 'closed';
  deadline: string;
  requirements: string[];
}

export interface ArenaResultItem {
  modelId: string;
  modelName: string;
  provider: string;
  output: string;
  latencyMs: number;
  /**
   * Provider-reported total tokens, or null when the provider reported none.
   * Never an estimate — a character count divided by four must not be stored here.
   */
  tokens: number | null;
  /**
   * Catalog-derived cost for the run, or null when it could not be computed
   * because the provider reported no token usage. Was `costUsd: number`, written
   * as `costMeta?.costUsd ?? 0`, so a run that really did cost money was stored
   * as costing exactly zero and every consumer read that zero as a measurement.
   */
  costUsd: number | null;
  /** Absent when costUsd is null. Never the placeholder string "$0.00000". */
  costDisplay?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
  isWinner?: boolean;
}

export interface ArenaRun {
  id: string;
  userId?: string;
  promptText: string;
  promptTitle?: string;
  results: ArenaResultItem[];
  winnerModelId?: string;
  winnerReason?: string;
  createdAt: string;
}

// ─── Enterprise Marketplace, Ledger & KYC Interfaces ────────────────────────

export type PaymentProviderType = 'razorpay' | 'stripe' | 'mock_gateway';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'disputed';
export type SellerEarningStatus = 'pending' | 'eligible' | 'payout_processing' | 'paid' | 'reversed';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type RefundStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type DisputeStatus = 'needs_response' | 'under_review' | 'won' | 'lost';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'restricted' | 'expired';
export type RequiredTaxForm = 'W-9' | 'W-8BEN' | 'W-8BEN-E' | 'PAN_INDIA' | 'NONE';
export type TaxFormStatus = 'not_submitted' | 'pending_review' | 'verified' | 'rejected';

export interface MarketplaceOrder {
  id: string;
  buyerId?: string;
  sellerId?: string;
  promptId?: string;
  promptTitle: string;
  currency: string;
  totalAmount: number;
  paymentProvider: PaymentProviderType;
  providerOrderId?: string;
  providerPaymentId?: string;
  paymentStatus: PaymentStatus;
  settledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplacePurchase {
  id: string;
  buyerId: string;
  sellerId: string;
  promptId: string;
  orderId?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaid: number;
  currency: string;
  platformFee: number;
  authorEarnings: number;
  status: 'completed' | 'refunded' | 'revoked';
  createdAt: string;
  refundedAt?: string;
}

export interface SellerEarning {
  id: string;
  orderId: string;
  sellerId: string;
  currency: string;
  grossAmount: number;
  platformFee: number;
  platformFeePercent: number;
  paymentProcessingFee: number;
  taxWithholding: number;
  taxRuleApplied?: string;
  netAmount: number;
  status: SellerEarningStatus;
  payoutCalculationRuleVersion?: string;
  payoutEligibleAt?: string;
  payoutId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayoutRecord {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  paymentProvider: PaymentProviderType;
  providerTransferId?: string;
  status: PayoutStatus;
  failureReason?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  orderId: string;
  buyerId?: string;
  sellerId?: string;
  amount: number;
  currency: string;
  reason?: string;
  status: RefundStatus;
  providerRefundId?: string;
  sellerBalanceAdjusted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeRecord {
  id: string;
  orderId: string;
  providerDisputeId?: string;
  amount: number;
  currency: string;
  status: DisputeStatus;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  referenceType: 'order' | 'seller_earning' | 'payout' | 'refund' | 'chargeback' | 'adjustment';
  referenceId: string;
  accountType: 'platform_revenue' | 'seller_payable' | 'escrow_holding' | 'tax_payable' | 'payment_fees';
  entryType: 'debit' | 'credit';
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
}

export interface SellerVerification {
  id: string;
  userId: string;
  country: string;
  entityType: 'individual' | 'company';
  isUsPerson: boolean;
  verificationProvider: 'razorpay' | 'stripe' | 'manual';
  providerAccountId?: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  requiredTaxForm: RequiredTaxForm;
  taxFormStatus: TaxFormStatus;
  payoutMethod: 'bank_account' | 'upi' | 'stripe_connect';
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutProfile {
  id?: string;
  userId: string;
  payoutType: 'upi' | 'bank_account';
  upiId?: string | null;
  upiQrCodeUrl?: string | null;
  maskedUpiId?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  accountNumberLast4?: string | null;
  maskedAccountNumber?: string | null;
  ifscCode?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreditRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CreditRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  amount: number;
  status: CreditRequestStatus;
  reason?: string;
  adminId?: string;
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  idempotencyKey?: string;
}

export type CreditTransactionType = 
  | 'FREE_CREDIT_REQUEST'
  | 'ADMIN_GRANT'
  | 'WEEKLY_REFRESH'
  | 'AI_EXECUTION_DEDUCTION'
  | 'REFUND'
  | 'MEGA_LAUNCH_BONUS'
  | 'MARKETPLACE_PURCHASE';

export interface AIExecutionRun {
  id: string;
  userId?: string;
  provider: string;
  model: string;
  deployment?: string;
  agent?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  durationMs?: number;
  requestId: string;
  creditCost?: number;
  creditSettled?: boolean;
  errorMessage?: string;
  createdAt: string;
}

// ─── Google Drive & Multi-Tenant Storage Layer Interfaces ───────────────────

export type StorageProviderType = 'google_drive' | 's3' | 'r2' | 'local';

export type StorageVisibility = 'private' | 'community' | 'public' | 'admin_only';

export type StorageFileStatus = 'active' | 'processing' | 'deleted' | 'failed';

export type FileCategory = 
  | 'uploads' 
  | 'prompt-assets' 
  | 'ai-knowledge' 
  | 'generated' 
  | 'exports' 
  | 'backups' 
  | 'community'
  | 'ai-news';

export interface StorageFile {
  id: string;
  userId: string;
  originalName: string;
  sanitizedName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: StorageProviderType;
  googleDriveFileId: string;
  googleDriveParentId?: string;
  category: FileCategory;
  visibility: StorageVisibility;
  status: StorageFileStatus;
  associatedPromptId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // UI helper computed fields
  formattedSize?: string;
  directDownloadUrl?: string;
  ownerName?: string;
}

export interface StorageQuota {
  userId: string;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  usedPercentage: number;
  fileCount: number;
  tierName: string;
  formattedUsed?: string;
  formattedLimit?: string;
  formattedRemaining?: string;
  breakdown?: Record<string, { bytes: number; count: number }>;
  platformStats?: {
    totalBytes?: number;
    fileCount?: number;
  };
}

export interface StorageUploadOptions {
  category?: FileCategory;
  visibility?: StorageVisibility;
  associatedPromptId?: string;
  sanitizedName?: string;
  originalName?: string;
  metadata?: Record<string, any>;
  onProgress?: (percent: number) => void;
  allowOverwrite?: boolean;
}

export interface StorageFilterOptions {
  category?: FileCategory | 'all';
  visibility?: StorageVisibility;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── AI News & Daily Announcement Hub Interfaces ─────────────────────────

export type NewsCategory = 
  | 'New Models'
  | 'AI Safety'
  | 'AI Agents'
  | 'Products & Pricing'
  | 'Open Source'
  | 'Developer Tools'
  | 'Hardware'
  | 'Industry'
  | 'Research'
  | 'Policy'
  | 'AI Breakthroughs'
  | 'LLMs & Reasoning'
  | 'Prompt Engineering'
  | 'Tools & Agents'
  | 'Industry & Ethics'
  | 'Announcements';

export interface AINewsArticle {
  success?: boolean;
  error?: string;
  count?: number;
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: NewsCategory;
  sourceUrl?: string;
  sourceName?: string;
  imageUrl?: string;
  tags: string[];
  isFeatured: boolean;
  isPublished: boolean;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  viewsCount: number;
  likesCount: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

// ─── Section Dwell-Time & Engagement Telemetry Interfaces ─────────────────

export interface SectionDwellRecord {
  id: string;
  userId?: string;
  sessionId: string;
  sectionName: string;
  dwellTimeSeconds: number;
  pagePath?: string;
  deviceType?: string;
  referrer?: string;
  createdAt: string;
}

export interface SectionEngagementStats {
  sectionName: string;
  totalDwellSeconds: number;
  totalVisits: number;
  avgDwellSeconds: number;
  uniqueUsersCount: number;
  percentageOfTotal: number;
}

