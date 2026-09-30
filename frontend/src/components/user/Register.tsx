import React, { useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, CheckCircle2, Eye, EyeOff, Mail, Phone, UserRound, Users } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { fetchRegistrationOptions, lookupSponsor, registerUser } from '../../services/api';
import type { RegistrationOption } from '../../services/api';

interface RegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [sponsorId, setSponsorId] = useState(() => new URLSearchParams(window.location.search).get('affiliateCode') || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryId, setCountryId] = useState('95');
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [password, setPassword] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTransactionPassword, setShowTransactionPassword] = useState(false);
  const [options, setOptions] = useState<{ countries: RegistrationOption[]; states: RegistrationOption[]; districts: RegistrationOption[] }>({
    countries: [], states: [], districts: []
  });
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<{ userId: string; name: string } | null>(null);
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRegistrationOptions()
      .then((result) => {
        if (!cancelled) setOptions(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setOptionsError(error instanceof Error ? error.message : 'Could not load locations.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const verifySponsor = async () => {
    const value = sponsorId.trim();
    setSponsor(null);
    setSponsorError(null);
    if (!value) {
      setSponsorError('Enter a sponsor user ID.');
      return;
    }

    setSponsorLoading(true);
    try {
      setSponsor(await lookupSponsor(value));
    } catch (error: unknown) {
      setSponsorError(error instanceof Error ? error.message : 'Could not verify sponsor.');
    } finally {
      setSponsorLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

    if (!sponsorId.trim()) {
      setErrorMsg('Please enter a sponsor user ID.');
      return;
    }
    if (!/^\d{7,15}$/.test(phone)) {
      setErrorMsg('Enter a phone number with 7 to 15 digits.');
      return;
    }
    if (!countryId || !stateId || !districtId) {
      setErrorMsg('Please select your country, state, and district.');
      return;
    }
    if (password.length < 4 || transactionPassword.length < 4) {
      setErrorMsg('Both passwords must be at least 4 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerUser({
        name: name.trim(),
        sponsorId: sponsorId.trim(),
        email: email.trim(),
        phone,
        countryId: Number(countryId),
        stateId: Number(stateId),
        districtId: Number(districtId),
        password,
        transactionPassword,
      });

      setCreatedUserId(response.userId || null);
      setSuccessMsg(response.message || 'Account created successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-card auth-card-register" aria-labelledby="auth-title">
      <nav className="auth-card-nav" aria-label="Account navigation">
        <button type="button" onClick={() => window.location.reload()}>Home</button>
        <span aria-hidden="true">|</span>
        <button type="button" onClick={onSwitchToLogin}>Login</button>
      </nav>

      <img className="auth-logo" src={logoImg} alt="Rexler Welfare Foundation" />
      <h1 className="auth-title" id="auth-title">Create account</h1>

      {/* Messages */}
      {errorMsg && (
        <div className="alert-box error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert-box success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <div>{successMsg}{createdUserId && <strong className="register-created-user">Your user ID: {createdUserId}</strong>}</div>
        </div>
      )}

      {createdUserId && (
        <button className="auth-submit-btn register-login-button" type="button" onClick={onSuccess}>
          Continue to login
        </button>
      )}

      {/* Form */}
      {!createdUserId && <form className="register-form" onSubmit={handleSubmit}>
        {optionsError && <div className="alert-box error register-options-error" role="alert">{optionsError}</div>}
        <div className="register-fields-grid">
          <label className="register-field register-field-wide">
            <span>Sponsor user ID</span>
            <div className="register-sponsor-control">
              <input type="text" value={sponsorId} onChange={(event) => { setSponsorId(event.target.value); setSponsor(null); setSponsorError(null); }} disabled={isLoading} required autoComplete="off" />
              <button type="button" onClick={() => void verifySponsor()} disabled={sponsorLoading || isLoading} aria-label="Verify sponsor"><Users size={16} /></button>
            </div>
            <small aria-live="polite">
              {sponsorLoading && 'Checking sponsor...'}
              {sponsor && <span className="register-valid"><BadgeCheck size={14} /> {sponsor.name} ({sponsor.userId})</span>}
              {sponsorError && <span className="register-invalid">{sponsorError}</span>}
            </small>
          </label>

          <label className="register-field register-field-wide">
            <span>Full name</span>
            <div className="register-input-icon"><UserRound size={15} /><input type="text" value={name} onChange={(event) => setName(event.target.value)} disabled={isLoading} required autoComplete="name" maxLength={120} /></div>
          </label>
          <label className="register-field">
            <span>Email address</span>
            <div className="register-input-icon"><Mail size={15} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} required autoComplete="email" /></div>
          </label>
          <label className="register-field">
            <span>Phone number</span>
            <div className="register-input-icon"><Phone size={15} /><input type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 15))} disabled={isLoading} required autoComplete="tel" /></div>
          </label>

          <label className="register-field">
            <span>Country</span>
            <select value={countryId} onChange={(event) => setCountryId(event.target.value)} disabled={isLoading || !options.countries.length} required>
              <option value="">Select country</option>
              {options.countries.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label className="register-field">
            <span>State</span>
            <select value={stateId} onChange={(event) => setStateId(event.target.value)} disabled={isLoading || !options.states.length} required>
              <option value="">Select state</option>
              {options.states.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label className="register-field register-field-wide">
            <span>District</span>
            <select value={districtId} onChange={(event) => setDistrictId(event.target.value)} disabled={isLoading || !options.districts.length} required>
              <option value="">Select district</option>
              {options.districts.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>

          <label className="register-field">
            <span>Login password</span>
            <div className="register-input-icon"><input className="register-password-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} disabled={isLoading} required autoComplete="new-password" minLength={4} maxLength={72} /><button className="register-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide login password' : 'Show login password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
          </label>
          <label className="register-field">
            <span>Transaction password</span>
            <div className="register-input-icon"><input className="register-password-input" type={showTransactionPassword ? 'text' : 'password'} value={transactionPassword} onChange={(event) => setTransactionPassword(event.target.value)} disabled={isLoading} required autoComplete="new-password" minLength={4} maxLength={72} /><button className="register-password-toggle" type="button" onClick={() => setShowTransactionPassword((visible) => !visible)} aria-label={showTransactionPassword ? 'Hide transaction password' : 'Show transaction password'} title={showTransactionPassword ? 'Hide password' : 'Show password'}>{showTransactionPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
          </label>
        </div>

        {/* Sub-links */}
        <div className="auth-links">
          <div className="auth-switch-prompt">
            Already have an account? 
            <button type="button" onClick={onSwitchToLogin}>
              Login
            </button>
          </div>
        </div>

        {/* SIGN UP Button */}
        <button type="submit" className="auth-submit-btn" disabled={isLoading || Boolean(optionsError)}>
          {isLoading ? (
            <div className="spinner"></div>
          ) : (
            'SIGN UP'
          )}
        </button>
      </form>}
    </section>
  );
};
