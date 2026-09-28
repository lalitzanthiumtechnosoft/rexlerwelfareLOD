import React, { useState } from 'react';
import { UserRound, LockKeyhole, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { loginUser } from '../../services/api';
import type { AuthUser } from '../../services/api';
import "../../index.css"
interface LoginProps {
  onSuccess: (token: string, user: AuthUser) => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!userId.trim()) {
      setErrorMsg('Please enter your User Id');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser({ userId: userId.trim(), password });
      
      if (response.token) {
        setSuccessMsg(response.message || 'Login successful!');
        localStorage.setItem('rexler_token', response.token);
        if (response.user) {
          localStorage.setItem('rexler_user', JSON.stringify(response.user));
        }
        
        setTimeout(() => {
          onSuccess(response.token!, response.user || { userId });
        }, 800);
      } else {
        setErrorMsg(response.error || 'Login failed. Invalid credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <nav className="auth-card-nav" aria-label="Account navigation">
        <button type="button" onClick={() => window.location.reload()}>Home</button>
        <span aria-hidden="true">|</span>
        <button type="button" onClick={onSwitchToRegister}>Sign Up</button>
      </nav>

      <img className="auth-logo" src={logoImg} alt="Rexler Welfare Foundation" />
      <h1 className="auth-title" id="auth-title">Login</h1>

      {/* Messages */}
      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert-box success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Form */}
      <form className="auth-form" onSubmit={handleSubmit}>
        {/* User Id input */}
        <label className="auth-input-wrap">
          <input
            type="text"
            className="auth-input"
            placeholder="User Id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="username"
          />
          <span className="auth-input-icon"><UserRound size={15} /></span>
        </label>

        {/* Password input */}
        <label className="auth-input-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="current-password"
          />
          <button
            className="auth-input-icon auth-input-action"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <LockKeyhole size={15} />}
          </button>
        </label>

        {/* Sub-links */}
        <div className="auth-links">
          <a 
            href="#forgot" 
            className="auth-forgot-link" 
            onClick={(e) => { 
              e.preventDefault(); 
              alert('Please contact your Rexler administrator to reset your password.'); 
            }}
          >
            Forgot Password
          </a>

          <div className="auth-switch-prompt">
            Don't have an account? 
            <button type="button" onClick={onSwitchToRegister}>
              Sign up
            </button>
          </div>
        </div>

        {/* LOGIN Button */}
        <button type="submit" className="auth-submit-btn" disabled={isLoading}>
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            'LOGIN'
          )}
        </button>
      </form>
    </section>
  );
};
