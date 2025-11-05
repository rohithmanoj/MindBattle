import React, { useState, useCallback, useEffect } from 'react';
import { AppView, QuizQuestion, GameSettings, Contest, User, StoredUser, Transaction, TransactionType, AdminRole, GameResults, ContestResult } from './types';
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
import { DEFAULT_CATEGORIES, DEFAULT_PRIZE_AMOUNTS, DEFAULT_PAYMENT_GATEWAY_SETTINGS, ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_TIME_PER_QUESTION } from './constants';
import { MOCK_CONTESTS } from './data';


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
  
  const [contests, setContests] = useState<Contest[]>(MOCK_CONTESTS);

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    prizeAmounts: DEFAULT_PRIZE_AMOUNTS,
    categories: DEFAULT_CATEGORIES,
    paymentGatewaySettings: DEFAULT_PAYMENT_GATEWAY_SETTINGS,
    timePerQuestion: DEFAULT_TIME_PER_QUESTION,
  });

  useEffect(() => {
    try {
      // User data migration
      const storedUsers = localStorage.getItem('mindbattle_users');
      let loadedUsers = storedUsers ? JSON.parse(storedUsers) : [];
      let userMigrationNeeded = false;
      const migratedUsers = loadedUsers.map(u => {
          if (!u.registrationDate) {
              userMigrationNeeded = true;
              return { ...u, registrationDate: new Date('2024-01-01').getTime() };
          }
          return u;
      });
      const adminExists = migratedUsers.some(u => u.email === ADMIN_EMAIL);
      if (!adminExists) {
        userMigrationNeeded = true;
        migratedUsers.push({
            name: 'Super Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
            walletBalance: 0, transactions: [], banned: false, role: 'Super Admin',
            registrationDate: Date.now(),
        });
      }
      if (userMigrationNeeded) {
        localStorage.setItem('mindbattle_users', JSON.stringify(migratedUsers));
      }
      setUsers(migratedUsers);

      // Settings
      const storedSettings = localStorage.getItem('mindbattle_settings');
      if (storedSettings) setGameSettings(JSON.parse(storedSettings));

      // Contest data migration
      const storedContests = localStorage.getItem('mindbattle_contests');
      let loadedContests = storedContests ? JSON.parse(storedContests) : MOCK_CONTESTS;
      let contestMigrationNeeded = false;
      const migratedContests = loadedContests.map(c => {
          const newContest = {...c};
          let hasChanged = false;

          if (!newContest.format || !newContest.timerType) {
              newContest.format = 'KBC';
              newContest.timerType = 'per_question';
              hasChanged = true;
          }
          if ((newContest.status as string) === 'Pending') {
              newContest.status = 'Pending Approval';
              hasChanged = true;
          }
          if (typeof newContest.numberOfQuestions === 'undefined') {
              newContest.numberOfQuestions = 15;
              hasChanged = true;
          }

          if(hasChanged) {
            contestMigrationNeeded = true;
          }
          return newContest;
      });

      if (contestMigrationNeeded) {
          localStorage.setItem('mindbattle_contests', JSON.stringify(migratedContests));
      }
      setContests(migratedContests);

    } catch (e) {
      console.error("Failed to parse data from localStorage", e);
    }
  }, []);

  // Auto-update contest statuses based on time
  useEffect(() => {
    const statusUpdateInterval = setInterval(() => {
        const now = Date.now();
        let contestsHaveChanged = false;

        const updatedContests = contests.map(contest => {
            const mutableContest = { ...contest };
            let hasChanged = false;

            // Rule: Upcoming -> Live
            if (mutableContest.status === 'Upcoming' && now >= mutableContest.contestStartDate) {
                mutableContest.status = 'Live';
                hasChanged = true;
            }

            // Rule: Live -> Finished
            if (mutableContest.status === 'Live') {
                let isFinished = false;
                if (mutableContest.format === 'FastestFinger' && mutableContest.timerType === 'total_contest' && mutableContest.totalContestTime) {
                    const contestEndTime = mutableContest.contestStartDate + (mutableContest.totalContestTime * 1000);
                    if (now > contestEndTime) {
                        isFinished = true;
                    }
                } else {
                    // For KBC or other formats, use a generous buffer (e.g., 2 hours) after contest start time
                    const contestEndTime = mutableContest.contestStartDate + (2 * 60 * 60 * 1000);
                     if (now > contestEndTime) {
                        isFinished = true;
                    }
                }

                if (isFinished) {
                    mutableContest.status = 'Finished';
                    hasChanged = true;
                }
            }

            if (hasChanged) {
                contestsHaveChanged = true;
            }
            return mutableContest;
        });

        if (contestsHaveChanged) {
            setContests(updatedContests);
            localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
        }

    }, 5000); // Check every 5 seconds for better responsiveness in a demo environment

    return () => clearInterval(statusUpdateInterval);
  }, [contests]);

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
          // IMPORTANT: Only adjust balance for completed, non-pending transactions.
          if (type !== 'pending_withdrawal') {
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
  
  const handleAdminAdjustWallet = useCallback((userId: string, amount: number, reason: string) => {
    const adminId = currentUser?.email;
    if (!isAdmin || !adminId) return;

    let adjustedUser: StoredUser | null = null;
    const updatedUsers = users.map(u => {
        if (u.email === userId) {
            const newBalance = u.walletBalance + amount;
            const adjustmentTx: Transaction = {
                id: `txn_adj_${Date.now()}`,
                type: 'admin_adjustment',
                amount: amount,
                description: `Admin adjustment: ${reason}`,
                timestamp: Date.now(),
                status: 'completed',
                updatedBy: adminId,
            };
            adjustedUser = {
                ...u,
                walletBalance: newBalance,
                transactions: [adjustmentTx, ...(u.transactions || [])],
            };
            return adjustedUser;
        }
        return u;
    });
    setUsers(updatedUsers);
    localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));

    // If the adjusted user is the current user, update their state
    if (currentUser && currentUser.email === userId && adjustedUser) {
        setCurrentUser(adjustedUser);
    }
}, [users, currentUser, isAdmin]);

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
    
    if (contest.entryFee > 0) {
        addTransaction(currentUser.email, 'entry_fee', contest.entryFee, `Entry for ${contest.title}`);
    }
    const updatedContests = contests.map(c => 
        c.id === contest.id ? { ...c, participants: [...c.participants, currentUser.email] } : c
    );
    setContests(updatedContests);
    localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
    
  }, [currentUser, addTransaction, contests, users]);
  
  const handleEnterContest = useCallback((contest: Contest) => {
    if (!contest.questions || contest.questions.length === 0) {
        setError('Contest questions are not ready yet. Please check back later.');
        return;
    }
    setActiveContest(contest);
    setAppView('waiting_room');
  }, []);

  const handleEndGame = useCallback((results: GameResults) => {
      setGameResults(results);

      if (activeContest && currentUser && !isAdmin) {
          let newResult: ContestResult | null = null;

          if (results.format === 'KBC') {
              if (results.score > 0) {
                  addTransaction(currentUser.email, 'win', results.score, `Prize from ${activeContest.title}`);
              }
              newResult = {
                  userId: currentUser.email,
                  name: currentUser.name,
                  score: results.score,
              };
          } else if (results.format === 'FastestFinger') {
              const userResult = results.leaderboard.find(p => p.name === 'You');
              if (userResult) {
                  newResult = {
                      userId: currentUser.email,
                      name: currentUser.name,
                      score: userResult.score,
                      time: userResult.time,
                  };
              }
              // Note: Winnings for FastestFinger format would need a different mechanism, e.g., admin distribution based on final leaderboard.
          }
          
          if (newResult) {
              const updatedContests = contests.map(c => {
                  if (c.id === activeContest.id) {
                      const existingResults = c.results || [];
                      // Update or add the current user's result, preventing duplicates
                      const otherUserResults = existingResults.filter(r => r.userId !== currentUser.email);
                      return { ...c, results: [...otherUserResults, newResult!] };
                  }
                  return c;
              });
              setContests(updatedContests);
              localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
          }
      }
      
      setAppView('end');
  }, [activeContest, currentUser, addTransaction, isAdmin, contests]);

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

  const handleLogin = (email: string, password: string): { success: boolean, message: string } => {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return { success: false, message: 'Invalid email or password.' };
    }
    if (user.banned) {
        return { success: false, message: 'Your account has been suspended by an administrator.' };
    }
    setCurrentUser(user);
    setIsAdmin(!!user.role);
    setAppView('home');
    return { success: true, message: 'Login successful' };
  };

  const handleAdminLogin = (email: string, password: string): boolean => {
      const user = users.find(u => u.email === email && u.password === password);
      if (user && user.role) { 
          setCurrentUser(user);
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
        name, email, password, 
        walletBalance: 500, 
        banned: false,
        registrationDate: Date.now(),
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

  const handleCreateContest = useCallback((newContestData: Omit<Contest, 'id' | 'participants'>) => {
      const newContest: Contest = {
          ...newContestData,
          id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          participants: [],
      };
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
  
  const handleUpdateUserRole = useCallback((userId: string, role: AdminRole | 'None') => {
      const updatedUsers = users.map(u => {
          if (u.email === userId) {
              const updatedUser = { ...u };
              if (role === 'None') {
                  delete updatedUser.role;
              } else {
                  updatedUser.role = role;
              }
              return updatedUser;
          }
          return u;
      });
      setUsers(updatedUsers);
      localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
  }, [users]);
  
  const handleCancelContest = useCallback((contestId: string) => {
      const contestToCancel = contests.find(c => c.id === contestId);
      if (!contestToCancel) return;

      contestToCancel.participants.forEach(participantEmail => {
          if (contestToCancel.entryFee > 0) {
              addTransaction(participantEmail, 'refund', contestToCancel.entryFee, `Refund for cancelled contest: ${contestToCancel.title}`);
          }
      });
      
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
    const adminId = currentUser?.email;
    if (!isAdmin || !adminId) return;

    const userIndex = users.findIndex(u => u.email === userId);
    if (userIndex === -1) return;

    const userToUpdate = { ...users[userIndex] };
    userToUpdate.transactions = [...(userToUpdate.transactions || [])];
    const txIndex = userToUpdate.transactions.findIndex(tx => tx.id === transactionId && tx.status === 'pending');
    
    if (txIndex === -1) return;

    const originalTx = userToUpdate.transactions[txIndex];

    if (action === 'approve') {
        userToUpdate.transactions[txIndex] = { 
            ...originalTx, type: 'withdrawal', status: 'completed', 
            description: 'Withdrawal approved by admin', updatedBy: adminId,
        };
        // Deduct the balance upon approval
        userToUpdate.walletBalance += originalTx.amount;
    } else { // Decline
        userToUpdate.transactions[txIndex] = { 
            ...originalTx, type: 'withdrawal_declined', status: 'declined', 
            description: 'Withdrawal declined by admin', updatedBy: adminId,
        };
        // No balance change needed, as it was never deducted.
    }
    
    const updatedUsers = [...users];
    updatedUsers[userIndex] = userToUpdate;

    setUsers(updatedUsers);
    localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
  }, [users, currentUser, isAdmin]);

  const handleAdminCreateAdmin = useCallback((name: string, email: string, password: string, role: AdminRole): { success: boolean, message: string } => {
      if (users.some(u => u.email === email)) {
        return { success: false, message: 'An account with this email already exists.' };
      }
      const newAdmin: StoredUser = {
          name, email, password, role,
          walletBalance: 0,
          banned: false,
          registrationDate: Date.now(),
          transactions: []
      };
      const updatedUsers = [...users, newAdmin];
      setUsers(updatedUsers);
      localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
      return { success: true, message: 'Admin created successfully!' };
  }, [users]);


  const renderContent = () => {
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
            users={users} onUpdateWithdrawal={handleUpdateWithdrawal}
            contests={contests} onCreateContest={handleCreateContest} onUpdateContest={handleUpdateContest}
            onDeleteContest={handleDeleteContest} onAdminUpdateUser={handleAdminUpdateUser}
            onUpdateUserRole={handleUpdateUserRole} onCancelContest={handleCancelContest} onAdjustWallet={handleAdminAdjustWallet}
            onAdminCreateAdmin={handleAdminCreateAdmin}
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