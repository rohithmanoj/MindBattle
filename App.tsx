

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
  const [debugInfo, setDebugInfo] = useState<string[] | null>(null);

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
        const errorMessage = e instanceof Error ? e.message : "Could not load application data. Please refresh the page.";
        setError(errorMessage);
        
        // Fetch diagnostic info on failure
        const diagnostics = await api.fetchDiagnostics();
        setDebugInfo(diagnostics);

      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Auto-update contest statuses based on time
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // This function reads from localStorage, updates statuses, and writes back.
        // initializeData populates localStorage from the backend on load.
        const { changed, updatedContests } = await api.updateContestStatuses();
        if (changed) {
          // If statuses changed, update the app state to re-render.
          setContests(updatedContests);
        }
      } catch (e) {
        console.error("Failed to update contest statuses", e);
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
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
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full text-white text-xl">
          Loading MindBattle...
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-white bg-slate-800/50 p-8 rounded-lg">
            <h2 className="text-3xl font-bold text-red-400 mb-4">Application Error</h2>
            <p className="text-slate-300 mb-6 text-center max-w-xl">We encountered a problem loading critical application data. This is often due to a temporary issue connecting to the backend service.</p>
            <div className="w-full max-w-2xl bg-slate-900/70 p-6 rounded-lg border border-slate-700">
                <h3 className="font-bold text-amber-400 mb-2">Error Message:</h3>
                <pre className="bg-slate-800 p-3 rounded-md text-red-300 font-roboto-mono text-sm whitespace-pre-wrap mb-4">{error}</pre>
                
                <h3 className="font-bold text-amber-400 mb-2">Backend Diagnostic Log:</h3>
                <div className="bg-slate-800 p-3 rounded-md font-roboto-mono text-sm text-slate-400 max-h-48 overflow-y-auto">
                    {debugInfo ? (
                        debugInfo.length > 0 ? (
                            <ul>
                                {debugInfo.map((log, index) => <li key={index}>{log}</li>)}
                            </ul>
                        ) : (
                            <p className="text-yellow-400">The backend's request log is empty.</p>
                        )
                    ) : (
                        <p className="animate-pulse">Fetching debug info...</p>
                    )}
                </div>
                 <div className="text-xs text-slate-500 mt-3">
                    <p className="font-bold">How to read this log:</p>
                    <p>&bull; This log shows the last few requests the backend server received.</p>
                    <p>&bull; If this log is <span className="text-yellow-500">empty</span>, it means your browser's request didn't reach our server. This could be a network or proxy configuration issue.</p>
                    <p>&bull; You should see a request like <span className="text-green-500">GET /api/contests</span>. If you see other paths but not this one, the proxy path might be incorrect.</p>
                </div>
            </div>
            <button onClick={() => window.location.reload()} className="mt-8 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 transition-colors">
                Retry Connection
            </button>
        </div>
      );
    }

    if (!gameSettings) {
      return (
        <div className="flex items-center justify-center h-full text-white text-xl">
          Initializing settings...
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
            timePerQuestion={activeContest.timePerQuestion || gameSettings.timePerQuestion} 
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