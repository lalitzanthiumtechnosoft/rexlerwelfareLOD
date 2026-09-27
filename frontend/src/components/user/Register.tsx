import React, { useState } from 'react';
import { User, Mail, Lock, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { registerUser } from '../../services/api';

interface RegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setSuccessMsg(response.message || 'Account created successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rexler-card">
      {/* Top Nav inside card: Home | Login */}
      <div className="card-top-nav">
        <span className="card-nav-link" onClick={() => window.location.reload()}>Home</span>
        <span className="card-nav-divider">|</span>
        <span className="card-nav-link" onClick={onSwitchToLogin}>Login</span>
      </div>

      {/* Rexler Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
        <img src={logoImg} alt="Rexler Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
      </div>

      {/* Title */}
      <h2 className="rexler-heading">Sign Up</h2>

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
        {/* Name input */}
        <div className="rexler-input-wrapper">
          <input
            type="text"
            className="rexler-input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="name"
          />
          <div className="rexler-input-icon-box">
            <User size={18} />
          </div>
        </div>

        {/* Email input */}
        <div className="rexler-input-wrapper">
          <input
            type="email"
            className="rexler-input"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="email"
          />
          <div className="rexler-input-icon-box">
            <Mail size={18} />
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
            autoComplete="new-password"
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
          <div className="rexler-subtext">
            Already have an account? 
            <button type="button" onClick={onSwitchToLogin}>
              Login
            </button>
          </div>
        </div>

        {/* SIGN UP Button */}
        <button type="submit" className="rexler-submit-btn" disabled={isLoading}>
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            'SIGN UP'
          )}
        </button>
      </form>
    </div>
  );
};
