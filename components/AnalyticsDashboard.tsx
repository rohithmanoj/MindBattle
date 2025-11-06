import React, { useMemo, useState } from 'react';
import { StoredUser, Contest, Rank, Difficulty } from '../types';
import { getRank } from '../services/rankingService';
import { RANK_ORDER, DIFFICULTY_LEVELS } from '../constants';
import RankBadge from './RankBadge';
import { generateAdminInsights } from '../services/geminiService';

interface AnalyticsDashboardProps {
  users: StoredUser[];
  contests: Contest[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ users, contests }) => {
    const regularUsers = useMemo(() => users.filter(u => !u.role), [users]);
    const [leaderboardSort, setLeaderboardSort] = useState({ key: 'totalPoints', order: 'desc' });

    const stats = useMemo(() => {
        const rankDistribution = RANK_ORDER.reduce((acc, rank) => {
            acc[rank] = 0;
            return acc;
        }, {} as Record<Rank, number>);

        regularUsers.forEach(user => {
            const rank = getRank(user.totalPoints);
            rankDistribution[rank]++;
        });
        
        const topTitaniumGeniuses = regularUsers
            .filter(u => getRank(u.totalPoints) === 'Titanium Genius')
            .map(u => {
                 const winRate = u.contestHistory.length > 0
                    ? (u.contestHistory.filter(h => h.pointsEarned > 0).length / u.contestHistory.length) * 100
                    : 0;
                 const difficulties = u.contestHistory.map(h => h.difficulty);
                 const mostPlayed = difficulties.length > 0 ?
                    Object.entries(difficulties.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {} as Record<string, number>))
                          .sort((a,b) => b[1] - a[1])[0][0]
                    : 'N/A';
                 return { ...u, winRate, mostPlayed };
            })
            .sort((a, b) => b.winRate - a.winRate || b.totalPoints - a.totalPoints)
            .slice(0, 5);
        
        return { rankDistribution, topTitaniumGeniuses };
    }, [regularUsers]);

    const sortedLeaderboard = useMemo(() => {
        return [...regularUsers].sort((a, b) => {
            const valA = a[leaderboardSort.key as keyof StoredUser];
            const valB = b[leaderboardSort.key as keyof StoredUser];
            if (leaderboardSort.order === 'asc') {
                return valA > valB ? 1 : -1;
            }
            return valB > valA ? 1 : -1;
        });
    }, [regularUsers, leaderboardSort]);

    const handleSort = (key: 'name' | 'totalPoints') => {
        setLeaderboardSort(prev => ({
            key,
            order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    }

    // AI Insights State
    const [aiPrompt, setAiPrompt] = useState('Show me the top 5 users by difficulty win ratio');
    const [aiResponse, setAiResponse] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateInsights = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        setAiResponse('');
        try {
            const response = await generateAdminInsights(aiPrompt, users, contests);
            setAiResponse(response);
        } catch (error) {
            setAiResponse("An error occurred while generating insights. Please try again.");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leaderboard */}
                <div className="bg-slate-800/40 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold text-slate-200 mb-4">Player Leaderboard</h3>
                     <div className="overflow-y-auto max-h-[60vh]">
                        <table className="w-full text-sm text-left text-slate-300">
                             <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 w-12 text-center">#</th>
                                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('name')}>Player</th>
                                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('totalPoints')}>Points</th>
                                    <th className="px-4 py-2">Rank</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-700">
                                {sortedLeaderboard.map((user, index) => (
                                    <tr key={user.email} className="hover:bg-slate-700/50">
                                        <td className="px-4 py-2 text-center font-bold">{index + 1}</td>
                                        <td className="px-4 py-2 font-semibold">{user.name}</td>
                                        <td className="px-4 py-2 font-roboto-mono font-bold text-amber-300">{user.totalPoints}</td>
                                        <td className="px-4 py-2"><RankBadge rank={getRank(user.totalPoints)} /></td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                </div>

                {/* Ranks & Top Players */}
                <div className="space-y-8">
                    <div className="bg-slate-800/40 p-4 rounded-lg">
                         <h3 className="text-xl font-semibold text-slate-200 mb-4">Rank Distribution</h3>
                         <div className="space-y-2">
                            {RANK_ORDER.map(rank => (
                                <div key={rank} className="flex items-center gap-2">
                                    <RankBadge rank={rank} className="w-40 justify-center" />
                                    <div className="flex-grow bg-slate-700 rounded-full h-4">
                                         <div className="bg-indigo-500 h-4 rounded-full text-right" style={{ width: `${(stats.rankDistribution[rank] / (regularUsers.length || 1)) * 100}%`}}>
                                         </div>
                                    </div>
                                    <span className="w-12 text-right font-roboto-mono font-bold">{stats.rankDistribution[rank]}</span>
                                </div>
                            ))}
                         </div>
                    </div>

                     <div className="bg-slate-800/40 p-4 rounded-lg">
                        <h3 className="text-xl font-semibold text-slate-200 mb-4">Top 5 Titanium Geniuses</h3>
                        <ul className="space-y-2">
                            {stats.topTitaniumGeniuses.map((user, index) => (
                                <li key={user.email} className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-lg">{index + 1}.</span>
                                        <div>
                                            <p className="font-bold text-white">{user.name}</p>
                                            <p className="text-xs text-slate-400">{user.totalPoints} Points</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-green-400">{user.winRate.toFixed(1)}% Win Rate</p>
                                        <p className="text-xs text-slate-500">Fav: {user.mostPlayed}</p>
                                    </div>
                                </li>
                            ))}
                            {stats.topTitaniumGeniuses.length === 0 && <p className="text-slate-500 text-center py-4">No Titanium Geniuses yet!</p>}
                        </ul>
                    </div>
                </div>
            </div>

             {/* AI Insights */}
            <div className="bg-slate-800/40 p-4 rounded-lg">
                 <h3 className="text-xl font-semibold text-slate-200 mb-4">AI-Powered Insights</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="ai-prompt" className="block text-slate-300 text-sm font-semibold mb-1">Your Question</label>
                        <textarea id="ai-prompt" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Ask about player performance, contest engagement, etc."></textarea>
                        <button onClick={handleGenerateInsights} disabled={isGenerating} className="mt-2 w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-wait">
                            {isGenerating ? 'Analyzing...' : '✨ Generate Insights'}
                        </button>
                    </div>
                     <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 min-h-[150px] max-h-[40vh] overflow-y-auto">
                        <h4 className="font-bold text-amber-300 mb-2">AI Analyst Response:</h4>
                        {isGenerating && <div className="text-slate-400 animate-pulse">Thinking...</div>}
                        {aiResponse ? (
                             <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{aiResponse}</pre>
                        ) : !isGenerating && (
                            <p className="text-slate-500">Your generated insights will appear here.</p>
                        )}
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
