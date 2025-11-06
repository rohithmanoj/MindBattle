

export type AppView = 'home' | 'login' | 'register' | 'loading' | 'playing' | 'end' | 'admin' | 'wallet' | 'payment' | 'admin-login' | 'waiting_room' | 'create_contest' | 'leaderboard';

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

export interface ContestResult {
  userId: string; // user email
  name: string;
  score: number; // for FF: score, for KBC: prize money
  time?: number; // for FF
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Difficult';

export interface Contest {
  id: string;
  title: string;
  description:string;
  category: string;
  entryFee: number;
  prizePool: number;
  status: 'Upcoming' | 'Live' | 'Finished' | 'Draft' | 'Cancelled' | 'Pending Approval' | 'Rejected';
  registrationStartDate: number;
  registrationEndDate: number;
  contestStartDate: number;
  maxParticipants: number;
  rules: string;
  questions: QuizQuestion[];
  participants: string[]; // array of user emails
  format: 'KBC' | 'FastestFinger';
  timerType: 'per_question' | 'total_contest';
  timePerQuestion: number;
  totalContestTime?: number; // in seconds, for 'total_contest' type
  numberOfQuestions: number;
  createdBy?: string; // email of the user who created it
  results?: ContestResult[];
  difficulty: Difficulty;
}

export type GameResults =
  | { format: 'KBC'; score: number }
  | { format: 'FastestFinger'; leaderboard: { name: string; score: number; time: number }[] };


export type TransactionType = 'deposit' | 'withdrawal' | 'win' | 'entry_fee' | 'pending_withdrawal' | 'withdrawal_declined' | 'refund' | 'admin_adjustment';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: number;
  status?: 'completed' | 'pending' | 'declined';
  updatedBy?: string; // email of admin who made the change
}

export type AdminPermission = 'MANAGE_CONTESTS' | 'MANAGE_FINANCE' | 'MANAGE_USERS' | 'MANAGE_SETTINGS' | 'MANAGE_ADMINS' | 'MANAGE_AUDIT_LOG';
export type AdminRole = 'Super Admin' | 'Contest Manager' | 'Finance Manager' | 'User Manager';

export type Rank = 'Bronze Beginner' | 'Silver Learner' | 'Gold Challenger' | 'Platinum Genius' | 'Titanium Genius';

export interface UserContestHistory {
  contestId: string;
  contestTitle: string;
  difficulty: Difficulty;
  category: string;
  result: number;
  pointsEarned: number;
  timestamp: number;
}

export interface User {
  name: string;
  email: string;
  walletBalance: number;
  transactions: Transaction[];
  role?: AdminRole;
  registrationDate: number;
  totalPoints: number;
  contestHistory: UserContestHistory[];
}

export interface StoredUser extends User {
  password: string;
  banned?: boolean;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type WalletActionType = 'DEPOSIT' | 'WITHDRAWAL_REQUEST' | 'WITHDRAWAL_APPROVE' | 'WITHDRAWAL_DECLINE' | 'CONTEST_ENTRY' | 'CONTEST_WIN' | 'CONTEST_REFUND' | 'ADMIN_ADJUSTMENT';

export interface WalletAction {
    type: WalletActionType;
    payload: {
        userId: string;
        amount: number;
        description: string;
        transactionId?: string; // For updates like approve/decline
        status?: 'completed' | 'pending' | 'declined';
        updatedBy?: string; // Admin email
    };
}

// --- New Types for Admin Audit Log ---
export type AuditLogAction =
  | 'SETTINGS_UPDATE'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_DECLINED'
  | 'CONTEST_CREATED'
  | 'CONTEST_UPDATED'
  | 'CONTEST_DELETED'
  | 'CONTEST_CANCELLED'
  | 'CONTEST_APPROVED'
  | 'CONTEST_REJECTED'
  | 'USER_BANNED'
  | 'USER_UNBANNED'
  | 'ROLE_UPDATED'
  | 'WALLET_ADJUSTED'
  | 'ADMIN_CREATED';

export interface AuditLog {
  id: string;
  timestamp: number;
  adminEmail: string;
  adminName: string;
  action: AuditLogAction;
  details: string; // e.g., "User: john@doe.com", "Contest: 'Summer Gala' (c123)"
}