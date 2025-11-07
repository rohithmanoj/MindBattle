import React, { useState } from 'react';

interface AdminLoginScreenProps {
  onAdminLogin: (email: string, password: string) => Promise<boolean>;
  onCancel: () => void;
  onNavigateToUserLogin: () => void;
}

const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onAdminLogin, onCancel, onNavigateToUserLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() === '' || password.trim() === '') {
      setError('Email and password cannot be empty.');
      return;
    }
    const success = await onAdminLogin(email, password);
    if (!success) {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-md rounded-lg p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-red-400 mb-6 text-center">Admin Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-slate-300 text-lg font-semibold mb-2">
              Admin Email:
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
              placeholder="admin@email.com"
              autoFocus
            />
          </div>
           <div className="mb-4">
            <label htmlFor="password"className="block text-slate-300 text-lg font-semibold mb-2">
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
              className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <div className="flex flex-col gap-4 mt-8">
             <button
              type="submit"
              className="w-full bg-red-600 text-white font-bold text-lg py-3 px-6 rounded-lg hover:bg-red-500 transition-colors duration-300"
            >
              Login as Admin
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
                  Not an admin?{' '}
                  <button type="button" onClick={onNavigateToUserLogin} className="font-semibold text-amber-400 hover:text-amber-300 underline">
                      Go to user login
                  </button>
              </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginScreen;