import React from 'react';
import { GameResults } from '../types';
import { MindBattleIcon } from './icons';

interface EndScreenProps {
    results: GameResults;
    onRestart: () => void;
    totalQuestions: number;
    prizeAmounts: number[];
}

const KBCResultScreen: React.FC<Pick<EndScreenProps, 'results' | 'onRestart' | 'totalQuestions' | 'prizeAmounts'>> = ({ results, onRestart, totalQuestions, prizeAmounts }) => {
    if (results.format !== 'KBC') return null;
    const { score } = results;

    const questionsAnswered = score === prizeAmounts[0]
        ? totalQuestions
        : prizeAmounts.includes(score)
            ? totalQuestions - prizeAmounts.indexOf(score)
            : 0;

    const getMessage = () => {
        if (score === prizeAmounts[0]) return "Congratulations! You're a MindBattle Champion!";
        if (score >= prizeAmounts[Math.floor(prizeAmounts.length / 2)]) return "Incredible performance!";
        if (score > 0) return "Great effort! You've got what it takes.";
        return "Tough battle! Why not try again?";
    };

    return (
        <>
            <h2 className="text-3xl font-bold mb-2 text-amber-400">{getMessage()}</h2>
            <p className="text-lg text-slate-300 mb-6">You walk away with:</p>
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold text-5xl py-4 px-8 rounded-lg mb-8 shadow-xl shadow-amber-500/20">
                ${score.toLocaleString()}
            </div>
            <p className="text-slate-400 mb-8">You answered {questionsAnswered} out of {totalQuestions} questions correctly.</p>
            <button
                onClick={onRestart}
                className="bg-indigo-600 text-white font-bold text-xl py-4 px-8 rounded-lg hover:bg-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20"
            >
                Back to Contests
            </button>
        </>
    );
};

const FastestFingerResultScreen: React.FC<Pick<EndScreenProps, 'results' | 'onRestart'>> = ({ results, onRestart }) => {
    if (results.format !== 'FastestFinger') return null;
    const { leaderboard } = results;

    return (
        <>
            <h2 className="text-3xl font-bold mb-2 text-amber-400">Time's Up!</h2>
            <p className="text-lg text-slate-300 mb-6">Here are the final results:</p>
            <div className="w-full max-w-lg bg-slate-800/50 rounded-lg p-4 mb-8">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-600 text-slate-400 uppercase text-sm">
                            <th className="p-2">Rank</th>
                            <th className="p-2">Name</th>
                            <th className="p-2 text-right">Score</th>
                            <th className="p-2 text-right">Time (s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((player, index) => (
                            <tr key={index} className={`border-b border-slate-700 last:border-b-0 ${player.name === 'You' ? 'bg-amber-500/20' : ''}`}>
                                <td className={`p-2 font-bold ${player.name === 'You' ? 'text-amber-300' : 'text-white'}`}>{index + 1}</td>
                                <td className={`p-2 font-semibold ${player.name === 'You' ? 'text-amber-300' : 'text-white'}`}>{player.name}</td>
                                <td className="p-2 text-right font-roboto-mono">{player.score}</td>
                                <td className="p-2 text-right font-roboto-mono">{player.time.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={onRestart}
                className="bg-indigo-600 text-white font-bold text-xl py-4 px-8 rounded-lg hover:bg-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20"
            >
                Back to Contests
            </button>
        </>
    );
};

const EndScreen: React.FC<EndScreenProps> = (props) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-white text-center p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg">
            <div className="w-20 h-20 mb-4">
                <MindBattleIcon />
            </div>
            {props.results.format === 'KBC' && <KBCResultScreen {...props} />}
            {props.results.format === 'FastestFinger' && <FastestFingerResultScreen {...props} />}
        </div>
    );
};

export default EndScreen;