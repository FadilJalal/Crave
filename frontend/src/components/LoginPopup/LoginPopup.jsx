// frontend/src/components/LoginPopup/LoginPopup.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import './LoginPopup.css';
import { StoreContext } from '../../Context/StoreContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const LoginPopup = ({ setShowLogin }) => {
  const { setToken, url, loadCartData } = useContext(StoreContext);
  const [mode, setMode]         = useState('user');
  const [isLogin, setIsLogin]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [screen, setScreen]     = useState('main'); // main | forgot | forgot-sent
  const [forgotEmail, setForgotEmail] = useState('');
  const modalRef = useRef(null);

  const onChange = (e) => setData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) setShowLogin(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      if (mode === 'admin') {
        const res = await axios.post(`${url}/api/admin/login-super`, { email: data.email, password: data.password });
        if (res.data.success) {
          window.location.href = `${import.meta.env.VITE_SUPER_ADMIN_URL || 'http://localhost:5173'}/bridge?token=${encodeURIComponent(res.data.token)}`;
          setShowLogin(false);
        } else { toast.error(res.data.message || 'Admin login failed'); }
        return;
      }
      if (mode === 'restaurant') {
        const res = await axios.post(`${url}/api/admin/login-restaurant`, { email: data.email, password: data.password });
        if (res.data.success) {
          localStorage.setItem('restaurantInfo', JSON.stringify(res.data.restaurant));
          setShowLogin(false);
          window.location.href = `${import.meta.env.VITE_RESTAURANT_ADMIN_URL || 'http://localhost:5175'}/bridge?token=${encodeURIComponent(res.data.token)}`;
        } else { toast.error(res.data.message || 'Restaurant login failed'); }
        return;
      }
      const endpoint = isLogin ? '/api/user/login' : '/api/user/register';
      const res = await axios.post(url + endpoint, data);
      if (res.data.success) {
        setToken(res.data.token);
        localStorage.setItem('token', res.data.token);
        // ✅ Pass true to MERGE guest cart with server cart instead of wiping it
        await loadCartData(res.data.token, true);
        toast.success(isLogin ? 'Welcome back!' : 'Account created!');
        setShowLogin(false);
      } else { toast.error(res.data.message || 'Something went wrong'); }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Network error');
    } finally { setLoading(false); }
  };

  const onForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error('Enter your email address'); return; }
    setLoading(true);
    try {
      const type = mode === 'restaurant' ? 'restaurant' : 'customer';
      const res = await axios.post(`${url}/api/auth/forgot-password`, { email: forgotEmail.trim(), type });
      if (res.data.success) { setScreen('forgot-sent'); }
      else { toast.error(res.data.message || 'Failed to send reset email'); }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Network error');
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'user',       label: 'Customer',   icon: '👤' },
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { id: 'admin',      label: 'Admin',      icon: '⚙️' },
  ];

  const showForgotLink = (mode === 'user' && isLogin) || mode === 'restaurant';

  return (
    <div className='lp-overlay' onMouseDown={handleOverlayClick}>
      <div className='lp-modal' ref={modalRef}>

        <button className='lp-close' type='button' onClick={() => setShowLogin(false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className='lp-brand'>
          <div className='lp-brand-icon'>🔥</div>
          <h2 className='lp-brand-name'>Crave.</h2>
        </div>

        <div className='lp-tabs'>
          {tabs.map(t => (
            <button key={t.id}
              className={`lp-tab ${mode === t.id ? 'lp-tab-active' : ''}`}
              type='button'
              onClick={() => { setMode(t.id); setScreen('main'); setForgotEmail(''); }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── MAIN SCREEN ── */}
        {screen === 'main' && (
          <>
            {mode === 'user' && (
              <div className='lp-toggle'>
                <button className={`lp-tog-btn ${!isLogin ? 'lp-tog-active' : ''}`} type='button' onClick={() => setIsLogin(false)}>Sign Up</button>
                <button className={`lp-tog-btn ${isLogin ? 'lp-tog-active' : ''}`} type='button' onClick={() => setIsLogin(true)}>Sign In</button>
              </div>
            )}

            <form onSubmit={onSubmit} className='lp-form'>
              {mode === 'user' && !isLogin && (
                <div className='lp-field'>
                  <label>Full Name</label>
                  <input name='name' value={data.name} onChange={onChange} placeholder='John Doe' required />
                </div>
              )}

              <div className='lp-field'>
                <label>Email Address</label>
                <input name='email' type='email' value={data.email} onChange={onChange} placeholder='you@example.com' required />
              </div>

              <div className='lp-field'>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Password</label>
                  {showForgotLink && (
                    <button type='button'
                      onClick={() => { setScreen('forgot'); setForgotEmail(data.email); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ff4e2a', fontWeight: 700, padding: 0 }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className='lp-pass-wrap'>
                  <input name='password' type={showPass ? 'text' : 'password'}
                    value={data.password} onChange={onChange} placeholder='••••••••' required />
                  <button type='button' className='lp-pass-toggle' onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className='lp-terms'>
                <input type='checkbox' id='lp-agree' required />
                <label htmlFor='lp-agree'>I agree to the <span>Terms of Use</span> & <span>Privacy Policy</span></label>
              </div>

              <button className='lp-submit' type='submit' disabled={loading}>
                {loading ? 'Please wait...' : mode === 'admin' ? 'Admin Login' : mode === 'restaurant' ? 'Restaurant Login' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </>
        )}

        {/* ── FORGOT SCREEN ── */}
        {screen === 'forgot' && (
          <div style={{ marginTop: 8 }}>
            <button type='button' onClick={() => setScreen('main')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280', fontWeight: 700, padding: '0 0 14px', display: 'block' }}>
              ← Back
            </button>
            <h3 style={{ margin: '0 0 6px', fontWeight: 900, color: '#111827', fontSize: 18 }}>Reset password</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
              We'll send a reset link to your {mode === 'restaurant' ? 'restaurant' : ''} email.
            </p>
            <form onSubmit={onForgot} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className='lp-field'>
                <label>Email Address</label>
                <input type='email' value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder='you@example.com' autoFocus />
              </div>
              <button className='lp-submit' type='submit' disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>
          </div>
        )}

        {/* ── SENT SCREEN ── */}
        {screen === 'forgot-sent' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📬</div>
            <h3 style={{ margin: '0 0 8px', fontWeight: 900, color: '#111827', fontSize: 18 }}>Check your inbox</h3>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              We sent a reset link to <strong>{forgotEmail}</strong>.<br/>Expires in <strong>1 hour</strong>.
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 20px' }}>
              Didn't get it? Check spam or{' '}
              <button type='button' onClick={() => setScreen('forgot')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4e2a', fontWeight: 700, fontSize: 12, padding: 0 }}>
                try again
              </button>.
            </p>
            <button className='lp-submit' type='button' onClick={() => setScreen('main')}>Back to Login</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginPopup;