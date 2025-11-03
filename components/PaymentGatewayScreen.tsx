import React, { useState, useEffect } from 'react';

interface PaymentGatewayScreenProps {
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const PaymentGatewayScreen: React.FC<PaymentGatewayScreenProps> = ({ amount, onSuccess, onCancel }) => {
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ''))) {
            setError('Please enter a valid 16-digit card number.');
            return;
        }
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            setError('Please enter a valid expiry date in MM/YY format.');
            return;
        }
        if (!/^\d{3}$/.test(cvv)) {
            setError('Please enter a valid 3-digit CVV.');
            return;
        }
        
        setIsProcessing(true);
        setTimeout(() => {
            onSuccess();
        }, 3000); // Simulate network delay
    };
    
    // Format card number with spaces
    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || '';
        setCardNumber(formatted.substring(0, 19));
    };

    // Format expiry date with a slash
    const formatExpiry = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 3) {
            setExpiry(`${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`);
        } else {
            setExpiry(cleaned);
        }
    };


    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xl">Processing payment...</p>
                <p className="text-sm text-gray-400">Please do not close this window.</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-md rounded-lg p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-amber-400 mb-2 text-center">Secure Payment</h2>
                <p className="text-center text-slate-300 mb-6">You are paying: <span className="font-bold text-white text-lg">${amount.toLocaleString()}</span></p>

                <form onSubmit={handlePayment}>
                    <div className="mb-4">
                        <label htmlFor="cardNumber" className="block text-slate-300 font-semibold mb-2">Card Number</label>
                        <input id="cardNumber" type="text" value={cardNumber} onChange={(e) => formatCardNumber(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-roboto-mono" placeholder="0000 0000 0000 0000" />
                    </div>
                    <div className="flex gap-4 mb-4">
                        <div className="w-1/2">
                             <label htmlFor="expiry" className="block text-slate-300 font-semibold mb-2">Expiry Date</label>
                            <input id="expiry" type="text" value={expiry} onChange={(e) => formatExpiry(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="MM/YY" />
                        </div>
                        <div className="w-1/2">
                             <label htmlFor="cvv" className="block text-slate-300 font-semibold mb-2">CVV</label>
                            <input id="cvv" type="text" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))} className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="123" />
                        </div>
                    </div>
                    
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    
                    <div className="flex flex-col gap-4 mt-8">
                        <button type="submit" className="w-full bg-green-600 text-white font-bold text-lg py-3 px-6 rounded-lg hover:bg-green-500 transition-colors duration-300">
                            Pay ${amount.toLocaleString()}
                        </button>
                        <button type="button" onClick={onCancel} className="w-full bg-slate-600 text-white font-bold text-lg py-3 px-6 rounded-lg hover:bg-slate-500 transition-colors duration-300">
                            Cancel Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentGatewayScreen;
