import React, { useState } from 'react';

interface RegisterScreenProps {
    onRegister: (name: string, email: string, password: string) => Promise<{ success: boolean, message: string }>;
    onCancel: () => void;
    onNavigateToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onCancel, onNavigateToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() === '' || email.trim() === '' || password.trim() === '') {
            setError('All fields are required.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        const result = await onRegister(name, email, password);
        if (!result.success) {
            setError(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-md rounded-lg p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-amber-400 mb-6 text-center">Create Your Account</h2>
                <form onSubmit={handleRegister}>
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-slate-300 text-lg font-semibold mb-2">
                            Name:
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError('');
                            }}
                            className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                            placeholder="e.g., TriviaMaster"
                            autoFocus
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-slate-300 text-lg font-semibold mb-2">
                            Email:
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError('');
                            }}
                            className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                            placeholder="your@email.com"
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-slate-300 text-lg font-semibold mb-2">
                            Password:
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) setError('');
                            }}
                            className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                            placeholder="••••••••"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <div className="flex flex-col gap-4 mt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-amber-500 text-slate-900 font-bold text-lg py-3 px-6 rounded-lg hover:bg-amber-400 transition-colors duration-300 disabled:bg-amber-700 disabled:cursor-wait"
                        >
                            {loading ? 'Creating Account...' : 'Register'}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="w-full bg-slate-600 text-white font-bold text-lg py-3 px-6 rounded-lg hover:bg-slate-500 transition-colors duration-300"
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="text-center mt-6">
                        <p className="text-slate-400">
                            Already have an account?{' '}
                            <button type="button" onClick={onNavigateToLogin} className="font-semibold text-amber-400 hover:text-amber-300 underline">
                                Login here
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterScreen;