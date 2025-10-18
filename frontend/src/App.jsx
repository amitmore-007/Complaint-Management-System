import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import useAuthStore from './store/authStore';

// Landing and Auth Pages
import Landing from './pages/Landing';
import RoleSelection from './pages/RoleSelection';
import Login from './pages/auth/Login';

// Client Pages
import ClientDashboard from './pages/client/Dashboard';
import CreateComplaint from './pages/client/CreateComplaint';
import MyComplaints from './pages/client/MyComplaints';
import ClientAssets from './pages/client/Assets';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ComplaintManagement from './pages/admin/ComplaintManagement';
import ClientManagement from './pages/admin/ClientManagement';
import TechnicianManagement from './pages/admin/TechnicianManagement';
import AdminAssets from './pages/admin/Assets';

// Technician Pages
import TechnicianDashboard from './pages/technician/Dashboard';
import TechnicianAssets from './pages/technician/Assets';
import TechnicianAssignments from './pages/technician/Assignments';
import ResolvedAssignments from './pages/technician/ResolvedAssignments';

import './App.css'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/role-selection" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return children;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, checkAutoLogin, isAutoLoginChecked } = useAuthStore();

  useEffect(() => {
    checkAutoLogin();
  }, [checkAutoLogin]);

  // Show loading while checking auto-login
  if (!isAutoLoginChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return children;
};

// Toast Component with Theme Awareness
const ThemedToaster = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '12px',
          padding: '16px 20px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: '500',
          fontSize: '14px',
          maxWidth: '400px',
          boxShadow: isDarkMode 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        // Default toast styling
        className: '',
        success: {
          style: {
            background: isDarkMode 
              ? 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)' 
              : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            color: isDarkMode ? '#ffffff' : '#15803d',
            border: isDarkMode ? '1px solid #059669' : '1px solid #22c55e',
          },
          iconTheme: {
            primary: isDarkMode ? '#10b981' : '#059669',
            secondary: isDarkMode ? '#ffffff' : '#ffffff',
          },
        },
        error: {
          style: {
            background: isDarkMode 
              ? 'linear-gradient(135deg, #7f1d1d 0%, #6b1616 100%)' 
              : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            color: isDarkMode ? '#ffffff' : '#dc2626',
            border: isDarkMode ? '1px solid #dc2626' : '1px solid #ef4444',
          },
          iconTheme: {
            primary: isDarkMode ? '#ef4444' : '#dc2626',
            secondary: isDarkMode ? '#ffffff' : '#ffffff',
          },
        },
        loading: {
          style: {
            background: isDarkMode 
              ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' 
              : 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
            color: isDarkMode ? '#f9fafb' : '#111827',
            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          },
          iconTheme: {
            primary: isDarkMode ? '#6b7280' : '#9ca3af',
            secondary: isDarkMode ? '#1f2937' : '#ffffff',
          },
        },
        // Custom toast for info/warning
        custom: {
          style: {
            background: isDarkMode 
              ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' 
              : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            color: isDarkMode ? '#ffffff' : '#2563eb',
            border: isDarkMode ? '1px solid #3b82f6' : '1px solid #3b82f6',
          },
        },
      }}
    />
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            } />
            
            <Route path="/role-selection" element={
              <PublicRoute>
                <RoleSelection />
              </PublicRoute>
            } />
            
            <Route path="/auth/:role" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />

            {/* Client Routes */}
            <Route path="/client/dashboard" element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/client/create-complaint" element={
              <ProtectedRoute allowedRoles={['client']}>
                <CreateComplaint />
              </ProtectedRoute>
            } />
            
            <Route path="/client/complaints" element={
              <ProtectedRoute allowedRoles={['client']}>
                <MyComplaints />
              </ProtectedRoute>
            } />

            <Route path="/client/assets" element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientAssets />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/complaints" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ComplaintManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/clients" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClientManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/technicians" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TechnicianManagement />
              </ProtectedRoute>
            } />

            <Route path="/admin/assets" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAssets />
              </ProtectedRoute>
            } />

            {/* Technician Routes */}
            <Route path="/technician/dashboard" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <TechnicianDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/technician/assignments" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <TechnicianAssignments />
              </ProtectedRoute>
            } />

            <Route path="/technician/resolved-assignments" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <ResolvedAssignments />
              </ProtectedRoute>
            } />

            <Route path="/technician/assets" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <TechnicianAssets />
              </ProtectedRoute>
            } />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast Notifications with Theme Support */}
          <ThemedToaster />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App
