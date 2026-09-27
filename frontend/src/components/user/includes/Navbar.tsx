import React, { useEffect, useState } from 'react';
import { ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { checkHealth } from '../../../services/api';

export const Navbar: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkServer = async () => {
      const status = await checkHealth();
      setIsOnline(status);
    };

    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="navbar-minimal">
      <div className="brand-title">
        <ShieldCheck size={20} color="var(--accent-cyan)" />
        <span>Rexler Welfare Foundation</span>
      </div>

      <div className="api-status-badge">
        <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>
          {isOnline ? 'Backend Online (Port 5000)' : 'Checking Backend...'}
        </span>
        {isOnline ? <Wifi size={13} color="var(--accent-emerald)" /> : <WifiOff size={13} color="var(--accent-rose)" />}
      </div>
    </header>
  );
};
