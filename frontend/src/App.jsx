import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import useAuthStore from './store/authStore';

// Landing and Auth Pages
import Landing from './pages/Landing';
import RoleSelection from './pages/RoleSelection';
import Login from './pages/auth/Login';

// Client Pages
import ClientDashboard from './pages/client/Dashboard';
import CreateComplaint from './pages/client/CreateComplaint';
import MyComplaints from './pages/client/MyComplaints';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ComplaintManagement from './pages/admin/ComplaintManagement';
import ClientManagement from './pages/admin/ClientManagement';
import TechnicianManagement from './pages/admin/TechnicianManagement';

// Technician Pages
import TechnicianDashboard from './pages/technician/Dashboard';

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
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return children;
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

            {/* Technician Routes */}
            <Route path="/technician/dashboard" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <TechnicianDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/technician/assignments" element={
              <ProtectedRoute allowedRoles={['technician']}>
                <TechnicianDashboard />
              </ProtectedRoute>
            } />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
                borderRadius: '12px',
                padding: '16px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App
