import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QuizQuestion, LifelineStatus, GameResults } from '../types';
import { askTheAI } from '../services/geminiService';
import { FiftyFiftyIcon, AskAIIcon, TimerIcon } from './icons';

interface QuizScreenProps {
    questions: QuizQuestion[];
    onEndGame: (results: GameResults) => void;
    prizeAmounts: number[];
    timePerQuestion: number;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ questions, onEndGame, prizeAmounts, timePerQuestion }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [answerStatus, setAnswerStatus] = useState<'pending' | 'correct' | 'incorrect' | null>(null);
    const [timeLeft, setTimeLeft] = useState(timePerQuestion);
    const [lifelines, setLifelines] = useState<LifelineStatus>({ fiftyFifty: true, askAI: true });
    const [displayedOptions, setDisplayedOptions] = useState<string[]>([]);
    const [aiHelp, setAiHelp] = useState<{ visible: boolean; text: string; loading: boolean }>({ visible: false, text: '', loading: false });

    const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);

    useEffect(() => {
        setDisplayedOptions(currentQuestion.options);
        setTimeLeft(timePerQuestion);
    }, [currentQuestion, timePerQuestion]);

    const handleAnswer = useCallback((answer: string | null) => {
        if (answerStatus !== null) return;

        setSelectedAnswer(answer);
        setAnswerStatus('pending');

        setTimeout(() => {
            if (answer === currentQuestion.answer) {
                setAnswerStatus('correct');
            } else {
                setAnswerStatus('incorrect');
            }
        }, 2000);
    }, [answerStatus, currentQuestion.answer]);

    useEffect(() => {
        if (answerStatus === 'pending') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAnswer(null); // Timeout
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [currentQuestionIndex, answerStatus, handleAnswer]);


    const handleNext = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setAnswerStatus(null);
            setTimeLeft(timePerQuestion);
            setAiHelp({ visible: false, text: '', loading: false });
        } else {
            onEndGame({ format: 'KBC', score: prizeAmounts[0] });
        }
    }, [currentQuestionIndex, questions.length, onEndGame, timePerQuestion, prizeAmounts]);

    useEffect(() => {
        if (answerStatus === 'correct') {
            const nextTimeout = setTimeout(handleNext, 2000);
            return () => clearTimeout(nextTimeout);
        }
        if (answerStatus === 'incorrect') {
            const endTimeout = setTimeout(() => {
                const score = currentQuestionIndex > 0 ? prizeAmounts[prizeAmounts.length - currentQuestionIndex] : 0;
                onEndGame({ format: 'KBC', score });
            }, 2000);
            return () => clearTimeout(endTimeout);
        }
    }, [answerStatus, handleNext, onEndGame, currentQuestionIndex, prizeAmounts]);

    const useFiftyFifty = () => {
        if (!lifelines.fiftyFifty || answerStatus !== null) return;
        setLifelines(prev => ({ ...prev, fiftyFifty: false }));
        const correctAnswer = currentQuestion.answer;
        const incorrectOptions = currentQuestion.options.filter(opt => opt !== correctAnswer);
        const randomIncorrect = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];
        setDisplayedOptions([correctAnswer, randomIncorrect].sort());
    };

    const useAskAI = async () => {
        if (!lifelines.askAI || answerStatus !== null) return;
        setLifelines(prev => ({ ...prev, askAI: false }));
        setAiHelp({ visible: true, text: '', loading: true });
        const hint = await askTheAI(currentQuestion);
        setAiHelp({ visible: true, text: hint, loading: false });
    };

    const getOptionClass = (option: string) => {
        if (answerStatus === null) return 'bg-slate-800/50 border-slate-600 hover:bg-amber-500/20 hover:border-amber-400';
        if (option === selectedAnswer) {
            if (answerStatus === 'pending') return 'bg-yellow-500/80 border-yellow-400 animate-pulse';
            if (answerStatus === 'correct') return 'bg-green-500/80 border-green-400';
            if (answerStatus === 'incorrect') return 'bg-red-500/80 border-red-400';
        }
        if (answerStatus === 'correct' || answerStatus === 'incorrect') {
            if (option === currentQuestion.answer) return 'bg-green-500/80 border-green-400';
        }
        return 'bg-slate-800/50 border-slate-600';
    };

    const currentPrizeIndex = prizeAmounts.length - 1 - currentQuestionIndex;

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4">
            {/* Main quiz area */}
            <div className="flex flex-col flex-grow h-full bg-slate-900/50 backdrop-blur-sm rounded-lg p-4 sm:p-8 text-white">
                <div className="flex justify-between items-center mb-4">
                    <div className={`flex items-center gap-2 p-2 rounded-full transition-all duration-300 ${timeLeft <= 5 ? 'bg-red-500/20 text-red-300' : 'bg-slate-700/50'}`}>
                        <TimerIcon />
                        <span className="font-roboto-mono text-lg font-bold w-6 text-center">{timeLeft}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={useFiftyFifty} disabled={!lifelines.fiftyFifty || answerStatus !== null} className={`p-3 rounded-full transition-colors ${lifelines.fiftyFifty ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>
                            <FiftyFiftyIcon used={!lifelines.fiftyFifty} />
                        </button>
                        <button onClick={useAskAI} disabled={!lifelines.askAI || answerStatus !== null} className={`p-3 rounded-full transition-colors ${lifelines.askAI ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>
                            <AskAIIcon used={!lifelines.askAI} />
                        </button>
                    </div>
                </div>

                {aiHelp.visible && (
                    <div className="bg-indigo-900/50 border border-indigo-700 p-4 rounded-lg mb-4 text-sm">
                        <h3 className="font-bold text-indigo-300 mb-2">AI Assistant says:</h3>
                        {aiHelp.loading ? <div className="animate-pulse">Thinking...</div> : <p>{aiHelp.text}</p>}
                    </div>
                )}

                <div className="flex-grow flex items-center justify-center">
                    <h2 className="text-xl sm:text-2xl md:text-3xl text-center font-semibold leading-relaxed">
                        {currentQuestion.question}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {displayedOptions.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleAnswer(option)}
                            disabled={answerStatus !== null}
                            className={`p-4 rounded-lg border-2 text-left transition-all duration-300 text-base md:text-lg ${getOptionClass(option)} ${answerStatus !== null ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className="font-bold mr-2 text-amber-400">{String.fromCharCode(65 + currentQuestion.options.indexOf(option))}:</span> {option}
                        </button>
                    ))}
                </div>
            </div>

            {/* Prize ladder */}
            <div className="w-full lg:w-64 flex-shrink-0 bg-slate-900/50 backdrop-blur-sm rounded-lg p-4">
                <ul className="flex flex-row lg:flex-col justify-around lg:justify-start h-full space-y-0 lg:space-y-1">
                    {prizeAmounts.map((amount, index) => {
                        const isCurrent = index === currentPrizeIndex;
                        const isPast = index > currentPrizeIndex;

                        const prizeClass = isCurrent
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 scale-110 shadow-xl shadow-yellow-500/30 font-bold md:text-lg'
                            : isPast
                                ? 'text-slate-500 opacity-60'
                                : 'text-slate-300';

                        return (
                            <li key={index} className={`text-sm md:text-base font-semibold rounded-md p-1 md:p-2 transition-all duration-300 text-center lg:text-left ${prizeClass}`}>
                                <span className="font-roboto-mono">{prizeAmounts.length - index}</span>
                                <span className="mx-2 hidden lg:inline">-</span>
                                <span className="font-roboto-mono">${amount.toLocaleString()}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default QuizScreen;