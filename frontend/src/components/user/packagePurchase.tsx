import React, { useEffect, useState } from 'react';
import { BadgeCheck, CircleAlert, Clock3, Package, Search, Wallet } from 'lucide-react';
import {
	fetchTeamPurchaseData,
	lookupTeamPurchaseMember,
	purchaseTeamPackage
} from '../../services/api';
import type { TeamPurchaseData } from '../../services/api';
import './css/packagePurchase.css';

const formatAmount = (amount: number | string) => Number(amount || 0).toLocaleString('en-IN', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const formatDateTime = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	return new Intl.DateTimeFormat('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).format(date);
};

const TeamPackagePurchase: React.FC = () => {
	const [data, setData] = useState<TeamPurchaseData | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [userId, setUserId] = useState('');
	const [verifiedMember, setVerifiedMember] = useState<{ userId: string; name: string } | null>(null);
	const [lookupLoading, setLookupLoading] = useState(false);
	const [lookupError, setLookupError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
	const [purchaseError, setPurchaseError] = useState<string | null>(null);

	const loadData = async () => {
		try {
			setData(await fetchTeamPurchaseData());
			setLoadError(null);
		} catch (error: unknown) {
			setLoadError(error instanceof Error ? error.message : 'Could not load purchase details.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		let cancelled = false;
		fetchTeamPurchaseData()
			.then((purchaseData) => {
				if (!cancelled) {
					setData(purchaseData);
					setLoadError(null);
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setLoadError(error instanceof Error ? error.message : 'Could not load purchase details.');
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const verifyMember = async () => {
		const normalizedUserId = userId.trim();
		setVerifiedMember(null);
		setLookupError(null);
		if (!normalizedUserId) return;

		setLookupLoading(true);
		try {
			setVerifiedMember(await lookupTeamPurchaseMember(normalizedUserId));
		} catch (error: unknown) {
			setLookupError(error instanceof Error ? error.message : 'Could not verify this member.');
		} finally {
			setLookupLoading(false);
		}
	};

	const handlePurchase = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setPurchaseMessage(null);
		setPurchaseError(null);
		setSubmitting(true);
		try {
			const result = await purchaseTeamPackage(userId.trim());
			setPurchaseMessage(result.message);
			setVerifiedMember(null);
			setUserId('');
			await loadData();
		} catch (error: unknown) {
			setPurchaseError(error instanceof Error ? error.message : 'Package purchase failed.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section className="team-purchase-view" aria-labelledby="team-purchase-heading">
			<header className="team-purchase-header">
				<div>
					<p className="team-purchase-eyebrow">MEMBER SERVICES</p>
					<h3 id="team-purchase-heading">Team package purchase</h3>
					<p>Activate an eligible team member using your fund wallet.</p>
				</div>
				<div className="team-purchase-wallet" aria-label="Fund wallet balance">
					<Wallet size={18} />
					<span>Fund wallet</span>
					<strong>{loading ? '...' : `₹ ${formatAmount(data?.wallet ?? 0)}`}</strong>
				</div>
			</header>

			{loadError && (
				<div className="team-purchase-alert is-error" role="alert">
					<CircleAlert size={17} /> <span>{loadError}</span>
				</div>
			)}
			{purchaseMessage && (
				<div className="team-purchase-alert is-success" role="status">
					<BadgeCheck size={17} /> <span>{purchaseMessage}</span>
				</div>
			)}
			{purchaseError && (
				<div className="team-purchase-alert is-error" role="alert">
					<CircleAlert size={17} /> <span>{purchaseError}</span>
				</div>
			)}

			<div className="team-purchase-main">
				<form className="team-purchase-form" onSubmit={(event) => void handlePurchase(event)}>
					<div className="team-purchase-form-heading">
						<span className="team-purchase-icon"><Package size={19} /></span>
						<div>
							<h4>Package 1</h4>
							<p>One-time team activation</p>
						</div>
						<strong>{loading ? '...' : `₹ ${formatAmount(data?.package.packagePrice ?? 0)}`}</strong>
					</div>

					<label className="team-purchase-label" htmlFor="team-purchase-user-id">Member user ID</label>
					<div className="team-purchase-input-row">
						<input
							id="team-purchase-user-id"
							name="userId"
							autoComplete="off"
							maxLength={80}
							placeholder="Enter member user ID"
							value={userId}
							required
							onChange={(event) => {
								setUserId(event.target.value);
								setVerifiedMember(null);
								setLookupError(null);
							}}
							onBlur={() => void verifyMember()}
						/>
						<button className="team-purchase-lookup" type="button" onClick={() => void verifyMember()} disabled={lookupLoading || !userId.trim()} aria-label="Verify member">
							<Search size={17} />
						</button>
					</div>
					<div className="team-purchase-member-status" aria-live="polite">
						{lookupLoading && <span>Checking member...</span>}
						{verifiedMember && <span className="is-verified"><BadgeCheck size={15} /> {verifiedMember.name} ({verifiedMember.userId})</span>}
						{lookupError && <span className="is-invalid">{lookupError}</span>}
					</div>

					<div className="team-purchase-total">
						<span>Amount to debit</span>
						<strong>{loading ? '...' : `₹ ${formatAmount(data?.package.packagePrice ?? 0)}`}</strong>
					</div>
					<button className="team-purchase-submit" type="submit" disabled={loading || submitting || Boolean(loadError) || !data}>
						{submitting ? 'Processing purchase...' : 'Purchase package'}
					</button>
				</form>

				<aside className="team-purchase-note">
					<Clock3 size={19} />
					<div>
						<h4>Recent activity</h4>
						<p>Latest team activations appear below after a successful purchase.</p>
					</div>
				</aside>
			</div>

			<section className="team-purchase-history" aria-labelledby="team-purchase-history-heading">
				<div className="team-purchase-history-heading">
					<div>
						<h4 id="team-purchase-history-heading">Team purchase history</h4>
						<p>Showing the latest 100 activations</p>
					</div>
					<button type="button" onClick={() => void loadData()} disabled={loading} aria-label="Refresh purchase history">
						<Clock3 size={16} /> Refresh
					</button>
				</div>
				<div className="team-purchase-table-scroll">
					<table className="team-purchase-table">
						<thead>
							<tr><th>#</th><th>Member</th><th>Package</th><th>Amount</th><th>Purchase date</th><th>Purchased by</th></tr>
						</thead>
						<tbody>
							{loading ? (
								<tr><td colSpan={6} className="team-purchase-empty">Loading purchase history...</td></tr>
							) : data?.history.length ? data.history.map((row, index) => (
								<tr key={`${row.dateTime}-${row.userId}-${index}`}>
									<td>{index + 1}</td>
									<td><strong>{row.name}</strong><span>{row.userId}</span></td>
									<td>Package {row.packageId}</td>
									<td>₹ {formatAmount(row.packagePrice)}</td>
									<td>{formatDateTime(row.dateTime)}</td>
									<td><strong>{row.purchaserName}</strong><span>{row.purchaserId}</span></td>
								</tr>
							)) : (
								<tr><td colSpan={6} className="team-purchase-empty">No team package purchases yet.</td></tr>
							)}
						</tbody>
					</table>
				</div>
			</section>
		</section>
	);
};

export default TeamPackagePurchase;
