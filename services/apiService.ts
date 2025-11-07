

import { StoredUser, Contest, GameSettings, AuditLog, AdminRole, User, QuizQuestion, GameResults, AuditLogAction, Transaction, ContestResult } from '../types';
import { ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_GATEWAY_SETTINGS, DEFAULT_PRIZE_AMOUNTS, DEFAULT_TIME_PER_QUESTION } from '../constants';
import * as gemini from './geminiService';
import { processWalletAction } from './walletService';
import { updateUserStatsAfterContest } from './rankingService';

// --- This service simulates a backend API. ---
// It uses localStorage as its database and returns Promises to mimic network latency.
// This architecture allows the UI to be easily switched to a real backend in the future.

const DB_KEYS = {
  USERS: 'mindbattle_users',
  CONTESTS: 'mindbattle_contests',
  SETTINGS: 'mindbattle_settings',
  AUDIT_LOG: 'mindbattle_audit_log'
};

const API_URL = ''; // Use relative path for API calls

// Fallback data, moved from the deleted data.ts file
const FALLBACK_MOCK_CONTESTS: Contest[] = [
  {
    id: 'c1',
    title: 'General Knowledge Gala',
    description: 'Test your all-around knowledge in this classic trivia showdown.',
    category: 'General Knowledge',
    entryFee: 0,
    prizePool: 500,
    status: 'Upcoming',
    registrationStartDate: Date.now() - 24 * 60 * 60 * 1000, // Started yesterday
    registrationEndDate: Date.now() + 6 * 24 * 60 * 60 * 1000, // Ends in 6 days
    contestStartDate: Date.now() + 6 * 24 * 60 * 60 * 1000 + 3600000, // Starts 1 hour after registration ends
    maxParticipants: 200,
    rules: 'Standard quiz rules. No cheating allowed. The admin\'s decision is final.',
    questions: [], // These would be populated by an admin
    participants: ['test@user.com'],
    format: 'KBC',
    timerType: 'per_question',
    timePerQuestion: 30,
    numberOfQuestions: 15,
    difficulty: 'Easy',
  },
  {
    id: 'c2',
    title: 'Science Sphere Challenge',
    description: 'From biology to astrophysics, prove you are a science whiz.',
    category: 'Science & Nature',
    entryFee: 100,
    prizePool: 10000,
    status: 'Upcoming',
    registrationStartDate: Date.now(),
    registrationEndDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
    contestStartDate: Date.now() + 10 * 24 * 60 * 60 * 1000 + 3600000,
    maxParticipants: 100,
    rules: 'Science category only. All questions are peer-reviewed for accuracy.',
    questions: [],
    participants: [],
    format: 'KBC',
    timerType: 'per_question',
    timePerQuestion: 45,
    numberOfQuestions: 15,
    difficulty: 'Medium',
  },
  {
    id: 'c3',
    title: 'History Buffs Battle',
    description: 'Journey through time and test your historical expertise.',
    category: 'History',
    entryFee: 50,
    prizePool: 5000,
    status: 'Upcoming',
    registrationStartDate: Date.now(),
    registrationEndDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
    contestStartDate: Date.now() + 5 * 24 * 60 * 60 * 1000 + 3600000,
    maxParticipants: 150,
    rules: 'Focuses on world history from ancient civilizations to the 20th century.',
    questions: [],
    participants: [],
    format: 'KBC',
    timerType: 'per_question',
    timePerQuestion: 35,
    numberOfQuestions: 15,
    difficulty: 'Hard',
  },
  {
    id: 'c4',
    title: 'Movie Marathon Quiz',
    description: 'Are you a true cinephile? This one is for you!',
    category: 'Movies & TV',
    entryFee: 0,
    prizePool: 250,
    status: 'Finished',
    registrationStartDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
    registrationEndDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
    contestStartDate: Date.now() - 15 * 24 * 60 * 60 * 1000 + 3600000,
    maxParticipants: 500,
    rules: 'Questions cover a wide range of genres and eras.',
    questions: [],
    participants: [],
    format: 'KBC',
    timerType: 'per_question',
    timePerQuestion: 25,
    numberOfQuestions: 15,
    difficulty: 'Medium',
  },
    {
    id: 'c5',
    title: 'Sports Fan Standoff',
    description: 'Go for the gold in this ultimate sports trivia competition.',
    category: 'Sports',
    entryFee: 25,
    prizePool: 2500,
    status: 'Upcoming',
    registrationStartDate: Date.now(),
    registrationEndDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
    contestStartDate: Date.now() + 3 * 24 * 60 * 60 * 1000 + 3600000,
    maxParticipants: 75,
    rules: 'All sports, all eras. Test your knowledge across the board.',
    questions: [],
    participants: [],
    format: 'KBC',
    timerType: 'per_question',
    timePerQuestion: 30,
    numberOfQuestions: 15,
    difficulty: 'Medium',
  },
  {
    id: 'c6',
    title: 'Tech Titans Tussle',
    description: 'Code, gadgets, and the digital world. Show off your tech genius.',
    category: 'Technology',
    entryFee: 200,
    prizePool: 20000,
    status: 'Draft', // Example of a draft contest
    registrationStartDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
    registrationEndDate: Date.now() + 9 * 24 * 60 * 60 * 1000,
    contestStartDate: Date.now() + 9 * 24 * 60 * 60 * 1000 + 3600000,
    maxParticipants: 50,
    rules: 'High-level technology questions. For experts only.',
    questions: [],
    participants: [],
    format: 'KBC',
    timerType: 'per_question',
    timePerQuestion: 60,
    numberOfQuestions: 15,
    difficulty: 'Difficult',
  },
];


