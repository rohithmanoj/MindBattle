
import React, { useState, useCallback, useEffect } from 'react';
import { AppView, QuizQuestion, GameSettings, Contest, User, StoredUser, Transaction, TransactionType } from './types';
import { generateQuiz } from './services/geminiService';
import HomeScreen from './components/HomeScreen';
import QuizScreen from './components/QuizScreen';
import EndScreen from './components/EndScreen';
import AdminScreen from './components/AdminScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import WalletScreen from './components/WalletScreen';
import PaymentGatewayScreen from './components/PaymentGatewayScreen';
import AdminLoginScreen from './components/AdminLoginScreen';
import WaitingRoomScreen from './components/WaitingRoomScreen';
import { DEFAULT_CATEGORIES, DEFAULT_PRIZE_AMOUNTS, DEFAULT_PAYMENT_GATEWAY_SETTINGS, ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_TIME_PER_QUESTION } from './constants';
import { MOCK_CONTESTS } from './data';


const App: React.FC = () => {
  const [appView, setAppView] = useState<AppView>('home');
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [depositInProgress, setDepositInProgress] = useState<{ amount: number } | null>(null);
  
  const [contests, setContests] = useState<Contest[]>(MOCK_CONTESTS);

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    prizeAmounts: DEFAULT_PRIZE_AMOUNTS,
    categories: DEFAULT_CATEGORIES,
    paymentGatewaySettings: DEFAULT_PAYMENT_GATEWAY_SETTINGS,
    timePerQuestion: DEFAULT_TIME_PER_QUESTION,
  });

  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('mindbattle_users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      }
       const storedSettings = localStorage.getItem('mindbattle_settings');
      if (storedSettings) {
        setGameSettings(JSON.parse(storedSettings));
      }
      const storedContests = localStorage.getItem('mindbattle_contests');
      if (storedContests) {
          setContests(JSON.parse(storedContests));
      } else {
          setContests(MOCK_CONTESTS); // Initialize with mock data if nothing is stored
      }
    } catch (e) {
      console.error("Failed to parse data from localStorage", e);
    }
  }, []);

  const addTransaction = useCallback((userId: string, type: TransactionType, amount: number, description: string, status: 'completed' | 'pending' = 'completed') => {
      const updatedUsers = users.map(u => {
        if (u.email === userId) {
          const newTransaction: Transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type,
            amount: ['withdrawal', 'entry_fee', 'pending_withdrawal'].includes(type) ? -Math.abs(amount) : amount,
            description,
            timestamp: Date.now(),
            status,
          };
          
          let newBalance = u.walletBalance;
          if (type === 'admin_adjustment') {
              newBalance += amount; // for adjustment, amount can be +/-
          } else {
              newBalance += newTransaction.amount;
          }

          return {
            ...u,
            walletBalance: newBalance,
            transactions: [newTransaction, ...(u.transactions || [])],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));

      if (currentUser && currentUser.email === userId) {
        const updatedUser = updatedUsers.find(u => u.email === userId);
        if(updatedUser) {
            setCurrentUser(updatedUser);
        }
      }
  }, [users, currentUser]);

  const handleRegisterForContest = useCallback(async (contest: Contest) => {
    if (!currentUser) {
        setAppView('login');
        return;
    }
    const user = users.find(u => u.email === currentUser.email);
    if (user?.banned) {
        setError('Your account has been suspended. You cannot register for contests.');
        return;
    }

    const now = Date.now();
    if (now < contest.registrationStartDate || now > contest.registrationEndDate) {
        setError('Registration for this contest is not currently open.');
        return;
    }
    if (now >= contest.contestStartDate) {
        setError('This contest has already started.');
        return;
    }
    if (contest.participants.length >= contest.maxParticipants) {
        setError('This contest has reached its maximum number of participants.');
        return;
    }
    if (currentUser.walletBalance < contest.entryFee) {
        setError(`Insufficient funds. You need $${contest.entryFee} to enter.`);
        return;
    }
    
    // Deduct entry fee and add user to participants list
    if (contest.entryFee > 0) {
        addTransaction(currentUser.email, 'entry_fee', contest.entryFee, `Entry for ${contest.title}`);
    }
    const updatedContests = contests.map(c => 
        c.id === contest.id ? { ...c, participants: [...c.participants, currentUser.email] } : c
    );
    setContests(updatedContests);
    localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
    
    // After registration, user stays on home screen. The contest card will update to show "Enter Contest".
  }, [currentUser, addTransaction, contests, users]);
  
  const handleEnterContest = useCallback((contest: Contest) => {
    // Ensure questions are ready before entering
    if (!contest.questions || contest.questions.length === 0) {
        setError('Contest questions are not ready yet. Please check back later.');
        return;
    }
    setActiveContest(contest);
    setAppView('waiting_room');
  }, []);

  const handleEndGame = useCallback((score: number) => {
    setFinalScore(score);
    if (currentUser && score > 0 && !isAdmin) {
      addTransaction(currentUser.email, 'win', score, 'Prize money from contest');
    }
    setAppView('end');
  }, [currentUser, addTransaction, isAdmin]);

  const handleRestart = useCallback(() => {
    setActiveContest(null);
    setFinalScore(0);
    setAppView('home');
  }, []);

  const handleGoToAdmin = useCallback(() => {
    if(isAdmin) {
        setAppView('admin');
    }
  }, [isAdmin]);
  
  const handleLogin = (email: string, password: string): { success: boolean, message: string } => {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return { success: false, message: 'Invalid email or password.' };
    }
    if (user.banned) {
        return { success: false, message: 'Your account has been suspended by an administrator.' };
    }
    setCurrentUser({ name: user.name, email: user.email, walletBalance: user.walletBalance, transactions: user.transactions || [] });
    setIsAdmin(false);
    setAppView('home');
    return { success: true, message: 'Login successful' };
  };

  const handleAdminLogin = (email: string, password: string): boolean => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          setCurrentUser({ name: 'Admin', email: ADMIN_EMAIL, walletBalance: 0, transactions: [] });
          setIsAdmin(true);
          setAppView('home');
          return true;
      }
      return false;
  }

  const handleRegister = (name: string, email: string, password: string): { success: boolean, message: string } => {
    if (users.some(u => u.email === email)) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const newUser: StoredUser = { 
        name, 
        email, 
        password, 
        walletBalance: 500, 
        banned: false,
        transactions: [{
            id: `txn_init_${Date.now()}`,
            type: 'deposit',
            amount: 500,
            description: 'Initial sign-up bonus',
            timestamp: Date.now(),
            status: 'completed',
        }] 
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
    setCurrentUser(newUser);
    setIsAdmin(false);
    setAppView('home');
    return { success: true, message: 'Registration successful!' };
  };

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setIsAdmin(false);
    setAppView('home');
  }, []);

  const handleAdminSaveSettings = useCallback((newSettings: GameSettings) => {
    setGameSettings(newSettings);
    localStorage.setItem('mindbattle_settings', JSON.stringify(newSettings));
  }, []);

  const handleCreateContest = useCallback((newContest: Contest) => {
      const updatedContests = [...contests, newContest];
      setContests(updatedContests);
      localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
  }, [contests]);

  const handleUpdateContest = useCallback((updatedContest: Contest) => {
      const updatedContests = contests.map(c => c.id === updatedContest.id ? updatedContest : c);
      setContests(updatedContests);
      localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
  }, [contests]);

  const handleDeleteContest = useCallback((contestId: string) => {
      const updatedContests = contests.filter(c => c.id !== contestId);
      setContests(updatedContests);
      localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
  }, [contests]);

  const handleAdminUpdateUser = useCallback((userId: string, updates: Partial<Pick<StoredUser, 'banned'>>) => {
      const updatedUsers = users.map(u => u.email === userId ? { ...u, ...updates } : u);
      setUsers(updatedUsers);
      localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
  }, [users]);
  
  const handleCancelContest = useCallback((contestId: string) => {
      const contestToCancel = contests.find(c => c.id === contestId);
      if (!contestToCancel) return;

      // Refund all participants
      contestToCancel.participants.forEach(participantEmail => {
          if (contestToCancel.entryFee > 0) {
              addTransaction(participantEmail, 'refund', contestToCancel.entryFee, `Refund for cancelled contest: ${contestToCancel.title}`);
          }
      });
      
      // Update contest status
      // FIX: Explicitly type updatedContests as Contest[] to prevent TypeScript from widening the status property to a generic string.
      const updatedContests: Contest[] = contests.map(c => 
          c.id === contestId ? { ...c, status: 'Cancelled', participants: [] } : c
      );
      setContests(updatedContests);
      localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
  }, [contests, addTransaction]);
  
  const handleGoToWallet = useCallback(() => {
    setAppView('wallet');
  }, []);

  const handleStartDeposit = useCallback((amount: number) => {
    if (currentUser) {
      setDepositInProgress({ amount });
      setAppView('payment');
    }
  }, [currentUser]);
  
  const handlePaymentSuccess = useCallback(() => {
    if (currentUser && depositInProgress) {
      addTransaction(currentUser.email, 'deposit', depositInProgress.amount, 'User deposit via gateway');
      setDepositInProgress(null);
      setAppView('wallet');
    }
  }, [currentUser, depositInProgress, addTransaction]);

  const handlePaymentCancel = useCallback(() => {
    setDepositInProgress(null);
    setAppView('wallet');
  }, []);

  const handleWithdraw = useCallback((amount: number) => {
    if(currentUser) {
        addTransaction(currentUser.email, 'pending_withdrawal', amount, 'Withdrawal request', 'pending');
    }
  }, [currentUser, addTransaction]);

  const handleUpdateWithdrawal = useCallback((userId: string, transactionId: string, action: 'approve' | 'decline') => {
    const updatedUsers = users.map(u => {
      if (u.email === userId) {
        let userToUpdate = { ...u, transactions: [...u.transactions] };
        const txIndex = userToUpdate.transactions.findIndex(tx => tx.id === transactionId);
        
        if (txIndex !== -1) {
          const originalTx = userToUpdate.transactions[txIndex];
          if (action === 'approve') {
            userToUpdate.transactions[txIndex] = { ...originalTx, type: 'withdrawal', status: 'completed', description: 'Withdrawal approved' };
          } else { // decline
            userToUpdate.transactions[txIndex] = { ...originalTx, type: 'withdrawal_declined', status: 'declined', description: 'Withdrawal declined' };
            // Refund the user
            const refundTx: Transaction = {
              id: `txn_refund_${Date.now()}`,
              type: 'deposit',
              amount: Math.abs(originalTx.amount),
              description: 'Refund for declined withdrawal',
              timestamp: Date.now(),
              status: 'completed',
            };
            userToUpdate.transactions.unshift(refundTx);
            userToUpdate.walletBalance += refundTx.amount;
          }
        }
        return userToUpdate;
      }
      return u;
    });

    setUsers(updatedUsers);
    localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));

    if (currentUser && currentUser.email === userId) {
      const updatedUser = updatedUsers.find(u => u.email === userId);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    }
  }, [users, currentUser]);


  const renderContent = () => {
    switch (appView) {
      case 'home':
        return <HomeScreen 
          contests={contests}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onRegister={handleRegisterForContest}
          onEnterContest={handleEnterContest}
          onLoginRequest={() => setAppView('login')}
          onLogout={handleLogout}
          onGoToAdmin={handleGoToAdmin}
          onGoToWallet={handleGoToWallet}
          error={error}
          clearError={() => setError(null)}
        />;
      case 'login':
        return <LoginScreen onLogin={handleLogin} onCancel={() => setAppView('home')} onNavigateToRegister={() => setAppView('register')} onNavigateToAdminLogin={() => setAppView('admin-login')} />;
      case 'admin-login':
        return <AdminLoginScreen onAdminLogin={handleAdminLogin} onCancel={() => setAppView('home')} onNavigateToUserLogin={() => setAppView('login')} />
      case 'register':
        return <RegisterScreen onRegister={handleRegister} onCancel={() => setAppView('home')} onNavigateToLogin={() => setAppView('login')} />;
      case 'waiting_room':
        return <WaitingRoomScreen contest={activeContest!} onContestStart={() => setAppView('playing')} onBack={handleRestart} />;
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl">Joining contest...</p>
            <p className="text-sm text-gray-400">The AI is crafting your questions!</p>
          </div>
        );
      case 'playing':
        return activeContest ? <QuizScreen questions={activeContest.questions} onEndGame={handleEndGame} prizeAmounts={gameSettings.prizeAmounts} timePerQuestion={activeContest.timePerQuestion} /> : <div className="text-white text-center">Error: No active contest found.</div>;
      case 'end':
        return <EndScreen score={finalScore} onRestart={handleRestart} totalQuestions={activeContest?.questions.length || 15} prizeAmounts={gameSettings.prizeAmounts} />;
      case 'admin':
        return isAdmin ? <AdminScreen 
            initialSettings={gameSettings} 
            onSaveSettings={handleAdminSaveSettings}
            onCancel={() => setAppView('home')} 
            users={users} 
            onUpdateWithdrawal={handleUpdateWithdrawal}
            contests={contests}
            onCreateContest={handleCreateContest}
            onUpdateContest={handleUpdateContest}
            onDeleteContest={handleDeleteContest}
            onAdminUpdateUser={handleAdminUpdateUser}
            onCancelContest={handleCancelContest}
            onAdjustWallet={addTransaction}
         /> : <HomeScreen contests={contests} currentUser={currentUser} isAdmin={isAdmin} onRegister={handleRegisterForContest} onEnterContest={handleEnterContest} onLoginRequest={() => setAppView('login')} onLogout={handleLogout} onGoToAdmin={handleGoToAdmin} onGoToWallet={handleGoToWallet} error={error} clearError={() => setError(null)} />;
      case 'wallet':
        return <WalletScreen currentUser={currentUser!} onStartDeposit={handleStartDeposit} onWithdraw={handleWithdraw} onBack={handleRestart} />
      case 'payment':
        return <PaymentGatewayScreen amount={depositInProgress?.amount || 0} onSuccess={handlePaymentSuccess} onCancel={handlePaymentCancel} />;
      default:
        return <HomeScreen 
          contests={contests}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onRegister={handleRegisterForContest}
          onEnterContest={handleEnterContest}
          onLoginRequest={() => setAppView('login')}
          onLogout={handleLogout}
          onGoToAdmin={handleGoToAdmin}
          onGoToWallet={handleGoToWallet}
          error={error}
          clearError={() => setError(null)}
        />;
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-indigo-900">
        <main className="w-full max-w-7xl mx-auto h-[90vh] max-h-[900px]">
            {renderContent()}
        </main>
    </div>
  );
};

export default App;
