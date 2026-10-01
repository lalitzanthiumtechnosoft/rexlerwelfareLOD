import React, { useState, useEffect } from 'react';
import { Login } from './components/user/Login';
import { Register } from './components/user/Register';
import { Dashboard } from './components/user/Dashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import type { AdminUser, AuthUser } from './services/api';

type ActiveTab = 'login' | 'register' | 'dashboard' | 'admin-login' | 'admin-dashboard';

export const App: React.FC = () => {
  const isAdminRoute = /^\/admin\/?$/.test(window.location.pathname);
  const [activeTab, setActiveTab] = useState<ActiveTab>(isAdminRoute ? 'admin-login' : 'login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminSessionMessage, setAdminSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminRoute) {
      const savedAdminToken = localStorage.getItem('rexler_admin_token');
      const savedAdminUser = localStorage.getItem('rexler_admin_user');
      let parsedAdminUser: AdminUser | null = null;

      if (savedAdminUser) {
        try {
          parsedAdminUser = JSON.parse(savedAdminUser) as AdminUser;
        } catch {
          localStorage.removeItem('rexler_admin_user');
        }
      }

      if (savedAdminToken && parsedAdminUser?.role === 'admin') {
        setAdminToken(savedAdminToken);
        setAdminUser(parsedAdminUser);
        setActiveTab('admin-dashboard');
      } else {
        localStorage.removeItem('rexler_admin_token');
        setActiveTab('admin-login');
      }
      return;
    }

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
  }, [isAdminRoute]);

  const handleLoginSuccess = (newToken: string, loggedInUser: AuthUser) => {
    setToken(newToken);
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleRegisterSuccess = () => {
    setActiveTab('login');
  };

  const handleAdminLoginSuccess = (newToken: string, loggedInAdmin: AdminUser) => {
    setAdminSessionMessage(null);
    localStorage.setItem('rexler_admin_token', newToken);
    localStorage.setItem('rexler_admin_user', JSON.stringify(loggedInAdmin));
    setAdminToken(newToken);
    setAdminUser(loggedInAdmin);
    setActiveTab('admin-dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('rexler_token');
    localStorage.removeItem('rexler_user');
    setToken(null);
    setUser(null);
    setActiveTab('login');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('rexler_admin_token');
    localStorage.removeItem('rexler_admin_user');
    setAdminToken(null);
    setAdminUser(null);
    setAdminSessionMessage(null);
    setActiveTab('admin-login');
  };

  const handleAdminSessionExpired = () => {
    localStorage.removeItem('rexler_admin_token');
    localStorage.removeItem('rexler_admin_user');
    setAdminToken(null);
    setAdminUser(null);
    setAdminSessionMessage('Admin session expired or is invalid. Please sign in again.');
    setActiveTab('admin-login');
  };

  if (isAdminRoute && activeTab === 'admin-dashboard' && adminToken && adminUser) {
    return <AdminDashboard token={adminToken} user={adminUser} onLogout={handleAdminLogout} onSessionExpired={handleAdminSessionExpired} />;
  }

  if (isAdminRoute) {
    return (
      <div className="auth-scene">
        <main className="auth-stage">
          <AdminLogin
            onSuccess={handleAdminLoginSuccess}
            onBackToUserLogin={() => window.location.assign('/')}
            sessionMessage={adminSessionMessage}
          />
        </main>
      </div>
    );
  }

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
