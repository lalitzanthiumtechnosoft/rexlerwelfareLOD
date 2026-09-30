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
    if (token) {
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
