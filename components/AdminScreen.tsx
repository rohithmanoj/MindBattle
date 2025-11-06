

import React, { useState, useMemo, useEffect } from 'react';
import { GameSettings, StoredUser, Transaction, Contest, QuizQuestion, AdminRole, AdminPermission, User, Toast, AuditLog, AuditLogAction, Difficulty } from '../types';
import { generateContestWithAI } from '../services/geminiService';
import { SearchIcon, DollarSignIcon, UsersIcon, TrendingUpIcon, DashboardIcon, ContestsIcon, AdminUsersIcon, AdminManagementIcon, GlobalSettingsIcon, AuditLogIcon, CheckCircleIcon, XCircleIcon, InfoIcon } from './icons';
import { DIFFICULTY_LEVELS } from '../constants';
import AnalyticsDashboard from './AnalyticsDashboard';


// --- Helper Components ---

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}
const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
        <input id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-700 disabled:cursor-not-allowed"/>
    </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}
const Textarea: React.FC<TextareaProps> = ({ label, id, ...props }) => (
  <div>
      <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
      <textarea id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-roboto-mono disabled:bg-slate-700 disabled:cursor-not-allowed"/>
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  children: React.ReactNode;
}
const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => (
  <div>
      <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
      <select id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          {children}
      </select>
  </div>
);

