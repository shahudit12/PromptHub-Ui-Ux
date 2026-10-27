// Auditable Business Calendar & Settlement Calculation Service

export interface PayoutEligibilityResult {
  settledAt: Date;
  payoutEligibleAt: Date;
  businessDaysRequired: number;
  businessDaysRemaining: number;
  calendarDaysElapsed: number;
  isEligibleNow: boolean;
  ruleVersion: string;
  formattedEligibilityDate: string;
}

export class BusinessCalendarService {
  public static readonly CURRENT_RULE_VERSION = 'v1_7_business_days';
  public static readonly DEFAULT_BUSINESS_DAYS = 7;

  /**
   * Check if a given date falls on a weekend (Saturday or Sunday)
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Calculate future eligibility date by adding N business days to settledAt date
   */
  static calculatePayoutEligibility(
    settledAtInput: Date | string | number,
    businessDays: number = this.DEFAULT_BUSINESS_DAYS
  ): PayoutEligibilityResult {
    const settledAt = new Date(settledAtInput);
    if (isNaN(settledAt.getTime())) {
      const now = new Date();
      return {
        settledAt: now,
        payoutEligibleAt: now,
        businessDaysRequired: businessDays,
        businessDaysRemaining: 0,
        calendarDaysElapsed: 0,
        isEligibleNow: false,
        ruleVersion: this.CURRENT_RULE_VERSION,
        formattedEligibilityDate: now.toLocaleDateString(),
      };
    }

    const eligibleDate = new Date(settledAt);
    let addedDays = 0;

    while (addedDays < businessDays) {
      eligibleDate.setDate(eligibleDate.getDate() + 1);
      if (!this.isWeekend(eligibleDate)) {
        addedDays++;
      }
    }

    const now = new Date();
    const isEligibleNow = now.getTime() >= eligibleDate.getTime();

    // Calculate business days remaining from now until eligibleDate
    let daysRemaining = 0;
    if (!isEligibleNow) {
      const cursor = new Date(now);
      while (cursor.getTime() < eligibleDate.getTime()) {
        cursor.setDate(cursor.getDate() + 1);
        if (!this.isWeekend(cursor)) {
          daysRemaining++;
        }
      }
    }

    const calendarDaysElapsed = Math.floor((now.getTime() - settledAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      settledAt,
      payoutEligibleAt: eligibleDate,
      businessDaysRequired: businessDays,
      businessDaysRemaining: daysRemaining,
      calendarDaysElapsed: Math.max(0, calendarDaysElapsed),
      isEligibleNow,
      ruleVersion: this.CURRENT_RULE_VERSION,
      formattedEligibilityDate: eligibleDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    };
  }
}
