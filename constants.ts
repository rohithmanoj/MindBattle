import { PaymentGatewaySettings } from "./types";

export const DEFAULT_PRIZE_AMOUNTS = [
  1000000, 500000, 250000, 125000, 64000, 32000, 16000, 8000, 4000, 2000, 1000, 500, 300, 200, 100
];

export const DEFAULT_TIME_PER_QUESTION = 30; // seconds

export const DEFAULT_CATEGORIES = [
  'General Knowledge',
  'Science & Nature',
  'History',
  'Geography',
  'Movies & TV',
  'Music',
  'Sports',
  'Technology'
];

export const DEFAULT_PAYMENT_GATEWAY_SETTINGS: PaymentGatewaySettings = {
    apiKey: 'YOUR_API_KEY_HERE',
    bankDetails: 'Bank Name: Example Bank\nAccount Number: 1234567890\nRouting Number: 0987654321',
    securityToken: 'YOUR_SECURITY_TOKEN_HERE',
};

export const ADMIN_EMAIL = 'admin@mindbattle.com';
export const ADMIN_PASSWORD = 'adminpassword123';