import React from 'react';
import type { TeamLevelCount, TeamTreeMember } from '../../services/api';

interface LevelTeamProps {
	selectedLevel: number | null;
	levels: TeamLevelCount[] | null;
	members: TeamTreeMember[] | null;
	error: string | null;
	onSelectLevel: (level: number) => void;
	onBack: () => void;
}

const LevelTeam: React.FC<LevelTeamProps> = ({
	selectedLevel,
	levels,
	members,
	error,
	onSelectLevel,
	onBack
}) => (
	<section className="referrals-table-panel" aria-labelledby="team-tree-heading">
		<div className="referrals-table-heading">
			<div>
				<h3 id="team-tree-heading">{selectedLevel === null ? 'Level Team' : `Level ${selectedLevel} Team`}</h3>
				<p>{selectedLevel === null ? 'Member count for each level' : `${members?.length ?? 0} members in this level`}</p>
			</div>
			{selectedLevel !== null && (
				<button className="team-level-back-btn" type="button" onClick={onBack}>
					Back to levels
				</button>
			)}
		</div>
		<div className="referrals-table-scroll">
			<table className="referrals-table">
				{selectedLevel === null ? (
					<>
						<thead>
							<tr>
								<th>#</th>
								<th>Level Number.</th>
								<th>Total Member</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							{error ? (
								<tr><td className="referrals-empty" colSpan={4}>{error}</td></tr>
							) : !levels ? (
								<tr><td className="referrals-empty" colSpan={4}>Loading team levels...</td></tr>
							) : levels.map(({ level, totalMembers }, index) => (
								<tr key={level}>
									<td>{index + 1}</td>
									<td>Level {level}</td>
									<td className="team-member-count">{totalMembers}</td>
									<td>
										<button className="team-level-more-btn" type="button" onClick={() => onSelectLevel(level)}>
											More
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</>
				) : (
					<>
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
							) : !members ? (
								<tr><td className="referrals-empty" colSpan={8}>Loading level members...</td></tr>
							) : members.length === 0 ? (
								<tr><td className="referrals-empty" colSpan={8}>No members found for this level.</td></tr>
							) : members.map((member, index) => {
								const isActive = Number(member.topupStatus) === 1;
								return (
									<tr key={member.memberId}>
										<td>{index + 1}</td>
										<td>{member.userId || '-'}</td>
										<td>{member.name || '-'}</td>
										<td>{member.email || '-'}</td>
										<td>{member.phone || '-'}</td>
										<td>{member.joinedAt ? new Date(member.joinedAt).toLocaleString() : '-'}</td>
										<td><span className={`referral-status ${isActive ? 'is-active' : 'is-inactive'}`}>{isActive ? 'Active' : 'Inactive'}</span></td>
										<td>{member.activeAt ? new Date(member.activeAt).toLocaleString() : '-'}</td>
									</tr>
								);
							})}
						</tbody>
					</>
				)}
			</table>
		</div>
	</section>
);

export default LevelTeam;
