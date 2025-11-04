import React, { useState, useMemo } from 'react';
import { GameSettings, StoredUser, Transaction, Contest, QuizQuestion, AdminRole, AdminPermission, User } from '../types';
import { generateContestWithAI } from '../services/geminiService';
import { SearchIcon, DollarSignIcon, UsersIcon, TrendingUpIcon } from './icons';

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

type MainTabs = 'contests' | 'users' | 'finance' | 'admins' | 'settings';

interface TabButtonProps {
    tabName: MainTabs;
    label: string;
    activeTab: MainTabs;
    setActiveTab: (tab: MainTabs) => void;
}
const TabButton: React.FC<TabButtonProps> = ({ tabName, label, activeTab, setActiveTab }) => (
  <button onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === tabName ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}>
    {label}
  </button>
);

const ROLES_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  'Super Admin': ['MANAGE_CONTESTS', 'MANAGE_FINANCE', 'MANAGE_USERS', 'MANAGE_SETTINGS', 'MANAGE_ADMINS'],
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


// --- Main Admin Screen Component ---

interface AdminScreenProps {
  initialSettings: GameSettings;
  users: StoredUser[];
  contests: Contest[];
  currentUser: User;
  onSaveSettings: (newSettings: GameSettings) => void;
  onCancel: () => void;
  onUpdateWithdrawal: (userId: string, transactionId: string, action: 'approve' | 'decline') => void;
  onCreateContest: (newContest: Omit<Contest, 'id' | 'participants'>) => void;
  onUpdateContest: (updatedContest: Contest) => void;
  onDeleteContest: (contestId: string) => void;
  onAdminUpdateUser: (userId: string, updates: Partial<Pick<StoredUser, 'banned'>>) => void;
  onUpdateUserRole: (userId: string, role: AdminRole | 'None') => void;
  onCancelContest: (contestId: string) => void;
  onAdjustWallet: (userId: string, amount: number, reason: string) => void;
  onAdminCreateAdmin: (name: string, email: string, password: string, role: AdminRole) => { success: boolean, message: string };
}

type AdminView = 'main' | 'edit_contest' | 'verify_questions';

