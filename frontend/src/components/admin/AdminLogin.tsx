import React, { useState } from 'react';
import { AlertCircle, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { loginAdmin } from '../../services/api';
import type { AdminUser } from '../../services/api';

interface AdminLoginProps {
  onSuccess: (token: string, user: AdminUser) => void;
  onBackToUserLogin: () => void;
  sessionMessage?: string | null;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToUserLogin, sessionMessage }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await loginAdmin({ userId: userId.trim(), password });
      if (!response.token || !response.user) {
        setError(response.error || 'Admin login failed.');
        return;
      }
      onSuccess(response.token, response.user);
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : 'Admin login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-card admin-auth-card" aria-labelledby="admin-auth-title">
      <nav className="auth-card-nav" aria-label="Login navigation">
        <button type="button" onClick={onBackToUserLogin}>User Login</button>
      </nav>
      <img className="auth-logo" src={logoImg} alt="Rexler Welfare Foundation" />
      <div className="admin-auth-eyebrow"><ShieldCheck size={14} /> ADMIN PORTAL</div>
      <h1 className="auth-title" id="admin-auth-title">Admin Login</h1>

      {sessionMessage && (
        <div className="alert-box error admin-auth-error" role="status">{sessionMessage}</div>
      )}

      {error && (
        <div className="alert-box error admin-auth-error" role="alert">
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="auth-input-wrap">
          <input
            type="text"
            className="auth-input"
            placeholder="Admin ID"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={isLoading}
            autoComplete="username"
            required
          />
          <span className="auth-input-icon"><UserRound size={15} /></span>
        </label>

        <label className="auth-input-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            required
          />
          <button
            className="auth-input-icon auth-input-action"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <LockKeyhole size={15} />}
          </button>
        </label>

        <button type="submit" className="auth-submit-btn" disabled={isLoading}>
          {isLoading ? <div className="spinner" /> : 'ADMIN LOGIN'}
        </button>
      </form>
    </section>
  );
};

export default AdminLogin;