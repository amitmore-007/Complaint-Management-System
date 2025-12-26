import axios from "axios";

// Get API URL from environment variables with fallback
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

console.log("🔗 API Base URL:", API_BASE_URL);

// Create main axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetchComplaintsCreatedVsResolvedStats = async ({
  interval = "month",
  from,
  to,
  tz,
} = {}) => {
  const params = {};
  if (interval) params.interval = interval;
  if (from) params.from = from;
  if (to) params.to = to;
  if (tz) params.tz = tz;

  const res = await api.get("/stats/complaints/created-vs-resolved", {
    params,
  });
  return res.data;
};

export const fetchTechniciansAssignedVsResolvedStats = async ({
  from,
  to,
  tz,
} = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (tz) params.tz = tz;

  const res = await api.get("/stats/technicians/assigned-vs-resolved", {
    params,
  });
  return res.data;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth-storage");
    if (token) {
      try {
        const authData = JSON.parse(token);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (error) {
        console.error("Error parsing auth token:", error);
      }
    }

    console.log(
      `🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${
        config.url
      }`
    );
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("❌ API Error:", error);

    if (error.code === "ERR_NETWORK") {
      console.error(
        "🔴 Network Error: Cannot connect to server. Please check if the backend is running on",
        API_BASE_URL
      );
    }

    if (error.code === "ECONNABORTED") {
      console.error(
        "⏱️ Request timeout: Server is taking too long to respond."
      );
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("auth-storage");
      window.location.href = "/role-selection";
    }

    return Promise.reject(error);
  }
);

export default api;
