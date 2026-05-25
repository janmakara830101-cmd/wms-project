import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('wms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  async err => {
    const config = err.config;
    // Retry up to 2 times on network error or 5xx (handles Neon cold start)
    if (config && !config._retryCount) config._retryCount = 0;
    if (config && config._retryCount < 2 && (!err.response || err.response.status >= 500)) {
      config._retryCount += 1;
      await new Promise(r => setTimeout(r, 1200 * config._retryCount));
      return api(config);
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('wms_token');
      localStorage.removeItem('wms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
