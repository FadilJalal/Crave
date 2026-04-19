import React, { useContext, useEffect } from 'react';
import './Wallet.css';
import { StoreContext } from '../../Context/StoreContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Wallet = () => {
    const { walletBalance, walletHistory, token, currency, fetchWalletBalance } = useContext(StoreContext);
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/');
        } else {
            fetchWalletBalance();
        }
    }, [token]);

    return (
        <div className="wallet-container">
            <div className="wallet-header">
                <h2>Crave Wallet</h2>
                <div className="wallet-balance-card">
                    <p>Current Balance</p>
                    <h1>{currency} {walletBalance ? walletBalance.toFixed(2) : "0.00"}</h1>
                    <span className="wallet-badge">Use balance on your next order automatically (Coming Soon!)</span>
                </div>
            </div>

            <div className="wallet-history">
                <h3>Transaction History</h3>
                {walletHistory && walletHistory.length > 0 ? (
                    <ul className="wallet-history-list">
                        {walletHistory.slice().reverse().map((tx, idx) => (
                            <li key={idx} className="wallet-history-item">
                                <div className="tx-details">
                                    <p className="tx-desc">{tx.description || "Credit"}</p>
                                    <p className="tx-date">{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}</p>
                                </div>
                                <div className={`tx-amount ${tx.type}`}>
                                    {tx.type === 'credit' ? '+' : '-'}{currency} {tx.amount.toFixed(2)}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="empty-wallet">
                        <p>No transactions yet.</p>
                        <p className="empty-sub">Earn credits by using Shared Delivery!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wallet;
