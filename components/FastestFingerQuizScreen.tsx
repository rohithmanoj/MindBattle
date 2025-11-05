import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Contest, GameResults, User } from '../types';
import { TimerIcon } from './icons';

interface FastestFingerQuizScreenProps {
  contest: Contest;
  currentUser: User;
  onEndGame: (results: GameResults) => void;
}

const FastestFingerQuizScreen: React.FC<FastestFingerQuizScreenProps> = ({ contest, currentUser, onEndGame }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'pending' | 'correct' | 'incorrect' | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(contest.totalContestTime || 60);

  const [leaderboard, setLeaderboard] = useState(() => {
    const players = [
        { name: 'You', score: 0, time: 0, isUser: true },
        ...['Vortex', 'CyberNeko', 'Glitch', 'RogueAI', 'ZeroCool', 'Hex', 'Byte', 'Phantom'].map(name => ({
            name,
            score: 0,
            time: 0,
            isUser: false,
        })),
    ];
    return players;
  });

  const currentQuestion = useMemo(() => contest.questions[currentQuestionIndex], [contest.questions, currentQuestionIndex]);

  const sortedLeaderboard = useMemo(() => {
      return [...leaderboard].sort((a, b) => b.score - a.score || a.time - b.time);
  }, [leaderboard]);

  const endGame = useCallback(() => {
    onEndGame({ format: 'FastestFinger', leaderboard: sortedLeaderboard });
  }, [sortedLeaderboard, onEndGame]);

  // Main contest timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [endGame]);
  
  // AI player simulation
  useEffect(() => {
    if (timeLeft <= 0) return;

    const simulationInterval = setInterval(() => {
        setLeaderboard(prev => {
            const updated = prev.map(p => ({...p})); // Deep copy
            const updates = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < updates; i++) {
                const playerIndex = Math.floor(Math.random() * (updated.length -1)) + 1;
                const player = updated[playerIndex];
                if (!player.isUser && Math.random() < 0.6) { // 60% chance to answer
                    player.score += 1;
                    player.time += Math.random() * 4 + 1.5; // 1.5s to 5.5s response time
                }
            }
            return updated;
        });
    }, 2500);

    return () => clearInterval(simulationInterval);
  }, [timeLeft]);


  const handleNext = useCallback(() => {
    if (currentQuestionIndex < contest.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswerStatus(null);
      setQuestionStartTime(Date.now());
    } else {
      endGame();
    }
  }, [currentQuestionIndex, contest.questions.length, endGame]);
  
  const handleAnswer = useCallback((answer: string) => {
    if (answerStatus !== null) return;
    setAnswerStatus('pending');

    setTimeout(() => {
      let isCorrect = answer === currentQuestion.answer;
      setAnswerStatus(isCorrect ? 'correct' : 'incorrect');

      if (isCorrect) {
          const timeTaken = (Date.now() - questionStartTime) / 1000;
          setLeaderboard(prev => prev.map(p => p.isUser ? { ...p, score: p.score + 1, time: p.time + timeTaken } : p));
      }
      
      setTimeout(handleNext, 1000); // Automatically move to next question
    }, 1000);
  }, [answerStatus, currentQuestion.answer, questionStartTime, handleNext]);

  const getOptionClass = (option: string, isSelected: boolean) => {
    if (answerStatus === null) return 'bg-slate-800/50 border-slate-600 hover:bg-amber-500/20 hover:border-amber-400';
    if (isSelected) {
      if (answerStatus === 'pending') return 'bg-yellow-500/80 border-yellow-400 animate-pulse';
      if (answerStatus === 'correct') return 'bg-green-500/80 border-green-400';
      if (answerStatus === 'incorrect') return 'bg-red-500/80 border-red-400';
    }
    if (answerStatus !== 'pending' && option === currentQuestion.answer) {
        return 'bg-green-500/80 border-green-400';
    }
    return 'bg-slate-800/50 border-slate-600 opacity-50';
  };

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const handleOptionClick = (option: string) => {
      if(answerStatus === null) {
          setSelectedAnswer(option);
          handleAnswer(option);
      }
  };


  return (
    <div className="flex flex-col lg:flex-row h-full gap-4">
      {/* Main quiz area */}
      <div className="flex flex-col flex-grow h-full bg-slate-900/50 backdrop-blur-sm rounded-lg p-4 sm:p-8 text-white">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-amber-400">{contest.title}</h2>
            <p className="text-sm text-slate-400">Question {currentQuestionIndex + 1} of {contest.questions.length}</p>
        </div>
        
        <div className="flex-grow flex flex-col items-center justify-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl text-center font-semibold leading-relaxed mb-8">
                {currentQuestion.question}
            </h2>
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => handleOptionClick(option)}
                        disabled={answerStatus !== null}
                        className={`p-4 rounded-lg border-2 text-left transition-all duration-300 text-base md:text-lg ${getOptionClass(option, option === selectedAnswer)} ${answerStatus !== null ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <span className="font-bold mr-2 text-amber-400">{String.fromCharCode(65 + index)}:</span> {option}
                    </button>
                ))}
            </div>
        </div>
        <div className="h-2 bg-slate-700 rounded-full mt-4 flex-shrink-0">
            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300 shadow-[0_0_10px_theme(colors.amber.400)]" style={{ width: `${((currentQuestionIndex + 1) / contest.questions.length) * 100}%` }}></div>
        </div>
      </div>

      {/* Leaderboard and status */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-slate-900/50 backdrop-blur-sm rounded-lg p-4 flex flex-col">
        <div className="flex-shrink-0 text-center bg-slate-800/40 rounded-lg p-4 mb-4 border-b-2 border-amber-400/50">
            <div className="text-slate-400 text-sm uppercase tracking-widest">Time Remaining</div>
            <div className={`flex items-center justify-center gap-2 transition-all duration-300 ${timeLeft <= 10 ? 'text-red-400' : 'text-amber-400'}`}>
                <TimerIcon />
                <span className="font-roboto-mono text-4xl font-bold tracking-wider">
                    {`${Math.floor(timeLeft / 60)}`.padStart(2, '0')}:{`${timeLeft % 60}`.padStart(2, '0')}
                </span>
            </div>
        </div>
        <h3 className="text-lg font-bold text-slate-200 mb-2 px-2">Live Leaderboard</h3>
        <div className="flex-grow overflow-y-auto">
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                    <tr>
                        <th className="p-2 text-slate-400">Rank</th>
                        <th className="p-2 text-slate-400">Player</th>
                        <th className="p-2 text-slate-400 text-right">Score</th>
                        <th className="p-2 text-slate-400 text-right">Time</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedLeaderboard.map((player, index) => (
                        <tr key={player.name} className={`border-b border-slate-800 transition-colors duration-300 ${player.isUser ? 'bg-amber-500/10' : ''}`}>
                            <td className={`p-2 font-bold ${player.isUser ? 'text-amber-300' : 'text-slate-300'}`}>{index + 1}</td>
                            <td className={`p-2 font-semibold ${player.isUser ? 'text-amber-300' : 'text-slate-300'}`}>{player.name}</td>
                            <td className="p-2 text-right font-roboto-mono text-white">{player.score}</td>
                            <td className="p-2 text-right font-roboto-mono text-slate-400">{player.time.toFixed(2)}s</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default FastestFingerQuizScreen;
