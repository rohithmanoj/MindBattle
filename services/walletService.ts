
import { StoredUser, Transaction, WalletAction } from '../types';

// This is a pure function. It takes the current user state and an action,
// and returns the new user state. It does not modify state directly.
export const processWalletAction = (user: StoredUser, action: WalletAction): StoredUser => {
    const { type, payload } = action;
    const { amount, description, status, updatedBy } = payload;
    let newBalance = user.walletBalance;
    let updatedTransactions = [...(user.transactions || [])];

    switch (type) {
        case 'DEPOSIT':
        case 'CONTEST_WIN':
        case 'CONTEST_REFUND': {
            const newTransaction: Transaction = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                type: type === 'DEPOSIT' ? 'deposit' : type === 'CONTEST_WIN' ? 'win' : 'refund',
                amount: Math.abs(amount),
                description,
                timestamp: Date.now(),
                status: 'completed',
            };
            newBalance += newTransaction.amount;
            updatedTransactions.unshift(newTransaction);
            break;
        }

        case 'CONTEST_ENTRY': {
            const newTransaction: Transaction = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                type: 'entry_fee',
                amount: -Math.abs(amount),
                description,
                timestamp: Date.now(),
                status: 'completed',
            };
            newBalance += newTransaction.amount;
            updatedTransactions.unshift(newTransaction);
            break;
        }

        case 'ADMIN_ADJUSTMENT': {
            const newTransaction: Transaction = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                type: 'admin_adjustment',
                amount: amount, // Can be positive or negative
                description,
                timestamp: Date.now(),
                status: 'completed',
                updatedBy,
            };
            newBalance += newTransaction.amount;
            updatedTransactions.unshift(newTransaction);
            break;
        }

        case 'WITHDRAWAL_REQUEST': {
            const newTransaction: Transaction = {
                id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                type: 'pending_withdrawal',
                amount: -Math.abs(amount), // Store as negative, but don't deduct from balance yet
                description,
                timestamp: Date.now(),
                status: 'pending',
            };
            // Balance does not change on request, only on approval
            updatedTransactions.unshift(newTransaction);
            break;
        }
        
        case 'WITHDRAWAL_APPROVE': {
            const txIndex = updatedTransactions.findIndex(tx => tx.id === payload.transactionId && tx.status === 'pending');
            if (txIndex > -1) {
                const originalTx = updatedTransactions[txIndex];
                updatedTransactions[txIndex] = {
                    ...originalTx,
                    type: 'withdrawal',
                    status: 'completed',
                    description: description || 'Withdrawal approved by admin',
                    updatedBy,
                };
                // Now deduct the amount from the balance
                newBalance += originalTx.amount; // amount is already negative
            }
            break;
        }

        case 'WITHDRAWAL_DECLINE': {
             const txIndex = updatedTransactions.findIndex(tx => tx.id === payload.transactionId && tx.status === 'pending');
            if (txIndex > -1) {
                const originalTx = updatedTransactions[txIndex];
                updatedTransactions[txIndex] = {
                    ...originalTx,
                    type: 'withdrawal_declined',
                    status: 'declined',
                    description: description || 'Withdrawal declined by admin',
                    updatedBy,
                };
                // No balance change on decline
            }
            break;
        }

        default:
            // Should not happen with TypeScript, but good for safety
            console.warn(`Unknown wallet action type: ${type}`);
            return user;
    }
    
    return {
        ...user,
        walletBalance: newBalance,
        transactions: updatedTransactions,
    };
};
