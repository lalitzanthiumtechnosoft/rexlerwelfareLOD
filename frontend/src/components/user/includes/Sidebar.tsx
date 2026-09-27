import React, { useState } from 'react';
import { 
  Users, Package, Globe, HeartHandshake, 
  Wallet, FileText, CreditCard, Share2, LogOut, ChevronRight, ChevronDown, Home, X, Grid 
} from 'lucide-react';
import faviconImg from '../../../assets/favicon.png';

export type ActiveViewType = 
  | 'dashboard'
  | 'my_profile' | 'change_password' | 'transaction_password' | 'bank_details' | 'id_card'
  | 'team_purchase' | 'global_purchase' | 'sahayata' | 'fund' | 'team_network' | 'financial' | 'withdrawal' | 'support';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  activeView: ActiveViewType;
  onSelectView: (view: ActiveViewType) => void;
  userIdStr: string;
  userNameStr: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setIsMobileOpen,
  activeView,
  onSelectView,
  userIdStr,
  userNameStr,
  onLogout
}) => {
  // Accordion expansion states
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    profile: true,
    team_purchase: false,
    global_purchase: false,
    sahayata: false,
    fund: false,
    team: false,
    financial: false,
    withdrawal: false,
    support: false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Left Sidebar Main Navigation Container */}
      <aside className={`dash-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <img src={faviconImg} alt="Rexler Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
          <Grid size={18} className="sidebar-header-grid-icon" />
          {isMobileOpen && (
            <button onClick={() => setIsMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* User Card in Sidebar */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-id">{userIdStr}</div>
          <div className="sidebar-user-name">{userNameStr}</div>
        </div>

        {/* Sidebar Accordion Navigation List */}
        <nav className="sidebar-menu">
          {/* 1. DASHBOARD */}
          <button 
            className={`sidebar-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => onSelectView('dashboard')}
          >
            <Home size={18} />
            <span>Dashboard</span>
          </button>

          {/* 2. PROFILE */}
          <button 
            className={`sidebar-item ${openAccordions['profile'] && activeView !== 'dashboard' ? 'parent-open' : ''}`}
            onClick={() => toggleAccordion('profile')}
          >
            <CreditCard size={18} />
            <span>Profile</span>
            {openAccordions['profile'] ? <ChevronDown size={16} className="sidebar-chevron" /> : <ChevronRight size={16} className="sidebar-chevron" />}
          </button>

          {openAccordions['profile'] && (
            <div className="sidebar-submenu">
              <button className={`sidebar-subitem ${activeView === 'my_profile' ? 'active' : ''}`} onClick={() => onSelectView('my_profile')}>
                <span className="sub-dash-prefix">-</span><span>My profile</span>
              </button>
              <button className={`sidebar-subitem ${activeView === 'change_password' ? 'active' : ''}`} onClick={() => onSelectView('change_password')}>
                <span className="sub-dash-prefix">-</span><span>Change Login Password</span>
              </button>
              <button className={`sidebar-subitem ${activeView === 'transaction_password' ? 'active' : ''}`} onClick={() => onSelectView('transaction_password')}>
                <span className="sub-dash-prefix">-</span><span>Transaction Password</span>
              </button>
              <button className={`sidebar-subitem ${activeView === 'bank_details' ? 'active' : ''}`} onClick={() => onSelectView('bank_details')}>
                <span className="sub-dash-prefix">-</span><span>Bank Details</span>
              </button>
              <button className={`sidebar-subitem ${activeView === 'id_card' ? 'active' : ''}`} onClick={() => onSelectView('id_card')}>
                <span className="sub-dash-prefix">-</span><span>Id Card</span>
              </button>
            </div>
          )}

          {/* 3. TEAM PURCHASE PACKAGE */}
          <button className={`sidebar-item ${activeView === 'team_purchase' ? 'active' : ''}`} onClick={() => onSelectView('team_purchase')}>
            <Package size={18} />
            <span>Team Purchase Package</span>
          </button>

          {/* 4. GLOBAL PURCHASE PACKAGE */}
          <button className={`sidebar-item ${activeView === 'global_purchase' ? 'active' : ''}`} onClick={() => onSelectView('global_purchase')}>
            <Globe size={18} />
            <span>Global Purchase Package</span>
          </button>

          {/* 5. SAHAYATA RASHI */}
          <button className={`sidebar-item ${activeView === 'sahayata' ? 'active' : ''}`} onClick={() => onSelectView('sahayata')}>
            <HeartHandshake size={18} />
            <span>Sahayata Rashi</span>
          </button>

          {/* 6. FUND MANAGEMENT */}
          <button className={`sidebar-item ${activeView === 'fund' ? 'active' : ''}`} onClick={() => toggleAccordion('fund')}>
            <Wallet size={18} />
            <span>Fund Management</span>
            {openAccordions['fund'] ? <ChevronDown size={16} className="sidebar-chevron" /> : <ChevronRight size={16} className="sidebar-chevron" />}
          </button>

          {openAccordions['fund'] && (
            <div className="sidebar-submenu">
              <button className="sidebar-subitem" onClick={() => onSelectView('fund')}>
                <span className="sub-dash-prefix">-</span><span>Fund Transfer</span>
              </button>
              <button className="sidebar-subitem" onClick={() => onSelectView('fund')}>
                <span className="sub-dash-prefix">-</span><span>Fund Request</span>
              </button>
            </div>
          )}

          {/* 7. TEAM & NETWORK */}
          <button className={`sidebar-item ${activeView === 'team_network' ? 'active' : ''}`} onClick={() => toggleAccordion('team')}>
            <Users size={18} />
            <span>Team & Network</span>
            {openAccordions['team'] ? <ChevronDown size={16} className="sidebar-chevron" /> : <ChevronRight size={16} className="sidebar-chevron" />}
          </button>

          {openAccordions['team'] && (
            <div className="sidebar-submenu">
              <button className="sidebar-subitem" onClick={() => onSelectView('team_network')}>
                <span className="sub-dash-prefix">-</span><span>Direct Referrals</span>
              </button>
              <button className="sidebar-subitem" onClick={() => onSelectView('team_network')}>
                <span className="sub-dash-prefix">-</span><span>Team Tree Downline</span>
              </button>
            </div>
          )}

          {/* 8. FINANCIAL REPORT */}
          <button className={`sidebar-item ${activeView === 'financial' ? 'active' : ''}`} onClick={() => toggleAccordion('financial')}>
            <FileText size={18} />
            <span>Financial Report</span>
            {openAccordions['financial'] ? <ChevronDown size={16} className="sidebar-chevron" /> : <ChevronRight size={16} className="sidebar-chevron" />}
          </button>

          {openAccordions['financial'] && (
            <div className="sidebar-submenu">
              <button className="sidebar-subitem" onClick={() => onSelectView('financial')}>
                <span className="sub-dash-prefix">-</span><span>Income Statement</span>
              </button>
              <button className="sidebar-subitem" onClick={() => onSelectView('financial')}>
                <span className="sub-dash-prefix">-</span><span>Daily Matrix Income</span>
              </button>
            </div>
          )}

          {/* 9. WITHDRAWAL */}
          <button className={`sidebar-item ${activeView === 'withdrawal' ? 'active' : ''}`} onClick={() => toggleAccordion('withdrawal')}>
            <CreditCard size={18} />
            <span>Withdrawal</span>
            {openAccordions['withdrawal'] ? <ChevronDown size={16} className="sidebar-chevron" /> : <ChevronRight size={16} className="sidebar-chevron" />}
          </button>

          {openAccordions['withdrawal'] && (
            <div className="sidebar-submenu">
              <button className="sidebar-subitem" onClick={() => onSelectView('withdrawal')}>
                <span className="sub-dash-prefix">-</span><span>Wallet Withdrawal</span>
              </button>
              <button className="sidebar-subitem" onClick={() => onSelectView('withdrawal')}>
                <span className="sub-dash-prefix">-</span><span>Withdrawal History</span>
              </button>
            </div>
          )}

          {/* 10. SUPPORT */}
          <button className={`sidebar-item ${activeView === 'support' ? 'active' : ''}`} onClick={() => onSelectView('support')}>
            <Share2 size={18} />
            <span>Support</span>
          </button>

          {/* 11. SIGN OUT */}
          <button className="sidebar-item" onClick={onLogout} style={{ color: '#f87171', marginTop: 'auto' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>
    </>
  );
};
