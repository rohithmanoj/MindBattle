

import React, { useState, useCallback, useEffect } from 'react';
import { AppView, QuizQuestion, GameSettings, Contest, User, StoredUser, Transaction, TransactionType, AdminRole, GameResults, ContestResult, WalletAction, AuditLog, AuditLogAction } from './types';
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
import FastestFingerQuizScreen from './components/FastestFingerQuizScreen';
import CreateContestScreen from './components/CreateContestScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import * as api from './services/apiService';


const App: React.FC = () => {
  const [appView, setAppView] = useState<AppView>('home');
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [viewingLeaderboardContest, setViewingLeaderboardContest] = useState<Contest | null>(null);
  
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [depositInProgress, setDepositInProgress] = useState<{ amount: number } | null>(null);
  
  const [contests, setContests] = useState<Contest[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { users, contests, settings, auditLog } = await api.initializeData();
        setUsers(users);
        setContests(contests);
        setGameSettings(settings);
        setAuditLog(auditLog);
      } catch (e) {
        console.error("Failed to initialize app data", e);
        setError("Could not load application data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Auto-update contest statuses based on time
  useEffect(() => {
    const statusUpdateInterval = setInterval(async () => {
        const { changed, updatedContests } = await api.updateContestStatuses();
        if (changed) {
            setContests(updatedContests);
        }
    }, 5000); // Check every 5 seconds for better responsiveness in a demo environment

    return () => clearInterval(statusUpdateInterval);
  }, []);

  useEffect(() => {
    if (currentUser?.email) {
        const freshUserData = users.find(u => u.email === currentUser.email);
        if (freshUserData && JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
            setCurrentUser(freshUserData);
        }
    }
  }, [users, currentUser]);


  const handleAdminAdjustWalletAI = useCallback(async (userId: string, amount: number, reasonKeywords: string, adminId: string) => {
      if (!currentUser) return;
      const { updatedUsers, newLog } = await api.adjustWalletWithAI(userId, amount, reasonKeywords, adminId);
      setUsers(updatedUsers);
      setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleAdminUpdateWithdrawal = useCallback(async (userId: string, transactionId: string, action: 'approve' | 'decline', adminId: string) => {
    if (!currentUser) return;
    const { updatedUsers, newLog } = await api.updateWithdrawalStatus(userId, transactionId, action, adminId);
    setUsers(updatedUsers);
    setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);


  const handleRegisterForContest = useCallback(async (contest: Contest) => {
    if (!currentUser) {
        setAppView('login');
        return;
    }
    try {
        const { updatedContests, updatedUsers } = await api.registerForContest(contest.id, currentUser.email);
        setContests(updatedContests);
        setUsers(updatedUsers);
    } catch(e) {
        if (e instanceof Error) setError(e.message);
    }
    
  }, [currentUser]);
  
  const handleEnterContest = useCallback((contest: Contest) => {
    if (!contest.questions || contest.questions.length === 0) {
        setError('Contest questions are not ready yet. Please check back later.');
        return;
    }
    setActiveContest(contest);
    setAppView('waiting_room');
  }, []);

  const handleEndGame = useCallback(async (results: GameResults) => {
      setGameResults(results);
      if (activeContest && currentUser && !isAdmin) {
          const { updatedContests, updatedUsers } = await api.endGameAndUpdateStats(activeContest.id, currentUser.email, results);
          setContests(updatedContests);
          setUsers(updatedUsers);
      }
      setAppView('end');
  }, [activeContest, currentUser, isAdmin]);


  const handleRestart = useCallback(() => {
    setActiveContest(null);
    setGameResults(null);
    setViewingLeaderboardContest(null);
    setAppView('home');
  }, []);

  const handleGoToAdmin = useCallback(() => {
    if(isAdmin) {
        setAppView('admin');
    }
  }, [isAdmin]);
  
  const handleViewLeaderboard = useCallback((contest: Contest) => {
    setViewingLeaderboardContest(contest);
    setAppView('leaderboard');
  }, []);

  const handleLogin = async (email: string, password: string): Promise<{ success: boolean, message: string }> => {
    try {
        const { user } = await api.login(email, password);
        setCurrentUser(user);
        setIsAdmin(!!user.role);
        setAppView('home');
        return { success: true, message: 'Login successful' };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'An unknown error occurred.' };
    }
  };

  const handleAdminLogin = async (email: string, password: string): Promise<boolean> => {
      try {
        const { user } = await api.adminLogin(email, password);
        setCurrentUser(user);
        setIsAdmin(true);
        setAppView('home');
        return true;
      } catch {
        return false;
      }
  }

  const handleRegister = async (name: string, email: string, password: string): Promise<{ success: boolean, message: string }> => {
    try {
      const { newUser, updatedUsers } = await api.register(name, email, password);
      setUsers(updatedUsers);
      setCurrentUser(newUser);
      setIsAdmin(false);
      setAppView('home');
      return { success: true, message: 'Registration successful!' };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'An unknown error occurred.' };
    }
  };

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setIsAdmin(false);
    setAppView('home');
  }, []);

  const handleAdminSaveSettings = useCallback(async (newSettings: GameSettings) => {
    if(!currentUser) return;
    const { updatedSettings, newLog } = await api.saveSettings(newSettings, currentUser);
    setGameSettings(updatedSettings);
    setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleCreateContest = useCallback(async (newContestData: Omit<Contest, 'id' | 'participants'>) => {
      if(!currentUser) return;
      const { updatedContests, newLog } = await api.createContest(newContestData, currentUser);
      setContests(updatedContests);
      if(newLog) setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleUpdateContest = useCallback(async (updatedContest: Contest) => {
      if(!currentUser) return;
      const { updatedContests, newLog } = await api.updateContest(updatedContest, currentUser);
      setContests(updatedContests);
      if(newLog) setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleDeleteContest = useCallback(async (contestId: string) => {
      if(!currentUser) return;
      const { updatedContests, newLog } = await api.deleteContest(contestId, currentUser);
      setContests(updatedContests);
      setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);

  const handleAdminUpdateUser = useCallback(async (userId: string, updates: Partial<Pick<StoredUser, 'banned'>>) => {
      if(!currentUser) return;
      const { updatedUsers, newLog } = await api.updateUser(userId, updates, currentUser);
      setUsers(updatedUsers);
      setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);
  
  const handleUpdateUserRole = useCallback(async (userId: string, role: AdminRole | 'None') => {
      if(!currentUser) return;
      const { updatedUsers, newLog } = await api.updateUserRole(userId, role, currentUser);
      setUsers(updatedUsers);
      setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);
  
  const handleCancelContest = useCallback(async (contestId: string) => {
      if(!currentUser) return;
      const { updatedContests, updatedUsers, newLog } = await api.cancelContest(contestId, currentUser);
      setContests(updatedContests);
      setUsers(updatedUsers);
      setAuditLog(prev => [newLog, ...prev]);
  }, [currentUser]);
  
  const handleGoToWallet = useCallback(() => {
    setAppView('wallet');
  }, []);

  const handleStartDeposit = useCallback((amount: number) => {
    if (currentUser) {
      setDepositInProgress({ amount });
      setAppView('payment');
    }
  }, [currentUser]);
  
  const handlePaymentSuccess = useCallback(async () => {
    if (currentUser && depositInProgress) {
      const { updatedUsers } = await api.depositFunds(currentUser.email, depositInProgress.amount);
      setUsers(updatedUsers);
      setDepositInProgress(null);
      setAppView('wallet');
    }
  }, [currentUser, depositInProgress]);

  const handlePaymentCancel = useCallback(() => {
    setDepositInProgress(null);
    setAppView('wallet');
  }, []);

  const handleWithdraw = useCallback(async (amount: number) => {
    if(currentUser) {
        const { updatedUsers } = await api.requestWithdrawal(currentUser.email, amount);
        setUsers(updatedUsers);
    }
  }, [currentUser]);

  const handleAdminCreateAdmin = useCallback(async (name: string, email: string, password: string, role: AdminRole): Promise<{ success: boolean, message: string }> => {
      if(!currentUser) return { success: false, message: "Not authorized" };
      try {
        const { updatedUsers, newLog } = await api.createAdmin(name, email, password, role, currentUser);
        setUsers(updatedUsers);
        setAuditLog(prev => [newLog, ...prev]);
        return { success: true, message: 'Admin created successfully!' };
      } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'Failed to create admin.' };
      }
  }, [currentUser]);

  const renderContent = () => {
    if (loading || !gameSettings) {
      return (
        <div className="flex items-center justify-center h-full text-white text-xl">
          Loading MindBattle...
        </div>
      );
    }
    
    switch (appView) {
      case 'home':
        return <HomeScreen 
          contests={contests} currentUser={currentUser} isAdmin={isAdmin}
          onRegister={handleRegisterForContest} onEnterContest={handleEnterContest}
          onLoginRequest={() => setAppView('login')} onLogout={handleLogout}
          onGoToAdmin={handleGoToAdmin} onGoToWallet={handleGoToWallet}
          onNavigateToCreateContest={() => setAppView('create_contest')}
          error={error} clearError={() => setError(null)} categories={gameSettings.categories}
          onViewLeaderboard={handleViewLeaderboard}
        />;
      case 'login':
        return <LoginScreen onLogin={handleLogin} onCancel={() => setAppView('home')} onNavigateToRegister={() => setAppView('register')} onNavigateToAdminLogin={() => setAppView('admin-login')} />;
      case 'admin-login':
        return <AdminLoginScreen onAdminLogin={handleAdminLogin} onCancel={() => setAppView('home')} onNavigateToUserLogin={() => setAppView('login')} />
      case 'register':
        return <RegisterScreen onRegister={handleRegister} onCancel={() => setAppView('home')} onNavigateToLogin={() => setAppView('login')} />;
      case 'create_contest':
        return currentUser ? <CreateContestScreen 
          currentUser={currentUser} 
          initialSettings={gameSettings}
          onCreateContest={(contestData) => {
            handleCreateContest(contestData);
            setAppView('home');
          }}
          onCancel={() => setAppView('home')}
        /> : <LoginScreen onLogin={handleLogin} onCancel={() => setAppView('home')} onNavigateToRegister={() => setAppView('register')} onNavigateToAdminLogin={() => setAppView('admin-login')} />;
      case 'waiting_room':
        return <WaitingRoomScreen contest={activeContest!} onContestStart={() => setAppView('playing')} onBack={handleRestart} />;
      case 'playing':
        if (!activeContest || !currentUser) return <div className="text-white text-center">Error: No active contest or user found.</div>;
        if (activeContest.format === 'FastestFinger') {
            return <FastestFingerQuizScreen 
                contest={activeContest}
                currentUser={currentUser}
                onEndGame={handleEndGame}
            />
        }
        return <QuizScreen 
            questions={activeContest.questions} 
            onEndGame={handleEndGame} 
            prizeAmounts={gameSettings.prizeAmounts} 
            timePerQuestion={activeContest.timePerQuestion} 
        />;
      case 'admin':
        return isAdmin ? <AdminScreen 
            initialSettings={gameSettings} currentUser={currentUser!}
            onSaveSettings={handleAdminSaveSettings} onCancel={() => setAppView('home')} 
            users={users} onUpdateWithdrawal={handleAdminUpdateWithdrawal}
            contests={contests} onCreateContest={handleCreateContest} onUpdateContest={handleUpdateContest}
            onDeleteContest={handleDeleteContest} onAdminUpdateUser={handleAdminUpdateUser}
            onUpdateUserRole={handleUpdateUserRole} onCancelContest={handleCancelContest} onAdjustWallet={handleAdminAdjustWalletAI}
            onAdminCreateAdmin={handleAdminCreateAdmin} auditLog={auditLog}
         /> : <HomeScreen contests={contests} currentUser={currentUser} isAdmin={isAdmin} onRegister={handleRegisterForContest} onEnterContest={handleEnterContest} onLoginRequest={() => setAppView('login')} onLogout={handleLogout} onGoToAdmin={handleGoToAdmin} onGoToWallet={handleGoToWallet} onNavigateToCreateContest={() => setAppView('create_contest')} error={error} clearError={() => setError(null)} categories={gameSettings.categories} onViewLeaderboard={handleViewLeaderboard} />;
      case 'wallet':
        return <WalletScreen currentUser={currentUser!} onStartDeposit={handleStartDeposit} onWithdraw={handleWithdraw} onBack={handleRestart} />
      case 'payment':
        return <PaymentGatewayScreen amount={depositInProgress?.amount || 0} onSuccess={handlePaymentSuccess} onCancel={handlePaymentCancel} />;
      case 'leaderboard':
        return <LeaderboardScreen contest={viewingLeaderboardContest!} currentUser={currentUser} onBack={handleRestart} />;
      case 'end':
        return <EndScreen results={gameResults!} onRestart={handleRestart} totalQuestions={activeContest?.numberOfQuestions ?? gameSettings.prizeAmounts.length} prizeAmounts={gameSettings.prizeAmounts} />;
      default:
        return <HomeScreen 
          contests={contests} currentUser={currentUser} isAdmin={isAdmin}
          onRegister={handleRegisterForContest} onEnterContest={handleEnterContest}
          onLoginRequest={() => setAppView('login')} onLogout={handleLogout}
          onGoToAdmin={handleGoToAdmin} onGoToWallet={handleGoToWallet}
          onNavigateToCreateContest={() => setAppView('create_contest')}
          error={error} clearError={() => setError(null)} categories={gameSettings.categories}
          onViewLeaderboard={handleViewLeaderboard}
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