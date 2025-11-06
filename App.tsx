

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
import { DEFAULT_CATEGORIES, DEFAULT_PRIZE_AMOUNTS, DEFAULT_PAYMENT_GATEWAY_SETTINGS, ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_TIME_PER_QUESTION } from './constants';
import { MOCK_CONTESTS } from './data';
import { processWalletAction } from './services/walletService';
import { generateTransactionDescription } from './services/geminiService';
import { updateUserStatsAfterContest } from './services/rankingService';


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
      let loadedUsers: StoredUser[] = storedUsers ? JSON.parse(storedUsers) : [];
      let userMigrationNeeded = false;
      const migratedUsers = loadedUsers.map(u => {
          const newUser = {...u};
          let userChanged = false;
          if (!u.registrationDate) {
              userChanged = true;
              newUser.registrationDate = new Date('2024-01-01').getTime();
          }
          if (typeof u.totalPoints === 'undefined') {
              userChanged = true;
              newUser.totalPoints = 0;
          }
          if (!u.contestHistory) {
              userChanged = true;
              newUser.contestHistory = [];
          }
          if (userChanged) {
            userMigrationNeeded = true;
          }
          return newUser;
      });
      const adminExists = migratedUsers.some(u => u.email === ADMIN_EMAIL);
      if (!adminExists) {
        userMigrationNeeded = true;
        migratedUsers.push({
            name: 'Super Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
            walletBalance: 0, transactions: [], banned: false, role: 'Super Admin',
            registrationDate: Date.now(), totalPoints: 0, contestHistory: []
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
      let loadedContests: Contest[] = storedContests ? JSON.parse(storedContests) : MOCK_CONTESTS;
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
           if (!newContest.difficulty) {
              newContest.difficulty = 'Medium';
              hasChanged = true;
          }

          if(hasChanged) {
            contestMigrationNeeded = true;
          }
          return newContest;
      });

      if (!storedContests || contestMigrationNeeded) {
          localStorage.setItem('mindbattle_contests', JSON.stringify(migratedContests));
      }
      setContests(migratedContests);
      
      // Audit Log
      const storedAuditLog = localStorage.getItem('mindbattle_audit_log');
      if (storedAuditLog) setAuditLog(JSON.parse(storedAuditLog));

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

  useEffect(() => {
    if (currentUser?.email) {
        const freshUserData = users.find(u => u.email === currentUser.email);
        if (freshUserData && JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
            setCurrentUser(freshUserData);
        }
    }
  }, [users, currentUser]);

  const logAdminAction = useCallback((admin: User, action: AuditLogAction, details: string) => {
      const newLog: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        adminEmail: admin.email,
        adminName: admin.name,
        action,
        details
      };
      setAuditLog(prev => {
        const updatedLog = [newLog, ...prev];
        localStorage.setItem('mindbattle_audit_log', JSON.stringify(updatedLog));
        return updatedLog;
      });
  }, []);

  const dispatchWalletAction = useCallback((action: WalletAction) => {
    setUsers(prevUsers => {
        const updatedUsers = prevUsers.map(user => {
            if (user.email === action.payload.userId) {
                return processWalletAction(user, action);
            }
            return user;
        });

        if (JSON.stringify(prevUsers) !== JSON.stringify(updatedUsers)) {
            localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
        }
        return updatedUsers;
    });
  }, []);
  
  const handleAdminAdjustWalletAI = useCallback(async (userId: string, amount: number, reasonKeywords: string, adminId: string) => {
      const description = await generateTransactionDescription(reasonKeywords, amount);
      dispatchWalletAction({
          type: 'ADMIN_ADJUSTMENT',
          payload: {
              userId,
              amount,
              description,
              updatedBy: adminId,
          },
      });
      if(currentUser) {
          logAdminAction(currentUser, 'WALLET_ADJUSTED', `Adjusted wallet for ${userId} by $${amount}. Reason: ${reasonKeywords}`);
      }
  }, [dispatchWalletAction, currentUser, logAdminAction]);

  const handleAdminUpdateWithdrawal = useCallback((userId: string, transactionId: string, action: 'approve' | 'decline', adminId: string) => {
    dispatchWalletAction({
        type: action === 'approve' ? 'WITHDRAWAL_APPROVE' : 'WITHDRAWAL_DECLINE',
        payload: {
            userId,
            amount: 0, // amount is irrelevant here, it's derived from the original tx
            description: '', // service will provide a default
            transactionId,
            updatedBy: adminId,
        }
    });
    if (currentUser) {
        const logAction: AuditLogAction = action === 'approve' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_DECLINED';
        logAdminAction(currentUser, logAction, `Withdrawal for ${userId} (Tx: ${transactionId})`);
    }
  }, [dispatchWalletAction, currentUser, logAdminAction]);


  const handleRegisterForContest = useCallback((contest: Contest) => {
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
        dispatchWalletAction({
            type: 'CONTEST_ENTRY',
            payload: {
                userId: currentUser.email,
                amount: contest.entryFee,
                description: `Entry for ${contest.title}`,
            }
        });
    }

    setContests(prevContests => {
      const updatedContests = prevContests.map(c => 
          c.id === contest.id ? { ...c, participants: [...c.participants, currentUser.email] } : c
      );
      localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
      return updatedContests;
    });
    
  }, [currentUser, dispatchWalletAction, users]);
  
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
          // --- Prize Money Logic ---
          let newResult: ContestResult | null = null;
          if (results.format === 'KBC') {
              if (results.score > 0) {
                  dispatchWalletAction({
                      type: 'CONTEST_WIN',
                      payload: {
                          userId: currentUser.email,
                          amount: results.score,
                          description: `Prize from ${activeContest.title}`,
                      }
                  });
              }
              newResult = { userId: currentUser.email, name: currentUser.name, score: results.score };
          } else if (results.format === 'FastestFinger') {
              const userResult = results.leaderboard.find(p => p.name === 'You');
              if (userResult) {
                  newResult = { userId: currentUser.email, name: currentUser.name, score: userResult.score, time: userResult.time };
              }
          }
          if (newResult) {
              setContests(prevContests => {
                const updatedContests = prevContests.map(c => {
                    if (c.id === activeContest.id) {
                        const existingResults = c.results || [];
                        const otherUserResults = existingResults.filter(r => r.userId !== currentUser.email);
                        return { ...c, results: [...otherUserResults, newResult!] };
                    }
                    return c;
                });
                localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
                return updatedContests;
              });
          }
          
          // --- NEW RANKING LOGIC ---
          const userToUpdate = users.find(u => u.email === currentUser.email);
          if (userToUpdate) {
              const updatedUser = updateUserStatsAfterContest(userToUpdate, activeContest, results);
              setUsers(prevUsers => {
                  const newUsers = prevUsers.map(u => u.email === updatedUser.email ? updatedUser : u);
                  localStorage.setItem('mindbattle_users', JSON.stringify(newUsers));
                  return newUsers;
              });
          }
      }
      
      setAppView('end');
  }, [activeContest, currentUser, dispatchWalletAction, isAdmin, users]);


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
        totalPoints: 0,
        contestHistory: [],
        transactions: [{
            id: `txn_init_${Date.now()}`,
            type: 'deposit',
            amount: 500,
            description: 'Initial sign-up bonus',
            timestamp: Date.now(),
            status: 'completed',
        }] 
    };
    setUsers(prevUsers => {
      const updatedUsers = [...prevUsers, newUser];
      localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
      return updatedUsers;
    });
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
    if(currentUser) {
        logAdminAction(currentUser, 'SETTINGS_UPDATE', 'Global game and payment settings were updated.');
    }
  }, [currentUser, logAdminAction]);

  const handleCreateContest = useCallback((newContestData: Omit<Contest, 'id' | 'participants'>) => {
      const newContest: Contest = {
          ...newContestData,
          id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          participants: [],
      };
      setContests(prevContests => {
        const updatedContests = [...prevContests, newContest];
        localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
        return updatedContests;
      });
      if (currentUser) {
        const action: AuditLogAction = newContest.status === 'Pending Approval' ? 'CONTEST_CREATED' : 'CONTEST_CREATED';
        logAdminAction(currentUser, action, `Contest: '${newContest.title}' (${newContest.id})`);
      }
  }, [currentUser, logAdminAction]);

  const handleUpdateContest = useCallback((updatedContest: Contest) => {
      const oldContest = contests.find(c => c.id === updatedContest.id);
      setContests(prevContests => {
        const updatedContests = prevContests.map(c => c.id === updatedContest.id ? updatedContest : c);
        localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
        return updatedContests;
      });
      if (currentUser && oldContest) {
        let action: AuditLogAction | null = 'CONTEST_UPDATED';
        let details = `Contest: '${updatedContest.title}' (${updatedContest.id})`;
        if (oldContest.status === 'Pending Approval' && updatedContest.status === 'Upcoming') {
            action = 'CONTEST_APPROVED';
        } else if (oldContest.status === 'Pending Approval' && updatedContest.status === 'Rejected') {
            action = 'CONTEST_REJECTED';
        }
        if(action) logAdminAction(currentUser, action, details);
      }
  }, [contests, currentUser, logAdminAction]);

  const handleDeleteContest = useCallback((contestId: string) => {
      const contestToDelete = contests.find(c => c.id === contestId);
      setContests(prevContests => {
        const updatedContests = prevContests.filter(c => c.id !== contestId);
        localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
        return updatedContests;
      });
      if (currentUser && contestToDelete) {
        logAdminAction(currentUser, 'CONTEST_DELETED', `Contest: '${contestToDelete.title}' (${contestToDelete.id})`);
      }
  }, [contests, currentUser, logAdminAction]);

  const handleAdminUpdateUser = useCallback((userId: string, updates: Partial<Pick<StoredUser, 'banned'>>) => {
      const userToUpdate = users.find(u => u.email === userId);
      setUsers(prevUsers => {
        const updatedUsers = prevUsers.map(u => u.email === userId ? { ...u, ...updates } : u);
        localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
        return updatedUsers;
      });
      if (currentUser && userToUpdate) {
          const action: AuditLogAction = updates.banned ? 'USER_BANNED' : 'USER_UNBANNED';
          logAdminAction(currentUser, action, `User: ${userToUpdate.name} (${userToUpdate.email})`);
      }
  }, [users, currentUser, logAdminAction]);
  
  const handleUpdateUserRole = useCallback((userId: string, role: AdminRole | 'None') => {
      const userToUpdate = users.find(u => u.email === userId);
      setUsers(prevUsers => {
        const updatedUsers = prevUsers.map(u => {
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
        localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
        return updatedUsers;
      });
       if (currentUser && userToUpdate) {
          logAdminAction(currentUser, 'ROLE_UPDATED', `Set role for ${userToUpdate.name} to ${role}`);
      }
  }, [users, currentUser, logAdminAction]);
  
  const handleCancelContest = useCallback((contestId: string) => {
      const contestToCancel = contests.find(c => c.id === contestId);
      if (!contestToCancel) return;

      contestToCancel.participants.forEach(participantEmail => {
          if (contestToCancel.entryFee > 0) {
              dispatchWalletAction({
                  type: 'CONTEST_REFUND',
                  payload: {
                      userId: participantEmail,
                      amount: contestToCancel.entryFee,
                      description: `Refund for cancelled contest: ${contestToCancel.title}`,
                  }
              });
          }
      });
      
      setContests(prevContests => {
        const updatedContests: Contest[] = prevContests.map(c => 
            c.id === contestId ? { ...c, status: 'Cancelled', participants: [] } : c
        );
        localStorage.setItem('mindbattle_contests', JSON.stringify(updatedContests));
        return updatedContests;
      });
      if (currentUser && contestToCancel) {
        logAdminAction(currentUser, 'CONTEST_CANCELLED', `Contest: '${contestToCancel.title}' (${contestToCancel.id})`);
      }
  }, [contests, dispatchWalletAction, currentUser, logAdminAction]);
  
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
      dispatchWalletAction({
          type: 'DEPOSIT',
          payload: {
              userId: currentUser.email,
              amount: depositInProgress.amount,
              description: 'User deposit via gateway',
          }
      });
      setDepositInProgress(null);
      setAppView('wallet');
    }
  }, [currentUser, depositInProgress, dispatchWalletAction]);

  const handlePaymentCancel = useCallback(() => {
    setDepositInProgress(null);
    setAppView('wallet');
  }, []);

  const handleWithdraw = useCallback((amount: number) => {
    if(currentUser) {
        dispatchWalletAction({
            type: 'WITHDRAWAL_REQUEST',
            payload: {
                userId: currentUser.email,
                amount: amount,
                description: 'Withdrawal request',
            }
        });
    }
  }, [currentUser, dispatchWalletAction]);

  const handleAdminCreateAdmin = useCallback((name: string, email: string, password: string, role: AdminRole): { success: boolean, message: string } => {
      if (users.some(u => u.email === email)) {
        return { success: false, message: 'An account with this email already exists.' };
      }
      const newAdmin: StoredUser = {
          name, email, password, role,
          walletBalance: 0,
          banned: false,
          registrationDate: Date.now(),
          transactions: [],
          totalPoints: 0,
          contestHistory: [],
      };
      setUsers(prevUsers => {
        const updatedUsers = [...prevUsers, newAdmin];
        localStorage.setItem('mindbattle_users', JSON.stringify(updatedUsers));
        return updatedUsers;
      });
       if(currentUser) {
          logAdminAction(currentUser, 'ADMIN_CREATED', `Created new admin: ${name} (${email}) with role ${role}.`);
      }
      return { success: true, message: 'Admin created successfully!' };
  }, [users, currentUser, logAdminAction]);


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