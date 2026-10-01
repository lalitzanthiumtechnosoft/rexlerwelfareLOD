import React, { useEffect, useState } from 'react';
import { Ban, Eye, LoaderCircle, Search, UserRoundCheck, X } from 'lucide-react';
import {
	fetchAdminMemberDetails,
	fetchAdminMembers,
	updateAdminMemberStatus
} from '../../services/api';
import type { AdminMember, AdminMemberDetails } from '../../services/api';
import { isAdminSessionError } from '../../services/api';
import './admin-members.css';

type MemberStatusFilter = 'all' | 'active' | 'inactive';
type DetailTab = 'profile' | 'bank';

interface ViewMemberProps {
	token: string;
	initialStatus?: MemberStatusFilter;
	onSessionExpired: () => void;
}

const localDate = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const displayDate = (value: string | null) => value ? new Date(value).toLocaleString() : '—';

export const ViewMember: React.FC<ViewMemberProps> = ({ token, initialStatus = 'all', onSessionExpired }) => {
	const [userId, setUserId] = useState('');
	const [fromDate, setFromDate] = useState(localDate);
	const [toDate, setToDate] = useState(localDate);
	const [status, setStatus] = useState<MemberStatusFilter>(initialStatus);
	const [members, setMembers] = useState<AdminMember[]>([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [selectedMember, setSelectedMember] = useState<AdminMemberDetails | null>(null);
	const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('profile');
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingDetails, setIsLoadingDetails] = useState(false);
	const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);

	const searchMembers = async (requestedPage = page, requestedStatus = status) => {
		setError(null);
		setIsLoading(true);
		try {
			const result = await fetchAdminMembers(token, { userId, fromDate, toDate, status: requestedStatus, page: requestedPage });
			setMembers(result.members);
			setPage(result.page);
			setTotal(result.total);
			setTotalPages(result.totalPages);
		} catch (searchError: unknown) {
			if (isAdminSessionError(searchError)) {
				onSessionExpired();
				return;
			}
			setError(searchError instanceof Error ? searchError.message : 'Failed to search members.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		setStatus(initialStatus);
		void searchMembers(1, initialStatus);
	}, [token, initialStatus]);

	const handleOpenDetails = async (member: AdminMember) => {
		setSelectedMember(null);
		setActiveDetailTab('profile');
		setIsLoadingDetails(true);
		setError(null);
		try {
			const result = await fetchAdminMemberDetails(token, member.memberId);
			setSelectedMember(result);
		} catch (detailsError: unknown) {
			if (isAdminSessionError(detailsError)) {
				onSessionExpired();
				return;
			}
			setError(detailsError instanceof Error ? detailsError.message : 'Failed to load member details.');
		} finally {
			setIsLoadingDetails(false);
		}
	};

	const handleToggleAccount = async (member: AdminMember) => {
		const accountStatus: 0 | 1 = member.accountStatus === 1 ? 0 : 1;
		const action = accountStatus === 1 ? 'unblock' : 'block';
		if (!window.confirm(`Are you sure you want to ${action} ${member.userId}?`)) return;

		setUpdatingMemberId(member.memberId);
		setError(null);
		try {
			await updateAdminMemberStatus(token, member.memberId, accountStatus);
			await searchMembers();
			if (selectedMember?.memberId === member.memberId) {
				setSelectedMember((current) => current ? { ...current, accountStatus } : current);
			}
		} catch (updateError: unknown) {
			if (isAdminSessionError(updateError)) {
				onSessionExpired();
				return;
			}
			setError(updateError instanceof Error ? updateError.message : `Failed to ${action} member.`);
		} finally {
			setUpdatingMemberId(null);
		}
	};

	return (
		<div className="admin-members-view">
			{error && <div className="admin-alert" role="alert">{error}</div>}

			<form className="admin-member-filters" onSubmit={(event) => { event.preventDefault(); void searchMembers(1, status); }}>
				<label>
					<span>User ID</span>
					<input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Enter User ID" />
				</label>
				<label>
					<span>From Date</span>
					<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} required />
				</label>
				<label>
					<span>To Date</span>
					<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} required />
				</label>
				<label>
					<span>Member Status</span>
					<select value={status} onChange={(event) => setStatus(event.target.value as MemberStatusFilter)}>
						<option value="all">All</option>
						<option value="active">Active</option>
						<option value="inactive">In-Active</option>
					</select>
				</label>
				<button type="submit" className="admin-member-search" disabled={isLoading}>
					{isLoading ? <LoaderCircle size={15} className="admin-member-spinner" /> : <Search size={15} />} Search
				</button>
			</form>

			<section className="admin-member-panel">
				<header><h2>View Member</h2><span>{total.toLocaleString('en-IN')} members</span></header>
				<div className="admin-member-table-scroll">
					<table>
						<thead>
							<tr><th>#</th><th>User ID</th><th>Name</th><th>Phone</th><th>Sponsor</th><th>Joining Date</th><th>Status</th><th>More Details</th><th>Account</th></tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr><td colSpan={9} className="admin-member-empty"><LoaderCircle size={17} className="admin-member-spinner" /> Loading members...</td></tr>
							) : members.length ? members.map((member, index) => (
								<tr key={member.memberId}>
									<td>{index + 1}</td>
									<td>{member.userId}</td>
									<td>{member.name}</td>
									<td>{member.phone}</td>
									<td>{member.sponsorName || '—'}{member.sponsorUserId ? ` (${member.sponsorUserId})` : ''}</td>
									<td>{displayDate(member.joinedAt)}</td>
									<td><span className={`admin-member-status ${member.topupFlag === 1 ? 'active' : 'inactive'}`}>{member.topupFlag === 1 ? 'Active' : 'In-Active'}</span></td>
									<td><button type="button" className="admin-member-detail-btn" onClick={() => void handleOpenDetails(member)}><Eye size={14} /> More</button></td>
									<td>
										<button
											type="button"
											className={`admin-member-account-btn ${member.accountStatus === 1 ? 'block' : 'unblock'}`}
											onClick={() => void handleToggleAccount(member)}
											disabled={updatingMemberId === member.memberId}
										>
											{updatingMemberId === member.memberId ? <LoaderCircle size={13} className="admin-member-spinner" /> : member.accountStatus === 1 ? <Ban size={13} /> : <UserRoundCheck size={13} />}
											{member.accountStatus === 1 ? 'Block' : 'Unblock'}
										</button>
									</td>
								</tr>
							)) : (
								<tr><td colSpan={9} className="admin-member-empty">No members match these filters.</td></tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="admin-member-pagination">
					<span>Showing {total === 0 ? 0 : (page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total.toLocaleString('en-IN')} entries</span>
					<div>
						<button type="button" onClick={() => void searchMembers(page - 1)} disabled={isLoading || page <= 1}>Previous</button>
						<span>Page {totalPages === 0 ? 0 : page} of {totalPages}</span>
						<button type="button" onClick={() => void searchMembers(page + 1)} disabled={isLoading || page >= totalPages}>Next</button>
					</div>
				</div>
			</section>

			{(isLoadingDetails || selectedMember) && (
				<div className="admin-member-modal-backdrop" role="presentation" onClick={() => { setSelectedMember(null); setIsLoadingDetails(false); }}>
					<section className="admin-member-modal" role="dialog" aria-modal="true" aria-labelledby="admin-member-modal-title" onClick={(event) => event.stopPropagation()}>
						<header>
							<div><h2 id="admin-member-modal-title">View Member Details</h2>{selectedMember && <span>{selectedMember.userId}</span>}</div>
							<button type="button" aria-label="Close details" onClick={() => { setSelectedMember(null); setIsLoadingDetails(false); }}><X size={18} /></button>
						</header>
						{isLoadingDetails ? (
							<div className="admin-member-empty"><LoaderCircle size={17} className="admin-member-spinner" /> Loading member details...</div>
						) : selectedMember && (
							<>
								<div className="admin-member-tabs" role="tablist" aria-label="Member detail sections">
									<button type="button" role="tab" aria-selected={activeDetailTab === 'profile'} className={activeDetailTab === 'profile' ? 'active' : ''} onClick={() => setActiveDetailTab('profile')}>Profile</button>
									<button type="button" role="tab" aria-selected={activeDetailTab === 'bank'} className={activeDetailTab === 'bank' ? 'active' : ''} onClick={() => setActiveDetailTab('bank')}>Bank</button>
								</div>
								{activeDetailTab === 'profile' ? (
									<dl className="admin-member-details">
										<div><dt>Name</dt><dd>{selectedMember.name}</dd></div>
										<div><dt>Phone</dt><dd>{selectedMember.phone}</dd></div>
										<div><dt>Email</dt><dd>{selectedMember.email || '—'}</dd></div>
										<div><dt>Sponsor</dt><dd>{selectedMember.sponsorName || '—'}{selectedMember.sponsorUserId ? ` (${selectedMember.sponsorUserId})` : ''}</dd></div>
										<div><dt>Joining Date</dt><dd>{displayDate(selectedMember.joinedAt)}</dd></div>
										<div><dt>Activation Date</dt><dd>{displayDate(selectedMember.activationDate)}</dd></div>
										<div><dt>Member Status</dt><dd>{selectedMember.topupFlag === 1 ? 'Active' : 'In-Active'}</dd></div>
										<div><dt>Account Status</dt><dd>{selectedMember.accountStatus === 1 ? 'Unblocked' : 'Blocked'}</dd></div>
									</dl>
								) : (
									<dl className="admin-member-details">
										<div><dt>Account Holder</dt><dd>{selectedMember.accountHolderName || '—'}</dd></div>
										<div><dt>Bank Name</dt><dd>{selectedMember.bankName || '—'}</dd></div>
										<div><dt>Branch</dt><dd>{selectedMember.branch || '—'}</dd></div>
										<div><dt>IFSC</dt><dd>{selectedMember.ifsc || '—'}</dd></div>
										<div><dt>Account Number</dt><dd>{selectedMember.accountNumber || '—'}</dd></div>
										<div><dt>PAN</dt><dd>{selectedMember.panNumber || '—'}</dd></div>
									</dl>
								)}
								<footer><button type="button" onClick={() => setSelectedMember(null)}>Close</button></footer>
							</>
						)}
					</section>
				</div>
			)}
		</div>
	);
};

export default ViewMember;
