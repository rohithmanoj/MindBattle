export type AppView = 'home' | 'login' | 'register' | 'loading' | 'playing' | 'end' | 'admin' | 'wallet' | 'payment' | 'admin-login' | 'waiting_room';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface LifelineStatus {
  fiftyFifty: boolean;
  askAI: boolean;
}

export interface PaymentGatewaySettings {
    apiKey: string;
    bankDetails: string;
    securityToken: string;
}

export interface GameSettings {
  prizeAmounts: number[];
  categories: string[];
  paymentGatewaySettings: PaymentGatewaySettings;
  timePerQuestion: number;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  category: string;
  entryFee: number;
  prizePool: number;
  status: 'Upcoming' | 'Live' | 'Finished' | 'Draft' | 'Cancelled';
  registrationStartDate: number;
  registrationEndDate: number;
  contestStartDate: number;
  maxParticipants: number;
  rules: string;
  questions: QuizQuestion[];
  participants: string[]; // array of user emails
  timePerQuestion: number;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'win' | 'entry_fee' | 'pending_withdrawal' | 'withdrawal_declined' | 'refund' | 'admin_adjustment';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: number;
  status?: 'completed' | 'pending' | 'declined';
}

export interface User {
  name: string;
  email: string;
  walletBalance: number;
  transactions: Transaction[];
}

export interface StoredUser extends User {
  password: string;
  banned?: boolean;
}
