import React, { useState } from 'react';
import { UserRound, Mail, LockKeyhole, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <section className="auth-card auth-card-register" aria-labelledby="auth-title">
      <nav className="auth-card-nav" aria-label="Account navigation">
        <button type="button" onClick={() => window.location.reload()}>Home</button>
        <span aria-hidden="true">|</span>
        <button type="button" onClick={onSwitchToLogin}>Login</button>
      </nav>

      <img className="auth-logo" src={logoImg} alt="Rexler Welfare Foundation" />
      <h1 className="auth-title" id="auth-title">Sign Up</h1>

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
        {/* Name input */}
        <label className="auth-input-wrap">
          <input
            type="text"
            className="auth-input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="name"
          />
          <span className="auth-input-icon"><UserRound size={15} /></span>
        </label>

        {/* Email input */}
        <label className="auth-input-wrap">
          <input
            type="email"
            className="auth-input"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="email"
          />
          <span className="auth-input-icon"><Mail size={15} /></span>
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
            autoComplete="new-password"
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
          <div className="auth-switch-prompt">
            Already have an account? 
            <button type="button" onClick={onSwitchToLogin}>
              Login
            </button>
          </div>
        </div>

        {/* SIGN UP Button */}
        <button type="submit" className="auth-submit-btn" disabled={isLoading}>
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            'SIGN UP'
          )}
        </button>
      </form>
    </section>
  );
};
