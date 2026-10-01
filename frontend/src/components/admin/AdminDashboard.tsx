import React, { useEffect, useState } from 'react';
import {
  Check,
  CircleDollarSign,
  Copy,
  Gift,
  Maximize,
  Minimize,
  LogOut,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRoundCheck,
  UserRoundX,
  Users,
  Wallet
} from 'lucide-react';
import logoImg from '../../assets/favicon.png';
import { fetchAdminDashboard, isAdminSessionError } from '../../services/api';
import type { AdminDashboardResponse, AdminUser } from '../../services/api';
import { AdminSidebar } from './include/sidebar';
import type { AdminPageKey } from './include/sidebar';
import { ViewMember } from './viewMember';
import './admin.css';
import './admin-members.css';

interface AdminDashboardProps {
  token: string;
  user: AdminUser;
  onLogout: () => void;
  onSessionExpired: () => void;
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, user, onLogout, onSessionExpired }) => {
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePage, setActivePage] = useState<AdminPageKey>('dashboard');
  const [activePageLabel, setActivePageLabel] = useState('Dashboard');

  useEffect(() => {
    let cancelled = false;
    fetchAdminDashboard(token)
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        if (isAdminSessionError(loadError)) {
          onSessionExpired();
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load admin dashboard.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, onSessionExpired]);

  const referralLink = dashboard ? new URL(dashboard.referralUrl, window.location.origin).href : '';

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy referral link.');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const shareReferral = (service: 'whatsapp' | 'facebook' | 'telegram') => {
    const encodedUrl = encodeURIComponent(referralLink);
    const urls = {
      whatsapp: `https://api.whatsapp.com/send?text=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      telegram: `https://telegram.me/share/url?url=${encodedUrl}`
    };
    window.open(urls[service], '_blank', 'noopener,noreferrer');
  };

  const stats = dashboard?.stats;
  const isDashboardPage = activePage === 'dashboard';
  const memberPage = ['viewMember', 'searchMember', 'viewActiveMember', 'viewInActiveMember'].includes(activePage);
  const cards = [
    { label: 'Total User', value: stats?.totalUsers.toLocaleString('en-IN') ?? '—', icon: Users, tone: 'cyan' },
    { label: 'Active User', value: stats?.activeUsers.toLocaleString('en-IN') ?? '—', icon: UserRoundCheck, tone: 'green' },
    { label: 'In Active User', value: stats?.inactiveUsers.toLocaleString('en-IN') ?? '—', icon: UserRoundX, tone: 'coral' },
    { label: 'Total Business', value: stats ? money(stats.totalBusiness) : '—', icon: CircleDollarSign, tone: 'sky' },
    { label: 'Today Business', value: stats ? money(stats.todayBusiness) : '—', icon: TrendingUp, tone: 'green' },
    { label: 'Income Wallet Outstanding', value: stats ? money(stats.incomeWalletOutstanding) : '—', icon: Wallet, tone: 'mint' },
    { label: 'Total Reward', value: money(stats?.totalRewards ?? 0), icon: Gift, tone: 'amber' }
  ];
  const filteredCards = cards.filter((card) => card.label.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="admin-shell">
      <AdminSidebar
        activePage={activePage}
        onNavigate={(page, label) => {
          setActivePage(page);
          setActivePageLabel(label);
        }}
        onLogout={onLogout}
      />

      <div className="admin-main">
        <header className="admin-topbar">
          <label className="admin-topbar-search">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Type here to search..."
              aria-label="Search dashboard statistics"
            />
            <Search size={15} />
          </label>
          <div className="admin-account">
            <button type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <img src={logoImg} alt="" className="admin-account-avatar" />
            <span><strong>{user.name}</strong><small>{user.userId}</small></span>
            <button type="button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </header>

        <main className="admin-content">
          <div className="admin-page-heading">
            <div><span className="admin-kicker">ADMINISTRATION</span><h1>{activePageLabel}</h1></div>
            <div className="admin-breadcrumb"><ShieldCheck size={13} /> / {activePageLabel.toUpperCase()}</div>
          </div>

          {error && <div className="admin-alert" role="alert">{error}</div>}

          {isDashboardPage ? (
            <>
              <section className="admin-referral" aria-label="Referral link">
                <label htmlFor="admin-referral-link">Referral Link</label>
                <input id="admin-referral-link" readOnly value={referralLink} placeholder="Loading referral link..." />
                <button type="button" onClick={() => void handleCopyReferral()} disabled={!referralLink}>
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button type="button" className="whatsapp" onClick={() => shareReferral('whatsapp')} disabled={!referralLink}>WhatsApp</button>
                <button type="button" className="facebook" onClick={() => shareReferral('facebook')} disabled={!referralLink}>Facebook</button>
                <button type="button" className="telegram" onClick={() => shareReferral('telegram')} disabled={!referralLink}>Telegram</button>
              </section>

              {isLoading ? (
                <div className="admin-loading">Loading dashboard statistics...</div>
              ) : (
                <section className="admin-stat-grid" aria-label="Dashboard statistics">
                  {filteredCards.map(({ label, value, icon: Icon, tone }) => (
                    <article className={`admin-stat-card ${tone}`} key={label}>
                      <div className="admin-stat-icon"><Icon size={19} /></div>
                      <div className="admin-stat-copy"><strong>{value}</strong><span>{label}</span></div>
                    </article>
                  ))}
                  {filteredCards.length === 0 && <div className="admin-no-matches">No dashboard statistics match that search.</div>}
                </section>
              )}
            </>
          ) : memberPage ? (
            <ViewMember
              token={token}
              initialStatus={activePage === 'viewActiveMember' ? 'active' : activePage === 'viewInActiveMember' ? 'inactive' : 'all'}
              onSessionExpired={onSessionExpired}
            />
          ) : (
            <section className="admin-module-placeholder">
              <h2>{activePageLabel}</h2>
              <p>This admin page has not been connected yet.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;