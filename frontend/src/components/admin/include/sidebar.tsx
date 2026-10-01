import React, { useState } from 'react';
import {
	ChevronDown,
	ChevronRight,
	CircleDollarSign,
	FolderKanban,
	LayoutDashboard,
	LifeBuoy,
	LockKeyhole,
	LogOut,
	Settings,
	Users,
	Wallet
} from 'lucide-react';
import logoImg from '../../../assets/favicon.png';

export type AdminPageKey =
	| 'dashboard'
	| 'viewMember' | 'searchMember' | 'viewActiveMember' | 'viewInActiveMember' | 'investmentHistory'
	| 'fundRequest' | 'fundTransfer' | 'fundTransferHistory' | 'paymentDetailsUpdate' | 'sahayataRashiHistory'
	| 'addProjectManager' | 'pinRequest' | 'viewPin' | 'used' | 'unUsed' | 'fundFranchiseRequest' | 'donationHistory'
	| 'myDirect' | 'walletWithdrawStatus' | 'newSupportTicket' | 'supportTicket'
	| 'walletStatement' | 'walletOutstanding' | 'popupUpdate' | 'changePassword';

interface AdminSidebarProps {
	activePage: AdminPageKey;
	onNavigate: (page: AdminPageKey, label: string) => void;
	onLogout: () => void;
}

const groups = [
	{
		id: 'members',
		label: 'User Management',
		icon: Users,
		items: [
			{ id: 'viewMember', label: 'View Member' },
			{ id: 'searchMember', label: 'Search Member' },
			{ id: 'viewActiveMember', label: 'View Active Member' },
			{ id: 'viewInActiveMember', label: 'View InActive Member' },
			{ id: 'investmentHistory', label: 'Business History' }
		]
	},
	{
		id: 'fund',
		label: 'Fund Manager',
		icon: Wallet,
		items: [
			{ id: 'fundRequest', label: 'Fund Request' },
			{ id: 'fundTransfer', label: 'Fund Transfer' },
			{ id: 'fundTransferHistory', label: 'Fund Transfer History' },
			{ id: 'paymentDetailsUpdate', label: 'Payment Details Update' },
			{ id: 'sahayataRashiHistory', label: 'Sahayata Rashi' }
		]
	},
	{
		id: 'projects',
		label: 'Project Manager',
		icon: FolderKanban,
		items: [
			{ id: 'addProjectManager', label: 'Add Project Manager' },
			{ id: 'pinRequest', label: 'Pin Request' },
			{ id: 'viewPin', label: 'View Pin' },
			{ id: 'used', label: 'Used Pin' },
			{ id: 'unUsed', label: 'Un-Used Pin' },
			{ id: 'fundFranchiseRequest', label: 'Fund Franchise Request' },
			{ id: 'donationHistory', label: 'Donation History' }
		]
	},
	{ id: 'team', label: 'Team Manager', icon: Users, items: [{ id: 'myDirect', label: 'My Direct' }] },
	{ id: 'payout', label: 'Withdraw', icon: CircleDollarSign, items: [{ id: 'walletWithdrawStatus', label: 'Withdrawal Status' }] },
	{
		id: 'support',
		label: 'Support',
		icon: LifeBuoy,
		items: [
			{ id: 'newSupportTicket', label: 'New Tickets' },
			{ id: 'supportTicket', label: 'Support Tickets' }
		]
	},
	{
		id: 'wallet',
		label: 'Wallet',
		icon: Wallet,
		items: [
			{ id: 'walletStatement', label: 'Wallet Statement' },
			{ id: 'walletOutstanding', label: 'Wallet Outstanding' }
		]
	},
	{ id: 'settings', label: 'Settings', icon: Settings, items: [{ id: 'popupUpdate', label: 'Popup Update' }] }
] as const;

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activePage, onNavigate, onLogout }) => {
	const [openGroup, setOpenGroup] = useState<string | null>(null);

	return (
		<aside className="admin-sidebar">
			<div className="admin-sidebar-brand"><img src={logoImg} alt="Rexler Welfare Foundation" /></div>
			<nav aria-label="Admin navigation">
				<div className="admin-menu-title">Menu</div>
				<button
					type="button"
					className={`admin-nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
					onClick={() => onNavigate('dashboard', 'Dashboard')}
				>
					<LayoutDashboard size={16} /><span>Dashboard</span>
				</button>

				{groups.map((group) => {
					const GroupIcon = group.icon;
					const isOpen = openGroup === group.id;
					const groupHasActivePage = group.items.some((item) => item.id === activePage);
					return (
						<div className="admin-nav-group" key={group.id}>
							<button
								type="button"
								className={`admin-nav-group-toggle ${groupHasActivePage ? 'active' : ''}`}
								aria-expanded={isOpen}
								onClick={() => setOpenGroup((current) => current === group.id ? null : group.id)}
							>
								<GroupIcon size={16} />
								<span>{group.label}</span>
								{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
							</button>
							{isOpen && (
								<div className="admin-submenu">
									{group.items.map((item) => (
										<button
											type="button"
											key={item.id}
											className={`admin-submenu-item ${activePage === item.id ? 'active' : ''}`}
											onClick={() => onNavigate(item.id, item.label)}
										>
											<span className="admin-submenu-dot" aria-hidden="true" />{item.label}
										</button>
									))}
								</div>
							)}
						</div>
					);
				})}

				<button
					type="button"
					className={`admin-nav-item ${activePage === 'changePassword' ? 'active' : ''}`}
					onClick={() => onNavigate('changePassword', 'Change Password')}
				>
					<LockKeyhole size={16} /><span>Change Password</span>
				</button>
			</nav>
			<button type="button" className="admin-sidebar-logout" onClick={onLogout} title="Sign out">
				<LogOut size={16} /><span>Sign Out</span>
			</button>
		</aside>
	);
};

export default AdminSidebar;
