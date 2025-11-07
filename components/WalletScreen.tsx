import React, { useState } from 'react';
import { User, Transaction } from '../types';

interface WalletScreenProps {
    currentUser: User;
    onStartDeposit: (amount: number) => void;
    onWithdraw: (amount: number) => void;
    onBack: () => void;
}

const getStatusBadge = (tx: Transaction) => {
    if (tx.status === 'pending') {
        return <span className="text-xs font-semibold px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full ml-2">Pending</span>
    }
    if (tx.status === 'declined') {
        return <span className="text-xs font-semibold px-2 py-1 bg-red-500/20 text-red-300 rounded-full ml-2">Declined</span>
    }
    return null;
}

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const isCredit = transaction.amount > 0;
    const amountColor = isCredit ? 'text-green-400' : 'text-red-400';
    const sign = isCredit ? '+' : '';

    return (
        <li className="flex justify-between items-center py-3 px-4 bg-slate-800/50 rounded-lg">
            <div>
                <div className="flex items-center">
                    <p className="font-semibold text-white">{transaction.description}</p>
                    {getStatusBadge(transaction)}
                </div>
                <p className="text-xs text-slate-400">{new Date(transaction.timestamp).toLocaleString()}</p>
            </div>
            <p className={`font-bold text-lg font-roboto-mono ${amountColor}`}>{sign}${transaction.amount.toLocaleString()}</p>
        </li>
    );
};

const WalletScreen: React.FC<WalletScreenProps> = ({ currentUser, onStartDeposit, onWithdraw, onBack }) => {
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid positive amount to deposit.');
            return;
        }
        setError(null);
        onStartDeposit(amount);
        setDepositAmount('');
    };

    const handleWithdraw = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid positive amount to withdraw.');
            return;
        }
        if (amount > currentUser.walletBalance) {
            setError('Withdrawal amount cannot exceed your current balance.');
            return;
        }
        setError(null);
        onWithdraw(amount);
        setWithdrawAmount('');
    };

    return (
        <div className="flex flex-col h-full text-white p-4 sm:p-8 bg-slate-900/50 backdrop-blur-sm rounded-lg">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold text-amber-400">My Wallet</h1>
                <button onClick={onBack} className="bg-slate-600 font-bold py-2 px-5 rounded-lg hover:bg-slate-500 transition-colors">
                    &larr; Back to Contests
                </button>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 flex-shrink-0">
                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 text-center">
                    <h2 className="text-slate-400 uppercase tracking-wider text-sm font-semibold mb-2">Current Balance</h2>
                    <p className="text-4xl font-bold text-amber-300 font-roboto-mono">${currentUser.walletBalance.toLocaleString()}</p>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 flex flex-col sm:flex-row gap-4">
                    <form onSubmit={handleDeposit} className="flex-1">
                        <label htmlFor="deposit" className="block text-slate-300 text-sm font-semibold mb-2">Deposit Funds</label>
                        <div className="flex gap-2">
                            <input id="deposit" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Amount" className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-green-400" />
                            <button type="submit" className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-500 transition-colors">Add</button>
                        </div>
                    </form>
                    <form onSubmit={handleWithdraw} className="flex-1">
                        <label htmlFor="withdraw" className="block text-slate-300 text-sm font-semibold mb-2">Request Withdrawal</label>
                        <div className="flex gap-2">
                            <input id="withdraw" type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Amount" className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-red-400" />
                            <button type="submit" className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-500 transition-colors">Withdraw</button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="flex-grow flex flex-col overflow-hidden">
                <h2 className="text-2xl font-bold text-slate-200 mb-4 flex-shrink-0">Transaction History</h2>
                {currentUser.transactions && currentUser.transactions.length > 0 ? (
                    <ul className="space-y-3 overflow-y-auto pr-2">
                        {currentUser.transactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
                    </ul>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-slate-500 bg-slate-800/30 rounded-lg">
                        <p>No transactions yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
export default WalletScreen;