const simulateDelay = (ms: number = 250) => new Promise(res => setTimeout(res, ms));

const readFromDb = <T>(key: string): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const writeToDb = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const logAdminAction = (admin: User, action: AuditLogAction, details: string): AuditLog => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      adminEmail: admin.email,
      adminName: admin.name,
      action,
      details
    };
    const allLogs = readFromDb<AuditLog[]>(DB_KEYS.AUDIT_LOG) || [];
    writeToDb(DB_KEYS.AUDIT_LOG, [newLog, ...allLogs]);
    return newLog;
};


// --- PUBLIC API ---

export const initializeData = async (): Promise<{ users: StoredUser[], contests: Contest[], settings: GameSettings, auditLog: AuditLog[] }> => {
  await simulateDelay();
  // User data migration
  let loadedUsers: StoredUser[] = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
  let userMigrationNeeded = false;
  const migratedUsers = loadedUsers.map(u => {
      const newUser = {...u};
      let userChanged = false;
      if (!u.registrationDate) { userChanged = true; newUser.registrationDate = new Date('2024-01-01').getTime(); }
      if (typeof u.totalPoints === 'undefined') { userChanged = true; newUser.totalPoints = 0; }
      if (!u.contestHistory) { userChanged = true; newUser.contestHistory = []; }
      if (userChanged) userMigrationNeeded = true;
      return newUser;
  });
  if (!migratedUsers.some(u => u.email === ADMIN_EMAIL)) {
    userMigrationNeeded = true;
    migratedUsers.push({
        name: 'Super Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
        walletBalance: 0, transactions: [], banned: false, role: 'Super Admin',
        registrationDate: Date.now(), totalPoints: 0, contestHistory: []
    });
  }
  if (userMigrationNeeded) writeToDb(DB_KEYS.USERS, migratedUsers);
  
  // Settings
  let settings = readFromDb<GameSettings>(DB_KEYS.SETTINGS);
  if (!settings) {
    settings = { prizeAmounts: DEFAULT_PRIZE_AMOUNTS, categories: DEFAULT_CATEGORIES, paymentGatewaySettings: DEFAULT_PAYMENT_GATEWAY_SETTINGS, timePerQuestion: DEFAULT_TIME_PER_QUESTION };
    writeToDb(DB_KEYS.SETTINGS, settings);
  }

  // Contest data now fetches from backend
  let loadedContests: Contest[];
  try {
    const response = await fetch(`${API_URL}/api/contests`);
    if (!response.ok) throw new Error('Backend not available');
    loadedContests = await response.json();
    console.log("Successfully fetched contests from backend.");
    writeToDb(DB_KEYS.CONTESTS, loadedContests); // Cache for offline/fallback
  } catch (e) {
    console.warn("Could not fetch contests from backend. Falling back to local storage/mock data.", e);
    loadedContests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || FALLBACK_MOCK_CONTESTS;
  }
  
  const auditLog = readFromDb<AuditLog[]>(DB_KEYS.AUDIT_LOG) || [];

  return { users: migratedUsers, contests: loadedContests, settings, auditLog };
};

