import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, LoaderCircle } from 'lucide-react';
import { fetchWithdrawalData, submitWithdrawal } from '../../services/api';
import type { WithdrawalHistoryRow, WithdrawalPageData } from '../../services/api';
import './css/withdrawal.css';

const currency = (value: number | string) => `₹${Number(value || 0).toFixed(2)}`;

const getStatus = (status: number) => {
	if (status === 1) return { label: 'Released', className: 'released' };
	if (status === 2) return { label: 'Processing', className: 'processing' };
	if (status === 3) return { label: 'Rejected', className: 'rejected' };
	return { label: 'Pending', className: 'pending' };
};

const Withdrawal: React.FC = () => {
	const [pageData, setPageData] = useState<WithdrawalPageData | null>(null);
	const [amount, setAmount] = useState('');
	const [transactionPassword, setTransactionPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const loadData = async () => {
		setError(null);
		try {
			setPageData(await fetchWithdrawalData());
		} catch (loadError: unknown) {
			setError(loadError instanceof Error ? loadError.message : 'Failed to load withdrawal details.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadData();
	}, []);

	const withdrawalAmount = Number(amount || 0);
	const withdrawCharge = withdrawalAmount * (Number(pageData?.withdrawCharge || 0) / 100);
	const netAmount = Math.max(0, withdrawalAmount - withdrawCharge);
	const canSubmit = Boolean(
		pageData?.withdrawalWindow.open &&
		pageData.totalSponsors >= 2 &&
		pageData.bankDetailsConfigured &&
		withdrawalAmount >= pageData.minimumWithdraw &&
		(!pageData.maximumWithdraw || withdrawalAmount <= pageData.maximumWithdraw) &&
		withdrawalAmount <= pageData.user.incomeWallet
	);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		setError(null);
		setSuccess(null);

		if (!pageData?.withdrawalWindow.open) {
			setError(pageData?.withdrawalWindow.description || 'Withdrawal window is closed.');
			return;
		}
		if (pageData.totalSponsors < 2) {
			setError('At least 2 direct sponsors are required for withdrawal.');
			return;
		}
		if (!pageData.bankDetailsConfigured) {
			setError('Add your bank account details before requesting a withdrawal.');
			return;
		}
		if (!Number.isFinite(withdrawalAmount) || withdrawalAmount < pageData.minimumWithdraw) {
			setError(`Minimum withdrawal amount is ${currency(pageData.minimumWithdraw)}.`);
			return;
		}
		if (pageData.maximumWithdraw > 0 && withdrawalAmount > pageData.maximumWithdraw) {
			setError(`Maximum withdrawal amount is ${currency(pageData.maximumWithdraw)}.`);
			return;
		}
		if (withdrawalAmount > pageData.user.incomeWallet) {
			setError('Insufficient balance in your income wallet.');
			return;
		}
		if (!window.confirm(`Submit a withdrawal request for ${currency(withdrawalAmount)}?`)) return;

		setIsSubmitting(true);
		try {
			const result = await submitWithdrawal({ amount: withdrawalAmount, transactionPassword });
			setSuccess(`${result.message} Charge: ${currency(result.charge)}. Net payout: ${currency(result.netAmount)}.`);
			setAmount('');
			setTransactionPassword('');
			form.reset();
			await loadData();
		} catch (submitError: unknown) {
			setError(submitError instanceof Error ? submitError.message : 'Failed to submit withdrawal request.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return <div className="withdrawal-loading"><LoaderCircle size={18} className="withdrawal-spinner" /> Loading withdrawal details...</div>;
	}

	return (
		<div className="withdrawal-view">
			{error && <div className="withdrawal-alert error" role="alert">{error}</div>}
			{success && <div className="withdrawal-alert success" role="status"><CheckCircle2 size={17} /> {success}</div>}

			{pageData && (
				<div className={`withdrawal-window-notice ${pageData.withdrawalWindow.open ? 'open' : 'closed'}`} role="status">
					<Clock3 size={17} />
					<span>{pageData.withdrawalWindow.description} Current India time: {pageData.withdrawalWindow.localTime}.</span>
				</div>
			)}

			<section className="withdrawal-panel">
						<form className="withdrawal-form" onSubmit={(event) => void handleSubmit(event)}>
							<label><span>User ID</span><input value={pageData?.user.userId || ''} readOnly /></label>
							<label><span>Name</span><input value={pageData?.user.name || ''} readOnly /></label>
							<label><span>Income Wallet</span><input value={currency(pageData?.user.incomeWallet || 0)} readOnly /></label>
							{pageData?.bankDetailsConfigured && (
								<label><span>Bank Account</span><input value={`${pageData.user.bankAccountName} · ${pageData.user.bankName} · ${pageData.user.maskedAccountNumber}`} readOnly /></label>
							)}
							<label>
								<span>Withdraw Amount * (Minimum {currency(pageData?.minimumWithdraw || 0)})</span>
								<input
									type="number"
									min={pageData?.minimumWithdraw || 0.01}
									max={pageData?.maximumWithdraw || pageData?.user.incomeWallet || undefined}
									step="0.01"
									value={amount}
									onChange={(event) => setAmount(event.target.value)}
									placeholder="Enter withdraw amount"
									required
									disabled={!pageData?.withdrawalWindow.open || (pageData?.totalSponsors ?? 0) < 2 || !pageData?.bankDetailsConfigured}
								/>
							</label>
							{withdrawalAmount > 0 && (
								<div className="withdrawal-breakdown">
									<span>Withdrawal charge ({Number(pageData?.withdrawCharge || 0)}%) <strong>{currency(withdrawCharge)}</strong></span>
									<span>Net payout <strong>{currency(netAmount)}</strong></span>
								</div>
							)}
							<label>
								<span>Transaction Password *</span>
								<input
									type="password"
									value={transactionPassword}
									onChange={(event) => setTransactionPassword(event.target.value)}
									placeholder="Enter transaction password"
									minLength={3}
									maxLength={6}
									autoComplete="off"
									required
									disabled={!pageData?.withdrawalWindow.open || (pageData?.totalSponsors ?? 0) < 2 || !pageData?.bankDetailsConfigured}
								/>
							</label>
							{pageData && pageData.totalSponsors < 2 && (
								<div className="withdrawal-requirement">At least 2 direct sponsors are required. Current: {pageData.totalSponsors}.</div>
							)}
							{pageData && !pageData.bankDetailsConfigured && (
								<div className="withdrawal-requirement">Add bank details from Profile → Bank Details before requesting a withdrawal.</div>
							)}
							<button className="withdrawal-submit" type="submit" disabled={!canSubmit || isSubmitting}>
								{isSubmitting ? <><LoaderCircle size={15} className="withdrawal-spinner" /> Submitting...</> : 'Withdraw'}
							</button>
						</form>
			</section>

			<section className="withdrawal-panel withdrawal-history">
				<div className="withdrawal-history-heading"><h3>Withdraw Report</h3></div>
				<div className="withdrawal-table-scroll">
					<table>
						<thead>
							<tr><th>#</th><th>Amount</th><th>Withdraw Charge</th><th>Net Amount</th><th>Order ID</th><th>Date</th><th>Status</th><th>Action Date</th><th>Remark</th></tr>
						</thead>
						<tbody>
							{pageData?.history.length ? pageData.history.map((entry: WithdrawalHistoryRow, index) => {
								const status = getStatus(Number(entry.status));
								return (
									<tr key={entry.id}>
										<td>{index + 1}</td>
										<td>{currency(entry.amount)}</td>
										<td>{Number(entry.withdrawCharge).toFixed(2)}%</td>
										<td>{currency(entry.netAmount)}</td>
										<td className="withdrawal-order-id">{entry.orderid || '—'}</td>
										<td>{entry.requestedAt ? new Date(entry.requestedAt).toLocaleString() : '—'}</td>
										<td><span className={`withdrawal-status ${status.className}`}>{status.label}</span></td>
										<td>{entry.actionDate ? new Date(entry.actionDate).toLocaleString() : '—'}</td>
										<td>{entry.remarks || '—'}</td>
									</tr>
								);
							}) : <tr><td colSpan={9} className="withdrawal-empty">No withdrawal requests yet.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
};

export default Withdrawal;
