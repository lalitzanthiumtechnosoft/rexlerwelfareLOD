import axios from 'axios';

// Base API configuration
const API_BASE_URL = '/api';
const BACKEND_HEALTH_URL = import.meta.env.VITE_BACKEND_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to attach JWT token to authorization header if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rexler_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface RegisterPayload {
  name: string;
  sponsorId: string;
  email: string;
  phone: string;
  countryId: number;
  stateId: number;
  districtId: number;
  password: string;
  transactionPassword: string;
}

export interface RegistrationOption {
  id: number;
  name: string;
}

export interface LoginPayload {
  userId: string;
  password: string;
}

export interface AuthUser {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  userId?: string;
  memberId?: string;
  topupFlag?: number;
  wallet?: number | string;
  fundWallet?: number | string;
  incomeWallet?: number | string;
  totalEarning?: number | string;
  dailyIncome?: number | string;
  levelIncome?: number | string;
  swasthya?: number | string;
  garbhavati?: number | string;
  kanya?: number | string;
  aawas?: number | string;
  totalSponser?: number;
  activeSponser?: number;
  inActiveSponser?: number;
  totalTeam?: number;
  activeTeam?: number;
  inActiveTeam?: number;
  created_at?: string;
}

export interface BankDetails {
  accountHolderName: string;
  ifscCode: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  panNumber: string;
}

export interface FundRequestPaymentMode {
  id: number;
  name: string;
}

export interface FundRequestPaymentDetails extends FundRequestPaymentMode {
  address: string | null;
  image: string | null;
}

export interface FundRequestHistoryRow {
  id: number;
  userId: string;
  name: string;
  amount: number | string;
  requestDate: string;
  transactionId: string;
  paymentId: number;
  paymentMode: string | null;
  transactionImage: string;
  status: number;
}

export interface FundRequestPageData {
  user: { userId: string; name: string; fundWallet: number };
  paymentModes: FundRequestPaymentMode[];
  requests: FundRequestHistoryRow[];
}

export interface WalletTransferHistoryRow {
  id: number;
  userId: string;
  name: string;
  transferAmount: number | string;
  transferCharge: number | string;
  depositAmount: number | string;
  transferDate: string;
}

export interface WalletTransferPageData {
  user: { userId: string; name: string; incomeWallet: number; fundWallet: number };
  chargePercent: number;
  history: WalletTransferHistoryRow[];
}

export interface WithdrawalHistoryRow {
  id: number;
  amount: number | string;
  withdrawCharge: number | string;
  netAmount: number | string;
  orderid: string | null;
  requestedAt: string | null;
  status: number;
  actionDate: string | null;
  remarks: string | null;
}

export interface WithdrawalPageData {
  user: {
    userId: string;
    name: string;
    incomeWallet: number;
    bankAccountName: string;
    bankName: string;
    ifsc: string;
    maskedAccountNumber: string;
  };
  withdrawCharge: number;
  minimumWithdraw: number;
  maximumWithdraw: number;
  totalSponsors: number;
  bankDetailsConfigured: boolean;
  withdrawalWindow: { open: boolean; day: number; localTime: string; description: string };
  history: WithdrawalHistoryRow[];
}

export interface SupportOption {
  id: number;
  name: string;
}

export interface SupportOutboxTicket {
  id: number;
  ticketCode: string;
  subjectName: string | null;
  ticketMessage: string;
  priorityName: string | null;
  raiseDate: string | null;
  actionDate: string | null;
  ticketStatus: number;
}

export interface SupportInboxTicket {
  id: number;
  ticketCode: string;
  subjectName: string | null;
  adminMessage: string;
  actionDate: string | null;
  ticketStatus: number;
}

export interface SupportPageData {
  subjects: SupportOption[];
  priorities: SupportOption[];
  outbox: SupportOutboxTicket[];
  inbox: SupportInboxTicket[];
  canCreateTicket: boolean;
}

export interface DirectReferral {
  memberId: number;
  userId: string;
  name: string;
  email: string | null;
  phone: string;
  registeredAt: string | null;
  activeAt: string | null;
  topupFlag: number;
}