export const login = async (email: string, password: string): Promise<{ user: StoredUser }> => {
    await simulateDelay();
    const users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    if (user.banned) throw new Error('Your account has been suspended by an administrator.');
    return { user };
};

export const adminLogin = async (email: string, password: string): Promise<{ user: StoredUser }> => {
    await simulateDelay();
    const users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (!user || !user.role) throw new Error('Invalid admin credentials.');
    return { user };
};

export const register = async (name: string, email: string, password: string): Promise<{ newUser: StoredUser, updatedUsers: StoredUser[] }> => {
    await simulateDelay(500);
    const users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    if (users.some(u => u.email === email)) throw new Error('An account with this email already exists.');
    
    const newUser: StoredUser = { 
        name, email, password, 
        walletBalance: 500, banned: false, registrationDate: Date.now(),
        totalPoints: 0, contestHistory: [],
        transactions: [{
            id: `txn_init_${Date.now()}`, type: 'deposit', amount: 500,
            description: 'Initial sign-up bonus', timestamp: Date.now(), status: 'completed',
        }] 
    };
    const updatedUsers = [...users, newUser];
    writeToDb(DB_KEYS.USERS, updatedUsers);
    return { newUser, updatedUsers };
};

export const saveSettings = async (newSettings: GameSettings, admin: User): Promise<{ updatedSettings: GameSettings, newLog: AuditLog }> => {
    await simulateDelay();
    writeToDb(DB_KEYS.SETTINGS, newSettings);
    const newLog = logAdminAction(admin, 'SETTINGS_UPDATE', 'Global game and payment settings were updated.');
    return { updatedSettings: newSettings, newLog };
};

export const createContest = async (newContestData: Omit<Contest, 'id' | 'participants'>, admin: User): Promise<{ updatedContests: Contest[], newLog: AuditLog | null }> => {
    await simulateDelay();
    const newContest: Contest = {
        ...newContestData,
        id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        participants: [],
    };
    const contests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || [];
    const updatedContests = [...contests, newContest];
    writeToDb(DB_KEYS.CONTESTS, updatedContests);
    const action: AuditLogAction = newContest.status === 'Pending Approval' ? 'CONTEST_CREATED' : 'CONTEST_CREATED';
    const newLog = logAdminAction(admin, action, `Contest: '${newContest.title}' (${newContest.id})`);
    return { updatedContests, newLog };
};

export const updateContest = async (updatedContest: Contest, admin: User): Promise<{ updatedContests: Contest[], newLog: AuditLog | null }> => {
    await simulateDelay();
    const contests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || [];
    const oldContest = contests.find(c => c.id === updatedContest.id);
    const updatedContests = contests.map(c => c.id === updatedContest.id ? updatedContest : c);
    writeToDb(DB_KEYS.CONTESTS, updatedContests);
    
    let newLog: AuditLog | null = null;
    if (oldContest) {
        let action: AuditLogAction | null = 'CONTEST_UPDATED';
        let details = `Contest: '${updatedContest.title}' (${updatedContest.id})`;
        if (oldContest.status === 'Pending Approval' && updatedContest.status === 'Upcoming') { action = 'CONTEST_APPROVED'; }
        else if (oldContest.status === 'Pending Approval' && updatedContest.status === 'Rejected') { action = 'CONTEST_REJECTED'; }
        if(action) newLog = logAdminAction(admin, action, details);
    }
    return { updatedContests, newLog };
};

export const deleteContest = async (contestId: string, admin: User): Promise<{ updatedContests: Contest[], newLog: AuditLog }> => {
    await simulateDelay();
    const contests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || [];
    const contestToDelete = contests.find(c => c.id === contestId)!;
    const updatedContests = contests.filter(c => c.id !== contestId);
    writeToDb(DB_KEYS.CONTESTS, updatedContests);
    const newLog = logAdminAction(admin, 'CONTEST_DELETED', `Contest: '${contestToDelete.title}' (${contestToDelete.id})`);
    return { updatedContests, newLog };
};

