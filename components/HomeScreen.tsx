import React, { useEffect, useState } from 'react';
import { Contest, User } from '../types';
import Header from './Header';
import ContestCard from './ContestCard';

interface HomeScreenProps {
  contests: Contest[];
  currentUser: User | null;
  isAdmin: boolean;
  onRegister: (contest: Contest) => void;
  onEnterContest: (contest: Contest) => void;
  onLoginRequest: () => void;
  onLogout: () => void;
  onGoToAdmin: () => void;
  onGoToWallet: () => void;
  error: string | null;
  clearError: () => void;
}

type Tab = 'active' | 'finished';

const HomeScreen: React.FC<HomeScreenProps> = ({ contests, currentUser, isAdmin, onRegister, onEnterContest, onLoginRequest, onLogout, onGoToAdmin, onGoToWallet, error, clearError }) => {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const now = Date.now();
  
  // A contest is considered "finished" if its status is explicitly set, or if it's 2 hours past its start time.
  const isContestFinished = (c: Contest) => c.status === 'Finished' || now > c.contestStartDate + (2 * 60 * 60 * 1000);

  const activeContests = contests.filter(c => c.status !== 'Draft' && !isContestFinished(c));
  const finishedContests = contests.filter(c => c.status !== 'Draft' && isContestFinished(c));


  const contestsToDisplay = activeTab === 'active' ? activeContests : finishedContests;

  return (
    <div className="flex flex-col h-full text-white bg-slate-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
      <Header 
        currentUser={currentUser} 
        isAdmin={isAdmin}
        onLoginRequest={onLoginRequest}
        onLogout={onLogout}
        onGoToAdmin={onGoToAdmin}
        onGoToWallet={onGoToWallet}
      />
      
      <main className="flex-grow overflow-y-auto p-4 sm:p-6">
        {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={clearError} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                <span className="text-2xl">×</span>
            </button>
            </div>
        )}
        
        <div className="flex border-b border-slate-700 mb-6">
            <button 
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'active' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}
            >
                Active Contests
            </button>
            <button 
                onClick={() => setActiveTab('finished')}
                className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'finished' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-slate-400 hover:text-white'}`}
            >
                Finished
            </button>
        </div>
        
        {contestsToDisplay.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {contestsToDisplay.map(contest => (
                <ContestCard 
                  key={contest.id} 
                  contest={contest} 
                  onRegister={onRegister}
                  onEnterContest={onEnterContest}
                  currentUser={currentUser}
                />
            ))}
            </div>
        ) : (
            <div className="text-center py-16">
                <p className="text-slate-500 text-xl">No {activeTab} contests found.</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default HomeScreen;