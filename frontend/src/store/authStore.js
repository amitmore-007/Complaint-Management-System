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
        console.log('🔒 Setting auth data:', { userId: user.id, role: user.role });
        set({ user, token, isAuthenticated: true, error: null });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      // Clear auth data
      logout: () => {
        console.log('🚪 Logging out');
        set({ user: null, token: null, isAuthenticated: false, error: null });
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('auth-storage');
      },

      // Send OTP
      sendOTP: async (phoneNumber, role) => {
        set({ isLoading: true, error: null });
        try {
          console.log('📞 Sending OTP to:', phoneNumber, 'for role:', role);
          const response = await axios.post(`${API_BASE_URL}/${role}/auth/send-otp`, {
            phoneNumber
          });
          console.log('✅ OTP sent successfully');
          set({ isLoading: false });
          return response.data;
        } catch (error) {
          console.error('❌ Send OTP error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to send OTP';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      // Verify OTP
      verifyOTP: async (phoneNumber, otp, role, name) => {
        set({ isLoading: true, error: null });
        try {
          console.log('🔐 Verifying OTP for:', phoneNumber, 'role:', role, 'name:', name);
          const payload = { phoneNumber, otp };
          if (name) payload.name = name;

          const response = await axios.post(`${API_BASE_URL}/${role}/auth/verify-otp`, payload);
          
          const { user, token } = response.data;
          console.log('✅ OTP verified, user authenticated:', user);
          get().setAuth(user, token);
          set({ isLoading: false });
          
          return response.data;
        } catch (error) {
          console.error('❌ Verify OTP error:', error);
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
          console.log('👤 Getting current user for role:', user.role);
          const response = await axios.get(`${API_BASE_URL}/${user.role}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('✅ Current user fetched:', response.data.user);
          set({ user: response.data.user });
          return response.data.user;
        } catch (error) {
          console.error('❌ Get current user error:', error);
          get().logout();
          return null;
        }
      },

      // Auto login check
      checkAutoLogin: async () => {
        const { token, user, isAutoLoginChecked } = get();
        
        if (isAutoLoginChecked) return;
        
        console.log('🔄 Checking auto-login...');
        set({ isAutoLoginChecked: true });
        
        if (!token || !user?.role) {
          console.log('❌ No token or user role found');
          return false;
        }

        try {
          console.log('👤 Verifying existing token for role:', user.role);
          const response = await axios.get(`${API_BASE_URL}/${user.role}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          console.log('✅ Auto-login successful:', response.data.user);
          set({ user: response.data.user, isAuthenticated: true });
          return true;
        } catch (error) {
          console.error('❌ Auto-login failed:', error);
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
          console.log('🔄 Rehydrating auth with token for user:', state.user?.role);
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);

export default useAuthStore;

