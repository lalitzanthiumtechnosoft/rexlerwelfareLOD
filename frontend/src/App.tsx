import React, { useState, useEffect } from 'react';
import { Login } from './components/user/Login';
import { Register } from './components/user/Register';
import { Dashboard } from './components/user/Dashboard';
import type { AuthUser } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'dashboard'>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('rexler_token');
    const savedUser = localStorage.getItem('rexler_user');

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          // ignore error
        }
      }
      setActiveTab('dashboard');
    } else if (new URLSearchParams(window.location.search).has('affiliateCode')) {
      setActiveTab('register');
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedInUser: AuthUser) => {
    setToken(newToken);
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleRegisterSuccess = () => {
    setActiveTab('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('rexler_token');
    localStorage.removeItem('rexler_user');
    setToken(null);
    setUser(null);
    setActiveTab('login');
  };

  if (activeTab === 'dashboard' && token) {
    return (
      <Dashboard 
        user={user || { name: 'User' }} 
        token={token} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <div className="auth-scene">
      <main className="auth-stage">
        {activeTab === 'login' && (
          <Login 
            onSuccess={handleLoginSuccess} 
            onSwitchToRegister={() => setActiveTab('register')} 
          />
        )}

        {activeTab === 'register' && (
          <Register 
            onSuccess={handleRegisterSuccess} 
            onSwitchToLogin={() => setActiveTab('login')} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
