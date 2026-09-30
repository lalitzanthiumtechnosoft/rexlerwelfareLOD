import React, { useEffect, useState } from 'react';
import { 
  User, CreditCard, Gift, Activity, Zap, Copy, 
  Moon, Sun, Maximize, Minimize, Home, CheckCircle2,
  Share2, Lock, Building, Save, KeyRound, Menu, ArrowUpRight, ChevronDown, LogOut
} from 'lucide-react';
import { Sidebar } from './includes/Sidebar';
import DirectReferalTeam from './directReferalTeam';
import LevelTeam from './levelTeam';
import TeamDailyIncome from './teamDailyIncome';
import TeamPackagePurchase from './packagePurchase';
import type { ActiveViewType } from './includes/Sidebar';
import { fetchDashboardData, fetchTeamLevelCounts, fetchTeamLevelMembers } from '../../services/api';
import type { AuthUser, DirectReferral, TeamLevelCount, TeamTreeMember } from '../../services/api';
import faviconImg from '../../assets/favicon.png';
import logoImg from '../../assets/logo.png';

interface DashboardProps {
  user: AuthUser;
  token: string;
  onLogout: () => void;
}

type TeamTreePageData =
  | { kind: 'levels'; levels: TeamLevelCount[] }
  | { kind: 'members'; level: number; members: TeamTreeMember[] };