const TimeSelector: React.FC<{
    label: string;
    id: string;
    value: number; // in seconds
    onChange: (seconds: number) => void;
}> = ({ label, id, value, onChange }) => {
    const presets = [
        { label: '1 min', seconds: 60 }, { label: '2 min', seconds: 120 },
        { label: '5 min', seconds: 300 }, { label: '10 min', seconds: 600 },
    ];
    const isCustom = !presets.some(p => p.seconds === value);

    return (
        <div>
            <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-2">{label}</label>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-wrap">
                    {presets.map(p => (
                        <button key={p.seconds} type="button" onClick={() => onChange(p.seconds)}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${value === p.seconds ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex-grow">
                    <input id={id} type="number" placeholder="Custom (seconds)"
                        value={isCustom || value === 0 ? value : ''}
                        onChange={e => onChange(Number(e.target.value))}
                        onFocus={() => { if (!isCustom) onChange(0); }}
                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
            </div>
        </div>
    );
};


type MainTabs = 'dashboard' | 'contests' | 'users' | 'finance' | 'admins' | 'settings' | 'audit_log' | 'analytics';

interface TabButtonProps {
    tabName: MainTabs;
    label: string;
    activeTab: MainTabs;
    setActiveTab: (tab: MainTabs) => void;
    icon: React.ReactNode;
}
const TabButton: React.FC<TabButtonProps> = ({ tabName, label, activeTab, setActiveTab, icon }) => (
  <button onClick={() => setActiveTab(tabName)} className={`flex items-center px-4 py-2 text-base font-semibold transition-all duration-200 ${activeTab === tabName ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white border-b-2 border-transparent'}`}>
    {icon} {label}
  </button>
);

const ROLES_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  'Super Admin': ['MANAGE_CONTESTS', 'MANAGE_FINANCE', 'MANAGE_USERS', 'MANAGE_SETTINGS', 'MANAGE_ADMINS', 'MANAGE_AUDIT_LOG'],
  'Contest Manager': ['MANAGE_CONTESTS'],
  'Finance Manager': ['MANAGE_FINANCE'],
  'User Manager': ['MANAGE_USERS'],
};

const formatPermission = (permission: AdminPermission): string => {
    return permission.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

interface EditAdminRoleModalProps {
    user: StoredUser;
    currentUser: User;
    onSave: (userId: string, role: AdminRole | 'None') => void;
    onClose: () => void;
}

const EditAdminRoleModal: React.FC<EditAdminRoleModalProps> = ({ user, currentUser, onSave, onClose }) => {
    const [selectedRole, setSelectedRole] = useState<AdminRole | 'None'>(user.role || 'None');
    
    const availableRoles: (AdminRole | 'None')[] = ['Super Admin', 'Contest Manager', 'Finance Manager', 'User Manager', 'None'];

    const handleSave = () => {
        if (selectedRole === 'Super Admin' && user.email !== currentUser.email) {
            if (!window.confirm(`Are you sure you want to grant Super Admin privileges to ${user.name}? This gives them full control over the platform.`)) {
                return;
            }
        }
        onSave(user.email, selectedRole);
    };

    const permissionsForSelectedRole = selectedRole !== 'None' ? ROLES_PERMISSIONS[selectedRole] : [];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 w-full max-w-lg shadow-2xl relative animate-fade-in">
                <h3 className="text-2xl font-bold text-amber-400 mb-2">Edit Admin Role</h3>
                <p className="text-slate-300 mb-6">For user: <span className="font-semibold text-white">{user.name}</span> ({user.email})</p>
                
                <div className="space-y-4">
                    <Select label="Role" id="role-select-modal" value={selectedRole} onChange={e => setSelectedRole(e.target.value as AdminRole | 'None')}>
                        {availableRoles.map(role => (
                            <option 
                                key={role} 
                                value={role} 
                                disabled={
                                    // Only Super Admins can assign Super Admin
                                    (role === 'Super Admin' && currentUser.role !== 'Super Admin') || 
                                    // Super Admins cannot demote themselves
                                    (user.email === currentUser.email && currentUser.role === 'Super Admin' && role !== 'Super Admin')
                                }>
                                {role === 'None' ? 'Remove Admin Role (Regular User)' : role}
                            </option>
                        ))}
                    </Select>

                    <div>
                        <p className="block text-slate-300 text-sm font-semibold mb-2">Permissions for this role:</p>
                        {permissionsForSelectedRole.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {permissionsForSelectedRole.map(permission => (
                                    <span key={permission} className="bg-indigo-500/30 text-indigo-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                                        {formatPermission(permission)}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm italic">This user will become a regular user with no admin permissions.</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={onClose} className="bg-slate-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-500">Cancel</button>
                    <button onClick={handleSave} className="bg-amber-500 text-slate-900 font-bold py-2 px-5 rounded-lg hover:bg-amber-400">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const getStatusChipColor = (status: Contest['status']) => {
    switch (status) {
      case 'Upcoming': return 'bg-green-500/20 text-green-300';
      case 'Live': return 'bg-red-500/20 text-red-300 animate-pulse';
      case 'Finished': return 'bg-slate-500/20 text-slate-300';
      case 'Draft': return 'bg-yellow-500/20 text-yellow-300';
      case 'Cancelled': return 'bg-gray-500/20 text-gray-300';
      case 'Pending Approval': return 'bg-blue-500/20 text-blue-300';
      case 'Rejected': return 'bg-red-500/20 text-red-300';
    }
};

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, colorClass: string }> = ({ icon, title, value, colorClass }) => (
    <div className="bg-slate-800/60 p-4 rounded-lg flex items-center gap-4">
        <div className={`p-3 rounded-full bg-slate-700/50 ${colorClass}`}>{icon}</div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className={`text-2xl font-bold font-roboto-mono ${colorClass}`}>{value}</p>
        </div>
    </div>
);

const SimpleBarChart: React.FC<{ data: { name: string, value: number }[], maxReg: number }> = ({ data, maxReg }) => (
    <div className="flex justify-around items-end h-40 pt-4 px-2">
        {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center w-1/8 group">
                <div
                    className="w-full bg-indigo-500 rounded-t-md group-hover:bg-amber-400 transition-all"
                    style={{ height: `${(d.value / maxReg) * 100}%` }}
                >
                    <div className="opacity-0 group-hover:opacity-100 text-slate-900 text-xs font-bold text-center -mt-5 transition-opacity">{d.value}</div>
                </div>
                <span className="text-xs text-slate-400 mt-1">{d.name}</span>
            </div>
        ))}
    </div>
);

const ContestDetailModal: React.FC<{ contest: Contest; users: StoredUser[]; onClose: () => void; }> = ({ contest, users, onClose }) => {
    const [tab, setTab] = useState<'participants' | 'results'>('participants');
    const participantsDetails = useMemo(() => {
        return contest.participants.map(email => users.find(u => u.email === email)).filter(Boolean) as StoredUser[];
    }, [contest.participants, users]);
    
    const sortedResults = useMemo(() => {
        if (!contest.results) return [];
        return [...contest.results].sort((a, b) => b.score - a.score || (a.time || 0) - (b.time || 0));
    }, [contest.results]);

    const getRankContent = (rank: number) => {
        if (rank === 0) return '🥇';
        if (rank === 1) return '🥈';
        if (rank === 2) return '🥉';
        return rank + 1;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-2xl shadow-2xl relative animate-fade-in flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-bold text-amber-400">{contest.title}</h3>
                            <p className="text-slate-400 text-sm">{contest.category} - <span className={`font-semibold ${getStatusChipColor(contest.status)} px-2 py-0.5 rounded-full`}>{contest.status}</span></p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl font-bold">&times;</button>
                    </div>
                     <div className="flex border-b border-slate-700 my-4">
                        <button onClick={() => setTab('participants')} className={`px-4 py-2 font-semibold ${tab === 'participants' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}>Participants ({participantsDetails.length})</button>
                        <button onClick={() => setTab('results')} disabled={contest.status !== 'Finished'} className={`px-4 py-2 font-semibold disabled:text-slate-600 disabled:cursor-not-allowed ${tab === 'results' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}>Results</button>
                     </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {tab === 'participants' && (
                        <ul>
                            {participantsDetails.length > 0 ? participantsDetails.map(p => (
                                <li key={p.email} className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg mb-2">
                                    <p className="font-semibold text-white">{p.name}</p>
                                    <p className="text-sm text-slate-400">{p.email}</p>
                                </li>
                            )) : <p className="text-slate-500 text-center py-8">No participants have registered yet.</p>}
                        </ul>
                    )}
                    {tab === 'results' && (
                        sortedResults.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-300">
                                 <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 w-16 text-center">Rank</th>
                                        <th className="px-4 py-2">Player</th>
                                        <th className="px-4 py-2 text-right">{contest.format === 'KBC' ? 'Prize Won' : 'Score'}</th>
                                        {contest.format === 'FastestFinger' && <th className="px-4 py-2 text-right">Time</th>}
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-700">
                                    {sortedResults.map((r, index) => (
                                        <tr key={r.userId} className={`hover:bg-slate-700/50 ${index < 3 ? 'bg-amber-500/10' : ''}`}>
                                            <td className="px-4 py-2 font-bold text-center text-xl">{getRankContent(index)}</td>
                                            <td className="px-4 py-2">{r.name} <span className="text-xs text-slate-500">({r.userId})</span></td>
                                            <td className="px-4 py-2 font-roboto-mono text-right font-semibold">{contest.format === 'KBC' ? `$${r.score.toLocaleString()}` : r.score}</td>
                                            {contest.format === 'FastestFinger' && <td className="px-4 py-2 font-roboto-mono text-right">{r.time?.toFixed(2)}s</td>}
                                        </tr>
                                    ))}
                                 </tbody>
                            </table>
                        ) : (
                           <p className="text-slate-500 text-center py-8">No results have been recorded for this contest.</p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const ToastComponent: React.FC<{ toast: Toast, onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const colors = {
      success: 'from-green-500/80 to-slate-800 border-green-400 text-green-200',
      error: 'from-red-500/80 to-slate-800 border-red-400 text-red-200',
      info: 'from-blue-500/80 to-slate-800 border-blue-400 text-blue-200',
    };
    const icons = {
        success: <CheckCircleIcon />,
        error: <XCircleIcon />,
        info: <InfoIcon />,
    }
    return (
        <div className={`flex items-center gap-4 w-full max-w-sm p-4 rounded-lg shadow-lg border-l-4 bg-gradient-to-r ${colors[toast.type]} backdrop-blur-md animate-fade-in-up`}>
            <div>{icons[toast.type]}</div>
            <p className="flex-grow font-semibold">{toast.message}</p>
            <button onClick={onDismiss} className="text-xl">&times;</button>
        </div>
    )
};


// --- Main Admin Screen Component ---

interface AdminScreenProps {
  initialSettings: GameSettings;
  users: StoredUser[];
  contests: Contest[];
  currentUser: User;
  auditLog: AuditLog[];
  onSaveSettings: (newSettings: GameSettings) => void;
  onCancel: () => void;
  onUpdateWithdrawal: (userId: string, transactionId: string, action: 'approve' | 'decline', adminId: string) => void;
  onCreateContest: (newContest: Omit<Contest, 'id' | 'participants'>) => void;
  onUpdateContest: (updatedContest: Contest) => void;
  onDeleteContest: (contestId: string) => void;
  onAdminUpdateUser: (userId: string, updates: Partial<Pick<StoredUser, 'banned'>>) => void;
  onUpdateUserRole: (userId: string, role: AdminRole | 'None') => void;
  onCancelContest: (contestId: string) => void;
  onAdjustWallet: (userId: string, amount: number, reasonKeywords: string, adminId: string) => Promise<void>;
  onAdminCreateAdmin: (name: string, email: string, password: string, role: AdminRole) => { success: boolean, message: string };
}

type AdminView = 'main' | 'edit_contest' | 'verify_questions';

const AdminScreen: React.FC<AdminScreenProps> = (props) => {
  const { 
    initialSettings, users, contests, currentUser, auditLog,
    onSaveSettings, onCancel, onUpdateWithdrawal, 
    onCreateContest, onUpdateContest, onDeleteContest,
    onAdminUpdateUser, onUpdateUserRole, onCancelContest, onAdjustWallet,
    onAdminCreateAdmin
  } = props;
  
  const [view, setView] = useState<AdminView>('main');
  const [activeTab, setActiveTab] = useState<MainTabs>('dashboard');
  
  const [time, setTime] = useState(initialSettings.timePerQuestion.toString());
  const [categories, setCategories] = useState(initialSettings.categories.join('\n'));
  const [prizes, setPrizes] = useState(initialSettings.prizeAmounts.join('\n'));
  const [apiKey, setApiKey] = useState(initialSettings.paymentGatewaySettings.apiKey);
  const [bankDetails, setBankDetails] = useState(initialSettings.paymentGatewaySettings.bankDetails);
  const [securityToken, setSecurityToken] = useState(initialSettings.paymentGatewaySettings.securityToken);
  
  const [currentContest, setCurrentContest] = useState<Partial<Contest> | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualQuestionsJson, setManualQuestionsJson] = useState('');
  const [aiFormParams, setAiFormParams] = useState({ topic: '', ageGroup: 'All Ages', difficulty: 'Medium', numberOfQuestions: 15 });
  
  const [transactionSearch, setTransactionSearch] = useState('');
  const [financeTab, setFinanceTab] = useState<'pending' | 'history'>('pending');

  const [toasts, setToasts] = useState<Toast[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Contest['status'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const selectedUser = useMemo(() => users.find(u => u.email === selectedUserEmail), [users, selectedUserEmail]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({ name: '', email: '', password: '', role: 'Contest Manager' as AdminRole });

  const [viewingContest, setViewingContest] = useState<Contest | null>(null);

  // State for the user detail view
  const [detailAdjustment, setDetailAdjustment] = useState({ amount: '', reasonKeywords: '' });
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  
  // State for Audit Log
  const [auditLogSearch, setAuditLogSearch] = useState('');
  

  // Reset detail view state when switching users to prevent stale data.
  useEffect(() => {
    if (selectedUserEmail) {
      setDetailAdjustment({ amount: '', reasonKeywords: '' });
      setTxSearch('');
    }
  }, [selectedUserEmail]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };
  
  const hasPermission = (permission: AdminPermission): boolean => {
    if (!currentUser.role) return false;
    return ROLES_PERMISSIONS[currentUser.role].includes(permission);
  };
  
  const { totalUserFunds, totalPrizes, totalEntryFees, totalPendingWithdrawals, pendingWithdrawals, allTransactions } = useMemo(() => {
    let totalUserFunds = 0, totalPrizes = 0, totalEntryFees = 0, totalPendingWithdrawals = 0;
    const pendingWithdrawals: (Transaction & { userEmail: string, userName: string })[] = [];
    const allTransactions: (Transaction & { userEmail: string, userName: string })[] = [];

    users.forEach(user => {
        totalUserFunds += user.walletBalance;
        if (user.transactions) {
            user.transactions.forEach(tx => {
                const transactionWithUser = { ...tx, userEmail: user.email, userName: user.name };
                allTransactions.push(transactionWithUser);
                if (tx.type === 'win') totalPrizes += tx.amount;
                if (tx.type === 'entry_fee') totalEntryFees += Math.abs(tx.amount);
                if (tx.type === 'pending_withdrawal' && tx.status === 'pending') {
                    totalPendingWithdrawals += Math.abs(tx.amount);
                    pendingWithdrawals.push(transactionWithUser);
                }
            });
        }
    });
    allTransactions.sort((a, b) => b.timestamp - a.timestamp);
    return { totalUserFunds, totalPrizes, totalEntryFees, totalPendingWithdrawals, pendingWithdrawals, allTransactions };
  }, [users]);

  const registrationData = useMemo(() => {
    const data: { name: string, value: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for(let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStart = date.getTime();
        const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;
        const count = users.filter(u => u.registrationDate >= dayStart && u.registrationDate <= dayEnd).length;
        data.push({ name: date.toLocaleDateString(undefined, { weekday: 'short' }), value: count });
    }
    return data;
  }, [users]);
  

  const toDateInputString = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const toTimeInputString = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleDateTimeChange = (field: 'registrationStartDate' | 'registrationEndDate' | 'contestStartDate', part: 'date' | 'time', value: string) => {
    if (!currentContest) return;
    const date = new Date(currentContest[field] || Date.now());
    if (part === 'date') {
        if (!value) return;
        const [year, month, day] = value.split('-').map(Number);
        date.setFullYear(year, month - 1, day);
    } else {
        const [hours, minutes] = value.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
    }
    setCurrentContest({ ...currentContest, [field]: date.getTime() });
  };


  const handleSaveSettings = () => {
    try {
      const newSettings: GameSettings = {
        timePerQuestion: Number(time),
        categories: categories.split('\n').map(cat => cat.trim()).filter(Boolean),
        prizeAmounts: prizes.split('\n').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p)),
        paymentGatewaySettings: { apiKey: apiKey.trim(), bankDetails: bankDetails.trim(), securityToken: securityToken.trim() }
      };
      if (newSettings.categories.length === 0) throw new Error("You must provide at least one category.");
      if (newSettings.prizeAmounts.length !== 15) throw new Error(`The prize ladder must have exactly 15 levels. You have provided ${newSettings.prizeAmounts.length}.`);
      if (Object.values(newSettings.paymentGatewaySettings).some(v => !v)) throw new Error("All payment gateway fields are required.");
      onSaveSettings(newSettings);
      addToast('Settings saved successfully!', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Invalid format in one of the fields.', 'error');
    }
  };
  
  const handleNewContest = () => {
    const regEndDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
    setCurrentContest({
        title: '', description: '', category: initialSettings.categories[0] || '',
        entryFee: 0, prizePool: 1000, status: 'Draft',
        registrationStartDate: Date.now(),
        registrationEndDate: regEndDate,
        contestStartDate: regEndDate + (60 * 60 * 1000),
        maxParticipants: 100, rules: 'Standard quiz rules apply.',
        questions: [], participants: [], 
        format: 'KBC', timerType: 'per_question', timePerQuestion: initialSettings.timePerQuestion,
        totalContestTime: 60, numberOfQuestions: 15, difficulty: 'Medium',
    });
    setManualQuestionsJson('');
    setGeneratedQuestions([]);
    setView('edit_contest');
  };

  const handleEditContest = (contest: Contest) => {
    setCurrentContest(contest);
    setManualQuestionsJson(contest.questions ? JSON.stringify(contest.questions, null, 2) : '');
    setView('edit_contest');
  };

  const handleGenerateQuestions = async () => {
      if (!aiFormParams.topic) {
          addToast("Please provide a topic to generate a contest.", 'error');
          return;
      }
      setIsGenerating(true);
      try {
          const contestData = await generateContestWithAI(aiFormParams.topic, aiFormParams.ageGroup, aiFormParams.difficulty, aiFormParams.numberOfQuestions);
          setCurrentContest(prev => ({ ...prev, ...contestData }));
          setGeneratedQuestions(contestData.questions || []);
          setView('verify_questions');
      } catch (e) {
          addToast(e instanceof Error ? e.message : "Failed to generate contest.", 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSaveContest = () => {
    if (!currentContest) return;
    try {
        let questionsToSave: QuizQuestion[] = currentContest.questions || [];
        if (manualQuestionsJson) {
            const parsed = JSON.parse(manualQuestionsJson);
            if (!Array.isArray(parsed)) throw new Error("JSON must be an array of questions.");
            questionsToSave = parsed;
        }
        const contestData: Omit<Contest, 'id' | 'participants'> = {
            title: currentContest.title?.trim() || 'Untitled',
            description: currentContest.description?.trim() || '',
            category: currentContest.category || '',
            entryFee: Number(currentContest.entryFee) || 0, prizePool: Number(currentContest.prizePool) || 0,
            status: questionsToSave.length > 0 ? (currentContest.status === 'Pending Approval' ? 'Pending Approval' : 'Upcoming') : 'Draft',
            registrationStartDate: currentContest.registrationStartDate || 0,
            registrationEndDate: currentContest.registrationEndDate || 0,
            contestStartDate: currentContest.contestStartDate || 0,
            maxParticipants: Number(currentContest.maxParticipants) || 50,
            rules: currentContest.rules || '', questions: questionsToSave,
            format: currentContest.format || 'KBC',
            timerType: currentContest.timerType || 'per_question',
            timePerQuestion: Number(currentContest.timePerQuestion) || 30,
            totalContestTime: Number(currentContest.totalContestTime) || undefined,
            numberOfQuestions: Number(currentContest.numberOfQuestions) || 15,
            createdBy: currentContest.createdBy || currentUser.email,
            difficulty: currentContest.difficulty || 'Medium',
        };

        if (!contestData.title) throw new Error("Contest title is required.");
        if (contestData.registrationEndDate <= contestData.registrationStartDate) throw new Error("Registration end date must be after start date.");
        if (contestData.contestStartDate <= contestData.registrationEndDate) throw new Error("Contest start date must be after registration end date.");
        
        if (currentContest.id) {
            onUpdateContest({ ...contestData, id: currentContest.id, participants: currentContest.participants || [] });
        } else {
            onCreateContest(contestData);
        }
        addToast('Contest saved successfully!', 'success');
        setView('main');
        setCurrentContest(null);
    } catch(e) {
        addToast(e instanceof Error ? e.message : 'Failed to save contest.', 'error');
    }
  };
  
  const handlePublishVerifiedContest = () => {
      if (!currentContest) return;
       const finalContestData: Omit<Contest, 'id' | 'participants'> = {
            ...(currentContest as Omit<Contest, 'id' | 'participants'>),
            status: 'Upcoming', 
            questions: generatedQuestions,
            createdBy: currentContest.createdBy || currentUser.email,
            difficulty: currentContest.difficulty || 'Medium',
       };
       if (currentContest.id) {
          onUpdateContest({ ...finalContestData, id: currentContest.id, participants: currentContest.participants || [] });
       } else {
          onCreateContest(finalContestData);
       }
       addToast('Contest has been published!', 'success');
       setView('main');
       setCurrentContest(null);
       setGeneratedQuestions([]);
  };

  const handleDetailAdjustWallet = async (type: 'add' | 'deduct') => {
    if (!selectedUser || !currentUser) return;
    const rawAmount = parseFloat(detailAdjustment.amount);

    if (isNaN(rawAmount) || rawAmount <= 0 || !detailAdjustment.reasonKeywords.trim()) {
        addToast("Please provide a valid positive amount and some reason keywords.", 'error');
        return;
    }
    
    const finalAmount = type === 'add' ? rawAmount : -rawAmount;
    
    setIsAdjustingWallet(true);
    try {
        await onAdjustWallet(selectedUser.email, finalAmount, detailAdjustment.reasonKeywords, currentUser.email);
        addToast("User wallet adjusted successfully with AI-generated description!", 'success');
        setDetailAdjustment({ amount: '', reasonKeywords: '' });
    } catch (e) {
        addToast("Failed to adjust wallet.", 'error');
    } finally {
        setIsAdjustingWallet(false);
    }
  };

  const handleCreateAdminSubmit = () => {
      const { name, email, password, role } = newAdminForm;
      if (!name.trim() || !email.trim() || !password.trim()) {
          addToast("All fields are required to create an admin.", 'error');
          return;
      }
      const result = onAdminCreateAdmin(name, email, password, role);
      if (result.success) {
          addToast(result.message, 'success');
          setIsCreatingAdmin(false);
          setNewAdminForm({ name: '', email: '', password: '', role: 'Contest Manager' });
      } else {
          addToast(result.message, 'error');
      }
  }
  
  const renderContestForm = () => (
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          <Input label="Contest Title" id="title" type="text" value={currentContest?.title || ''} onChange={e => setCurrentContest({...currentContest, title: e.target.value})} />
          <Textarea label="Description" id="description" value={currentContest?.description || ''} onChange={e => setCurrentContest({...currentContest, description: e.target.value})} rows={2} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select label="Category" id="category" value={currentContest?.category} onChange={e => setCurrentContest({...currentContest, category: e.target.value})}>
                {initialSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Difficulty" id="difficulty" value={currentContest?.difficulty} onChange={e => setCurrentContest({...currentContest, difficulty: e.target.value as Difficulty})}>
                {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label="Format" id="format" value={currentContest?.format} onChange={e => {
                const newFormat = e.target.value as 'KBC' | 'FastestFinger';
                const updates: Partial<Contest> = { format: newFormat };
                if (newFormat === 'KBC') {
                    updates.numberOfQuestions = 15;
                }
                setCurrentContest({ ...currentContest, ...updates });
            }}>
                <option value="KBC">KBC (Prize Ladder)</option>
                <option value="FastestFinger">Fastest Finger (Score & Time)</option>
            </Select>
            <Input
                label="Number of Questions"
                id="numberOfQuestions"
                type="number"
                min="1"
                value={currentContest?.numberOfQuestions ?? 15}
                onChange={e => setCurrentContest({ ...currentContest, numberOfQuestions: Number(e.target.value) })}
                disabled={currentContest?.format === 'KBC'}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="Entry Fee ($)" id="entryFee" type="number" value={currentContest?.entryFee ?? 0} onChange={e => setCurrentContest({...currentContest, entryFee: Number(e.target.value)})} />
            <Input label="Prize Pool ($)" id="prizePool" type="number" value={currentContest?.prizePool ?? 0} onChange={e => setCurrentContest({...currentContest, prizePool: Number(e.target.value)})} />
            <Input label="Max Participants" id="maxParticipants" type="number" value={currentContest?.maxParticipants ?? 0} onChange={e => setCurrentContest({...currentContest, maxParticipants: Number(e.target.value)})} />
            
          </div>
          <Select label="Timer Type" id="timerType" value={currentContest?.timerType} onChange={e => setCurrentContest({...currentContest, timerType: e.target.value as 'per_question' | 'total_contest'})}>
              <option value="per_question">Per Question</option>
              <option value="total_contest">Total Contest Time</option>
          </Select>
          {currentContest?.timerType === 'per_question' ? (
              <Input label="Time Per Question (s)" id="timePerQuestion" type="number" value={currentContest?.timePerQuestion ?? 0} onChange={e => setCurrentContest({...currentContest, timePerQuestion: Number(e.target.value)})} />
          ) : (
                <TimeSelector
                    label="Total Contest Time"
                    id="totalContestTime"
                    value={currentContest?.totalContestTime ?? 0}
                    onChange={seconds => setCurrentContest({ ...currentContest, totalContestTime: seconds })}
                />
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-1">Registration Start</label>
                  <div className="flex gap-2">
                      <input type="date" value={toDateInputString(currentContest?.registrationStartDate)} onChange={e => handleDateTimeChange('registrationStartDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                      <input type="time" value={toTimeInputString(currentContest?.registrationStartDate)} onChange={e => handleDateTimeChange('registrationStartDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                  </div>
              </div>
              <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-1">Registration End</label>
                  <div className="flex gap-2">
                      <input type="date" value={toDateInputString(currentContest?.registrationEndDate)} onChange={e => handleDateTimeChange('registrationEndDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                      <input type="time" value={toTimeInputString(currentContest?.registrationEndDate)} onChange={e => handleDateTimeChange('registrationEndDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                  </div>
              </div>
              <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-1">Contest Start</label>
                  <div className="flex gap-2">
                      <input type="date" value={toDateInputString(currentContest?.contestStartDate)} onChange={e => handleDateTimeChange('contestStartDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                      <input type="time" value={toTimeInputString(currentContest?.contestStartDate)} onChange={e => handleDateTimeChange('contestStartDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                  </div>
              </div>
          </div>
          <Textarea label="Rules & Regulations" id="rules" value={currentContest?.rules || ''} onChange={e => setCurrentContest({...currentContest, rules: e.target.value})} rows={2} />
          
          <div className="border-t-2 border-slate-700/50 pt-4 mt-4 space-y-4">
              <h3 className="text-xl font-semibold text-slate-200">Contest Questions</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <h4 className="font-bold text-lg mb-2 text-amber-300">Generate with AI</h4>
                    <p className="text-sm text-slate-400 mb-4">Automatically create a full contest based on a topic.</p>
                    <div className="space-y-3">
                        <Input label="Topic" id="ai-topic" placeholder="e.g., 'World Capitals' or '80s Pop Music'" value={aiFormParams.topic} onChange={e => setAiFormParams({...aiFormParams, topic: e.target.value})} />
                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Target Age" id="ai-age" value={aiFormParams.ageGroup} onChange={e => setAiFormParams({...aiFormParams, ageGroup: e.target.value})}>
                                <option>All Ages</option><option>Children</option><option>Teens</option><option>Adults</option>
                            </Select>
                            <Select label="Difficulty" id="ai-difficulty" value={aiFormParams.difficulty} onChange={e => setAiFormParams({...aiFormParams, difficulty: e.target.value})}>
                                <option>Easy</option><option>Medium</option><option>Hard</option><option>Expert</option>
                            </Select>
                        </div>
                        <Input label="Number of Questions" id="ai-num-questions" type="number" min="1" max="50" value={aiFormParams.numberOfQuestions} onChange={e => setAiFormParams({...aiFormParams, numberOfQuestions: Number(e.target.value)})} />
                        <button onClick={handleGenerateQuestions} disabled={isGenerating} className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-wait">
                            {isGenerating ? 'Generating...' : '✨ Generate & Verify'}
                        </button>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <h4 className="font-bold text-lg mb-2 text-amber-300">Manual Question Upload</h4>
                     <p className="text-sm text-slate-400 mb-4">Paste an array of question objects in JSON format. This will override existing questions.</p>
                    <Textarea label="Questions (JSON format)" id="manualQuestions" value={manualQuestionsJson} onChange={e => setManualQuestionsJson(e.target.value)} rows={10} />
                </div>
              </div>
          </div>
      </div>
  );

  const renderVerifyQuestions = () => (
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {generatedQuestions.map((q, qIndex) => (
              <div key={qIndex} className="bg-slate-800/50 p-4 rounded-lg">
                  <Textarea id={`question-${qIndex}`} label={`Question ${qIndex + 1}`} value={q.question} onChange={e => {
                      const updated = [...generatedQuestions]; updated[qIndex].question = e.target.value; setGeneratedQuestions(updated);
                  }} rows={2} />
                  <div className="grid grid-cols-2 gap-4 mt-2">
                      {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                              <input type="radio" name={`q${qIndex}_answer`} id={`q${qIndex}o${oIndex}`} checked={opt === q.answer} onChange={() => {
                                  const updated = [...generatedQuestions]; updated[qIndex].answer = opt; setGeneratedQuestions(updated);
                              }} className="form-radio h-4 w-4 text-amber-500 bg-slate-700 border-slate-500 focus:ring-amber-400" />
                              <input type="text" value={opt} onChange={e => {
                                  const updated = [...generatedQuestions]; updated[qIndex].options[oIndex] = e.target.value; setGeneratedQuestions(updated);
                              }} className="w-full bg-slate-900 border border-slate-600 rounded py-1 px-2 text-white" />
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>
  );

  const renderCreateAdminModal = () => (
     <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 w-full max-w-lg shadow-2xl relative animate-fade-in">
            <h3 className="text-2xl font-bold text-amber-400 mb-6">Create New Admin User</h3>
            <div className="space-y-4">
                <Input label="Full Name" id="admin-name" value={newAdminForm.name} onChange={e => setNewAdminForm({...newAdminForm, name: e.target.value })} />
                <Input label="Email (Login ID)" id="admin-email" type="email" value={newAdminForm.email} onChange={e => setNewAdminForm({...newAdminForm, email: e.target.value })}/>
                <Input label="Temporary Password" id="admin-password" type="text" value={newAdminForm.password} onChange={e => setNewAdminForm({...newAdminForm, password: e.target.value })}/>
                <Select label="Role" id="admin-role" value={newAdminForm.role} onChange={e => setNewAdminForm({...newAdminForm, role: e.target.value as AdminRole })}>
                    <option value="Contest Manager">Contest Manager</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="User Manager">User Manager</option>
                    {currentUser.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                </Select>
            </div>
            <div className="flex justify-end gap-4 mt-8">
                <button onClick={() => setIsCreatingAdmin(false)} className="bg-slate-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-500">Cancel</button>
                <button onClick={handleCreateAdminSubmit} className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-500">Create Admin</button>
            </div>
        </div>
     </div>
  );

  const maxReg = Math.max(...registrationData.map(d => d.value), 1);
  const activeContests = contests.filter(c => ['Upcoming', 'Live'].includes(c.status));
  const totalUsers = users.filter(u => !u.role).length;
  const pendingContests = contests.filter(c => c.status === 'Pending Approval');
  const regularContests = contests.filter(c => 
      (c.status !== 'Pending Approval') &&
      (searchTerm === '' || c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || c.status === statusFilter) &&
      (categoryFilter === 'all' || c.category === categoryFilter)
  );
  const filteredUsers = users.filter(u => !u.role && (userSearchTerm === '' || u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) && (userStatusFilter === 'all' || (userStatusFilter === 'banned' && u.banned) || (userStatusFilter === 'active' && !u.banned)));
  const admins = users.filter(u => u.role);
  const filteredAuditLog = auditLog.filter(log => auditLogSearch === '' || log.adminEmail.toLowerCase().includes(auditLogSearch.toLowerCase()) || log.adminName.toLowerCase().includes(auditLogSearch.toLowerCase()) || log.action.toLowerCase().includes(auditLogSearch.toLowerCase()) || log.details.toLowerCase().includes(auditLogSearch.toLowerCase()));
  
  return (
    <div className="flex flex-col h-full text-white p-4 sm:p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg relative">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
         <h1 className="text-3xl font-bold text-amber-400">Admin Control Panel</h1>
         {view !== 'main' && <button onClick={() => setView('main')} className="bg-slate-600 font-bold py-2 px-4 rounded-lg">&larr; Back to Main</button>}
      </div>
      
      {view === 'main' && <div className="flex flex-col flex-grow overflow-y-hidden"><div className="flex border-b border-slate-700 mb-6 flex-shrink-0 overflow-x-auto">{hasPermission('MANAGE_CONTESTS') && <TabButton tabName="dashboard" label="Dashboard" activeTab={activeTab} setActiveTab={setActiveTab} icon={<DashboardIcon />} />}<TabButton tabName="contests" label="Contests" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ContestsIcon />} />{hasPermission('MANAGE_USERS') && <TabButton tabName="users" label="Users" activeTab={activeTab} setActiveTab={setActiveTab} icon={<AdminUsersIcon />} />}{hasPermission('MANAGE_FINANCE') && <TabButton tabName="finance" label="Finance" activeTab={activeTab} setActiveTab={setActiveTab} icon={<DollarSignIcon />} />}{hasPermission('MANAGE_ADMINS') && <TabButton tabName="admins" label="Admins" activeTab={activeTab} setActiveTab={setActiveTab} icon={<AdminManagementIcon />} />}{hasPermission('MANAGE_AUDIT_LOG') && <TabButton tabName="analytics" label="Analytics" activeTab={activeTab} setActiveTab={setActiveTab} icon={<TrendingUpIcon />} />}{hasPermission('MANAGE_AUDIT_LOG') && <TabButton tabName="audit_log" label="Audit Log" activeTab={activeTab} setActiveTab={setActiveTab} icon={<AuditLogIcon />} />}{hasPermission('MANAGE_SETTINGS') && <TabButton tabName="settings" label="Global Settings" activeTab={activeTab} setActiveTab={setActiveTab} icon={<GlobalSettingsIcon />} />}</div><div className="flex-grow overflow-y-auto pr-2">
        {activeTab === 'dashboard' && hasPermission('MANAGE_CONTESTS') && (
            <div className="space-y-6">
                <div className="mb-6 border-b-2 border-slate-700 pb-2">
                    <h2 className="text-2xl font-semibold text-slate-200">Platform Overview</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={<DollarSignIcon />} title="Total User Funds" value={`$${totalUserFunds.toLocaleString()}`} colorClass="text-white" />
                    <StatCard icon={<UsersIcon />} title="Registered Users" value={totalUsers} colorClass="text-white" />
                    <StatCard icon={<TrendingUpIcon />} title="Active Contests" value={activeContests.length} colorClass="text-green-400" />
                    <StatCard icon={<DollarSignIcon />} title="Pending Withdrawals" value={`$${totalPendingWithdrawals.toLocaleString()}`} colorClass="text-yellow-400" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-800/40 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">User Registrations (Last 7 Days)</h3>
                        <SimpleBarChart data={registrationData} maxReg={maxReg} />
                    </div>
                     <div className="bg-slate-800/40 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">Recent User Registrations</h3>
                        <ul className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                            {[...users].filter(u => !u.role).sort((a,b) => b.registrationDate - a.registrationDate).slice(0, 5).map(u => (
                                <li key={u.email} className="bg-slate-800/60 p-2 rounded-lg flex items-center justify-between text-sm">
                                    <div><p className="font-bold text-white">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                                    <span className="text-xs text-slate-500">{new Date(u.registrationDate).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'contests' && hasPermission('MANAGE_CONTESTS') && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4 border-b-2 border-slate-700 pb-2">
                  <h2 className="text-2xl font-semibold text-slate-200">Contest Management</h2>
                  <button onClick={handleNewContest} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded text-sm">Create New Contest</button>
              </div>
              
              {pendingContests.length > 0 && (
                <div className="bg-slate-800/40 p-3 rounded-lg border-l-4 border-blue-400">
                    <h3 className="text-lg font-semibold text-blue-300 mb-2">Pending Approval ({pendingContests.length})</h3>
                    <ul className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                        {pendingContests.map(c => (
                            <li key={c.id} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-white">{c.title}</p>
                                    <p className="text-xs text-slate-400">By: {c.createdBy}</p>
                                </div>
                                <div className="flex gap-2">
                                   <button onClick={() => onUpdateContest({...c, status: 'Upcoming'})} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded text-sm">Approve</button>
                                   <button onClick={() => onUpdateContest({...c, status: 'Rejected'})} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">Reject</button>
                                   <button onClick={() => handleEditContest(c)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-1 px-3 rounded text-sm">Review</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
              )}

              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-slate-800/40 p-3 rounded-lg">
                  <Input label="Search Contests" id="search" type="text" placeholder="Title, description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <Select label="Status" id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as Contest['status'] | 'all')}>
                    <option value="all">All Statuses</option>
                    <option value="Upcoming">Upcoming</option><option value="Live">Live</option><option value="Finished">Finished</option>
                    <option value="Draft">Draft</option><option value="Cancelled">Cancelled</option><option value="Rejected">Rejected</option>
                  </Select>
                  <Select label="Category" id="categoryFilter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    {initialSettings.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </Select>
                </div>
                <ul className="space-y-3 max-h-[calc(100vh-450px)] overflow-y-auto pr-2">
                    {regularContests.length > 0 ? regularContests.map(c => (
                        <li key={c.id} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white">{c.title} <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusChipColor(c.status)}`}>{c.status}</span></p>
                                <p className="text-xs text-slate-400">{c.category} | {c.participants.length}/{c.maxParticipants} participants {c.createdBy && `| By: ${c.createdBy}`}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => setViewingContest(c)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-1 px-3 rounded text-sm">Details</button>
                               <button onClick={() => handleEditContest(c)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm">Edit</button>
                               {c.status === 'Upcoming' && <button onClick={() => window.confirm('Cancel this contest? Participants will be refunded.') && onCancelContest(c.id)} className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-1 px-3 rounded text-sm">Cancel</button>}
                               <button onClick={() => window.confirm('Permanently delete this contest?') && onDeleteContest(c.id)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">Delete</button>
                            </div>
                        </li>
                    )) : <li className="text-center text-slate-500 py-4">No contests match your filters.</li>}
                </ul>
              </div>
            </div>
        )}
        {activeTab === 'users' && hasPermission('MANAGE_USERS') && (
            selectedUser ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-4 border-b-2 border-slate-700 pb-2">
                        <button onClick={() => setSelectedUserEmail(null)} className="bg-slate-600 font-bold py-2 px-4 rounded-lg">&larr; Back</button>
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-200">{selectedUser.name}</h2>
                            <p className="text-sm text-slate-400">{selectedUser.email}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <div className="bg-slate-800/40 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4">User Info</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="text-slate-400">Status</p><span className={`px-2 py-1 font-semibold rounded-full ${selectedUser.banned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{selectedUser.banned ? 'Banned' : 'Active'}</span></div>
                                    <div><p className="text-slate-400">Balance</p><p className="font-bold font-roboto-mono text-white">${selectedUser.walletBalance.toLocaleString()}</p></div>
                                    <div className="col-span-2"><p className="text-slate-400">Joined</p><p className="font-semibold text-white">{new Date(selectedUser.registrationDate).toLocaleDateString()}</p></div>
                                </div>
                            </div>
                             <div className="bg-slate-800/40 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4">AI-Powered Wallet Adjustment</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="detailAmount" className="block text-slate-300 text-sm font-semibold mb-1">Amount</label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-slate-400">$</span>
                                            </div>
                                            <input id="detailAmount" type="number" placeholder="50.00" 
                                                value={detailAdjustment.amount} 
                                                onChange={e => setDetailAdjustment({...detailAdjustment, amount: e.target.value.replace(/[^0-9.]/g, '')})}
                                                className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 pl-7 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                        </div>
                                    </div>
                                    <Input id="detailReason" label="Reason Keywords" type="text" placeholder="e.g. bonus, event winner, refund" value={detailAdjustment.reasonKeywords} onChange={e => setDetailAdjustment({...detailAdjustment, reasonKeywords: e.target.value})} />
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => handleDetailAdjustWallet('add')} disabled={isAdjustingWallet} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200 disabled:bg-slate-600 flex justify-center items-center gap-2">
                                            {isAdjustingWallet ? 'Processing...' : '✨ Add to Wallet'}
                                        </button>
                                        <button onClick={() => handleDetailAdjustWallet('deduct')} disabled={isAdjustingWallet} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200 disabled:bg-slate-600 flex justify-center items-center gap-2">
                                            {isAdjustingWallet ? 'Processing...' : '✨ Deduct from Wallet'}
                                        </button>
                                    </div>
                                    {isAdjustingWallet && <p className="text-xs text-slate-400 text-center animate-pulse">Generating AI description and processing transaction...</p>}
                                </div>
                            </div>
                            <div className="bg-slate-800/40 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4">User Actions</h3>
                                <button onClick={() => onAdminUpdateUser(selectedUser.email, { banned: !selectedUser.banned })} className={`w-full font-bold py-2 px-3 rounded text-sm ${selectedUser.banned ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>{selectedUser.banned ? 'Unban User' : 'Ban User'}</button>
                            </div>
                        </div>
                        {/* Right Column */}
                        <div className="bg-slate-800/40 p-4 rounded-lg flex flex-col">
                            <h3 className="text-lg font-semibold text-slate-200 mb-2 flex-shrink-0">Transaction History</h3>
                            <input type="text" placeholder="Search transactions..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 mb-4 text-white flex-shrink-0" />
                            <div className="overflow-y-auto flex-grow">
                                <table className="w-full text-sm text-left text-slate-300"><thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Description</th><th className="px-4 py-2">Status</th></tr></thead><tbody className="divide-y divide-slate-700">{(selectedUser.transactions || []).filter(tx => txSearch === '' || tx.description.toLowerCase().includes(txSearch.toLowerCase()) || tx.type.toLowerCase().includes(txSearch.toLowerCase())).map(tx => (<tr key={tx.id} className="hover:bg-slate-700/50"><td className="px-4 py-2 text-xs">{new Date(tx.timestamp).toLocaleString()}</td><td className="px-4 py-2 uppercase text-xs font-bold">{tx.type.replace(/_/g, ' ')}</td><td className={`px-4 py-2 font-roboto-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()}</td><td className="px-4 py-2">{tx.description}</td><td className="px-4 py-2"><span className={`px-2 py-0.5 text-xs rounded-full ${tx.status === 'completed' ? 'bg-green-500/20 text-green-300' : tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>{tx.status}</span></td></tr>))}</tbody></table>
                                {(selectedUser.transactions || []).length === 0 && <p className="text-slate-500 text-center py-8">No transactions found.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6"><div className="flex justify-between items-center mb-4 border-b-2 border-slate-700 pb-2"><h2 className="text-2xl font-semibold text-slate-200">User Management</h2></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-800/40 p-3 rounded-lg"><Input label="Search Users" id="userSearch" type="text" placeholder="Name, email..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} /><Select label="Status" id="userStatusFilter" value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value as 'all' | 'active' | 'banned')}><option value="all">All Users</option><option value="active">Active</option><option value="banned">Banned</option></Select></div><div className="overflow-x-auto max-h-[calc(100vh-450px)]"><table className="w-full text-sm text-left text-slate-300"><thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0"><tr><th scope="col" className="px-6 py-3">User</th><th scope="col" className="px-6 py-3">Wallet Balance</th><th scope="col" className="px-6 py-3">Status</th><th scope="col" className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{filteredUsers.map(user => (<tr key={user.email} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50"><td className="px-6 py-4 font-medium text-white whitespace-nowrap">{user.name} <span className="block text-xs text-slate-400">{user.email}</span></td><td className="px-6 py-4 font-roboto-mono">${user.walletBalance.toLocaleString()}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.banned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{user.banned ? 'Banned' : 'Active'}</span></td><td className="px-6 py-4 text-right"><button onClick={() => setSelectedUserEmail(user.email)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs">View Details</button></td></tr>))}</tbody></table></div></div>
            )
        )}
        {activeTab === 'finance' && hasPermission('MANAGE_FINANCE') && (
            <div className="space-y-6">
                <div>
                    <div className="mb-6 border-b-2 border-slate-700 pb-2">
                        <h2 className="text-2xl font-semibold text-slate-200">Financial Overview</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-800/60 p-4 rounded-lg text-center"><p className="text-sm text-slate-400">Total User Funds</p><p className="text-2xl font-bold font-roboto-mono text-white flex items-center justify-center gap-2"><DollarSignIcon/>${totalUserFunds.toLocaleString()}</p></div>
                        <div className="bg-slate-800/60 p-4 rounded-lg text-center"><p className="text-sm text-slate-400">Total Entry Fees</p><p className="text-2xl font-bold font-roboto-mono text-green-400 flex items-center justify-center gap-2"><TrendingUpIcon/>${totalEntryFees.toLocaleString()}</p></div>
                        <div className="bg-slate-800/60 p-4 rounded-lg text-center"><p className="text-sm text-slate-400">Total Prize Payouts</p><p className="text-2xl font-bold font-roboto-mono text-red-400 flex items-center justify-center gap-2"><UsersIcon/>${totalPrizes.toLocaleString()}</p></div>
                        <div className="bg-slate-800/60 p-4 rounded-lg text-center"><p className="text-sm text-slate-400">Pending Withdrawals</p><p className="text-2xl font-bold font-roboto-mono text-yellow-400 flex items-center justify-center gap-2"><DollarSignIcon/>${totalPendingWithdrawals.toLocaleString()}</p></div>
                    </div>
                </div>
                <div>
                    <div className="flex border-b border-slate-700 mb-4">
                        <button onClick={() => setFinanceTab('pending')} className={`px-4 py-2 font-semibold transition-colors ${financeTab === 'pending' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}>
                            Pending Withdrawals ({pendingWithdrawals.length})
                        </button>
                        <button onClick={() => setFinanceTab('history')} className={`px-4 py-2 font-semibold transition-colors ${financeTab === 'history' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}>
                            Transaction History
                        </button>
                    </div>
                    
                    {financeTab === 'pending' && (
                        <ul className="space-y-3 max-h-[calc(100vh-550px)] overflow-y-auto pr-2">
                            {pendingWithdrawals.length > 0 ? pendingWithdrawals.map(tx => (
                                <li key={tx.id} className="bg-slate-800/60 p-3 rounded-lg flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex-grow">
                                        <p className="font-bold text-white">{tx.userName} ({tx.userEmail})</p>
                                        <p className="text-sm text-slate-400 font-roboto-mono">Request: <span className="font-bold text-red-400">${Math.abs(tx.amount).toLocaleString()}</span> on {new Date(tx.timestamp).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                       <button onClick={() => onUpdateWithdrawal(tx.userEmail, tx.id, 'approve', currentUser.email)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded text-sm">Approve</button>
                                       <button onClick={() => onUpdateWithdrawal(tx.userEmail, tx.id, 'decline', currentUser.email)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">Decline</button>
                                    </div>
                                </li>
                            )) : <li className="text-center text-slate-500 py-4">No pending withdrawals.</li>}
                        </ul>
                    )}
                    
                    {financeTab === 'history' && (
                        <div>
                            <div className="relative mb-4">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none"><SearchIcon/></span>
                                <input type="text" placeholder="Search by description, type, user..." value={transactionSearch} onChange={e => setTransactionSearch(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 pl-10 pr-3 text-white"/>
                            </div>
                            <div className="overflow-x-auto max-h-[calc(100vh-580px)]">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Description</th></tr></thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {allTransactions.filter(tx => transactionSearch === '' || tx.description.toLowerCase().includes(transactionSearch.toLowerCase()) || tx.type.toLowerCase().includes(transactionSearch.toLowerCase()) || tx.userName.toLowerCase().includes(transactionSearch.toLowerCase())).map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-700/50">
                                                <td className="px-4 py-2 text-xs">{new Date(tx.timestamp).toLocaleString()}</td>
                                                <td className="px-4 py-2">{tx.userName}</td>
                                                <td className="px-4 py-2 uppercase text-xs font-bold">{tx.type.replace(/_/g, ' ')}</td>
                                                <td className={`px-4 py-2 font-roboto-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()}</td>
                                                <td className="px-4 py-2">{tx.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
        {activeTab === 'admins' && hasPermission('MANAGE_ADMINS') && (
            <div>
                <div className="flex justify-between items-center mb-4 border-b-2 border-slate-700 pb-2">
                    <h2 className="text-2xl font-semibold text-slate-200">Admin Role Management</h2>
                     {currentUser.role === 'Super Admin' && (
                        <button onClick={() => setIsCreatingAdmin(true)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded text-sm">
                            + Create New Admin
                        </button>
                     )}
                </div>
                <div className="overflow-x-auto max-h-[calc(100vh-550px)]">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">User</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map(admin => (
                                <tr key={admin.email} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{admin.name} <span className="block text-xs text-slate-400">{admin.email}</span></td>
                                    <td className="px-6 py-4">{admin.role}</td>
                                    <td className="px-6 py-4">
                                        {currentUser.role === 'Super Admin' && admin.email !== currentUser.email ? (
                                            <button 
                                                onClick={() => setEditingUser(admin)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs"
                                            >
                                                Edit Role
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-500">
                                                {admin.email === currentUser.email ? 'Current User' : 'No Permission'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {currentUser.role === 'Super Admin' && (
                    <div className="mt-6 bg-slate-800/40 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Promote User to Admin</h3>
                        <p className="text-sm text-slate-400 mb-2">Select a regular user to grant them admin permissions.</p>
                        <Select
                            label="Select User"
                            id="user-to-promote"
                            onChange={e => {
                                const userToEdit = users.find(u => u.email === e.target.value);
                                if (userToEdit) {
                                    setEditingUser(userToEdit);
                                }
                            }}
                            value=""
                        >
                            <option value="">-- Select a user to promote --</option>
                            {users.filter(u => !u.role).map(u => (
                                <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
                            ))}
                        </Select>
                    </div>
                )}
            </div>
        )}
        {activeTab === 'analytics' && hasPermission('MANAGE_AUDIT_LOG') && (
            <AnalyticsDashboard users={users} contests={contests} />
        )}
        {activeTab === 'audit_log' && hasPermission('MANAGE_AUDIT_LOG') && (
            <div className="space-y-6">
                 <div className="flex justify-between items-center mb-4 border-b-2 border-slate-700 pb-2">
                    <h2 className="text-2xl font-semibold text-slate-200">Admin Audit Log</h2>
                </div>
                <div className="relative mb-4">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none"><SearchIcon/></span>
                    <input type="text" placeholder="Search by admin, action, or details..." value={auditLogSearch} onChange={e => setAuditLogSearch(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 pl-10 pr-3 text-white"/>
                </div>
                <div className="overflow-x-auto max-h-[calc(100vh-450px)]">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Timestamp</th>
                                <th className="px-4 py-2">Admin</th>
                                <th className="px-4 py-2">Action</th>
                                <th className="px-4 py-2">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredAuditLog.length > 0 ? filteredAuditLog.map(log => (
                                <tr key={log.id} className="hover:bg-slate-700/50">
                                    <td className="px-4 py-2 text-xs font-roboto-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{log.adminName} <span className="text-xs text-slate-500">({log.adminEmail})</span></td>
                                    <td className="px-4 py-2"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/30 text-indigo-200">{log.action.replace(/_/g, ' ')}</span></td>
                                    <td className="px-4 py-2">{log.details}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center text-slate-500 py-8">No audit log entries found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        {activeTab === 'settings' && hasPermission('MANAGE_SETTINGS') && (
            <div className="space-y-6">
                <div>
                    <div className="mb-4 border-b-2 border-slate-700 pb-2">
                        <h2 className="text-2xl font-semibold text-slate-200">Global Game Settings</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input label="Default Time Per Question (seconds)" id="time" type="number" value={time} onChange={e => setTime(e.target.value)} />
                            <Textarea label="Question Categories (one per line)" id="categories" value={categories} onChange={e => setCategories(e.target.value)} rows={8} />
                        </div>
                        <div>
                            <Textarea label="Prize Ladder Amounts (15 levels, one per line)" id="prizes" value={prizes} onChange={e => setPrizes(e.target.value)} rows={15} />
                        </div>
                    </div>
                </div>
                <div>
                    <div className="my-4 border-b-2 border-slate-700 pb-2">
                        <h2 className="text-2xl font-semibold text-slate-200">Payment Gateway</h2>
                    </div>
                    <div className="space-y-4">
                        <Input label="API Key" id="apiKey" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                        <Textarea label="Bank Details for Payouts" id="bankDetails" value={bankDetails} onChange={e => setBankDetails(e.target.value)} rows={4} />
                        <Input label="Security Token" id="securityToken" type="password" value={securityToken} onChange={e => setSecurityToken(e.target.value)} />
                    </div>
                </div>
            </div>
        )}
      </div></div>}
      {view === 'edit_contest' && hasPermission('MANAGE_CONTESTS') && currentContest && renderContestForm()}
      {view === 'verify_questions' && hasPermission('MANAGE_CONTESTS') && currentContest && renderVerifyQuestions()}

      <div className="flex justify-end gap-4 mt-6 flex-shrink-0">
        {view === 'main' && <>
            <button onClick={onCancel} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500">Close Panel</button>
            {activeTab === 'settings' && hasPermission('MANAGE_SETTINGS') && <button onClick={handleSaveSettings} className="bg-amber-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-amber-400">Save Global Settings</button>}
        </>}
        {view === 'edit_contest' && <>
            <button onClick={() => setView('main')} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500">Cancel</button>
            <button onClick={handleSaveContest} className="bg-amber-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-amber-400">Save Contest</button>
        </>}
        {view === 'verify_questions' && <>
            <button onClick={() => setView('edit_contest')} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500">Back to Edit</button>
            <button onClick={handlePublishVerifiedContest} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-500">Save & Publish Contest</button>
        </>}
      </div>

       {editingUser && hasPermission('MANAGE_ADMINS') && (
            <EditAdminRoleModal
                user={editingUser}
                currentUser={currentUser}
                onClose={() => setEditingUser(null)}
                onSave={(userId, newRole) => {
                    onUpdateUserRole(userId, newRole);
                    setEditingUser(null);
                }}
            />
        )}
        {isCreatingAdmin && hasPermission('MANAGE_ADMINS') && renderCreateAdminModal()}
        {viewingContest && <ContestDetailModal contest={viewingContest} users={users} onClose={() => setViewingContest(null)} />}
        {/* Toast Container */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-3 z-50">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
            ))}
        </div>
    </div>
  );
};

export default AdminScreen;