import React, { useEffect, useState } from 'react';
import { 
  User, CreditCard, Gift, Activity, Zap, Copy, 
  Moon, Sun, Maximize, Minimize, Home, CheckCircle2,
  Share2, Lock, Building, Save, KeyRound, Menu, ArrowUpRight, ChevronDown, LogOut, Download
} from 'lucide-react';
import { Sidebar } from './includes/Sidebar';
import DirectReferalTeam from './directReferalTeam';
import LevelTeam from './levelTeam';
import TeamDailyIncome from './teamDailyIncome';
import TeamPackagePurchase from './packagePurchase';
import AutopoolPurchase from './autopoolPurchase';
import FundRequest from './funtRequest';
import IncomeToPurchase from './IncomeToPurchase';
import Withdrawal from './walletWithdraw';
import Support from './support';
import type { ActiveViewType } from './includes/Sidebar';
import { changeLoginPassword, changeTransactionPassword, fetchBankDetails, fetchDashboardData, fetchTeamLevelCounts, fetchTeamLevelMembers, updateBankDetails, updateProfile } from '../../services/api';
import type { AuthUser, BankDetails, DirectReferral, TeamLevelCount, TeamTreeMember } from '../../services/api';
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
  const [profileName, setProfileName] = useState(initialUser.name || '');
  const [profileEmail, setProfileEmail] = useState(initialUser.email || '');
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [transactionPasswordError, setTransactionPasswordError] = useState<string | null>(null);
  const [isTransactionPasswordSaving, setIsTransactionPasswordSaving] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountHolderName: '',
    ifscCode: '',
    bankName: '',
    branch: '',
    accountNumber: '',
    panNumber: ''
  });
  const [bankDetailsError, setBankDetailsError] = useState<string | null>(null);
  const [isBankDetailsLoading, setIsBankDetailsLoading] = useState(false);
  const [isBankDetailsSaving, setIsBankDetailsSaving] = useState(false);
  const [idCardAddress, setIdCardAddress] = useState('');
  const [isIdCardDownloading, setIsIdCardDownloading] = useState(false);

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
    if (activeView !== 'bank_details') return;

    let cancelled = false;
    setIsBankDetailsLoading(true);
    setBankDetailsError(null);
    fetchBankDetails()
      .then((details) => {
        if (!cancelled) setBankDetails(details);
      })
      .catch((error: unknown) => {
        if (!cancelled) setBankDetailsError(error instanceof Error ? error.message : 'Failed to load bank details.');
      })
      .finally(() => {
        if (!cancelled) setIsBankDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView]);

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

  const handleProfileSave = async () => {
    setProfileSaveError(null);
    setIsProfileSaving(true);
    try {
      const updatedUser = await updateProfile({
        name: profileName.trim(),
        email: profileEmail.trim()
      });
      setDashboardUser((prev) => ({ ...prev, ...updatedUser }));
      handleSimulateSave('Profile information updated successfully!');
    } catch (error: unknown) {
      setProfileSaveError(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleLoginPasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordChangeError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get('currentPassword') || '');
    const newPassword = String(formData.get('newPassword') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New password and confirmation do not match.');
      return;
    }

    setIsPasswordChanging(true);
    try {
      await changeLoginPassword({ currentPassword, newPassword });
      form.reset();
      handleSimulateSave('Login password changed successfully!');
    } catch (error: unknown) {
      setPasswordChangeError(error instanceof Error ? error.message : 'Failed to update login password.');
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const handleTransactionPasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTransactionPasswordError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsTransactionPasswordSaving(true);
    try {
      await changeTransactionPassword({
        currentPassword: String(formData.get('currentTransactionPassword') || ''),
        newPassword: String(formData.get('newTransactionPassword') || '')
      });
      form.reset();
      handleSimulateSave('Transaction password updated successfully!');
    } catch (error: unknown) {
      setTransactionPasswordError(error instanceof Error ? error.message : 'Failed to update transaction password.');
    } finally {
      setIsTransactionPasswordSaving(false);
    }
  };

  const handleBankDetailsSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBankDetailsError(null);
    setIsBankDetailsSaving(true);
    try {
      const savedDetails = await updateBankDetails(bankDetails);
      setBankDetails(savedDetails);
      handleSimulateSave('Bank details saved successfully!');
    } catch (error: unknown) {
      setBankDetailsError(error instanceof Error ? error.message : 'Failed to save bank details.');
    } finally {
      setIsBankDetailsSaving(false);
    }
  };

  const handleIdCardDownload = async () => {
    const card = document.getElementById('member-id-card');
    if (!card) return;

    setIsIdCardDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(card, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const downloadLink = document.createElement('a');
      downloadLink.download = `rexler-id-card-${userIdStr}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    } finally {
      setIsIdCardDownloading(false);
    }
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
              {activeView === 'global_purchase' && 'Helping Fund Purchase Package'}
              {activeView === 'sahayata' && 'Sahayata Rashi'}
              {activeView === 'fund' && 'Income Wallet To Purchase Wallet'}
              {activeView === 'fund_request' && 'Fund Request'}
              {activeView === 'team_network' && 'Team & Network'}
              {activeView === 'direct_referrals' && 'Direct Referrals'}
              {activeView === 'team_tree_downline' && (selectedTeamLevel === null ? 'Level Team' : `Level ${selectedTeamLevel} Team`)}
              {activeView === 'financial' && 'Financial Report'}
              {activeView === 'team_daily_income' && 'Daily Field Expenses Income'}
              {activeView === 'withdrawal' && 'Withdrawal'}
              {activeView === 'support' && 'Support'}
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
                  <input type="text" className="rexler-input" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>EMAIL ADDRESS</label>
                  <input type="email" className="rexler-input" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>ACCOUNT STATUS</label>
                  <div style={{ padding: '0.65rem 1rem', background: '#e6fffa', color: '#047857', fontWeight: 700, borderRadius: '4px', marginTop: '4px' }}>
                    {isUserActive ? 'ACTIVE MEMBER' : 'IN-ACTIVE'}
                  </div>
                </div>
              </div>

              {profileSaveError && <div className="alert-box error" role="alert" style={{ marginTop: '1rem' }}>{profileSaveError}</div>}
              <button 
                type="button" 
                onClick={() => void handleProfileSave()}
                disabled={isProfileSaving}
                style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Save size={16} /> {isProfileSaving ? 'Saving...' : 'Save Changes'}
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

              <form onSubmit={(event) => void handleLoginPasswordChange(event)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>OLD PASSWORD</label>
                    <input type="password" name="currentPassword" autoComplete="current-password" className="rexler-input" placeholder="Enter old password" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>NEW PASSWORD</label>
                    <input type="password" name="newPassword" autoComplete="new-password" minLength={3} maxLength={6} className="rexler-input" placeholder="Enter new password (3-6 characters)" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>CONFIRM NEW PASSWORD</label>
                    <input type="password" name="confirmPassword" autoComplete="new-password" minLength={3} maxLength={6} className="rexler-input" placeholder="Confirm new password" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                </div>

                {passwordChangeError && <div className="alert-box error" role="alert" style={{ marginTop: '1rem' }}>{passwordChangeError}</div>}
                <button type="submit" disabled={isPasswordChanging} style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={16} /> {isPasswordChanging ? 'Updating...' : 'Update Password'}
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

              <form onSubmit={(event) => void handleTransactionPasswordChange(event)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>CURRENT TRANSACTION PASSWORD</label>
                    <input type="password" name="currentTransactionPassword" autoComplete="off" className="rexler-input" placeholder="Enter current transaction password" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>NEW TRANSACTION PASSWORD</label>
                    <input type="password" name="newTransactionPassword" autoComplete="new-password" minLength={3} maxLength={6} className="rexler-input" placeholder="Enter new password (3-6 characters)" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required />
                  </div>
                </div>

                {transactionPasswordError && <div className="alert-box error" role="alert" style={{ marginTop: '1rem' }}>{transactionPasswordError}</div>}
                <button type="submit" disabled={isTransactionPasswordSaving} style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={16} /> {isTransactionPasswordSaving ? 'Saving...' : 'Save Transaction Password'}
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

              <form onSubmit={(event) => void handleBankDetailsSave(event)}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>BANK NAME</label>
                    <input type="text" className="rexler-input" value={bankDetails.bankName} onChange={(event) => setBankDetails((prev) => ({ ...prev, bankName: event.target.value }))} placeholder="State Bank of India" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required disabled={isBankDetailsLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>ACCOUNT HOLDER NAME</label>
                    <input type="text" className="rexler-input" value={bankDetails.accountHolderName} onChange={(event) => setBankDetails((prev) => ({ ...prev, accountHolderName: event.target.value }))} placeholder="Enter account holder name" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required disabled={isBankDetailsLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>ACCOUNT NUMBER</label>
                    <input type="text" className="rexler-input" value={bankDetails.accountNumber} onChange={(event) => setBankDetails((prev) => ({ ...prev, accountNumber: event.target.value }))} placeholder="Enter account number" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required disabled={isBankDetailsLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>IFSC CODE</label>
                    <input type="text" className="rexler-input" value={bankDetails.ifscCode} onChange={(event) => setBankDetails((prev) => ({ ...prev, ifscCode: event.target.value.toUpperCase() }))} placeholder="Example: SBIN0001234" maxLength={11} style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required disabled={isBankDetailsLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>BRANCH</label>
                    <input type="text" className="rexler-input" value={bankDetails.branch} onChange={(event) => setBankDetails((prev) => ({ ...prev, branch: event.target.value }))} placeholder="Enter branch" style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required disabled={isBankDetailsLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>PAN NUMBER</label>
                    <input type="text" className="rexler-input" value={bankDetails.panNumber} onChange={(event) => setBankDetails((prev) => ({ ...prev, panNumber: event.target.value.toUpperCase() }))} placeholder="Example: ABCDE1234F" maxLength={10} style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', width: '100%', marginTop: '4px' }} required disabled={isBankDetailsLoading} />
                  </div>
                </div>

                {bankDetailsError && <div className="alert-box error" role="alert" style={{ marginTop: '1rem' }}>{bankDetailsError}</div>}
                <button type="submit" disabled={isBankDetailsLoading || isBankDetailsSaving} style={{ marginTop: '1.5rem', background: '#00b894', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={16} /> {isBankDetailsLoading ? 'Loading...' : isBankDetailsSaving ? 'Saving...' : 'Save Bank Account'}
                </button>
              </form>
            </div>
          )}

          {/* 6. ID CARD VIEW */}
          {activeView === 'id_card' && (
            <div className="id-card-page">
              <div className="id-card-pair" id="member-id-card">
                <article className="id-card-front">
                  <div className="id-card-front-header">
                    <div className="id-card-motto">सेवा परम धर्म !!!</div>
                    <img className="id-card-logo" src={logoImg} alt="Rexler Welfare Foundation" />
                    <div className="id-card-avatar"><User size={34} strokeWidth={1.6} /></div>
                  </div>
                  <div className="id-card-front-body">
                    <h3>{userNameStr}</h3>
                    <div className="id-card-details">
                      <div><span>User ID</span><strong>{userIdStr}</strong></div>
                      <div><span>Email</span><strong>{dashboardUser.email || '--'}</strong></div>
                      <div><span>Join Date</span><strong>{dashboardUser.created_at ? new Date(dashboardUser.created_at).toLocaleString() : '--'}</strong></div>
                      <div><span>Phone</span><strong>{dashboardUser.phone || '--'}</strong></div>
                      <div><span>Registration No.</span><strong>{dashboardUser.memberId || dashboardUser.id || '--'}</strong></div>
                    </div>
                    <div className="id-card-signature"><span>Signatory</span></div>
                  </div>
                </article>

                <article className="id-card-back">
                  <div className="id-card-back-content">
                    <header>
                      <h3>Rexler Welfare Foundation</h3>
                      <p>Member Guidelines</p>
                    </header>
                    <ul>
                      <li>Member must carry this card at all times.</li>
                      <li>This card is non-transferable and strictly personal.</li>
                      <li>In case of loss, report immediately to the office.</li>
                    </ul>
                    <label htmlFor="id-card-address">Address:</label>
                    <input
                      id="id-card-address"
                      type="text"
                      value={idCardAddress}
                      onChange={(event) => setIdCardAddress(event.target.value)}
                      placeholder="Enter Address"
                    />
                    <div className="id-card-authority">
                      <img src={logoImg} alt="" />
                      <span>Authorized Signatory</span>
                    </div>
                  </div>
                </article>
              </div>
              <button type="button" className="id-card-download-btn" disabled={isIdCardDownloading} onClick={() => void handleIdCardDownload()}>
                <Download size={17} /> {isIdCardDownloading ? 'Preparing...' : 'Download ID Card'}
              </button>
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
          {activeView === 'global_purchase' && <AutopoolPurchase />}
          {activeView === 'fund_request' && <FundRequest />}
          {activeView === 'fund' && <IncomeToPurchase />}
          {activeView === 'withdrawal' && <Withdrawal />}
          {activeView === 'support' && <Support />}

          {/* 7. GENERIC SECTION PLACEHOLDER VIEWS */}
          {['sahayata', 'team_network', 'financial'].includes(activeView) && (
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