export const cancelContest = async (contestId: string, admin: User): Promise<{ updatedContests: Contest[], updatedUsers: StoredUser[], newLog: AuditLog }> => {
    await simulateDelay();
    let contests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || [];
    let users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const contestToCancel = contests.find(c => c.id === contestId)!;

    contestToCancel.participants.forEach(participantEmail => {
        if (contestToCancel.entryFee > 0) {
            const userIndex = users.findIndex(u => u.email === participantEmail);
            if (userIndex > -1) {
                users[userIndex] = processWalletAction(users[userIndex], {
                    type: 'CONTEST_REFUND',
                    payload: { userId: participantEmail, amount: contestToCancel.entryFee, description: `Refund for cancelled contest: ${contestToCancel.title}` }
                });
            }
        }
    });
    
    // Fix for type error TS2322. Explicitly setting the return type of the map
    // callback ensures TypeScript correctly unifies the types from the ternary branches.
    const updatedContests = contests.map((c): Contest => (c.id === contestId ? { ...c, status: 'Cancelled', participants: [] } : c));
    
    writeToDb(DB_KEYS.CONTESTS, updatedContests);
    writeToDb(DB_KEYS.USERS, users);
    
    const newLog = logAdminAction(admin, 'CONTEST_CANCELLED', `Contest: '${contestToCancel.title}' (${contestToCancel.id})`);
    return { updatedContests, updatedUsers: users, newLog };
};


export const updateUser = async (userId: string, updates: Partial<Pick<StoredUser, 'banned'>>, admin: User): Promise<{ updatedUsers: StoredUser[], newLog: AuditLog }> => {
    await simulateDelay();
    const users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const userToUpdate = users.find(u => u.email === userId)!;
    const updatedUsers = users.map(u => u.email === userId ? { ...u, ...updates } : u);
    writeToDb(DB_KEYS.USERS, updatedUsers);
    const action: AuditLogAction = updates.banned ? 'USER_BANNED' : 'USER_UNBANNED';
    const newLog = logAdminAction(admin, action, `User: ${userToUpdate.name} (${userToUpdate.email})`);
    return { updatedUsers, newLog };
};

export const updateUserRole = async (userId: string, role: AdminRole | 'None', admin: User): Promise<{ updatedUsers: StoredUser[], newLog: AuditLog }> => {
    await simulateDelay();
    const users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const userToUpdate = users.find(u => u.email === userId)!;
    const updatedUsers = users.map(u => {
        if (u.email === userId) {
            const updatedUser = { ...u };
            if (role === 'None') delete updatedUser.role;
            else updatedUser.role = role;
            return updatedUser;
        }
        return u;
    });
    writeToDb(DB_KEYS.USERS, updatedUsers);
    const newLog = logAdminAction(admin, 'ROLE_UPDATED', `Set role for ${userToUpdate.name} to ${role}`);
    return { updatedUsers, newLog };
};

export const createAdmin = async (name: string, email: string, password: string, role: AdminRole, admin: User): Promise<{ updatedUsers: StoredUser[], newLog: AuditLog }> => {
    await simulateDelay();
    const users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    if (users.some(u => u.email === email)) throw new Error('An account with this email already exists.');
    
    const newAdmin: StoredUser = {
        name, email, password, role, walletBalance: 0, banned: false,
        registrationDate: Date.now(), transactions: [], totalPoints: 0, contestHistory: [],
    };
    const updatedUsers = [...users, newAdmin];
    writeToDb(DB_KEYS.USERS, updatedUsers);
    const newLog = logAdminAction(admin, 'ADMIN_CREATED', `Created new admin: ${name} (${email}) with role ${role}.`);
    return { updatedUsers, newLog };
};

export const depositFunds = async (userId: string, amount: number): Promise<{ updatedUsers: StoredUser[] }> => {
    await simulateDelay(1000); // Payment gateway is slower
    let users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const userIndex = users.findIndex(u => u.email === userId);
    if (userIndex > -1) {
        users[userIndex] = processWalletAction(users[userIndex], {
            type: 'DEPOSIT', payload: { userId, amount, description: 'User deposit via gateway' }
        });
        writeToDb(DB_KEYS.USERS, users);
    }
    return { updatedUsers: users };
};

