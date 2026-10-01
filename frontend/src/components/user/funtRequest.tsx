import React, { useEffect, useState } from 'react';
import { Check, Copy, Eye, FileImage, LoaderCircle, Upload } from 'lucide-react';
import {
  fetchFundRequestData,
  fetchFundRequestPaymentDetails,
  fetchFundRequestReceipt,
  submitFundRequest
} from '../../services/api';
import type {
  FundRequestHistoryRow,
  FundRequestPageData,
  FundRequestPaymentDetails
} from '../../services/api';
import './css/fundRequest.css';

const formatDate = (value: string) => new Date(value).toLocaleString();

const statusLabel = (status: number) => {
  if (status === 1) return 'Approved';
  if (status === 2) return 'Rejected';
  return 'Pending';
};

const statusClass = (status: number) => {
  if (status === 1) return 'approved';
  if (status === 2) return 'rejected';
  return 'pending';
};

const paymentImageUrl = (image: string) => {
  if (/^https?:\/\//i.test(image) || image.startsWith('/')) return image;
  return `/${image.replace(/^(\.\.\/)+/, '')}`;
};

const FundRequest: React.FC = () => {
  const [pageData, setPageData] = useState<FundRequestPageData | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<FundRequestPaymentDetails | null>(null);
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentHash, setPaymentHash] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');
  const [slip, setSlip] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState<number | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const loadPageData = async () => {
    setError(null);
    try {
      setPageData(await fetchFundRequestData());
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load fund request data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  useEffect(() => () => {
    if (receiptUrl) URL.revokeObjectURL(receiptUrl);
  }, [receiptUrl]);

  const handlePaymentModeChange = async (value: string) => {
    setPaymentId(value);
    setPaymentDetails(null);
    setError(null);
    if (!value) return;

    setIsLoadingPayment(true);
    try {
      setPaymentDetails(await fetchFundRequestPaymentDetails(Number(value)));
    } catch (paymentError: unknown) {
      setError(paymentError instanceof Error ? paymentError.message : 'Failed to load payment details.');
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setSuccess(null);

    if (!slip) {
      setError('Please upload your payment slip.');
      return;
    }
    if (!paymentId || !paymentDetails) {
      setError('Please select an active payment mode.');
      return;
    }
    if (!window.confirm('Are you sure you want to submit this fund request?')) return;

    const formData = new FormData();
    formData.append('requestFund', amount);
    formData.append('paymentId', paymentId);
    formData.append('paymentHash', paymentHash.trim());
    formData.append('transactionPassword', transactionPassword);
    formData.append('transactionImage', slip);

    setIsSubmitting(true);
    try {
      const result = await submitFundRequest(formData);
      setSuccess(result.message);
      setAmount('');
      setPaymentId('');
      setPaymentDetails(null);
      setPaymentHash('');
      setTransactionPassword('');
      setSlip(null);
      form.reset();
      await loadPageData();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit fund request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReceipt = async (request: FundRequestHistoryRow) => {
    setError(null);
    setIsLoadingReceipt(request.id);
    try {
      const receipt = await fetchFundRequestReceipt(request.id);
      setReceiptUrl(URL.createObjectURL(receipt));
    } catch (receiptError: unknown) {
      setError(receiptError instanceof Error ? receiptError.message : 'Failed to load payment slip.');
    } finally {
      setIsLoadingReceipt(null);
    }
  };

  const handleCopyAddress = async () => {
    if (!paymentDetails?.address) return;
    try {
      await navigator.clipboard.writeText(paymentDetails.address);
      setCopiedAddress(true);
      window.setTimeout(() => setCopiedAddress(false), 1800);
    } catch {
      setError('Could not copy the payment address.');
    }
  };

  const pendingRequest = pageData?.requests.some((request) => request.status === 0) ?? false;

  if (isLoading) {
    return <div className="fund-request-loading"><LoaderCircle size={20} className="fund-request-spinner" /> Loading fund request details...</div>;
  }

  return (
    <div className="fund-request-view">
      {error && <div className="fund-request-alert error" role="alert">{error}</div>}
      {success && <div className="fund-request-alert success" role="status"><Check size={16} /> {success}</div>}

      {pendingRequest && (
        <div className="fund-request-alert pending-notice" role="status">
          You already have a pending fund request. Wait for it to be reviewed before submitting another.
        </div>
      )}

      <div className="fund-request-top-grid">
        <section className="fund-request-panel">
          <div className="fund-request-panel-heading">
            <h3>Request Funds</h3>
            <span className="fund-request-wallet">Fund Wallet <strong>₹{Number(pageData?.user.fundWallet || 0).toFixed(2)}</strong></span>
          </div>

          <form className="fund-request-form" onSubmit={(event) => void handleSubmit(event)}>
            <label>
              <span>User ID</span>
              <input value={pageData?.user.userId || ''} readOnly />
            </label>

            <label>
              <span>Fund Need <b>*</b></span>
              <input
                type="number"
                min="0.01"
                max="99999999.99"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter requested amount"
                required
                disabled={pendingRequest}
              />
            </label>

            <label>
              <span>Payment Mode <b>*</b></span>
              <select value={paymentId} onChange={(event) => void handlePaymentModeChange(event.target.value)} required disabled={pendingRequest}>
                <option value="">Select one</option>
                {pageData?.paymentModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.name}</option>)}
              </select>
            </label>

            <label>
              <span>Payment Slip <b>*</b></span>
              <span className="fund-request-file-control">
                <Upload size={15} />
                <span>{slip?.name || 'Choose JPG, PNG, or GIF (max 5 MB)'}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                  required
                  disabled={pendingRequest}
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] || null;
                    if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
                      setError('Payment slip must be 5 MB or smaller.');
                      setSlip(null);
                      event.target.value = '';
                      return;
                    }
                    setError(null);
                    setSlip(selectedFile);
                  }}
                />
              </span>
            </label>

            <label>
              <span>Transaction ID <b>*</b></span>
              <textarea
                value={paymentHash}
                onChange={(event) => setPaymentHash(event.target.value)}
                placeholder="Transaction hash or reference number"
                maxLength={1000}
                rows={2}
                required
                disabled={pendingRequest}
              />
            </label>

            <label>
              <span>Transaction Password <b>*</b></span>
              <input
                type="password"
                value={transactionPassword}
                onChange={(event) => setTransactionPassword(event.target.value)}
                placeholder="Enter your transaction password"
                minLength={3}
                maxLength={6}
                autoComplete="off"
                required
                disabled={pendingRequest}
              />
            </label>

            <button className="fund-request-submit" type="submit" disabled={pendingRequest || isSubmitting || isLoadingPayment}>
              {isSubmitting ? <><LoaderCircle size={15} className="fund-request-spinner" /> Submitting...</> : 'Submit Request'}
            </button>
          </form>
        </section>

        <section className="fund-request-panel fund-request-payment-panel" aria-live="polite">
          <div className="fund-request-panel-heading"><h3>Payment Details</h3></div>
          {isLoadingPayment ? (
            <div className="fund-request-empty"><LoaderCircle size={18} className="fund-request-spinner" /> Loading payment details...</div>
          ) : paymentDetails ? (
            <div className="fund-request-payment-content">
              <strong>{paymentDetails.name}</strong>
              {paymentDetails.image && (
                <img
                  className="fund-request-qr"
                  src={paymentImageUrl(paymentDetails.image)}
                  alt={`${paymentDetails.name} payment QR`}
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
              )}
              {paymentDetails.address ? (
                <div className="fund-request-address">
                  <span>{paymentDetails.address}</span>
                  <button type="button" aria-label="Copy payment address" title="Copy payment address" onClick={() => void handleCopyAddress()}>
                    {copiedAddress ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              ) : (
                <p className="fund-request-empty">Follow the payment instructions provided by the selected payment mode.</p>
              )}
            </div>
          ) : (
            <div className="fund-request-empty">Select a payment mode to view its payment address or QR code.</div>
          )}
        </section>
      </div>

      <section className="fund-request-panel fund-request-history-panel">
        <div className="fund-request-panel-heading">
          <h3>Fund Request History</h3>
          <span className="fund-request-wallet">Fund Wallet <strong>${Number(pageData?.user.fundWallet || 0).toFixed(2)}</strong></span>
        </div>
        <div className="fund-request-table-scroll">
          <table className="fund-request-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User ID</th>
                <th>Name</th>
                <th>Requested Amount</th>
                <th>Request Date</th>
                <th>Payment Mode</th>
                <th>Transaction ID</th>
                <th>Transaction Slip</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData?.requests.length ? pageData.requests.map((request, index) => (
                <tr key={request.id}>
                  <td>{index + 1}</td>
                  <td>{request.userId}</td>
                  <td>{request.name}</td>
                  <td>₹{Number(request.amount).toFixed(2)}</td>
                  <td>{formatDate(request.requestDate)}</td>
                  <td>{request.paymentMode || '—'}</td>
                  <td className="fund-request-hash">{request.transactionId}</td>
                  <td>
                    <button className="fund-request-receipt-btn" type="button" onClick={() => void handleViewReceipt(request)} disabled={isLoadingReceipt === request.id}>
                      {isLoadingReceipt === request.id ? <LoaderCircle size={14} className="fund-request-spinner" /> : <Eye size={14} />}
                      View slip
                    </button>
                  </td>
                  <td><span className={`fund-request-status ${statusClass(request.status)}`}>{statusLabel(request.status)}</span></td>
                </tr>
              )) : (
                <tr><td className="fund-request-no-data" colSpan={9}>No fund requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {receiptUrl && (
        <div className="fund-request-modal-backdrop" role="presentation" onClick={() => setReceiptUrl(null)}>
          <div className="fund-request-receipt-modal" role="dialog" aria-modal="true" aria-label="Payment slip" onClick={(event) => event.stopPropagation()}>
            <div><FileImage size={18} /><strong>Payment Slip</strong><button type="button" onClick={() => setReceiptUrl(null)}>Close</button></div>
            <img src={receiptUrl} alt="Uploaded payment slip" />
          </div>
        </div>
      )}
    </div>
  );
};

export default FundRequest;