export const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onLogout }) => {
  const [dashboardUser, setDashboardUser] = useState<AuthUser>(initialUser);
  const [directReferrals, setDirectReferrals] = useState<DirectReferral[]>([]);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  const [teamTreePage, setTeamTreePage] = useState<TeamTreePageData | null>(null);
  const [selectedTeamLevel, setSelectedTeamLevel] = useState<number | null>(null);
  const [teamTreeError, setTeamTreeError] = useState<string | null>(null);
  const [copyNotification, setCopyNotification] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Top bar controls state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Active view state
  const [activeView, setActiveView] = useState<ActiveViewType>('dashboard');

  // Form notifications
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchDashboardData();
       console.log('Dashboard Data:', data);
      if (data.user) {
        setDashboardUser((prev) => ({ ...prev, ...data.user }));
      }
      if (Array.isArray(data.directReferrals)) {
        setDirectReferrals(data.directReferrals);
      }
      setDashboardLoadError(null);
      setDashboardLoaded(true);
    } catch (error: unknown) {
      console.error('Failed to load dashboard statistics:', error);
      setDashboardLoadError(error instanceof Error ? error.message : 'Dashboard data could not be loaded.');
      setDashboardLoaded(true);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadData();
    }, 0);

    const intervalId = setInterval(() => {
      loadData();
    }, 15000);

    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (activeView !== 'team_tree_downline') return;

    let cancelled = false;
    const request = selectedTeamLevel === null
      ? fetchTeamLevelCounts().then((levels) => ({ kind: 'levels' as const, levels }))
      : fetchTeamLevelMembers(selectedTeamLevel).then((members) => ({
          kind: 'members' as const,
          level: selectedTeamLevel,
          members
        }));

    request
      .then((page) => {
        if (!cancelled) {
          setTeamTreePage(page);
          setTeamTreeError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setTeamTreeError(error instanceof Error ? error.message : 'Failed to load team data.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, selectedTeamLevel]);

  const userIdStr = String(dashboardUser.userId || dashboardUser.id || 'RWFXXXXXXX');
  const userNameStr = dashboardUser.name || 'Rexler Welfare User';
  const isUserActive = Number(dashboardUser.topupFlag ?? 0) === 1;
  const referralUrl = `${window.location.origin}/?affiliateCode=${userIdStr}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopyNotification(true);
    setTimeout(() => setCopyNotification(false), 2500);
  };

  const handleShare = (platform: string) => {
    let url = '';
    const text = encodeURIComponent(`Join me on Rexler Welfare Foundation: ${referralUrl}`);
    
    if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${text}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`;
    } else if (platform === 'telegram') {
      url = `https://telegram.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-theme');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSimulateSave = (msg: string) => {
    setProfileSavedMsg(msg);
    setTimeout(() => setProfileSavedMsg(null), 3000);
  };

  const handleSelectView = (view: ActiveViewType) => {
    if (view === 'team_tree_downline') {
      setSelectedTeamLevel(null);
      setTeamTreePage(null);
      setTeamTreeError(null);
    }
    setActiveView(view);
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
  };

  const currentLevelSummary = teamTreePage?.kind === 'levels' ? teamTreePage.levels : null;
  const currentLevelMembers = teamTreePage?.kind === 'members' && teamTreePage.level === selectedTeamLevel
    ? teamTreePage.members
    : null;

  return (
    <div className="dashboard-layout">
      {/* Refactored Reusable Sidebar Component */}
      <Sidebar 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        activeView={activeView}
        onSelectView={handleSelectView}
        userIdStr={userIdStr}
        userNameStr={userNameStr}
        onLogout={onLogout}
      />

      {/* Main Dashboard Area */}
      <div className="dash-main">
        {/* Top Header Bar */}
        <header className="dash-header">
          <div className="dash-header-title">
            <button className="sidebar-toggle-btn" onClick={() => setIsMobileOpen(true)}>
              <Menu size={22} />
            </button>

            <h2>
              {activeView === 'dashboard' && 'Dashboard'}
              {activeView === 'my_profile' && 'My Profile'}
              {activeView === 'change_password' && 'Change Login Password'}
              {activeView === 'transaction_password' && 'Transaction Password'}
              {activeView === 'bank_details' && 'Bank Details'}
              {activeView === 'id_card' && 'Member ID Card'}
              {activeView === 'team_purchase' && 'Team Purchase Package'}
              {activeView === 'global_purchase' && 'Global Purchase Package'}
              {activeView === 'sahayata' && 'Sahayata Rashi'}
              {activeView === 'fund' && 'Fund Management'}
              {activeView === 'team_network' && 'Team & Network'}
              {activeView === 'direct_referrals' && 'Direct Referrals'}
              {activeView === 'team_tree_downline' && (selectedTeamLevel === null ? 'Level Team' : `Level ${selectedTeamLevel} Team`)}
              {activeView === 'financial' && 'Financial Report'}
              {activeView === 'team_daily_income' && 'Daily Field Expenses Income'}
              {activeView === 'withdrawal' && 'Withdrawal Statement'}
              {activeView === 'support' && 'Helpdesk Support'}
            </h2>
          </div>

          <div className="dash-header-user">
            <div className="breadcrumb-nav">
              <Home size={14} />
              <span>/ {activeView.replace('_', ' ').toUpperCase()}</span>
            </div>

            {/* Dark Mode Toggle */}
            <button className="header-icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {isDarkMode ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
            </button>

            {/* Fullscreen Toggle */}
            <button className="header-icon-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            {/* Top Right User Profile Dropdown Badge matching user screenshot */}
            <div className="user-profile-badge" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
              <img src={faviconImg} alt="Profile Icon" style={{ height: '36px', width: '36px', borderRadius: '50%', objectFit: 'contain' }} />
              <div className="user-name-text">
                {userNameStr}
                <div className="user-id-text">
                  {userIdStr} <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Floating User Profile Dropdown Menu matching screenshot */}
            {isUserMenuOpen && (
              <div className="header-profile-dropdown">
                <button className="dropdown-item" onClick={() => handleSelectView('my_profile')}>
                  <User size={16} /> Account
                </button>
                <button className="dropdown-item" onClick={() => handleSelectView('change_password')}>
                  <Lock size={16} /> Password
                </button>
                <button className="dropdown-item" onClick={onLogout} style={{ color: '#475569' }}>
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Body Content */}
        <div className="dash-content">
          {profileSavedMsg && (
            <div className="alert-box success" style={{ marginBottom: '1rem' }}>
              <CheckCircle2 size={16} />
              <div>{profileSavedMsg}</div>
            </div>
          )}
          {dashboardLoadError && (
            <div className="alert-box error" role="alert">
              {dashboardLoadError.includes('Invalid or expired token')
                ? 'Session expired. Please sign out and sign in again to load dashboard and referral data.'
                : dashboardLoadError}
            </div>
          )}

          {/* 1. MAIN DASHBOARD VIEW */}
          {activeView === 'dashboard' && (
            <>
              {copyNotification && (
                <div className="alert-box success" style={{ marginBottom: '1rem' }}>
                  <CheckCircle2 size={16} />
                  <div>Referral Link Copied Successfully to Clipboard!</div>
                </div>
              )}

              {/* Referral Banner */}
              <div className="referral-banner">
                <span className="referral-label">Referral URL</span>
                <button type="button" className="referral-btn btn-copy" onClick={handleCopyLink}>
                  <Copy size={14} /> Copy
                </button>
                <button type="button" className="referral-btn btn-whatsapp" onClick={() => handleShare('whatsapp')}>
                  <Share2 size={14} /> Whatsapp
                </button>
                <button type="button" className="referral-btn btn-facebook" onClick={() => handleShare('facebook')}>
                  <Share2 size={14} /> Facebook
                </button>
                <button type="button" className="referral-btn btn-telegram" onClick={() => handleShare('telegram')}>
                  <Share2 size={14} /> Telegram
                </button>
              </div>

              {/* Widgets 4-Column Grid */}
              <div className="widgets-grid">
                {/* Card 1: User Info Card (Green) */}
                <div className="widget-card bg-green">
                  <div className="widget-left-icon">
                    <User size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">{userNameStr}</div>
                    <div className="widget-value" style={{ fontSize: '1.15rem' }}>{userIdStr}</div>
                    {isUserActive ? (
                      <span className="active-status-badge">ACTIVE</span>
                    ) : (
                      <span className="inactive-status-badge">IN-ACTIVE</span>
                    )}
                  </div>
                </div>

                {/* Card 2: TOTAL EARNINGS (Purple) */}
                <div className="widget-card bg-purple">
                  <div className="widget-left-icon">
                    <Gift size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">TOTAL EARNINGS</div>
                    <div className="widget-value">₹ {dashboardUser.totalEarning || '0.00'}</div>
                  </div>
                </div>

                {/* Card 3: INCOME WALLET (Red) */}
                <div className="widget-card bg-red">
                  <div className="widget-left-icon">
                    <CreditCard size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">INCOME WALLET</div>
                    <div className="widget-value">₹ {dashboardUser.incomeWallet || dashboardUser.wallet || '0.00'}</div>
                  </div>
                </div>

                {/* Card 4: FUND WALLET (Indigo) */}
                <div className="widget-card bg-indigo">
                  <div className="widget-left-icon">
                    <CreditCard size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">FUND WALLET</div>
                    <div className="widget-value">₹ {dashboardUser.fundWallet || '0.00'}</div>
                  </div>
                </div>

                {/* Card 5: DAILY MATRIX INCOME (Blue Purple) */}
                <div className="widget-card bg-blue-purple">
                  <div className="widget-left-icon">
                    <Activity size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">DAILY MATRIX INCOME</div>
                    <div className="widget-value">₹ {dashboardUser.levelIncome || '0.00'}</div>
                  </div>
                </div>

                {/* Card 6: Swasthya Sahayata Yojana (Red) */}
                <div className="widget-card bg-red">
                  <div className="widget-left-icon">
                    <Gift size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">Swasthya Sahayata Yojana</div>
                    <div className="widget-value">₹ {dashboardUser.swasthya || '0.00'}</div>
                  </div>
                </div>

                {/* Card 7: Garbhavati Mahila Yojana (Red) */}
                <div className="widget-card bg-red">
                  <div className="widget-left-icon">
                    <Gift size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">Garbhavati Mahila Yojana</div>
                    <div className="widget-value">₹ {dashboardUser.garbhavati || '0.00'}</div>
                  </div>
                </div>

                {/* Card 8: Kanya Vivaah Sahayata Yojana (Red) */}
                <div className="widget-card bg-red">
                  <div className="widget-left-icon">
                    <Gift size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">Kanya Vivaah Sahayata Yojana</div>
                    <div className="widget-value">₹ {dashboardUser.kanya || '0.00'}</div>
                  </div>
                </div>

                {/* Card 9: Aawas Sahayata Yojana (Red) */}
                <div className="widget-card bg-red">
                  <div className="widget-left-icon">
                    <Gift size={26} />
                  </div>
                  <div className="widget-body">
                    <div className="widget-title">Aawas Sahayata Yojana</div>
                    <div className="widget-value">₹ {dashboardUser.aawas || '0.00'}</div>
                  </div>
                </div>

                {/* Card 10: Total Referrals (Wide Red Split Card) */}
                <div className="widget-card bg-red widget-card-wide" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="widget-left-icon">
                      <User size={26} />
                    </div>
                    <div className="widget-body" style={{ textAlign: 'center' }}>
                      <div className="widget-title">Total Referrals</div>
                      <div className="widget-value">{dashboardUser.totalSponser || 0}</div>
                    </div>
                  </div>

                  <div className="referral-split-row">
                    <div className="referral-split-col">
                      <div className="split-label">ACTIVE</div>
                      <div className="split-val">{dashboardUser.activeSponser || 0}</div>
                    </div>
                    <div className="referral-split-col">
                      <div className="split-label">IN-ACTIVE</div>
                      <div className="split-val">{dashboardUser.inActiveSponser || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Coming Soon Banner */}
                <div className="coming-soon-banner">
                  <div className="bolt-circle">
                    <Zap size={32} fill="#ffffff" color="#ffffff" />
                  </div>
                  <div className="coming-soon-title">COMING SOON</div>
                  <div className="coming-soon-sub">REXLER ANPURNA YOJNA</div>
                </div>
              </div>
            </>
          )}

          {/* 2. MY PROFILE VIEW */}
          {activeView === 'my_profile' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '800px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <User size={28} color="#00b894" />
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>User Profile</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Manage your personal details and account info</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>USER ID</label>
                  <input type="text" className="rexler-input" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} value={userIdStr} readOnly />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>FULL NAME</label>
                  <input type="text" className="rexler-input" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} defaultValue={userNameStr} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>EMAIL ADDRESS</label>
                  <input type="email" className="rexler-input" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} defaultValue={dashboardUser.email || 'user@rexler.online'} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>ACCOUNT STATUS</label>
                  <div style={{ padding: '0.65rem 1rem', background: '#e6fffa', color: '#047857', fontWeight: 700, borderRadius: '4px', marginTop: '4px' }}>
                    {isUserActive ? 'ACTIVE MEMBER' : 'IN-ACTIVE'}
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => handleSimulateSave('Profile information updated successfully!')}
                style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          )}

          {/* 3. CHANGE LOGIN PASSWORD VIEW */}
          {activeView === 'change_password' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <Lock size={28} color="#00b894" />
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Change Login Password</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Update your secret login password</p>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSimulateSave('Login password changed successfully!'); }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>OLD PASSWORD</label>
                    <input type="password" className="rexler-input" placeholder="Enter old password" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>NEW PASSWORD</label>
                    <input type="password" className="rexler-input" placeholder="Enter new password" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>CONFIRM NEW PASSWORD</label>
                    <input type="password" className="rexler-input" placeholder="Confirm new password" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                </div>

                <button type="submit" style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={16} /> Update Password
                </button>
              </form>
            </div>
          )}

          {/* 4. TRANSACTION PASSWORD VIEW */}
          {activeView === 'transaction_password' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <KeyRound size={28} color="#00b894" />
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Transaction Password</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Manage your fund transfer & withdrawal PIN</p>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSimulateSave('Transaction password updated successfully!'); }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>CURRENT TRANSACTION PIN</label>
                    <input type="password" className="rexler-input" placeholder="Enter current PIN" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>NEW TRANSACTION PIN</label>
                    <input type="password" className="rexler-input" placeholder="Enter new PIN" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                </div>

                <button type="submit" style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={16} /> Save Transaction PIN
                </button>
              </form>
            </div>
          )}

          {/* 5. BANK DETAILS VIEW */}
          {activeView === 'bank_details' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '800px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <Building size={28} color="#00b894" />
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Bank Account Details</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Update your payout bank account for withdrawal</p>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSimulateSave('Bank details saved successfully!'); }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>BANK NAME</label>
                    <input type="text" className="rexler-input" placeholder="State Bank of India" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>ACCOUNT HOLDER NAME</label>
                    <input type="text" className="rexler-input" defaultValue={userNameStr} style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>ACCOUNT NUMBER</label>
                    <input type="text" className="rexler-input" placeholder="Enter account number" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>IFSC CODE</label>
                    <input type="text" className="rexler-input" placeholder="SBIN0001234" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                </div>

                <button type="submit" style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={16} /> Save Bank Account
                </button>
              </form>
            </div>
          )}

          {/* 6. ID CARD VIEW */}
          {activeView === 'id_card' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '360px', 
                background: 'linear-gradient(135deg, #151824, #232738)', 
                borderRadius: '16px', 
                padding: '2rem', 
                border: '2px solid #00b894', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                color: '#ffffff',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', top: '12px', right: '16px', background: '#00b894', color: '#fff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  OFFICIAL MEMBER
                </div>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <img src={logoImg} alt="Rexler Logo" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
                </div>

                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 }}>
                  {userNameStr.charAt(0)}
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{userNameStr}</h3>
                <p style={{ color: '#00b894', fontWeight: 700, fontSize: '0.9rem', margin: '4px 0 1rem 0' }}>{userIdStr}</p>

                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div><strong>Status:</strong> ACTIVE MEMBER</div>
                  <div><strong>Portal:</strong> Rexler Welfare Foundation</div>
                  <div><strong>Issued Date:</strong> {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'direct_referrals' && (
            <DirectReferalTeam referrals={directReferrals} loading={!dashboardLoaded} error={dashboardLoadError} />
          )}

          {activeView === 'team_tree_downline' && (
            <LevelTeam
              selectedLevel={selectedTeamLevel}
              levels={currentLevelSummary}
              members={currentLevelMembers}
              error={teamTreeError}
              onSelectLevel={(level) => {
                setTeamTreePage(null);
                setTeamTreeError(null);
                setSelectedTeamLevel(level);
              }}
              onBack={() => {
                setTeamTreePage(null);
                setTeamTreeError(null);
                setSelectedTeamLevel(null);
              }}
            />
          )}

          {activeView === 'team_daily_income' && <TeamDailyIncome />}

          {activeView === 'team_purchase' && <TeamPackagePurchase />}

          {/* 7. GENERIC SECTION PLACEHOLDER VIEWS */}
          {['global_purchase', 'sahayata', 'fund', 'team_network', 'financial', 'withdrawal', 'support'].includes(activeView) && (
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxWidth: '800px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: '#e6fffa', color: '#00b894', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <ArrowUpRight size={30} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>
                {activeView.replace('_', ' ')} Statement
              </h3>
              <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                Module activated for User <strong style={{ color: '#1e293b' }}>{userIdStr}</strong>. Real-time statistics synced with Rexler Welfare Foundation database.
              </p>
              <button 
                type="button" 
                onClick={() => setActiveView('dashboard')}
                style={{ marginTop: '1.5rem', background: '#1e293b', color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