export const requestWithdrawal = async (userId: string, amount: number): Promise<{ updatedUsers: StoredUser[] }> => {
    await simulateDelay();
    let users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const userIndex = users.findIndex(u => u.email === userId);
    if (userIndex > -1) {
        users[userIndex] = processWalletAction(users[userIndex], {
            type: 'WITHDRAWAL_REQUEST', payload: { userId, amount, description: 'Withdrawal request' }
        });
        writeToDb(DB_KEYS.USERS, users);
    }
    return { updatedUsers: users };
};

export const updateWithdrawalStatus = async (userId: string, transactionId: string, action: 'approve' | 'decline', adminId: string): Promise<{ updatedUsers: StoredUser[], newLog: AuditLog }> => {
    await simulateDelay();
    let users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const admin = users.find(u => u.email === adminId)!;
    const userIndex = users.findIndex(u => u.email === userId);
    if (userIndex > -1) {
        users[userIndex] = processWalletAction(users[userIndex], {
            type: action === 'approve' ? 'WITHDRAWAL_APPROVE' : 'WITHDRAWAL_DECLINE',
            payload: { userId, amount: 0, description: '', transactionId, updatedBy: adminId }
        });
        writeToDb(DB_KEYS.USERS, users);
    }
    const logAction: AuditLogAction = action === 'approve' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_DECLINED';
    const newLog = logAdminAction(admin, logAction, `Withdrawal for ${userId} (Tx: ${transactionId})`);
    return { updatedUsers: users, newLog };
};

export const adjustWalletWithAI = async (userId: string, amount: number, reasonKeywords: string, adminId: string): Promise<{ updatedUsers: StoredUser[], newLog: AuditLog }> => {
    await simulateDelay(1500); // AI call takes longer
    const description = await gemini.generateTransactionDescription(reasonKeywords, amount);
    let users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    const admin = users.find(u => u.email === adminId)!;
    const userIndex = users.findIndex(u => u.email === userId);
    if (userIndex > -1) {
        users[userIndex] = processWalletAction(users[userIndex], {
            type: 'ADMIN_ADJUSTMENT',
            payload: { userId, amount, description, updatedBy: adminId }
        });
        writeToDb(DB_KEYS.USERS, users);
    }
    const newLog = logAdminAction(admin, 'WALLET_ADJUSTED', `Adjusted wallet for ${userId} by $${amount}. Reason: ${reasonKeywords}`);
    return { updatedUsers: users, newLog };
};

export const registerForContest = async (contestId: string, userId: string): Promise<{ updatedContests: Contest[], updatedUsers: StoredUser[] }> => {
    await simulateDelay();
    let users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    let contests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || [];
    const user = users.find(u => u.email === userId)!;
    const contest = contests.find(c => c.id === contestId)!;

    if (user.banned) throw new Error('Your account has been suspended. You cannot register for contests.');
    const now = Date.now();
    if (now < contest.registrationStartDate || now > contest.registrationEndDate) throw new Error('Registration for this contest is not currently open.');
    if (now >= contest.contestStartDate) throw new Error('This contest has already started.');
    if (contest.participants.length >= contest.maxParticipants) throw new Error('This contest has reached its maximum number of participants.');
    if (user.walletBalance < contest.entryFee) throw new Error(`Insufficient funds. You need $${contest.entryFee} to enter.`);

    if (contest.entryFee > 0) {
        const userIndex = users.findIndex(u => u.email === userId);
        users[userIndex] = processWalletAction(user, {
            type: 'CONTEST_ENTRY', payload: { userId, amount: contest.entryFee, description: `Entry for ${contest.title}` }
        });
    }

    const updatedContests = contests.map(c => c.id === contestId ? { ...c, participants: [...c.participants, userId] } : c);

    writeToDb(DB_KEYS.USERS, users);
    writeToDb(DB_KEYS.CONTESTS, updatedContests);
    
    return { updatedContests, updatedUsers: users };
};

