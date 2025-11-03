import React, { useState } from 'react';
import { GameSettings, StoredUser, Transaction, Contest, QuizQuestion, TransactionType } from '../types';
import { generateQuiz } from '../services/geminiService';

interface AdminScreenProps {
  initialSettings: GameSettings;
  users: StoredUser[];
  contests: Contest[];
  onSaveSettings: (newSettings: GameSettings) => void;
  onCancel: () => void;
  onUpdateWithdrawal: (userId: string, transactionId: string, action: 'approve' | 'decline') => void;
  onCreateContest: (newContest: Contest) => void;
  onUpdateContest: (updatedContest: Contest) => void;
  onDeleteContest: (contestId: string) => void;
  onAdminUpdateUser: (userId: string, updates: Partial<Pick<StoredUser, 'banned'>>) => void;
  onCancelContest: (contestId: string) => void;
  onAdjustWallet: (userId: string, type: TransactionType, amount: number, description: string) => void;
}

type AdminView = 'main' | 'edit_contest' | 'verify_questions';
type MainTabs = 'contests' | 'users' | 'settings';

const AdminScreen: React.FC<AdminScreenProps> = (props) => {
  const { 
    initialSettings, users, contests,
    onSaveSettings, onCancel, onUpdateWithdrawal, 
    onCreateContest, onUpdateContest, onDeleteContest,
    onAdminUpdateUser, onCancelContest, onAdjustWallet
  } = props;
  
  const [view, setView] = useState<AdminView>('main');
  const [activeTab, setActiveTab] = useState<MainTabs>('contests');
  
  // State for forms
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
  const [walletModal, setWalletModal] = useState<{ user: StoredUser, amount: string, reason: string } | null>(null);

  const [error, setError] = useState<string | null>(null);
  
  const toDateInputString = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toTimeInputString = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleDateTimeChange = (field: 'registrationStartDate' | 'registrationEndDate' | 'contestStartDate', part: 'date' | 'time', value: string) => {
    if (!currentContest) return;
    const existingTimestamp = currentContest[field] || Date.now();
    const date = new Date(existingTimestamp);
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
        categories: categories.split('\n').map(cat => cat.trim()).filter(cat => cat !== ''),
        prizeAmounts: prizes.split('\n').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p)),
        paymentGatewaySettings: {
            apiKey: apiKey.trim(),
            bankDetails: bankDetails.trim(),
            securityToken: securityToken.trim(),
        }
      };
      
      if (newSettings.categories.length === 0) throw new Error("You must provide at least one category.");
      if (newSettings.prizeAmounts.length !== 15) throw new Error(`The prize ladder must have exactly 15 levels. You have provided ${newSettings.prizeAmounts.length}.`);
      if (!newSettings.paymentGatewaySettings.apiKey || !newSettings.paymentGatewaySettings.bankDetails || !newSettings.paymentGatewaySettings.securityToken) {
          throw new Error("All payment gateway fields are required.");
      }

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
        questions: [], participants: [], timePerQuestion: initialSettings.timePerQuestion,
    });
    setManualQuestionsJson('');
    setView('edit_contest');
  };

  const handleEditContest = (contest: Contest) => {
    setCurrentContest(contest);
    const questionsJson = contest.questions ? JSON.stringify(contest.questions, null, 2) : '';
    setManualQuestionsJson(questionsJson);
    setView('edit_contest');
  };

  const handleGenerateQuestions = async () => {
      if (!currentContest?.category) {
          setError("Please select a category before generating questions.");
          return;
      }
      setIsGenerating(true);
      setError(null);
      try {
          const questions = await generateQuiz(currentContest.category);
          setGeneratedQuestions(questions);
          setView('verify_questions');
      } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to generate questions.");
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
            try {
                const parsedQuestions = JSON.parse(manualQuestionsJson);
                if (!Array.isArray(parsedQuestions)) throw new Error("JSON must be an array of questions.");
                questionsToSave = parsedQuestions;
            } catch (e) {
                throw new Error("Invalid JSON format for questions.");
            }
        }
        const finalContest: Contest = {
            id: currentContest.id || `c_${Date.now()}`,
            title: currentContest.title?.trim() || 'Untitled Contest',
            description: currentContest.description?.trim() || '',
            category: currentContest.category || '',
            entryFee: Number(currentContest.entryFee) || 0,
            prizePool: Number(currentContest.prizePool) || 0,
            status: questionsToSave.length > 0 ? 'Upcoming' : 'Draft',
            registrationStartDate: currentContest.registrationStartDate || 0,
            registrationEndDate: currentContest.registrationEndDate || 0,
            contestStartDate: currentContest.contestStartDate || 0,
            maxParticipants: Number(currentContest.maxParticipants) || 50,
            rules: currentContest.rules || '',
            questions: questionsToSave,
            participants: currentContest.participants || [],
            timePerQuestion: Number(currentContest.timePerQuestion) || 30,
        };
        if (!finalContest.title) throw new Error("Contest title is required.");
        if (finalContest.registrationEndDate <= finalContest.registrationStartDate) throw new Error("Registration end date must be after the start date.");
        if (finalContest.contestStartDate <= finalContest.registrationEndDate) throw new Error("Contest start date must be after the registration end date.");
        if (currentContest.id) {
            onUpdateContest(finalContest);
        } else {
            onCreateContest(finalContest);
        }
        setView('main');
        setCurrentContest(null);
    } catch(e) {
        setError(e instanceof Error ? e.message : 'Failed to save contest.');
    }
  };
  
  const handlePublishVerifiedContest = () => {
      if (!currentContest) return;
       const finalContest: Contest = {
            id: currentContest.id || `c_${Date.now()}`,
            ...currentContest,
            title: currentContest.title || 'Untitled', description: currentContest.description || '',
            category: currentContest.category || '', entryFee: Number(currentContest.entryFee) || 0,
            prizePool: Number(currentContest.prizePool) || 0, status: 'Upcoming',
            registrationStartDate: currentContest.registrationStartDate || 0,
            registrationEndDate: currentContest.registrationEndDate || 0,
            contestStartDate: currentContest.contestStartDate || 0,
            maxParticipants: Number(currentContest.maxParticipants) || 50,
            rules: currentContest.rules || '', participants: currentContest.participants || [],
            timePerQuestion: Number(currentContest.timePerQuestion) || 30, questions: generatedQuestions,
       };
        if (currentContest.id) {
            onUpdateContest(finalContest);
        } else {
            onCreateContest(finalContest);
        }
        setView('main');
        setCurrentContest(null);
        setGeneratedQuestions([]);
  };

  const handleAdjustWalletSubmit = () => {
    if (!walletModal) return;
    const amount = parseFloat(walletModal.amount);
    if (isNaN(amount)) {
      setError("Please enter a valid number for the amount.");
      return;
    }
    if (!walletModal.reason.trim()) {
      setError("A reason for the adjustment is required.");
      return;
    }
    onAdjustWallet(walletModal.user.email, 'admin_adjustment', amount, walletModal.reason);
    setWalletModal(null);
    setError(null);
  };

  const pendingWithdrawals: (Transaction & { userEmail: string, userName: string })[] = users.flatMap(user => 
    (user.transactions || [])
      .filter(tx => tx.type === 'pending_withdrawal' && tx.status === 'pending')
      .map(tx => ({...tx, userEmail: user.email, userName: user.name }))
  );
  
  const Input = ({ label, id, ...props }) => (
      <div>
          <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
          <input id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"/>
      </div>
  );

  const Textarea = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
        <textarea id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-roboto-mono"/>
    </div>
  );

  const getStatusChipColor = (status: Contest['status']) => {
    switch (status) {
      case 'Upcoming': return 'bg-green-500/20 text-green-300';
      case 'Live': return 'bg-red-500/20 text-red-300 animate-pulse';
      case 'Finished': return 'bg-slate-500/20 text-slate-300';
      case 'Draft': return 'bg-yellow-500/20 text-yellow-300';
      case 'Cancelled': return 'bg-gray-500/20 text-gray-300';
      default: return 'bg-blue-500/20 text-blue-300';
    }
  };
  
  const TabButton: React.FC<{ tabName: MainTabs; label: string; }> = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === tabName ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}
    >
      {label}
    </button>
  );

  const renderContestsView = () => (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4 border-b-2 border-slate-700 pb-2">
            <h2 className="text-2xl font-semibold text-slate-200">Contest Management</h2>
            <button onClick={handleNewContest} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded text-sm">Create New Contest</button>
        </div>
        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {contests.map(c => (
                <li key={c.id} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="font-bold text-white">{c.title} <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusChipColor(c.status)}`}>{c.status}</span></p>
                        <p className="text-xs text-slate-400">{c.category} | {c.participants.length}/{c.maxParticipants} participants</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleEditContest(c)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm">Edit</button>
                       {c.status === 'Upcoming' && <button onClick={() => window.confirm('Are you sure you want to cancel this contest? This will refund all participants.') && onCancelContest(c.id)} className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-1 px-3 rounded text-sm">Cancel</button>}
                       <button onClick={() => window.confirm('Are you sure you want to permanently delete this contest?') && onDeleteContest(c.id)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">Delete</button>
                    </div>
                </li>
            ))}
        </ul>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-slate-200 mb-4 border-b-2 border-slate-700 pb-2">Pending Withdrawals</h2>
        {pendingWithdrawals.length > 0 ? (
            <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {pendingWithdrawals.map(tx => (
                    <li key={tx.id} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="font-bold text-white">{tx.userName} ({tx.userEmail})</p>
                            <p className="text-amber-300 font-roboto-mono text-lg">${Math.abs(tx.amount).toLocaleString()}</p>
                            <p className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onUpdateWithdrawal(tx.userEmail, tx.id, 'approve')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded text-sm">Approve</button>
                            <button onClick={() => onUpdateWithdrawal(tx.userEmail, tx.id, 'decline')} className="bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded text-sm">Decline</button>
                        </div>
                    </li>
                ))}
            </ul>
        ) : <p className="text-slate-500">No pending withdrawals.</p>}
      </div>
    </div>
  );

  const renderUsersView = () => (
    <div>
        <h2 className="text-2xl font-semibold text-slate-200 mb-4 border-b-2 border-slate-700 pb-2">User Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/80">
                <tr>
                    <th scope="col" className="px-6 py-3">User</th>
                    <th scope="col" className="px-6 py-3">Wallet Balance</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {users.map(user => (
                    <tr key={user.email} className="bg-slate-800/50 border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{user.name} <span className="block text-xs text-slate-400">{user.email}</span></td>
                        <td className="px-6 py-4 font-roboto-mono">${user.walletBalance.toLocaleString()}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.banned ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                                {user.banned ? 'Banned' : 'Active'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right flex gap-2 justify-end">
                            <button onClick={() => onAdminUpdateUser(user.email, { banned: !user.banned })} className={`font-bold py-1 px-3 rounded text-xs ${user.banned ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                                {user.banned ? 'Unban' : 'Ban'}
                            </button>
                            <button onClick={() => setWalletModal({ user, amount: '', reason: '' })} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs">Adjust Wallet</button>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-200 mb-4 border-b-2 border-slate-700 pb-2">Global Settings</h2>
      <Input id="time" label="Default Time Per Question (s)" type="number" value={time} onChange={(e) => setTime(e.target.value)} />
      <Textarea id="categories" label="Categories (one per line)" value={categories} onChange={(e) => setCategories(e.target.value)} rows={8} />
      <Textarea id="prizes" label="Prize Amounts (15 levels, highest to lowest)" value={prizes} onChange={(e) => setPrizes(e.target.value)} rows={15} />
      
      <h2 className="text-2xl font-semibold text-slate-200 mb-4 border-b-2 border-slate-700 pb-2">Payment Gateway Settings</h2>
      <Input id="apiKey" label="Gateway API Key" type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
      <Input id="securityToken" label="Security Token" type="text" value={securityToken} onChange={(e) => setSecurityToken(e.target.value)} />
      <Textarea id="bankDetails" label="Bank Account Details" value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} rows={4} />
    </div>
  );
  
  const renderMainView = () => (
     <div className="flex flex-col flex-grow overflow-y-hidden">
        <div className="flex border-b border-slate-700 mb-6 flex-shrink-0">
            <TabButton tabName="contests" label="Contests & Withdrawals" />
            <TabButton tabName="users" label="Users" />
            <TabButton tabName="settings" label="Global Settings" />
        </div>
        <div className="flex-grow overflow-y-auto pr-2">
          {activeTab === 'contests' && renderContestsView()}
          {activeTab === 'users' && renderUsersView()}
          {activeTab === 'settings' && renderSettingsView()}
        </div>
      </div>
  );

  const renderContestForm = () => (
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          <Input label="Contest Title" id="title" type="text" value={currentContest.title} onChange={e => setCurrentContest({...currentContest, title: e.target.value})} />
          <Textarea label="Description" id="description" value={currentContest.description} onChange={e => setCurrentContest({...currentContest, description: e.target.value})} rows={3} />
          <div>
            <label htmlFor="category" className="block text-slate-300 text-sm font-semibold mb-1">Category</label>
            <select id="category" value={currentContest.category} onChange={e => setCurrentContest({...currentContest, category: e.target.value})} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                {initialSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Entry Fee ($)" id="entryFee" type="number" value={currentContest.entryFee} onChange={e => setCurrentContest({...currentContest, entryFee: Number(e.target.value)})} />
            <Input label="Prize Pool ($)" id="prizePool" type="number" value={currentContest.prizePool} onChange={e => setCurrentContest({...currentContest, prizePool: Number(e.target.value)})} />
            <Input label="Max Participants" id="maxParticipants" type="number" value={currentContest.maxParticipants} onChange={e => setCurrentContest({...currentContest, maxParticipants: Number(e.target.value)})} />
            <Input label="Time Per Question (s)" id="timePerQuestion" type="number" value={currentContest.timePerQuestion} onChange={e => setCurrentContest({...currentContest, timePerQuestion: Number(e.target.value)})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <label htmlFor="regStartDate" className="block text-slate-300 text-sm font-semibold mb-1">Registration Start</label>
                  <div className="flex gap-2">
                      <input id="regStartDate" type="date" value={toDateInputString(currentContest.registrationStartDate)} onChange={e => handleDateTimeChange('registrationStartDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                      <input id="regStartTime" type="time" value={toTimeInputString(currentContest.registrationStartDate)} onChange={e => handleDateTimeChange('registrationStartDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                  </div>
              </div>
              <div>
                  <label htmlFor="regEndDate" className="block text-slate-300 text-sm font-semibold mb-1">Registration End</label>
                  <div className="flex gap-2">
                      <input id="regEndDate" type="date" value={toDateInputString(currentContest.registrationEndDate)} onChange={e => handleDateTimeChange('registrationEndDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                      <input id="regEndTime" type="time" value={toTimeInputString(currentContest.registrationEndDate)} onChange={e => handleDateTimeChange('registrationEndDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                  </div>
              </div>
              <div>
                  <label htmlFor="contestStartDate" className="block text-slate-300 text-sm font-semibold mb-1">Contest Start</label>
                  <div className="flex gap-2">
                      <input id="contestStartDate" type="date" value={toDateInputString(currentContest.contestStartDate)} onChange={e => handleDateTimeChange('contestStartDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                      <input id="contestStartTime" type="time" value={toTimeInputString(currentContest.contestStartDate)} onChange={e => handleDateTimeChange('contestStartDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"/>
                  </div>
              </div>
          </div>
          <Textarea label="Rules & Regulations" id="rules" value={currentContest.rules} onChange={e => setCurrentContest({...currentContest, rules: e.target.value})} rows={4} />
          <div className="border-t border-slate-700 pt-4">
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Contest Questions</h3>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                  <p className="text-sm text-slate-400 mb-2">You can auto-generate questions using AI or provide them manually.</p>
                  <button onClick={handleGenerateQuestions} disabled={isGenerating} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-wait">
                      {isGenerating ? 'Generating...' : 'Generate 15 Questions with AI'}
                  </button>
                  <Textarea label="Manual Questions (JSON format)" id="manualQuestions" value={manualQuestionsJson} onChange={e => setManualQuestionsJson(e.target.value)} rows={10} />
              </div>
          </div>
      </div>
  );

  const renderVerifyQuestions = () => (
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {generatedQuestions.map((q, qIndex) => (
              <div key={qIndex} className="bg-slate-800/50 p-4 rounded-lg">
                  <Textarea id={`question-${qIndex}`} label={`Question ${qIndex + 1}`} value={q.question} onChange={e => {
                      const updated = [...generatedQuestions];
                      updated[qIndex].question = e.target.value;
                      setGeneratedQuestions(updated);
                  }} rows={2} />
                  <div className="grid grid-cols-2 gap-4 mt-2">
                      {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                              <input type="radio" name={`q${qIndex}_answer`} id={`q${qIndex}o${oIndex}`} checked={opt === q.answer} onChange={() => {
                                  const updated = [...generatedQuestions];
                                  updated[qIndex].answer = opt;
                                  setGeneratedQuestions(updated);
                              }} className="form-radio h-4 w-4 text-amber-500 bg-slate-700 border-slate-500 focus:ring-amber-400" />
                              <input type="text" value={opt} onChange={e => {
                                  const updated = [...generatedQuestions];
                                  updated[qIndex].options[oIndex] = e.target.value;
                                  setGeneratedQuestions(updated);
                              }} className="w-full bg-slate-900 border border-slate-600 rounded py-1 px-2 text-white" />
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>
  );

  return (
    <div className="flex flex-col h-full text-white p-4 sm:p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg relative">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
         <h1 className="text-3xl font-bold text-amber-400">Admin Control Panel</h1>
         {view !== 'main' && <button onClick={() => setView('main')} className="bg-slate-600 font-bold py-2 px-4 rounded-lg">&larr; Back to Main</button>}
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-4 flex-shrink-0" role="alert">
          <p><strong className="font-bold">Error: </strong>{error}</p>
          <button onClick={() => setError(null)} className="absolute top-1 right-2 text-2xl">&times;</button>
        </div>
      )}
      
      {view === 'main' && renderMainView()}
      {view === 'edit_contest' && renderContestForm()}
      {view === 'verify_questions' && renderVerifyQuestions()}

      <div className="flex justify-end gap-4 mt-6 flex-shrink-0">
        {view === 'main' && activeTab === 'settings' && <>
            <button onClick={onCancel} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500 transition-colors duration-300">Close Panel</button>
            <button onClick={handleSaveSettings} className="bg-amber-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-amber-400 transition-colors duration-300">Save Global Settings</button>
        </>}
        {view === 'main' && activeTab !== 'settings' && <button onClick={onCancel} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500 transition-colors duration-300">Close Panel</button>}
        {view === 'edit_contest' && <>
            <button onClick={() => setView('main')} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500">Cancel</button>
            <button onClick={handleSaveContest} className="bg-amber-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-amber-400">Save Contest</button>
        </>}
        {view === 'verify_questions' && <>
            <button onClick={() => setView('edit_contest')} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500">Back to Edit</button>
            <button onClick={handlePublishVerifiedContest} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-500">Save & Publish Contest</button>
        </>}
      </div>

      {walletModal && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm">
                  <h3 className="text-xl font-bold mb-4">Adjust Wallet for <span className="text-amber-300">{walletModal.user.name}</span></h3>
                  <Input label="Amount (use negative for deduction)" id="adjustAmount" type="number" placeholder="e.g., 100 or -50" value={walletModal.amount} onChange={e => setWalletModal({...walletModal, amount: e.target.value})} />
                  <div className="mt-4">
                      <Textarea label="Reason for Adjustment" id="adjustReason" value={walletModal.reason} onChange={e => setWalletModal({...walletModal, reason: e.target.value})} rows={3} />
                  </div>
                   <div className="flex justify-end gap-4 mt-6">
                      <button onClick={() => setWalletModal(null)} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                      <button onClick={handleAdjustWalletSubmit} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Apply Adjustment</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminScreen;