export interface TeamTreeMember {
  memberId: number;
  level: number;
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  joinedAt: string | null;
  activeAt: string | null;
  topupStatus: number;
}

export interface TeamLevelCount {
  level: number;
  totalMembers: number;
}

export interface DailyIncomeSummary {
  summaryId: number;
  incomeStatus: number;
  dailyIncome: number | string;
  level: number;
  createdAt: string;
  releaseStatus: number;
  userId: string;
  name: string;
  incomeGet: number | string;
}

export interface DailyIncomeDetail {
  id: number;
  userId: string | null;
  name: string | null;
  dailyAmount: number | string;
  releaseDate: string;
}

export interface TeamPurchasePackage {
  packageId: number;
  packagePrice: number | string;
}

export interface TeamPurchaseHistoryRow {
  dateTime: string;
  packageId: number;
  packagePrice: number | string;
  userId: string;
  name: string;
  purchaserId: string;
  purchaserName: string;
}

export interface TeamPurchaseData {
  wallet: number;
  package: TeamPurchasePackage;
  history: TeamPurchaseHistoryRow[];
}

export interface AutopoolPurchaseHistoryRow {
  dateTime: string;
  packageId: number;
  packagePrice: number | string;
  userId: string;
  name: string;
  purchaserId: string;
  purchaserName: string;
}

export interface AutopoolPurchaseData {
  wallet: number;
  package: TeamPurchasePackage & { giveAmount: number | string };
  history: AutopoolPurchaseHistoryRow[];
}

export interface DashboardResponse {
  user?: AuthUser;
  directReferrals?: DirectReferral[];
}

export interface LoginResponse {
  message: string;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export interface AdminUser {
  id: number;
  userId: string;
  name: string;
  email?: string;
  role: 'admin';
}

export interface AdminLoginResponse {
  message: string;
  token?: string;
  user?: AdminUser;
  error?: string;
}

export interface AdminDashboardResponse {
  admin: { userId: string; name: string };
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalBusiness: number;
    todayBusiness: number;
    incomeWalletOutstanding: number;
    purchaseWalletOutstanding: number;
    totalWithdrawals: number;
    pendingWithdrawals: number;
    totalRewards: number | null;
  };
  referralUrl: string;
}

export const isAdminSessionError = (error: unknown): boolean =>
  error instanceof Error && /invalid or expired token|administrator access required|administrator account is no longer active/i.test(error.message);

export interface AdminMember {
  memberId: number;
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  sponsorMemberId: number;
  sponsorUserId: string | null;
  sponsorName: string | null;
  joinedAt: string;
  topupFlag: number;
  accountStatus: number | null;
}

export interface AdminMemberListResponse {
  members: AdminMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminMemberDetails extends AdminMember {
  activationDate: string | null;
  accountHolderName: string | null;
  ifsc: string | null;
  bankName: string | null;
  branch: string | null;
  accountNumber: string | null;
  panNumber: string | null;
}

export interface RegisterResponse {
  message: string;
  userId?: string;
  error?: string;
}

export const fetchRegistrationOptions = async (): Promise<{
  countries: RegistrationOption[];
  states: RegistrationOption[];
  districts: RegistrationOption[];
}> => {
  try {
    const response = await api.get('/auth/registration-options');
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Could not load registration options');
  }
};

export const lookupSponsor = async (userId: string): Promise<{ userId: string; name: string }> => {
  try {
    const response = await api.get<{ sponsor: { userId: string; name: string } }>('/auth/sponsor', {
      params: { userId }
    });
    return response.data.sponsor;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Could not verify sponsor');
  }
};

export const registerUser = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/register', payload, { timeout: 30000 });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.error || 'Registration failed');
    }
    throw new Error(error.message || 'Server connection error');
  }
};

export const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', payload);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.error || 'Login failed');
    }
    throw new Error(error.message || 'Server connection error');
  }
};

