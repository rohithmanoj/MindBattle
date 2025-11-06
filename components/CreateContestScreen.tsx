import React, { useState } from 'react';
import { Contest, GameSettings, QuizQuestion, User, Difficulty } from '../types';
import { DIFFICULTY_LEVELS } from '../constants';

interface CreateContestScreenProps {
    currentUser: User;
    initialSettings: GameSettings;
    onCreateContest: (contestData: Omit<Contest, 'id' | 'participants'>) => void;
    onCancel: () => void;
}

// Helper Components
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
        <input id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-slate-700 disabled:cursor-not-allowed"/>
    </div>
);
const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; }> = ({ label, id, ...props }) => (
  <div>
      <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
      <textarea id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-roboto-mono disabled:bg-slate-700 disabled:cursor-not-allowed"/>
  </div>
);
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; children: React.ReactNode }> = ({ label, id, children, ...props }) => (
  <div>
      <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-1">{label}</label>
      <select id={id} {...props} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          {children}
      </select>
  </div>
);
const TimeSelector: React.FC<{
    label: string;
    id: string;
    value: number; // in seconds
    onChange: (seconds: number) => void;
}> = ({ label, id, value, onChange }) => {
    const presets = [
        { label: '1 min', seconds: 60 }, { label: '2 min', seconds: 120 },
        { label: '5 min', seconds: 300 }, { label: '10 min', seconds: 600 },
    ];
    const isCustom = !presets.some(p => p.seconds === value);

    return (
        <div>
            <label htmlFor={id} className="block text-slate-300 text-sm font-semibold mb-2">{label}</label>
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-wrap">
                    {presets.map(p => (
                        <button key={p.seconds} type="button" onClick={() => onChange(p.seconds)}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${value === p.seconds ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex-grow">
                    <input id={id} type="number" placeholder="Custom (seconds)"
                        value={isCustom || value === 0 ? value : ''}
                        onChange={e => onChange(Number(e.target.value))}
                        onFocus={() => { if (!isCustom) onChange(0); }}
                        className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
            </div>
        </div>
    );
};


const CreateContestScreen: React.FC<CreateContestScreenProps> = ({ currentUser, initialSettings, onCreateContest, onCancel }) => {
    const regEndDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const [contest, setContest] = useState<Partial<Contest>>({
        title: '', description: '', category: initialSettings.categories[0] || '',
        entryFee: 0, prizePool: 1000,
        registrationStartDate: Date.now(),
        registrationEndDate: regEndDate,
        contestStartDate: regEndDate + (60 * 60 * 1000),
        maxParticipants: 100, rules: 'Standard quiz rules apply.',
        format: 'KBC', timerType: 'per_question', timePerQuestion: initialSettings.timePerQuestion,
        totalContestTime: 60, numberOfQuestions: 15, difficulty: 'Medium',
    });
    const [questionsJson, setQuestionsJson] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        setError(null);
        try {
            let questions: QuizQuestion[] = [];
            if (questionsJson.trim()) {
                const parsed = JSON.parse(questionsJson);
                if (!Array.isArray(parsed)) throw new Error("Questions JSON must be an array.");
                // Basic validation of question structure can be added here
                questions = parsed;
            } else {
                throw new Error("You must provide at least one question.");
            }
            if (questions.length === 0) {
                 throw new Error("You must provide at least one question.");
            }

            const contestData: Omit<Contest, 'id' | 'participants'> = {
                title: contest.title?.trim() || 'Untitled Contest',
                description: contest.description?.trim() || 'A user-submitted contest.',
                category: contest.category || 'General Knowledge',
                entryFee: Number(contest.entryFee) || 0,
                prizePool: Number(contest.prizePool) || 0,
                status: 'Pending Approval',
                registrationStartDate: contest.registrationStartDate!,
                registrationEndDate: contest.registrationEndDate!,
                contestStartDate: contest.contestStartDate!,
                maxParticipants: Number(contest.maxParticipants) || 50,
                rules: contest.rules || '',
                questions: questions,
                format: contest.format || 'KBC',
                timerType: contest.timerType || 'per_question',
                timePerQuestion: contest.timePerQuestion || 30,
                totalContestTime: contest.totalContestTime,
                numberOfQuestions: contest.numberOfQuestions || 15,
                createdBy: currentUser.email,
                difficulty: contest.difficulty || 'Medium',
            };

            if (!contestData.title) throw new Error("Contest title is required.");
            if (contestData.registrationEndDate <= contestData.registrationStartDate) throw new Error("Registration end date must be after start date.");
            if (contestData.contestStartDate <= contestData.registrationEndDate) throw new Error("Contest start date must be after registration end date.");
            
            onCreateContest(contestData);

        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        }
    };

    const toDateInputString = (timestamp: number | undefined): string => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    
    const toTimeInputString = (timestamp: number | undefined): string => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const handleDateTimeChange = (field: 'registrationStartDate' | 'registrationEndDate' | 'contestStartDate', part: 'date' | 'time', value: string) => {
        const date = new Date(contest[field] || Date.now());
        if (part === 'date') {
            if (!value) return;
            const [year, month, day] = value.split('-').map(Number);
            date.setFullYear(year, month - 1, day);
        } else {
            const [hours, minutes] = value.split(':').map(Number);
            date.setHours(hours, minutes, 0, 0);
        }
        setContest({ ...contest, [field]: date.getTime() });
    };

    return (
        <div className="flex flex-col h-full text-white p-4 sm:p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg">
            <h1 className="text-3xl font-bold text-amber-400 mb-4 flex-shrink-0">Create Your Contest</h1>
            <p className="text-slate-400 mb-6 flex-shrink-0">Fill out the details below. Your contest will be submitted for admin approval before it goes live.</p>
            
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-4 flex-shrink-0" role="alert">
                    <p><strong className="font-bold">Error: </strong>{error}</p>
                    <button onClick={() => setError(null)} className="absolute top-1 right-2 text-2xl">&times;</button>
                </div>
            )}

            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                <Input label="Contest Title" id="title" type="text" value={contest.title || ''} onChange={e => setContest({...contest, title: e.target.value})} />
                <Textarea label="Description" id="description" value={contest.description || ''} onChange={e => setContest({...contest, description: e.target.value})} rows={2} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select label="Category" id="category" value={contest.category} onChange={e => setContest({...contest, category: e.target.value})}>
                        {initialSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                     <Select label="Difficulty" id="difficulty" value={contest.difficulty} onChange={e => setContest({...contest, difficulty: e.target.value as Difficulty})}>
                        {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                    <Select label="Format" id="format" value={contest.format} onChange={e => {
                        const newFormat = e.target.value as 'KBC' | 'FastestFinger';
                        const updates: Partial<Contest> = { format: newFormat };
                        if (newFormat === 'KBC') {
                            updates.numberOfQuestions = 15;
                        }
                        setContest({ ...contest, ...updates });
                    }}>
                        <option value="KBC">KBC (Prize Ladder)</option>
                        <option value="FastestFinger">Fastest Finger (Score & Time)</option>
                    </Select>
                    <Input
                        label="Number of Questions"
                        id="numberOfQuestions"
                        type="number"
                        min="1"
                        value={contest.numberOfQuestions ?? 15}
                        onChange={e => setContest({ ...contest, numberOfQuestions: Number(e.target.value) })}
                        disabled={contest.format === 'KBC'}
                    />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Input label="Entry Fee ($)" id="entryFee" type="number" value={contest.entryFee ?? 0} onChange={e => setContest({...contest, entryFee: Number(e.target.value)})} />
                    <Input label="Prize Pool ($)" id="prizePool" type="number" value={contest.prizePool ?? 0} onChange={e => setContest({...contest, prizePool: Number(e.target.value)})} />
                    <Input label="Max Participants" id="maxParticipants" type="number" value={contest.maxParticipants ?? 0} onChange={e => setContest({...contest, maxParticipants: Number(e.target.value)})} />
                </div>
                 <Select label="Timer Type" id="timerType" value={contest.timerType} onChange={e => setContest({...contest, timerType: e.target.value as 'per_question' | 'total_contest'})}>
                    <option value="per_question">Per Question</option>
                    <option value="total_contest">Total Contest Time</option>
                </Select>
                 {contest.timerType === 'per_question' ? (
                    <Input label="Time Per Question (s)" id="timePerQuestion" type="number" value={contest.timePerQuestion ?? 0} onChange={e => setContest({...contest, timePerQuestion: Number(e.target.value)})} />
                ) : (
                    <TimeSelector
                        label="Total Contest Time"
                        id="totalContestTime"
                        value={contest.totalContestTime ?? 0}
                        onChange={seconds => setContest({ ...contest, totalContestTime: seconds })}
                    />
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-1">Registration Start</label>
                        <div className="flex gap-2">
                            <input type="date" value={toDateInputString(contest.registrationStartDate)} onChange={e => handleDateTimeChange('registrationStartDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                            <input type="time" value={toTimeInputString(contest.registrationStartDate)} onChange={e => handleDateTimeChange('registrationStartDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-1">Registration End</label>
                        <div className="flex gap-2">
                            <input type="date" value={toDateInputString(contest.registrationEndDate)} onChange={e => handleDateTimeChange('registrationEndDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                            <input type="time" value={toTimeInputString(contest.registrationEndDate)} onChange={e => handleDateTimeChange('registrationEndDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-1">Contest Start</label>
                        <div className="flex gap-2">
                            <input type="date" value={toDateInputString(contest.contestStartDate)} onChange={e => handleDateTimeChange('contestStartDate', 'date', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                            <input type="time" value={toTimeInputString(contest.contestStartDate)} onChange={e => handleDateTimeChange('contestStartDate', 'time', e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 rounded-lg py-2 px-3 text-white"/>
                        </div>
                    </div>
                </div>
                <Textarea label="Rules & Regulations" id="rules" value={contest.rules || ''} onChange={e => setContest({...contest, rules: e.target.value})} rows={2} />
                <div className="border-t-2 border-slate-700/50 pt-4 mt-4 space-y-4">
                    <h3 className="text-xl font-semibold text-slate-200">Contest Questions</h3>
                    <p className="text-sm text-slate-400">Paste an array of question objects in JSON format. You must provide questions to submit the contest for approval.</p>
                    <Textarea label='Questions (JSON format)' id="questionsJson" value={questionsJson} onChange={e => setQuestionsJson(e.target.value)} rows={12} placeholder='[{"question": "...", "options": ["..."], "answer": "..."}]' />
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 flex-shrink-0">
                <button onClick={onCancel} className="bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500">Cancel</button>
                <button onClick={handleSubmit} className="bg-amber-500 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-amber-400">Submit for Approval</button>
            </div>
        </div>
    );
};

export default CreateContestScreen;