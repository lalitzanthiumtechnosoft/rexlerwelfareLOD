import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, LoaderCircle } from 'lucide-react';
import { fetchWalletTransferData, transferIncomeToPurchaseWallet } from '../../services/api';
import type { WalletTransferPageData } from '../../services/api';
import './css/incomeToPurchase.css';

const formatCurrency = (amount: number | string) => `₹${Number(amount || 0).toFixed(2)}`;

const IncomeToPurchase: React.FC = () => {
	const [pageData, setPageData] = useState<WalletTransferPageData | null>(null);
	const [amount, setAmount] = useState('');
	const [transactionPassword, setTransactionPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const loadData = async () => {
		setError(null);
		try {
			setPageData(await fetchWalletTransferData());
		} catch (loadError: unknown) {
			setError(loadError instanceof Error ? loadError.message : 'Failed to load wallet data.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadData();
	}, []);

	const transferAmount = Number(amount || 0);
	const charge = transferAmount * (Number(pageData?.chargePercent || 0) / 100);
	const netAmount = Math.max(0, transferAmount - charge);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		setError(null);
		setSuccess(null);

		if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
			setError('Transfer amount must be greater than zero.');
			return;
		}
		if (transferAmount > Number(pageData?.user.incomeWallet || 0)) {
			setError('Transfer amount cannot exceed your income wallet balance.');
			return;
		}
		if (!window.confirm(`Transfer ${formatCurrency(transferAmount)} from your income wallet?`)) return;

		setIsSubmitting(true);
		try {
			const result = await transferIncomeToPurchaseWallet({ amount: transferAmount, transactionPassword });
			setSuccess(`${result.message} Fee: ${formatCurrency(result.transferCharge)}. Added to purchase wallet: ${formatCurrency(result.depositAmount)}.`);
			setAmount('');
			setTransactionPassword('');
			form.reset();
			await loadData();
		} catch (submitError: unknown) {
			setError(submitError instanceof Error ? submitError.message : 'Failed to transfer wallet balance.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return <div className="income-transfer-loading"><LoaderCircle size={18} className="income-transfer-spinner" /> Loading wallet balances...</div>;
	}

	return (
		<div className="income-transfer-view">
			{error && <div className="income-transfer-alert error" role="alert">{error}</div>}
			{success && <div className="income-transfer-alert success" role="status"><CheckCircle2 size={17} /> {success}</div>}

			<section className="income-transfer-panel">
				<form className="income-transfer-form" onSubmit={(event) => void handleSubmit(event)}>
					<label>
						<span>User ID</span>
						<input value={pageData?.user.userId || ''} readOnly />
					</label>
					<label>
						<span>Name</span>
						<input value={pageData?.user.name || ''} readOnly />
					</label>
					<label>
						<span>Income Wallet</span>
						<input value={formatCurrency(pageData?.user.incomeWallet || 0)} readOnly />
					</label>
					<label>
						<span>Purchase Wallet</span>
						<input value={formatCurrency(pageData?.user.fundWallet || 0)} readOnly />
					</label>
					<label>
						<span>Amount To Transfer <b>*</b></span>
						<input
							type="number"
							min="0.01"
							max={pageData?.user.incomeWallet || undefined}
							step="0.01"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
							placeholder="Enter transfer amount"
							required
						/>
					</label>
					{transferAmount > 0 && (
						<div className="income-transfer-breakdown">
							<span>Transfer charge ({Number(pageData?.chargePercent || 0)}%) <strong>{formatCurrency(charge)}</strong></span>
							<span>Added to purchase wallet <strong>{formatCurrency(netAmount)}</strong></span>
						</div>
					)}
					<label>
						<span>Transaction Password <b>*</b></span>
						<input
							type="password"
							value={transactionPassword}
							onChange={(event) => setTransactionPassword(event.target.value)}
							placeholder="Enter transaction password"
							minLength={3}
							maxLength={6}
							autoComplete="off"
							required
						/>
					</label>
					<button className="income-transfer-submit" type="submit" disabled={isSubmitting}>
						{isSubmitting ? <><LoaderCircle size={15} className="income-transfer-spinner" /> Transferring...</> : <><ArrowRightLeft size={15} /> Transfer</>}
					</button>
				</form>
			</section>

			<section className="income-transfer-panel income-transfer-history">
				<div className="income-transfer-history-heading"><h3>Main Wallet To Purchase Wallet History</h3></div>
				<div className="income-transfer-table-scroll">
					<table>
						<thead>
							<tr><th>#</th><th>User ID</th><th>Name</th><th>Transfer Amount</th><th>Transfer Date</th></tr>
						</thead>
						<tbody>
							{pageData?.history.length ? pageData.history.map((entry, index) => (
								<tr key={entry.id}>
									<td>{index + 1}</td>
									<td>{entry.userId}</td>
									<td>{entry.name}</td>
									<td><span className="income-transfer-amount">{formatCurrency(entry.transferAmount)}</span></td>
									<td>{new Date(entry.transferDate).toLocaleString()}</td>
								</tr>
							)) : <tr><td colSpan={5} className="income-transfer-empty">No wallet transfers yet.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
};

export default IncomeToPurchase;
