import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized Session Expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Helper for extracting data from standard response
const extractData = (response) => response.data?.data || response.data;

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials).then(extractData),
  signup: (data) => api.post('/auth/signup', data).then(extractData),
  getMe: () => api.get('/auth/me').then(extractData),
  logout: () => api.post('/auth/logout').catch(() => {}), // fire-and-forget
};

export const dashboardService = {
  getStats: () => api.get('/dashboard').then(extractData),
  getLowStock: () => api.get('/low-stock').then(extractData),
};

export const tanksService = {
  getAll: () => api.get('/tanks').then(extractData),
  add: (data) => api.post('/tanks', data).then(extractData),
  update: (id, data) => api.put(`/tanks/${id}`, data).then(extractData),
  delete: (id) => api.delete(`/tanks/${id}`).then(extractData),
};

export const feedTypesService = {
  getAll: () => api.get('/feed-types').then(extractData),
  add: (data) => api.post('/feed-types', data).then(extractData),
  update: (id, data) => api.put(`/feed-types/${id}`, data).then(extractData),
  delete: (id) => api.delete(`/feed-types/${id}`).then(extractData),
};

export const feedStockService = {
  getAll: () => api.get('/feed-stock').then(extractData),
  add: (data) => api.post('/feed-stock', data).then(extractData),
};

export const feedLogsService = {
  getAll: () => api.get('/feed-logs').then(extractData),
  add: (data) => api.post('/feed-logs', data).then(extractData),
  delete: (id) => api.delete(`/feed-logs/${id}`).then(extractData),
};

export const reportsService = {
  getStock: () => api.get('/reports/stock').then(extractData),
  getConsumption: (params) => api.get('/reports/consumption', { params }).then(extractData),
  getTankUsage: (params) => api.get('/reports/tank-usage', { params }).then(extractData),
  getMonthlySummary: (params) => api.get('/reports/monthly-summary', { params }).then(extractData),
  generatePDF: (payload) =>
    api.post('/reports/pdf', payload, { responseType: 'blob' }),
};

export const auditService = {
  getLogs: (params) => api.get('/audit-logs', { params }).then(extractData),
  getUsers: () => api.get('/audit-logs/users').then(extractData),
};

export default api;