export const endGameAndUpdateStats = async (contestId: string, userId: string, results: GameResults): Promise<{ updatedContests: Contest[], updatedUsers: StoredUser[] }> => {
    await simulateDelay();
    let users = readFromDb<StoredUser[]>(DB_KEYS.USERS) || [];
    let contests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || [];
    const userIndex = users.findIndex(u => u.email === userId);
    const contestIndex = contests.findIndex(c => c.id === contestId);

    if (userIndex === -1 || contestIndex === -1) throw new Error("User or contest not found.");
    
    let user = users[userIndex];
    const contest = contests[contestIndex];
    let newResult: ContestResult | null = null;
    
    // --- Prize Money Logic ---
    if (results.format === 'KBC' && results.score > 0) {
        user = processWalletAction(user, {
            type: 'CONTEST_WIN', payload: { userId, amount: results.score, description: `Prize from ${contest.title}` }
        });
        newResult = { userId: user.email, name: user.name, score: results.score };
    } else if (results.format === 'FastestFinger') {
        const userResult = results.leaderboard.find(p => p.name === 'You');
        if (userResult) { newResult = { userId: user.email, name: user.name, score: userResult.score, time: userResult.time }; }
    }

    if (newResult) {
        const existingResults = contest.results || [];
        const otherUserResults = existingResults.filter(r => r.userId !== userId);
        contests[contestIndex] = { ...contest, results: [...otherUserResults, newResult] };
    }
    
    // --- Ranking Logic ---
    user = updateUserStatsAfterContest(user, contest, results);
    users[userIndex] = user;

    writeToDb(DB_KEYS.USERS, users);
    writeToDb(DB_KEYS.CONTESTS, contests);

    return { updatedContests: contests, updatedUsers: users };
};


// Fix for type error TS2322: Type '(Contest | { status: "Live"; ... })[]' is not assignable to type 'Contest[]'.
// The original implementation mutated an object inside a .map() callback, which can lead to subtle typing issues.
// This new implementation is immutable, safer, and fixes the type widening problem by creating a new object when the status changes.
// It also corrects a logic bug where a contest could transition from 'Upcoming' to 'Finished' in a single pass.
export const updateContestStatuses = async (): Promise<{ changed: boolean, updatedContests: Contest[] }> => {
    // This is a special case that doesn't simulate a user-initiated API call,
    // but a server-side cron job. No delay needed.
    let contests = readFromDb<Contest[]>(DB_KEYS.CONTESTS) || [];
    const now = Date.now();
    let contestsHaveChanged = false;

    const updatedContests = contests.map(contest => {
        const originalStatus = contest.status;
        let newStatus: Contest['status'] = originalStatus;

        if (originalStatus === 'Upcoming' && now >= contest.contestStartDate) {
            newStatus = 'Live';
        } else if (originalStatus === 'Live') {
            let isFinished = false;
            if (contest.format === 'FastestFinger' && contest.timerType === 'total_contest' && contest.totalContestTime) {
                if (now > contest.contestStartDate + (contest.totalContestTime * 1000)) {
                    isFinished = true;
                }
            } else {
                // Use a buffer for KBC since game length can vary
                if (now > contest.contestStartDate + (2 * 60 * 60 * 1000)) {
                    isFinished = true;
                }
            }
            if (isFinished) {
                newStatus = 'Finished';
            }
        }

        if (newStatus !== originalStatus) {
            contestsHaveChanged = true;
            return { ...contest, status: newStatus };
        }

        return contest;
    });

    if (contestsHaveChanged) {
        writeToDb(DB_KEYS.CONTESTS, updatedContests);
    }
    return { changed: contestsHaveChanged, updatedContests };
};

// Gemini Proxy
export const proxyGenerateContestWithAI = async (topic: string, ageGroup: string, difficulty: string, numberOfQuestions: number): Promise<Partial<Contest>> => {
    await simulateDelay(2000);
    return gemini.generateContestWithAI(topic, ageGroup, difficulty, numberOfQuestions);
};

export const proxyGenerateAdminInsights = async (prompt: string, users: StoredUser[], contests: Contest[]): Promise<string> => {
    await simulateDelay(1500);
    return gemini.generateAdminInsights(prompt, users, contests);
}
