import React, { useState, useEffect } from 'react';
import { Navbar } from './components/user/includes/Navbar';
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
    <div className="app-layout">
      {/* Network Constellation Background for Auth pages */}
      <div className="network-bg">
        <div className="network-grid-lines"></div>
        <svg className="constellation-svg" xmlns="http://www.w3.org/2000/svg">
          <line x1="20%" y1="30%" x2="40%" y2="60%" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
          <line x1="40%" y1="60%" x2="75%" y2="40%" stroke="rgba(168, 85, 247, 0.15)" strokeWidth="1" />
          <line x1="75%" y1="40%" x2="85%" y2="70%" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
          <line x1="15%" y1="75%" x2="40%" y2="60%" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" />

          <circle cx="20%" cy="30%" r="4" fill="rgba(6, 182, 212, 0.4)" />
          <circle cx="40%" cy="60%" r="5" fill="rgba(168, 85, 247, 0.5)" />
          <circle cx="75%" cy="40%" r="4" fill="rgba(6, 182, 212, 0.4)" />
          <circle cx="85%" cy="70%" r="3" fill="rgba(99, 102, 241, 0.4)" />
          <circle cx="15%" cy="75%" r="4" fill="rgba(168, 85, 247, 0.4)" />
        </svg>
      </div>

      {/* Top Navbar for Auth pages */}
      <Navbar />

      {/* Main Auth Container */}
      <main className="main-wrapper">
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
