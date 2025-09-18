import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, Lock, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import useAuthStore from '../../store/authStore';

const Login = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countdown, setCountdown] = useState(0);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const getRoleTitle = () => {
    switch (role) {
      case 'client': return 'Client Login';
      case 'technician': return 'Technician Login';
      case 'admin': return 'Admin Login';
      default: return 'Login';
    }
  };

  const onPhoneSubmit = async (data) => {
    try {
      setPhoneNumber(data.phoneNumber);
      await sendOTP(data.phoneNumber, role);
      setStep('otp');
      setCountdown(60);
      toast.success('OTP sent to your WhatsApp!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onOTPSubmit = async (data) => {
    try {
      await verifyOTP(phoneNumber, data.otp, role, data.name);
      toast.success('Login successful!');
      
      // Navigate based on role
      switch (role) {
        case 'client':
          navigate('/client/dashboard');
          break;
        case 'technician':
          navigate('/technician/dashboard');
          break;
        case 'admin':
          navigate('/admin/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const resendOTP = async () => {
    try {
      await sendOTP(phoneNumber, role);
      setCountdown(60);
      toast.success('OTP resent!');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const goBack = () => {
    setStep('phone');
    reset();
  };

  return (
    <AuthLayout 
      title={getRoleTitle()} 
      subtitle={step === 'phone' ? 'Enter your phone number to continue' : 'Enter the OTP sent to your WhatsApp'}
    >
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.form
            key="phone"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onPhoneSubmit)}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('phoneNumber', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+[1-9]\d{1,14}$/,
                      message: 'Please enter a valid phone number with country code (e.g., +1234567890)'
                    }
                  })}
                  type="tel"
                  placeholder="+1234567890"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onOTPSubmit)}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                OTP sent to <span className="font-semibold">{phoneNumber}</span>
              </p>
            </div>

            {role === 'client' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Name (required for new users)
                </label>
                <input
                  {...register('name', {
                    required: role === 'client' ? 'Name is required for new clients' : false
                  })}
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Verification Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('otp', {
                    required: 'OTP is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'OTP must be 6 digits'
                    }
                  })}
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-center text-lg tracking-widest"
                />
              </div>
              {errors.otp && (
                <p className="mt-1 text-sm text-red-600">{errors.otp.message}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <motion.button
                type="button"
                onClick={goBack}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Back
              </motion.button>
              
              <motion.button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Verify</span>
                    <Check className="h-5 w-5" />
                  </>
                )}
              </motion.button>
            </div>

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Resend OTP in {countdown}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={resendOTP}
                  disabled={isLoading}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
};

export default Login;