const AdminScreen: React.FC<AdminScreenProps> = (props) => {
  const { 
    initialSettings, users, contests, currentUser,
    onSaveSettings, onCancel, onUpdateWithdrawal, 
    onCreateContest, onUpdateContest, onDeleteContest,
    onAdminUpdateUser, onUpdateUserRole, onCancelContest, onAdjustWallet,
    onAdminCreateAdmin
  } = props;
  
  const [view, setView] = useState<AdminView>('main');
  const [activeTab, setActiveTab] = useState<MainTabs>('contests');
  
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
  const [aiFormParams, setAiFormParams] = useState({ topic: '', ageGroup: 'All Ages', difficulty: 'Medium' });
  
  const [adjustmentForm, setAdjustmentForm] = useState({ userId: '', amount: '', reason: '' });
  const [transactionSearch, setTransactionSearch] = useState('');
  const [financeTab, setFinanceTab] = useState<'pending' | 'history'>('pending');

  const [error, setError] = useState<string | null>(null);

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
    setError(null);
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
      alert('Settings saved successfully!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid format in one of the fields.');
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
          setError("Please provide a topic to generate a contest.");
          return;
      }
      setIsGenerating(true);
      setError(null);
      try {
          const contestData = await generateContestWithAI(aiFormParams.topic, aiFormParams.ageGroup, aiFormParams.difficulty);
          setCurrentContest(prev => ({ ...prev, ...contestData }));
          setGeneratedQuestions(contestData.questions || []);
          setView('verify_questions');
      } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to generate contest.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSaveContest = () => {
    setError(null);
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
            createdBy: currentContest.createdBy || currentUser.email,
        };

        if (!contestData.title) throw new Error("Contest title is required.");
        if (contestData.registrationEndDate <= contestData.registrationStartDate) throw new Error("Registration end date must be after start date.");
        if (contestData.contestStartDate <= contestData.registrationEndDate) throw new Error("Contest start date must be after registration end date.");
        
        if (currentContest.id) {
            onUpdateContest({ ...contestData, id: currentContest.id, participants: currentContest.participants || [] });
        } else {
            onCreateContest(contestData);
        }

        setView('main');
        setCurrentContest(null);
    } catch(e) {
        setError(e instanceof Error ? e.message : 'Failed to save contest.');
    }
  };
  
  const handlePublishVerifiedContest = () => {
      if (!currentContest) return;
       const finalContestData: Omit<Contest, 'id' | 'participants'> = {
            ...(currentContest as Omit<Contest, 'id' | 'participants'>),
            status: 'Upcoming', 
            questions: generatedQuestions,
            createdBy: currentContest.createdBy || currentUser.email,
       };
       if (currentContest.id) {
          onUpdateContest({ ...finalContestData, id: currentContest.id, participants: currentContest.participants || [] });
       } else {
          onCreateContest(finalContestData);
       }

       setView('main');
       setCurrentContest(null);
       setGeneratedQuestions([]);
  };

  const handleAdjustWalletSubmit = () => {
    setError(null);
    const { userId, amount: amountStr, reason } = adjustmentForm;
    const amount = parseFloat(amountStr);

    if (!userId || isNaN(amount) || !reason.trim()) {
        setError("Please select a user, enter a valid amount, and provide a reason.");
        return;
    }
    if (!window.confirm(`Adjust ${userId}'s balance by $${amount}? This is irreversible.`)) return;

    onAdjustWallet(userId, amount, reason);
    setAdjustmentForm({ userId: '', amount: '', reason: '' });
  };

  const handleCreateAdminSubmit = () => {
      setError(null);
      const { name, email, password, role } = newAdminForm;
      if (!name.trim() || !email.trim() || !password.trim()) {
          setError("All fields are required to create an admin.");
          return;
      }
      const result = onAdminCreateAdmin(name, email, password, role);
      if (result.success) {
          setIsCreatingAdmin(false);
          setNewAdminForm({ name: '', email: '', password: '', role: 'Contest Manager' });
      } else {
          setError(result.message);
      }
  }
  
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
  
  const renderContestsView = () => {
    const pendingContests = contests.filter(c => c.status === 'Pending Approval');
    const regularContests = contests.filter(c => 
        (c.status !== 'Pending Approval') &&
        (searchTerm === '' || c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === 'all' || c.status === statusFilter) &&
        (categoryFilter === 'all' || c.category === categoryFilter)
    );

    return (
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
                           <button onClick={() => handleEditContest(c)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm">Edit</button>
                           {c.status === 'Upcoming' && <button onClick={() => window.confirm('Cancel this contest? Participants will be refunded.') && onCancelContest(c.id)} className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-1 px-3 rounded text-sm">Cancel</button>}
                           <button onClick={() => window.confirm('Permanently delete this contest?') && onDeleteContest(c.id)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">Delete</button>
                        </div>
                    </li>
                )) : <li className="text-center text-slate-500 py-4">No contests match your filters.</li>}
            </ul>
          </div>
        </div>
    );
  };
  
  const renderUserDetailView = (user: StoredUser) => {
    const [detailAdjustment, setDetailAdjustment] = useState({ amount: '', reason: '' });
    const [txSearch, setTxSearch] = useState('');
    const filteredTxs = (user.transactions || []).filter(tx => txSearch === '' || tx.description.toLowerCase().includes(txSearch.toLowerCase()) || tx.type.toLowerCase().includes(txSearch.toLowerCase()));

    const handleDetailAdjustWallet = () => {
        const amount = parseFloat(detailAdjustment.amount);
        if (isNaN(amount) || !detailAdjustment.reason.trim()) return alert("Please provide a valid amount and reason.");
        if (window.confirm(`Adjust ${user.name}'s wallet by $${amount}?`)) {
            onAdjustWallet(user.email, amount, detailAdjustment.reason);
            setDetailAdjustment({ amount: '', reason: '' });
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4 border-b-2 border-slate-700 pb-2">
                <button onClick={() => setSelectedUserEmail(null)} className="bg-slate-600 font-bold py-2 px-4 rounded-lg">&larr;</button>
                <div>
                    <h2 className="text-2xl font-semibold text-slate-200">{user.name}</h2>
                    <p className="text-sm text-slate-400">{user.email}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-lg"><p className="text-sm text-slate-400">Status</p><span className={`px-2 py-1 text-sm font-semibold rounded-full ${user.banned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{user.banned ? 'Banned' : 'Active'}</span></div>
                <div className="bg-slate-800/60 p-4 rounded-lg"><p className="text-sm text-slate-400">Wallet Balance</p><p className="text-xl font-bold font-roboto-mono text-white">${user.walletBalance.toLocaleString()}</p></div>
                <div className="bg-slate-800/60 p-4 rounded-lg"><p className="text-sm text-slate-400">Registration Date</p><p className="text-lg font-semibold text-white">{new Date(user.registrationDate).toLocaleDateString()}</p></div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-slate-800/40 p-4 rounded-lg"><h3 className="text-lg font-semibold text-slate-200 mb-2">Actions</h3><button onClick={() => onAdminUpdateUser(user.email, { banned: !user.banned })} className={`w-full font-bold py-2 px-3 rounded text-sm ${user.banned ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>{user.banned ? 'Unban User' : 'Ban User'}</button></div>
                 <div className="flex-2 bg-slate-800/40 p-4 rounded-lg"><h3 className="text-lg font-semibold text-slate-200 mb-2">Adjust Wallet</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"><Input id="detailAmount" label="Amount" type="number" placeholder="e.g. 50" value={detailAdjustment.amount} onChange={e => setDetailAdjustment({...detailAdjustment, amount: e.target.value})} /><Input id="detailReason" label="Reason" type="text" placeholder="Reason" value={detailAdjustment.reason} onChange={e => setDetailAdjustment({...detailAdjustment, reason: e.target.value})} /><button onClick={handleDetailAdjustWallet} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 px-4 rounded-lg">Apply</button></div></div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">Transaction History</h3>
                 <input type="text" placeholder="Search transactions..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 mb-4 text-white" />
                 <div className="overflow-x-auto max-h-[25vh]"><table className="w-full text-sm text-left text-slate-300"><thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Description</th><th className="px-4 py-2">Status</th></tr></thead><tbody className="divide-y divide-slate-700">{filteredTxs.map(tx => (<tr key={tx.id} className="hover:bg-slate-700/50"><td className="px-4 py-2 text-xs">{new Date(tx.timestamp).toLocaleString()}</td><td className="px-4 py-2 uppercase text-xs font-bold">{tx.type.replace(/_/g, ' ')}</td><td className={`px-4 py-2 font-roboto-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()}</td><td className="px-4 py-2">{tx.description}</td><td className="px-4 py-2"><span className={`px-2 py-0.5 text-xs rounded-full ${tx.status === 'completed' ? 'bg-green-500/20 text-green-300' : tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>{tx.status}</span></td></tr>))}</tbody></table></div>
            </div>
        </div>
    );
  };
  
  const renderUsersView = () => {
    if (selectedUser) return renderUserDetailView(selectedUser);
    const filteredUsers = users.filter(u => !u.role && (userSearchTerm === '' || u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) && (userStatusFilter === 'all' || (userStatusFilter === 'banned' && u.banned) || (userStatusFilter === 'active' && !u.banned)));
    return (<div className="space-y-6"><div className="flex justify-between items-center mb-4 border-b-2 border-slate-700 pb-2"><h2 className="text-2xl font-semibold text-slate-200">User Management</h2></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-slate-800/40 p-3 rounded-lg"><Input label="Search Users" id="userSearch" type="text" placeholder="Name, email..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} /><Select label="Status" id="userStatusFilter" value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value as 'all' | 'active' | 'banned')}><option value="all">All Users</option><option value="active">Active</option><option value="banned">Banned</option></Select></div><div className="overflow-x-auto max-h-[calc(100vh-450px)]"><table className="w-full text-sm text-left text-slate-300"><thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0"><tr><th scope="col" className="px-6 py-3">User</th><th scope="col" className="px-6 py-3">Wallet Balance</th><th scope="col" className="px-6 py-3">Status</th><th scope="col" className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{filteredUsers.map(user => (<tr key={user.email} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50"><td className="px-6 py-4 font-medium text-white whitespace-nowrap">{user.name} <span className="block text-xs text-slate-400">{user.email}</span></td><td className="px-6 py-4 font-roboto-mono">${user.walletBalance.toLocaleString()}</td><td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.banned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{user.banned ? 'Banned' : 'Active'}</span></td><td className="px-6 py-4 text-right"><button onClick={() => setSelectedUserEmail(user.email)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs">View Details</button></td></tr>))}</tbody></table></div></div>);
  };
  
  const renderAdminsView = () => {
    const admins = users.filter(u => u.role);

    return (
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
    );
  };
  const renderFinanceView = () => (
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
                        <li key={tx.id} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-bold text-white">{tx.userName} ({tx.userEmail})</p>
                                <p className="text-sm text-slate-400 font-roboto-mono">Request: <span className="font-bold text-red-400">${Math.abs(tx.amount).toLocaleString()}</span> on {new Date(tx.timestamp).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => onUpdateWithdrawal(tx.userEmail, tx.id, 'approve')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded text-sm">Approve</button>
                               <button onClick={() => onUpdateWithdrawal(tx.userEmail, tx.id, 'decline')} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">Decline</button>
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
        <div className="mt-6 bg-slate-800/40 p-4 rounded-lg">
             <h3 className="text-lg font-semibold mb-2">Manual Wallet Adjustment</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Select label="Select User" id="adjustUser" value={adjustmentForm.userId} onChange={e => setAdjustmentForm({...adjustmentForm, userId: e.target.value})}>
                    <option value="">-- Select a user --</option>
                    {users.map(u => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
                </Select>
                <Input label="Amount (use '-' for deduction)" id="adjustAmount" type="number" placeholder="e.g., -50" value={adjustmentForm.amount} onChange={e => setAdjustmentForm({...adjustmentForm, amount: e.target.value})} />
                <Input label="Reason" id="adjustReason" type="text" placeholder="e.g., Bonus payout" value={adjustmentForm.reason} onChange={e => setAdjustmentForm({...adjustmentForm, reason: e.target.value})} />
             </div>
             <button onClick={handleAdjustWalletSubmit} className="mt-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 px-4 rounded-lg">Apply Adjustment</button>
        </div>
    </div>
  );
  const renderSettingsView = () => (
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
  );

  const renderContestForm = () => (
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          <Input label="Contest Title" id="title" type="text" value={currentContest?.title || ''} onChange={e => setCurrentContest({...currentContest, title: e.target.value})} />
          <Textarea label="Description" id="description" value={currentContest?.description || ''} onChange={e => setCurrentContest({...currentContest, description: e.target.value})} rows={2} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Category" id="category" value={currentContest?.category} onChange={e => setCurrentContest({...currentContest, category: e.target.value})}>
                {initialSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Format" id="format" value={currentContest?.format} onChange={e => setCurrentContest({...currentContest, format: e.target.value as 'KBC' | 'FastestFinger'})}>
                <option value="KBC">KBC (Prize Ladder)</option>
                <option value="FastestFinger">Fastest Finger (Score & Time)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input label="Entry Fee ($)" id="entryFee" type="number" value={currentContest?.entryFee ?? 0} onChange={e => setCurrentContest({...currentContest, entryFee: Number(e.target.value)})} />
            <Input label="Prize Pool ($)" id="prizePool" type="number" value={currentContest?.prizePool ?? 0} onChange={e => setCurrentContest({...currentContest, prizePool: Number(e.target.value)})} />
            <Input label="Max Participants" id="maxParticipants" type="number" value={currentContest?.maxParticipants ?? 0} onChange={e => setCurrentContest({...currentContest, maxParticipants: Number(e.target.value)})} />
            <Select label="Timer Type" id="timerType" value={currentContest?.timerType} onChange={e => setCurrentContest({...currentContest, timerType: e.target.value as 'per_question' | 'total_contest'})}>
                <option value="per_question">Per Question</option>
                <option value="total_contest">Total Contest Time</option>
            </Select>
            {currentContest?.timerType === 'per_question' ? (
                <Input label="Time Per Question (s)" id="timePerQuestion" type="number" value={currentContest?.timePerQuestion ?? 0} onChange={e => setCurrentContest({...currentContest, timePerQuestion: Number(e.target.value)})} />
            ) : (
                 <Input label="Total Contest Time (s)" id="totalContestTime" type="number" value={currentContest?.totalContestTime ?? 0} onChange={e => setCurrentContest({...currentContest, totalContestTime: Number(e.target.value)})} />
            )}
          </div>
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
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="space-y-4">
                <Input label="Full Name" id="admin-name" value={newAdminForm.name} onChange={e => { setNewAdminForm({...newAdminForm, name: e.target.value }); setError(null); }} />
                <Input label="Email (Login ID)" id="admin-email" type="email" value={newAdminForm.email} onChange={e => { setNewAdminForm({...newAdminForm, email: e.target.value }); setError(null); }}/>
                <Input label="Temporary Password" id="admin-password" type="text" value={newAdminForm.password} onChange={e => { setNewAdminForm({...newAdminForm, password: e.target.value }); setError(null); }}/>
                <Select label="Role" id="admin-role" value={newAdminForm.role} onChange={e => setNewAdminForm({...newAdminForm, role: e.target.value as AdminRole })}>
                    <option value="Contest Manager">Contest Manager</option>
                    <option value="Finance Manager">Finance Manager</option>
                    <option value="User Manager">User Manager</option>
                    {currentUser.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                </Select>
            </div>
            <div className="flex justify-end gap-4 mt-8">
                <button onClick={() => { setIsCreatingAdmin(false); setError(null); }} className="bg-slate-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-500">Cancel</button>
                <button onClick={handleCreateAdminSubmit} className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-500">Create Admin</button>
            </div>
        </div>
     </div>
  );

  return (
    <div className="flex flex-col h-full text-white p-4 sm:p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg relative">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
         <h1 className="text-3xl font-bold text-amber-400">Admin Control Panel</h1>
         {view !== 'main' && <button onClick={() => setView('main')} className="bg-slate-600 font-bold py-2 px-4 rounded-lg">&larr; Back to Main</button>}
      </div>
      
      {error && view === 'main' && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-4 flex-shrink-0" role="alert">
          <p><strong className="font-bold">Error: </strong>{error}</p>
          <button onClick={() => setError(null)} className="absolute top-1 right-2 text-2xl">&times;</button>
        </div>
      )}
      
      {view === 'main' && <div className="flex flex-col flex-grow overflow-y-hidden"><div className="flex border-b border-slate-700 mb-6 flex-shrink-0">{hasPermission('MANAGE_CONTESTS') && <TabButton tabName="contests" label="Contests" activeTab={activeTab} setActiveTab={setActiveTab} />}{hasPermission('MANAGE_USERS') && <TabButton tabName="users" label="Users" activeTab={activeTab} setActiveTab={setActiveTab} />}{hasPermission('MANAGE_FINANCE') && <TabButton tabName="finance" label="Finance" activeTab={activeTab} setActiveTab={setActiveTab} />}{hasPermission('MANAGE_ADMINS') && <TabButton tabName="admins" label="Admins" activeTab={activeTab} setActiveTab={setActiveTab} />}{hasPermission('MANAGE_SETTINGS') && <TabButton tabName="settings" label="Global Settings" activeTab={activeTab} setActiveTab={setActiveTab} />}</div><div className="flex-grow overflow-y-auto pr-2">{activeTab === 'contests' && hasPermission('MANAGE_CONTESTS') && renderContestsView()}{activeTab === 'users' && hasPermission('MANAGE_USERS') && renderUsersView()}{activeTab === 'finance' && hasPermission('MANAGE_FINANCE') && renderFinanceView()}{activeTab === 'admins' && hasPermission('MANAGE_ADMINS') && renderAdminsView()}{activeTab === 'settings' && hasPermission('MANAGE_SETTINGS') && renderSettingsView()}</div></div>}
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
    </div>
  );
};

export default AdminScreen;
