import { PaymentGatewaySettings, Difficulty, Rank } from "./types";

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

export const DIFFICULTY_LEVELS: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Difficult'];

export const SCORING_POINTS: Record<Difficulty, { base: number; win: number; loss: number }> = {
  Easy: { base: 10, win: 5, loss: -2 },
  Medium: { base: 20, win: 10, loss: -5 },
  Hard: { base: 40, win: 20, loss: -10 },
  Difficult: { base: 60, win: 30, loss: -15 },
};

export const RANK_THRESHOLDS: Record<Rank, number> = {
  'Titanium Genius': 2000,
  'Platinum Genius': 1000,
  'Gold Challenger': 500,
  'Silver Learner': 200,
  'Bronze Beginner': 0,
};

export const RANK_ORDER: Rank[] = [
  'Titanium Genius',
  'Platinum Genius',
  'Gold Challenger',
  'Silver Learner',
  'Bronze Beginner'
];