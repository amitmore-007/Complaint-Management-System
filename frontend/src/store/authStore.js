import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isAutoLoginChecked: false,

      // Set auth data
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true, error: null });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      // Clear auth data
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null });
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('auth-storage');
      },

      // Send OTP
      sendOTP: async (phoneNumber, role) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, {
            phoneNumber,
            role
          });
          set({ isLoading: false });
          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to send OTP';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Verify OTP
      verifyOTP: async (phoneNumber, otp, role, name) => {
        set({ isLoading: true, error: null });
        try {
          const payload = { phoneNumber, otp, role };
          if (name) payload.name = name;

          const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, payload);

          const { user, token } = response.data;
          get().setAuth(user, token);
          set({ isLoading: false });

          return response.data;
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to verify OTP';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Get current user
      getCurrentUser: async () => {
        const { token, user } = get();
        if (!token || !user?.role) return null;

        try {
          const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ user: response.data.user });
          return response.data.user;
        } catch (error) {
          get().logout();
          return null;
        }
      },

      // Auto login check
      checkAutoLogin: async () => {
        const { token, user, isAutoLoginChecked } = get();

        if (isAutoLoginChecked) return;

        set({ isAutoLoginChecked: true });

        if (!token || !user?.role) {
          return false;
        }

        try {
          const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          set({ user: response.data.user, isAuthenticated: true });
          return true;
        } catch (error) {
          get().logout();
          return false;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);

export default useAuthStore;

