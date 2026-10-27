// Environment configuration validator & access point (Frontend Mock Mode)
export interface AppEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_POSTHOG_KEY: string;
  VITE_SENTRY_DSN: string;
  VITE_TURNSTILE_SITE_KEY: string;
  VITE_HCAPTCHA_SITE_KEY: string;
  VITE_RAZORPAY_KEY_ID: string;
  VITE_CLOUDINARY_CLOUD_NAME?: string;
  VITE_CLOUDINARY_UPLOAD_PRESET?: string;
  VITE_GOOGLE_CLIENT_ID: string;
  VITE_APP_URL: string;
  VITE_APP_ENV: string;
  IS_DEV: boolean;
  IS_PROD: boolean;
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return (import.meta.env[key] as string) || defaultValue;
  }
  return defaultValue;
};

export const env: AppEnv = {
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL', ''),
  VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY', ''),
  VITE_POSTHOG_KEY: getEnvVar('VITE_POSTHOG_KEY', ''),
  VITE_SENTRY_DSN: getEnvVar('VITE_SENTRY_DSN', ''),
  VITE_TURNSTILE_SITE_KEY: getEnvVar('VITE_TURNSTILE_SITE_KEY', ''),
  VITE_HCAPTCHA_SITE_KEY: getEnvVar('VITE_HCAPTCHA_SITE_KEY', ''),
  VITE_RAZORPAY_KEY_ID: getEnvVar('VITE_RAZORPAY_KEY_ID', ''),
  VITE_CLOUDINARY_CLOUD_NAME: getEnvVar('VITE_CLOUDINARY_CLOUD_NAME', ''),
  VITE_CLOUDINARY_UPLOAD_PRESET: getEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET', ''),
  VITE_GOOGLE_CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID', ''),
  VITE_APP_URL: getEnvVar('VITE_APP_URL', 'http://localhost:5173'),
  VITE_APP_ENV: getEnvVar('VITE_APP_ENV', 'development'),
  IS_DEV: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.DEV : true,
  IS_PROD: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : false,
};

export const isSupabaseConfigured = (): boolean => false;

export const isCaptchaConfigured = (): boolean => false;
