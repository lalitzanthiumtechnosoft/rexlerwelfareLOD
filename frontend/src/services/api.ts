import axios from 'axios';

// Base API configuration
const API_BASE_URL = '/api';

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
  email: string;
  password: string;
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

export interface LoginResponse {
  message: string;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export interface RegisterResponse {
  message: string;
  error?: string;
}

export const registerUser = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/register', payload);
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

export const fetchDashboardData = async () => {
  try {
    const response = await api.get('/dashboard');
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.error || 'Failed to fetch dashboard data');
    }
    throw new Error(error.message || 'Server connection error');
  }
};

export const checkHealth = async () => {
  try {
    const response = await axios.get('http://localhost:5000/');
    return response.status === 200;
  } catch (err) {
    return false;
  }
};