export const loginAdmin = async (payload: LoginPayload): Promise<AdminLoginResponse> => {
  try {
    const response = await api.post<AdminLoginResponse>('/auth/admin-login', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Admin login failed');
  }
};

export const fetchAdminDashboard = async (adminToken: string): Promise<AdminDashboardResponse> => {
  try {
    const response = await api.get<AdminDashboardResponse>('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load admin dashboard');
  }
};

export const fetchAdminMembers = async (
  adminToken: string,
  filters: { userId?: string; search?: string; fromDate?: string; toDate?: string; status: 'all' | 'active' | 'inactive'; page: number }
): Promise<AdminMemberListResponse> => {
  try {
    const response = await api.get<AdminMemberListResponse>('/admin/members', {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: filters
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to search members');
  }
};

export const fetchAdminMemberDetails = async (adminToken: string, memberId: number): Promise<AdminMemberDetails> => {
  try {
    const response = await api.get<{ member: AdminMemberDetails }>(`/admin/members/${memberId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return response.data.member;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load member details');
  }
};

export const updateAdminMemberStatus = async (adminToken: string, memberId: number, accountStatus: 0 | 1): Promise<void> => {
  try {
    await api.patch(`/admin/members/${memberId}/status`, { accountStatus }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to update member status');
  }
};

export const fetchDashboardData = async (): Promise<DashboardResponse> => {
  try {
    const response = await api.get<DashboardResponse>('/dashboard');
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.error || 'Failed to fetch dashboard data');
    }
    throw new Error(error.message || 'Server connection error');
  }
};

export const updateProfile = async (payload: { name: string; email: string }): Promise<{ name: string; email: string }> => {
  try {
    const response = await api.put<{ user: { name: string; email: string } }>('/dashboard/profile', payload);
    return response.data.user;
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to update profile');
  }
};

export const fetchBankDetails = async (): Promise<BankDetails> => {
  try {
    const response = await api.get<{ bankDetails: BankDetails }>('/dashboard/bank-details');
    return response.data.bankDetails;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load bank details');
  }
};

export const updateBankDetails = async (payload: BankDetails): Promise<BankDetails> => {
  try {
    const response = await api.put<{ bankDetails: BankDetails }>('/dashboard/bank-details', payload);
    return response.data.bankDetails;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to save bank details');
  }
};

export const fetchFundRequestData = async (): Promise<FundRequestPageData> => {
  try {
    const response = await api.get<FundRequestPageData>('/fund-request');
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load fund request data');
  }
};

export const fetchFundRequestPaymentDetails = async (paymentId: number): Promise<FundRequestPaymentDetails> => {
  try {
    const response = await api.get<{ paymentMode: FundRequestPaymentDetails }>(`/fund-request/payment-modes/${paymentId}`);
    return response.data.paymentMode;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load payment details');
  }
};

export const submitFundRequest = async (formData: FormData): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>('/fund-request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to submit fund request');
  }
};

export const fetchFundRequestReceipt = async (requestId: number): Promise<Blob> => {
  try {
    const response = await api.get<Blob>(`/fund-request/requests/${requestId}/receipt`, { responseType: 'blob' });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load payment slip');
  }
};

export const fetchWalletTransferData = async (): Promise<WalletTransferPageData> => {
  try {
    const response = await api.get<WalletTransferPageData>('/wallet-transfer');
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load wallet transfer data');
  }
};

export const transferIncomeToPurchaseWallet = async (payload: { amount: number; transactionPassword: string }): Promise<{
  message: string;
  transferAmount: number;
  transferCharge: number;
  depositAmount: number;
  incomeWallet: number;
  fundWallet: number;
}> => {
  try {
    const response = await api.post('/wallet-transfer', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to transfer wallet balance');
  }
};

export const fetchWithdrawalData = async (): Promise<WithdrawalPageData> => {
  try {
    const response = await api.get<WithdrawalPageData>('/withdrawal');
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load withdrawal data');
  }
};

export const submitWithdrawal = async (payload: { amount: number; transactionPassword: string }): Promise<{
  message: string;
  amount: number;
  charge: number;
  netAmount: number;
  incomeWallet: number;
  orderId: string;
}> => {
  try {
    const response = await api.post('/withdrawal', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to submit withdrawal request');
  }
};

export const fetchSupportData = async (): Promise<SupportPageData> => {
  try {
    const response = await api.get<SupportPageData>('/support');
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load support tickets');
  }
};

export const createSupportTicket = async (payload: { subjectId: number; priorityId: number; ticketMessage: string }): Promise<{ message: string; ticket: { id: number; ticketCode: string } }> => {
  try {
    const response = await api.post('/support', payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to create support ticket');
  }
};

export const changeLoginPassword = async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
  try {
    await api.put('/dashboard/change-password', payload);
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to update login password');
  }
};

export const changeTransactionPassword = async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
  try {
    await api.put('/dashboard/change-transaction-password', payload);
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to update transaction password');
  }
};

export const fetchTeamLevelCounts = async (): Promise<TeamLevelCount[]> => {
  try {
    const response = await api.get<{ levels: TeamLevelCount[] }>('/dashboard/team-tree');
    return response.data.levels;
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to load team levels');
  }
};

export const fetchTeamLevelMembers = async (level: number): Promise<TeamTreeMember[]> => {
  try {
    const response = await api.get<{ members: TeamTreeMember[] }>(`/dashboard/team-tree/${level}`);
    return response.data.members;
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to load level members');
  }
};

export const fetchDailyIncome = async (): Promise<DailyIncomeSummary[]> => {
  try {
    const response = await api.get<{ incomeRows: DailyIncomeSummary[] }>('/dashboard/daily-income');
    return response.data.incomeRows;
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to load daily income');
  }
};

export const fetchDailyIncomeDetails = async (summaryId: number): Promise<DailyIncomeDetail[]> => {
  try {
    const response = await api.get<{ details: DailyIncomeDetail[] }>(`/dashboard/daily-income/${summaryId}`);
    return response.data.details;
  } catch (error: any) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to load income details');
  }
};

export const fetchTeamPurchaseData = async (): Promise<TeamPurchaseData> => {
  try {
    const response = await api.get<TeamPurchaseData>('/team-purchase', { timeout: 30000 });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load package purchase data');
  }
};

export const lookupTeamPurchaseMember = async (userId: string): Promise<{ userId: string; name: string }> => {
  try {
    const response = await api.get<{ member: { userId: string; name: string } }>('/team-purchase/lookup', {
      params: { userId },
      timeout: 15000
    });
    return response.data.member;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to verify member');
  }
};

export const purchaseTeamPackage = async (userId: string): Promise<{ message: string; wallet: number }> => {
  try {
    const response = await api.post<{ message: string; wallet: number }>(
      '/team-purchase',
      { userId },
      { timeout: 60000 }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Package purchase failed');
  }
};

export const fetchAutopoolPurchaseData = async (): Promise<AutopoolPurchaseData> => {
  try {
    const response = await api.get<AutopoolPurchaseData>('/autopool-purchase', { timeout: 30000 });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to load Helping Fund purchase data');
  }
};

export const lookupAutopoolMember = async (userId: string): Promise<{ userId: string; name: string }> => {
  try {
    const response = await api.get<{ member: { userId: string; name: string } }>('/autopool-purchase/lookup', {
      params: { userId },
      timeout: 15000
    });
    return response.data.member;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Failed to verify active member');
  }
};

export const purchaseAutopoolPackage = async (userId: string): Promise<{ message: string; wallet: number }> => {
  try {
    const response = await api.post<{ message: string; wallet: number }>(
      '/autopool-purchase',
      { userId },
      { timeout: 60000 }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.error) throw new Error(error.response.data.error);
    throw new Error(error.message || 'Helping Fund purchase failed');
  }
};

export const checkHealth = async () => {
  try {
    const response = await axios.get(`${BACKEND_HEALTH_URL}/`, { timeout: 5000 });
    return response.status === 200;
  } catch (err) {
    return false;
  }
};
