// Dynamic Tax Rules & Marketplace Fee Breakdown Engine
import type { RequiredTaxForm } from '../../db/schema';

export interface TaxCalculationParams {
  sellerCountry: string;
  sellerEntityType: 'individual' | 'company';
  isUsPerson: boolean;
  hasPan?: boolean;
  hasGstin?: boolean;
  grossAmount: number;
  currency: string;
  platformCommissionPercent?: number; // Configurable, defaults to 30.0%
}

export interface TaxCalculationResult {
  grossAmount: number;
  currency: string;
  platformCommissionPercent: number;
  platformFeeAmount: number;
  paymentProcessingFee: number;
  taxWithholdingAmount: number;
  taxWithholdingPercent: number;
  taxRuleCode: string;
  taxRuleDescription: string;
  sellerNetAmount: number;
  requiredTaxForm: RequiredTaxForm;
  disclaimer: string;
}

export class TaxEngine {
  // Default platform commission rate (PromptHub takes 30%, creator receives 70%)
  private static DEFAULT_PLATFORM_COMMISSION_PERCENT = 30.0;

  /**
   * Determine required tax form based on jurisdiction and entity type
   */
  static determineRequiredTaxForm(country: string, isUsPerson: boolean, entityType: 'individual' | 'company'): RequiredTaxForm {
    const cleanCountry = (country || '').trim().toUpperCase();

    if (cleanCountry === 'IN' || cleanCountry === 'INDIA') {
      return 'PAN_INDIA';
    }

    if (isUsPerson || cleanCountry === 'US' || cleanCountry === 'USA' || cleanCountry === 'UNITED STATES') {
      return 'W-9';
    }

    if (entityType === 'company') {
      return 'W-8BEN-E';
    }

    return 'W-8BEN';
  }

  /**
   * Calculate dynamic fees, withholding and net seller earnings
   */
  static calculateBreakdown(params: TaxCalculationParams): TaxCalculationResult {
    const commissionPercent = params.platformCommissionPercent ?? this.DEFAULT_PLATFORM_COMMISSION_PERCENT;
    const gross = Math.max(0, params.grossAmount);
    const platformFee = Math.round(gross * (commissionPercent / 100.0) * 100) / 100;
    const country = (params.sellerCountry || '').trim().toUpperCase();

    let taxPercent = 0.0;
    let taxRuleCode = 'NONE';
    let taxRuleDesc = 'No tax withholding required for this transaction.';
    let processingFee = 0.0;

    if (country === 'IN' || country === 'INDIA') {
      // Estimated payment gateway fee for Indian transactions (Razorpay Route ~2.0%)
      processingFee = Math.round(gross * 0.02 * 100) / 100;

      if (!params.hasPan) {
        // Section 206AA of Income Tax Act 1961: 5.0% higher withholding if PAN not furnished
        taxPercent = 5.0;
        taxRuleCode = 'IN_SEC_206AA_NO_PAN';
        taxRuleDesc = 'Section 206AA TDS (5.00% without verified PAN on gross e-commerce marketplace value).';
      } else {
        // Section 194-O of Income Tax Act 1961: Standard e-commerce operator TDS (0.10% / 1.00% statutory rule)
        taxPercent = 1.0;
        taxRuleCode = 'IN_SEC_194O_STANDARD';
        taxRuleDesc = 'Section 194-O TDS (1.00% with verified PAN on gross e-commerce marketplace value).';
      }
    } else if (params.isUsPerson || country === 'US' || country === 'USA') {
      // Estimated payment processing fee for US transactions (Stripe ~2.9% + $0.30)
      processingFee = Math.round((gross * 0.029 + (gross > 0 ? 0.30 : 0)) * 100) / 100;
      taxPercent = 0.0; // Handled via year-end 1099-K / 1099-MISC reporting under W-9
      taxRuleCode = 'US_W9_BACKUP_EXEMPT';
      taxRuleDesc = 'U.S. Person / W-9 on file — annual 1099 reporting applies, 0% backup withholding.';
    } else {
      // International non-US seller
      processingFee = Math.round((gross * 0.035 + (gross > 0 ? 0.30 : 0)) * 100) / 100;
      taxPercent = 0.0; // Cross-border digital software license exemption under valid W-8BEN treaty
      taxRuleCode = 'GLOBAL_W8BEN_TREATY';
      taxRuleDesc = 'Foreign Person / W-8BEN on file — 0% treaty withholding rate on digital asset licensing.';
    }

    const taxAmount = Math.round(gross * (taxPercent / 100.0) * 100) / 100;
    const sellerNet = Math.max(0, Math.round((gross - platformFee - processingFee - taxAmount) * 100) / 100);
    const requiredForm = this.determineRequiredTaxForm(params.sellerCountry, params.isUsPerson, params.sellerEntityType);

    return {
      grossAmount: gross,
      currency: params.currency || 'USD',
      platformCommissionPercent: commissionPercent,
      platformFeeAmount: platformFee,
      paymentProcessingFee: processingFee,
      taxWithholdingAmount: taxAmount,
      taxWithholdingPercent: taxPercent,
      taxRuleCode,
      taxRuleDescription: taxRuleDesc,
      sellerNetAmount: sellerNet,
      requiredTaxForm: requiredForm,
      disclaimer: 'Tax calculations and withholding rates are dynamic estimates based on applicable jurisdictional rules and are subject to professional tax and legal review.',
    };
  }
}
