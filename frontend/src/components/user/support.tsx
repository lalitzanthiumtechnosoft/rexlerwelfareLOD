import React, { useEffect, useState } from 'react';
import { CheckCircle2, LifeBuoy, LoaderCircle, Plus, X } from 'lucide-react';
import { createSupportTicket, fetchSupportData } from '../../services/api';
import type { SupportInboxTicket, SupportOutboxTicket, SupportPageData } from '../../services/api';
import './css/support.css';

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : '—';

const getStatus = (status: number) => {
	if (status === 2) return { label: 'Processing', className: 'processing' };
	if (status === 3) return { label: 'Resolved', className: 'resolved' };
	return { label: 'Open', className: 'open' };
};

const Support: React.FC = () => {
	const [pageData, setPageData] = useState<SupportPageData | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [subjectId, setSubjectId] = useState('');
	const [priorityId, setPriorityId] = useState('');
	const [ticketMessage, setTicketMessage] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const loadData = async () => {
		setError(null);
		try {
			setPageData(await fetchSupportData());
		} catch (loadError: unknown) {
			setError(loadError instanceof Error ? loadError.message : 'Failed to load support tickets.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadData();
	}, []);

	const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setSuccess(null);
		setIsSubmitting(true);
		try {
			const result = await createSupportTicket({
				subjectId: Number(subjectId),
				priorityId: Number(priorityId),
				ticketMessage: ticketMessage.trim()
			});
			setSuccess(`${result.message} Ticket number: ${result.ticket.ticketCode}.`);
			setSubjectId('');
			setPriorityId('');
			setTicketMessage('');
			setIsModalOpen(false);
			await loadData();
		} catch (submitError: unknown) {
			setError(submitError instanceof Error ? submitError.message : 'Failed to create support ticket.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return <div className="support-loading"><LoaderCircle size={18} className="support-spinner" /> Loading support tickets...</div>;
	}

	return (
		<div className="support-view">
			{error && <div className="support-alert error" role="alert">{error}</div>}
			{success && <div className="support-alert success" role="status"><CheckCircle2 size={17} /> {success}</div>}

			<div className="support-toolbar">
				{pageData?.canCreateTicket ? (
					<button type="button" className="support-create-btn" onClick={() => { setError(null); setIsModalOpen(true); }}>
						<Plus size={17} /> Create New Ticket
					</button>
				) : (
					<div className="support-open-ticket-notice">Your previous request is open or being processed. You can create another ticket after it is resolved.</div>
				)}
			</div>

			<section className="support-panel">
				<div className="support-panel-heading"><h3>All Outbox Tickets</h3></div>
				<div className="support-table-scroll">
					<table>
						<thead><tr><th>#</th><th>Ticket No</th><th>Subject</th><th>Message</th><th>Priority</th><th>Raise Date</th><th>Last Update</th><th>Status</th></tr></thead>
						<tbody>
							{pageData?.outbox.length ? pageData.outbox.map((ticket: SupportOutboxTicket, index) => {
								const status = getStatus(ticket.ticketStatus);
								return (
									<tr key={ticket.id}>
										<td>{index + 1}</td>
										<td>{ticket.ticketCode}</td>
										<td>{ticket.subjectName || '—'}</td>
										<td className="support-message-cell">{ticket.ticketMessage}</td>
										<td>{ticket.priorityName || '—'}</td>
										<td>{formatDate(ticket.raiseDate)}</td>
										<td>{formatDate(ticket.actionDate)}</td>
										<td><span className={`support-status ${status.className}`}>{status.label}</span></td>
									</tr>
								);
							}) : <tr><td colSpan={8} className="support-empty">No outbox tickets yet.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>

			<section className="support-panel">
				<div className="support-panel-heading"><h3>All Inbox Tickets</h3></div>
				<div className="support-table-scroll">
					<table>
						<thead><tr><th>#</th><th>Ticket No</th><th>Subject</th><th>Message</th><th>Date</th><th>Status</th></tr></thead>
						<tbody>
							{pageData?.inbox.length ? pageData.inbox.map((ticket: SupportInboxTicket, index) => {
								const status = getStatus(ticket.ticketStatus);
								return (
									<tr key={ticket.id}>
										<td>{index + 1}</td>
										<td>{ticket.ticketCode}</td>
										<td>{ticket.subjectName || '—'}</td>
										<td className="support-message-cell">{ticket.adminMessage}</td>
										<td>{formatDate(ticket.actionDate)}</td>
										<td><span className={`support-status ${status.className}`}>{status.label}</span></td>
									</tr>
								);
							}) : <tr><td colSpan={6} className="support-empty">No admin replies yet.</td></tr>}
						</tbody>
					</table>
				</div>
			</section>

			{isModalOpen && (
				<div className="support-modal-backdrop" role="presentation" onClick={() => setIsModalOpen(false)}>
					<section className="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-modal-title" onClick={(event) => event.stopPropagation()}>
						<header>
							<div><LifeBuoy size={20} /><h3 id="support-modal-title">Create a new ticket</h3></div>
							<button type="button" aria-label="Close" onClick={() => setIsModalOpen(false)}><X size={19} /></button>
						</header>
						<form onSubmit={(event) => void handleCreateTicket(event)}>
							<label>
								<span>Subject</span>
								<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required>
									<option value="">Select one</option>
									{pageData?.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
								</select>
							</label>
							<label>
								<span>Priority</span>
								<select value={priorityId} onChange={(event) => setPriorityId(event.target.value)} required>
									<option value="">Select one</option>
									{pageData?.priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}
								</select>
							</label>
							<label>
								<span>Message</span>
								<textarea value={ticketMessage} onChange={(event) => setTicketMessage(event.target.value)} placeholder="Describe how we can help" minLength={5} maxLength={5000} rows={5} required />
								<small>{ticketMessage.length}/5000</small>
							</label>
							{error && <div className="support-alert error" role="alert">{error}</div>}
							<footer>
								<button type="button" className="support-cancel-btn" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
								<button type="submit" className="support-submit-btn" disabled={isSubmitting || !pageData?.canCreateTicket}>
									{isSubmitting ? <><LoaderCircle size={15} className="support-spinner" /> Submitting...</> : 'Submit Ticket'}
								</button>
							</footer>
						</form>
					</section>
				</div>
			)}
		</div>
	);
};

export default Support;
