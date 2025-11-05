import React, { useEffect, useState, useMemo } from 'react';
import { Contest, User } from '../types';
import Header from './Header';
import ContestCard from './ContestCard';
import { SearchIcon, PlusIcon } from './icons';

interface HomeScreenProps {
  contests: Contest[];
  currentUser: User | null;
  isAdmin: boolean;
  onRegister: (contest: Contest) => void;
  onEnterContest: (contest: Contest) => void;
  onViewLeaderboard: (contest: Contest) => void;
  onLoginRequest: () => void;
  onLogout: () => void;
  onGoToAdmin: () => void;
  onGoToWallet: () => void;
  onNavigateToCreateContest: () => void;
  error: string | null;
  clearError: () => void;
  categories: string[];
}

type Tab = 'active' | 'finished' | 'my_contests';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-bold transition-colors rounded-md ${active ? 'bg-amber-500 text-slate-900' : 'text-slate-300 hover:bg-slate-700'}`}
    >
        {children}
    </button>
);


const HomeScreen: React.FC<HomeScreenProps> = ({ contests, currentUser, isAdmin, onRegister, onEnterContest, onViewLeaderboard, onLoginRequest, onLogout, onGoToAdmin, onGoToWallet, onNavigateToCreateContest, error, clearError, categories }) => {
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const { activeContests, finishedContests, myContests, featuredContest } = useMemo(() => {
    const now = Date.now();
    
    const isContestFinished = (c: Contest) => {
        if (c.status === 'Finished') return true;
        
        // For FastestFinger, the end is precise.
        if (c.format === 'FastestFinger' && c.timerType === 'total_contest' && c.totalContestTime) {
            const endTime = c.contestStartDate + (c.totalContestTime * 1000);
            return now > endTime;
        }
        
        // For KBC or others, use a generous buffer to account for gameplay.
        const endTime = c.contestStartDate + (2 * 60 * 60 * 1000);
        return now > endTime;
    };

    const approvedContests = contests.filter(c => c.status !== 'Draft' && c.status !== 'Pending Approval' && c.status !== 'Rejected');
    const active = approvedContests.filter(c => !isContestFinished(c));
    const finished = approvedContests.filter(c => isContestFinished(c));
    const my = contests.filter(c => c.createdBy === currentUser?.email);
      
    const featured = active.length > 0
      ? [...active].sort((a, b) => b.prizePool - a.prizePool)[0]
      : null;

    return { activeContests: active, finishedContests: finished, myContests: my, featuredContest: featured };
  }, [contests, currentUser]);


  const contestsForTab = activeTab === 'active' 
    ? activeContests 
    : activeTab === 'finished' 
    ? finishedContests
    : myContests;
  
  const filteredContests = contestsForTab.filter(c => {
    const searchMatch = searchTerm.toLowerCase() === '' ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const categoryMatch = categoryFilter === 'all' || c.category === categoryFilter;

    return searchMatch && categoryMatch;
  });

  const tabTitles: Record<Tab, string> = {
    active: 'Active Contests',
    finished: 'Finished Contests',
    my_contests: 'My Contest Submissions'
  };

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
        
        {/* --- Hero Section --- */}
        <div className="grid lg:grid-cols-5 gap-8 mb-8 bg-slate-800/20 p-6 rounded-lg border border-slate-700/50">
            <div className="lg:col-span-2 flex flex-col justify-center text-center lg:text-left items-center lg:items-start">
                {currentUser ? (
                    <>
                        <h2 className="text-3xl font-bold text-slate-100">Welcome back, <span className="text-amber-400">{currentUser.name}!</span></h2>
                        <p className="text-slate-400 mt-2 mb-6">Ready for your next challenge? Or perhaps you're ready to create one?</p>
                        <button onClick={onNavigateToCreateContest} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center gap-2 transition-transform transform hover:scale-105">
                            <PlusIcon />
                            Create a Contest
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-4xl font-bold text-slate-100">The Ultimate Trivia Challenge Awaits.</h2>
                        <p className="text-slate-400 mt-2 mb-6">Join thousands of players in real-time quiz battles and win amazing prizes.</p>
                        <button onClick={onLoginRequest} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105">
                            Get Started
                        </button>
                    </>
                )}
            </div>
            <div className="lg:col-span-3">
                {featuredContest ? (
                     <div className="relative">
                        <div className="absolute top-0 left-0 bg-amber-400 text-slate-900 font-bold text-xs px-3 py-1 rounded-br-lg rounded-tl-lg z-10 uppercase tracking-wider">Featured</div>
                        <ContestCard
                            contest={featuredContest}
                            onRegister={onRegister}
                            onEnterContest={onEnterContest}
                            onViewLeaderboard={onViewLeaderboard}
                            currentUser={currentUser}
                        />
                     </div>
                ) : (
                    <div className="h-full flex items-center justify-center bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                        <p className="text-slate-500">No upcoming featured contests.</p>
                    </div>
                )}
            </div>
        </div>

        {/* --- Controls Bar --- */}
        <div className="sticky top-0 z-10 bg-slate-900/60 backdrop-blur-md rounded-lg p-2 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-700/50">
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg">
                <TabButton active={activeTab === 'active'} onClick={() => setActiveTab('active')}>Active</TabButton>
                <TabButton active={activeTab === 'finished'} onClick={() => setActiveTab('finished')}>Finished</TabButton>
                {currentUser && <TabButton active={activeTab === 'my_contests'} onClick={() => setActiveTab('my_contests')}>My Contests</TabButton>}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                 <div className="relative flex-grow">
                     <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none"><SearchIcon /></span>
                     <input type="text" placeholder="Find a contest..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"/>
                 </div>
                 <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                    <option value="all">All Categories</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                 </select>
            </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-200 mb-4">{tabTitles[activeTab]}</h2>
        {filteredContests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredContests.map(contest => (
                <ContestCard 
                  key={contest.id} 
                  contest={contest} 
                  onRegister={onRegister}
                  onEnterContest={onEnterContest}
                  onViewLeaderboard={onViewLeaderboard}
                  currentUser={currentUser}
                  isMyContestView={activeTab === 'my_contests'}
                />
            ))}
            </div>
        ) : (
            <div className="text-center py-16 bg-slate-800/30 rounded-lg">
                <p className="text-slate-500 text-xl">
                    {activeTab === 'my_contests'
                        ? "You haven't created any contests yet."
                        : `No ${activeTab} contests match your filters.`
                    }
                </p>
            </div>
        )}
      </main>
    </div>
  );
};

export default HomeScreen;