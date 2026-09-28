import React from 'react';
import type { DirectReferral } from '../../services/api';

interface DirectReferalTeamProps {
	referrals: DirectReferral[];
	loading: boolean;
	error: string | null;
}

const DirectReferalTeam: React.FC<DirectReferalTeamProps> = ({ referrals, loading, error }) => (
	<section className="referrals-table-panel" aria-labelledby="direct-referrals-heading">
		<div className="referrals-table-heading">
			<div>
				<h3 id="direct-referrals-heading">Direct Referrals</h3>
				<p>{referrals.length} direct {referrals.length === 1 ? 'referral' : 'referrals'}</p>
			</div>
		</div>
		<div className="referrals-table-scroll">
			<table className="referrals-table">
				<thead>
					<tr>
						<th>#</th>
						<th>User ID</th>
						<th>Name</th>
						<th>Email</th>
						<th>Phone</th>
						<th>Register Date</th>
						<th>Active Status</th>
						<th>Active Date</th>
					</tr>
				</thead>
				<tbody>
					{error ? (
						<tr><td className="referrals-empty" colSpan={8}>{error}</td></tr>
					) : loading ? (
						<tr><td className="referrals-empty" colSpan={8}>Loading direct referrals...</td></tr>
					) : referrals.length === 0 ? (
						<tr><td className="referrals-empty" colSpan={8}>No direct referrals found.</td></tr>
					) : referrals.map((referral, index) => {
						const isActive = Number(referral.topupFlag) === 1;
						return (
							<tr key={referral.memberId}>
								<td>{index + 1}</td>
								<td>{referral.userId || '-'}</td>
								<td>{referral.name || '-'}</td>
								<td>{referral.email || '-'}</td>
								<td>{referral.phone || '-'}</td>
								<td>{referral.registeredAt ? new Date(referral.registeredAt).toLocaleString() : '-'}</td>
								<td><span className={`referral-status ${isActive ? 'is-active' : 'is-inactive'}`}>{isActive ? 'Active' : 'Inactive'}</span></td>
								<td>{referral.activeAt ? new Date(referral.activeAt).toLocaleString() : '-'}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	</section>
);

export default DirectReferalTeam;
