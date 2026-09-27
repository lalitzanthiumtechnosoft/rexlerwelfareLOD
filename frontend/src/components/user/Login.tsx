import React, { useState } from 'react';
import { User, Lock, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { loginUser } from '../../services/api';
import type { AuthUser } from '../../services/api';

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
    <div className="rexler-card">
      {/* Top Nav inside card: Home | Sign Up */}
      <div className="card-top-nav">
        <span className="card-nav-link" onClick={() => window.location.reload()}>Home</span>
        <span className="card-nav-divider">|</span>
        <span className="card-nav-link" onClick={onSwitchToRegister}>Sign Up</span>
      </div>

      {/* Rexler Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
        <img src={logoImg} alt="Rexler Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
      </div>

      {/* Title */}
      <h2 className="rexler-heading">Login</h2>

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
      <form className="rexler-form" onSubmit={handleSubmit}>
        {/* User Id input */}
        <div className="rexler-input-wrapper">
          <input
            type="text"
            className="rexler-input"
            placeholder="User Id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="username"
          />
          <div className="rexler-input-icon-box">
            <User size={18} />
          </div>
        </div>

        {/* Password input */}
        <div className="rexler-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            className="rexler-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="current-password"
          />
          <div 
            className="rexler-input-icon-box"
            onClick={() => setShowPassword(!showPassword)}
            style={{ cursor: 'pointer' }}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Lock size={18} />}
          </div>
        </div>

        {/* Sub-links */}
        <div className="rexler-links-container">
          <a 
            href="#forgot" 
            className="rexler-link" 
            onClick={(e) => { 
              e.preventDefault(); 
              alert('Please contact your Rexler administrator to reset your password.'); 
            }}
          >
            Forgot Password
          </a>

          <div className="rexler-subtext">
            Don't have an account? 
            <button type="button" onClick={onSwitchToRegister}>
              Sign up
            </button>
          </div>
        </div>

        {/* LOGIN Button */}
        <button type="submit" className="rexler-submit-btn" disabled={isLoading}>
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            'LOGIN'
          )}
        </button>
      </form>
    </div>
  );
};
