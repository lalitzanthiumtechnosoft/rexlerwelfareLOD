import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import { fetchDailyIncome, fetchDailyIncomeDetails } from '../../services/api';
import type { DailyIncomeDetail, DailyIncomeSummary } from '../../services/api';

const formatAmount = (amount: number | string) => Number(amount || 0).toFixed(2);

const formatDateTime = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	const parts = new Intl.DateTimeFormat('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(date);
	const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
	return `${values.day}-${values.month}-${values.year} ${values.hour}:${values.minute}:${values.second}`;
};

const getIncomeStatus = (status: number) => {
	if (Number(status) === 1) return { label: 'RUNNING', className: 'is-active' };
	if (Number(status) === 2) return { label: 'HOLD', className: 'is-inactive' };
	return { label: 'PENDING', className: 'is-inactive' };
};

const getReleaseStatus = (status: number) => {
	if (Number(status) === 1) return { label: 'RUNNING', className: 'is-active' };
	if (Number(status) === 0 || Number(status) === 2) return { label: 'COMPLETED', className: 'is-inactive' };
	return { label: 'PENDING', className: 'is-inactive' };
};

const TeamDailyIncome: React.FC = () => {
	const [incomeRows, setIncomeRows] = useState<DailyIncomeSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedSummary, setSelectedSummary] = useState<DailyIncomeSummary | null>(null);
	const [details, setDetails] = useState<DailyIncomeDetail[]>([]);
	const [detailsLoading, setDetailsLoading] = useState(false);
	const [detailsError, setDetailsError] = useState<string | null>(null);
	const [searchText, setSearchText] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [copyCompleted, setCopyCompleted] = useState(false);
	const pageSize = 10;

	useEffect(() => {
		let cancelled = false;
		fetchDailyIncome()
			.then((rows) => {
				if (!cancelled) setIncomeRows(rows);
			})
			.catch((loadError: unknown) => {
				if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Failed to load daily income.');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!selectedSummary) return;
		let cancelled = false;

		fetchDailyIncomeDetails(selectedSummary.summaryId)
			.then((rows) => {
				if (!cancelled) setDetails(rows);
			})
			.catch((loadError: unknown) => {
				if (!cancelled) setDetailsError(loadError instanceof Error ? loadError.message : 'Failed to load income details.');
			})
			.finally(() => {
				if (!cancelled) setDetailsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [selectedSummary]);

	const filteredDetails = details.filter((detail) =>
		[detail.userId, detail.name, formatAmount(detail.dailyAmount), formatDateTime(detail.releaseDate)]
			.some((value) => String(value || '').toLowerCase().includes(searchText.toLowerCase()))
	);
	const pageCount = Math.max(1, Math.ceil(filteredDetails.length / pageSize));
	const visibleDetails = filteredDetails.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	const downloadFile = (content: string, type: string, filename: string) => {
		const url = URL.createObjectURL(new Blob([content], { type }));
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handleCsvExport = () => {
		const rows = [
			['#', 'User Id', 'Name', 'Daily Amount', 'Release Date'],
			...filteredDetails.map((detail, index) => [
				String(index + 1), detail.userId || '', detail.name || '',
				`Rs ${formatAmount(detail.dailyAmount)}`, formatDateTime(detail.releaseDate)
			])
		];
		const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
		downloadFile(csv, 'text/csv;charset=utf-8', 'daily-income-details.csv');
	};

	const handleExcelExport = () => {
		const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
		const rows = filteredDetails.map((detail, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(detail.userId || '')}</td><td>${escapeHtml(detail.name || '')}</td><td>Rs ${formatAmount(detail.dailyAmount)}</td><td>${formatDateTime(detail.releaseDate)}</td></tr>`).join('');
		const workbook = `<html><head><meta charset="utf-8"></head><body><table><thead><tr><th>#</th><th>User Id</th><th>Name</th><th>Daily Amount</th><th>Release Date</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
		downloadFile(workbook, 'application/vnd.ms-excel', 'daily-income-details.xls');
	};

	const handleCopy = async () => {
		const header = ['#', 'User Id', 'Name', 'Daily Amount', 'Release Date'];
		const rows = filteredDetails.map((detail, index) => [
			String(index + 1), detail.userId || '', detail.name || '',
			`Rs ${formatAmount(detail.dailyAmount)}`, formatDateTime(detail.releaseDate)
		]);
		await navigator.clipboard.writeText([header, ...rows].map((row) => row.join('\t')).join('\n'));
		setCopyCompleted(true);
		window.setTimeout(() => setCopyCompleted(false), 1500);
	};

	return (
		<section className="referrals-table-panel" aria-labelledby="daily-income-heading">
			<div className="referrals-table-heading">
				<div>
					<h3 id="daily-income-heading">Daily Field Expenses Income</h3>
					<p>{selectedSummary ? `Level ${selectedSummary.level} income details` : `${incomeRows.length} income records`}</p>
				</div>
				{selectedSummary && (
					<button
						className="team-level-back-btn"
						type="button"
						onClick={() => {
							setSelectedSummary(null);
							setDetailsLoading(false);
						}}
					>
						<ArrowLeft size={15} /> Back to income
					</button>
				)}
			</div>

			{!selectedSummary ? (
				<div className="referrals-table-scroll">
					<table className="referrals-table daily-income-table">
						<thead>
							<tr>
								<th>#</th>
								<th>UserId</th>
								<th>Name</th>
								<th>Daily Income</th>
								<th>Level</th>
								<th>Date</th>
								<th>Income Get</th>
								<th>Income Status</th>
								<th>Release Status</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							{error ? (
								<tr><td className="referrals-empty" colSpan={10}>{error}</td></tr>
							) : loading ? (
								<tr><td className="referrals-empty" colSpan={10}>Loading income records...</td></tr>
							) : incomeRows.length === 0 ? (
								<tr><td className="referrals-empty" colSpan={10}>No daily income records found.</td></tr>
							) : incomeRows.map((row, index) => {
								const incomeStatus = getIncomeStatus(row.incomeStatus);
								const releaseStatus = getReleaseStatus(row.releaseStatus);
								return (
									<tr key={row.summaryId}>
										<td>{index + 1}</td>
										<td>{row.userId}</td>
										<td>{row.name}</td>
										<td>₹ {formatAmount(row.dailyIncome)}</td>
										<td>Level {row.level}</td>
										<td>{formatDateTime(row.createdAt)}</td>
										<td>₹ {formatAmount(row.incomeGet)}</td>
										<td><span className={`referral-status ${incomeStatus.className}`}>{incomeStatus.label}</span></td>
										<td><span className={`referral-status ${releaseStatus.className}`}>{releaseStatus.label}</span></td>
										<td>
											<button
												className="team-level-more-btn"
												type="button"
												onClick={() => {
													setDetails([]);
													setDetailsError(null);
													setDetailsLoading(true);
													setSelectedSummary(row);
												}}
											>
												<Eye size={14} /> More
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<>
					<div className="daily-income-toolbar">
						<div className="daily-income-export-actions">
							<button type="button" onClick={() => void handleCopy()}>{copyCompleted ? 'Copied' : 'Copy'}</button>
							<button type="button" onClick={handleExcelExport}>Excel</button>
							<button type="button" onClick={handleCsvExport}>CSV</button>
							<button type="button" onClick={() => window.print()}>PDF</button>
						</div>
						<label className="daily-income-search">
							<span>Search:</span>
							<input
								type="search"
								value={searchText}
								onChange={(event) => {
									setSearchText(event.target.value);
									setCurrentPage(1);
								}}
								aria-label="Search income details"
							/>
						</label>
					</div>
					<div className="referrals-table-scroll">
						<table className="referrals-table">
							<thead>
								<tr>
									<th>#</th>
									<th>User Id</th>
									<th>Name</th>
									<th>Daily Amount</th>
									<th>Release Date</th>
								</tr>
							</thead>
							<tbody>
								{detailsError ? (
										<tr><td className="referrals-empty" colSpan={5}>{detailsError}</td></tr>
								) : detailsLoading ? (
										<tr><td className="referrals-empty" colSpan={5}>Loading income details...</td></tr>
								) : filteredDetails.length === 0 ? (
										<tr><td className="referrals-empty" colSpan={5}>No released income details found for this record.</td></tr>
									) : visibleDetails.map((detail, index) => (
									<tr key={detail.id}>
											<td>{(currentPage - 1) * pageSize + index + 1}</td>
										<td>{detail.userId || '-'}</td>
										<td>{detail.name || '-'}</td>
											<td><span className="daily-amount-badge">₹ {formatAmount(detail.dailyAmount)}</span></td>
											<td>{formatDateTime(detail.releaseDate)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="daily-income-pagination">
						<span>Showing {filteredDetails.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredDetails.length)} of {filteredDetails.length} entries</span>
						<div>
							<button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button>
							<span>{currentPage}</span>
							<button type="button" disabled={currentPage >= pageCount} onClick={() => setCurrentPage((page) => page + 1)}>Next</button>
						</div>
					</div>
				</>
			)}
		</section>
	);
};

export default TeamDailyIncome;
