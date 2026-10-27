/**
 * Unified Authentication Error Formatter & Diagnostics
 * Converts raw Auth errors into accurate, user-friendly messages
 * while logging structured diagnostics in development without leaking secrets.
 */

import { logger } from './logger';

export interface AuthDiagnostic {
  message: string;
  code?: string;
  status?: number;
  name?: string;
}

/**
 * Normalizes redirect paths and query parameters to clean canonical routes
 */
export function cleanAuthPath(path: string): string {
  if (!path) return '/';
  const clean = path.split('?')[0].split('#')[0].toLowerCase().trim();
  if (clean === '' || clean === '/home') return '/';
  if (clean === '/login' || clean === '/signup') return '/auth';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = (error.message || '').toString();
  const code = (error.code || '').toString().toLowerCase();
  const status = Number(error.status) || 0;
  const name = (error.name || '').toString();

  // Log safe structured diagnostics (strictly excluding any tokens/passwords)
  logger.warn('[Auth Diagnostics]', {
    name,
    code: code || undefined,
    status: status || undefined,
    message,
  });

  // 1. Invalid Credentials / Password Incorrect
  if (
    code === 'invalid_credentials' ||
    message.toLowerCase().includes('invalid login credentials') ||
    message.toLowerCase().includes('invalid email or password') ||
    (status === 400 && message.toLowerCase().includes('credentials'))
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  // 2. Email Not Confirmed
  if (
    code === 'email_not_confirmed' ||
    message.toLowerCase().includes('email not confirmed') ||
    message.toLowerCase().includes('not confirmed')
  ) {
    return 'Your email has not been confirmed yet. Please check your inbox for the confirmation code, or click Resend.';
  }

  // 3. User Already Registered / Duplicate Account
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.toLowerCase().includes('already registered') ||
    message.toLowerCase().includes('user already exists') ||
    message.toLowerCase().includes('email address is already in use')
  ) {
    return 'An account already exists with this email address. Please sign in instead.';
  }

  // 4. Rate Limiting / Too Many Attempts
  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many requests')
  ) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // 5. SMTP / Email Sending Error from Supabase (500)
  if (
    message.toLowerCase().includes('error sending confirmation email') ||
    message.toLowerCase().includes('error sending email') ||
    (status === 500 && message.toLowerCase().includes('email'))
  ) {
    return 'Email delivery service is currently rate-limited by the authentication service. Please sign in with Google, or disable "Confirm email" in your Auth settings.';
  }

  // 6. OAuth Provider Not Configured or Disabled
  if (
    message.toLowerCase().includes('provider is not enabled') ||
    message.toLowerCase().includes('unsupported provider') ||
    message.toLowerCase().includes('oauth')
  ) {
    return 'This sign-in provider is currently unavailable. Please try another sign-in method.';
  }

  // 7. Network / Connection Errors
  if (
    name === 'AuthRetryableFetchError' &&
    !message.toLowerCase().includes('email')
  ) {
    return 'Could not reach the authentication server. Please check your network connection and try again.';
  }

  if (
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('timeout')
  ) {
    return 'Could not connect to authentication services. Please verify your internet connection and try again.';
  }

  // 8. Session restoration or expired token
  if (
    message.toLowerCase().includes('session from url') ||
    message.toLowerCase().includes('refresh_token_not_found') ||
    message.toLowerCase().includes('invalid token')
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  // 9. Weak Password
  if (message.toLowerCase().includes('password should be') || message.toLowerCase().includes('weak password')) {
    return 'Password must be at least 8 characters long.';
  }

  // 10. CAPTCHA Verification Failed or Expired
  if (
    code === 'captcha_failed' ||
    code === 'captcha_protection' ||
    code === 'invalid_captcha' ||
    message.toLowerCase().includes('captcha') ||
    message.toLowerCase().includes('turnstile') ||
    message.toLowerCase().includes('hcaptcha') ||
    message.toLowerCase().includes('challenge verification failed') ||
    message.toLowerCase().includes('security verification')
  ) {
    if (message.toLowerCase().includes('expired') || code.includes('expired')) {
      return 'Your security verification expired. Please complete the verification challenge again.';
    }
    return 'Security verification failed. Please complete the verification challenge and try again.';
  }

  // Return sanitized Auth message or safe fallback
  return message || 'Authentication failed. Please check your details and try again.';
}


export const getCleanErrorMessage = formatAuthError;
