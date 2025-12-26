import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Phone, Lock, ArrowRight, Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import useAuthStore from "../../store/authStore";

const Login = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState("phone"); // 'phone' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm();

  // Handle phone number input with fixed +91 country code
  const handlePhoneNumberChange = (e) => {
    let value = e.target.value;

    // Remove all non-digit characters
    value = value.replace(/\D/g, "");

    // Limit to 10 digits
    if (value.length > 10) {
      value = value.substring(0, 10);
    }

    // Update the actual phone number (without +91 for display)
    setPhoneNumber(value);

    // Update display phone number with +91
    if (value.length > 0) {
      setDisplayPhoneNumber(`+91${value}`);
    } else {
      setDisplayPhoneNumber("");
    }
  };

  const onSendOTP = async (data) => {
    try {
      if (phoneNumber.length !== 10) {
        toast.error("Please enter a valid 10-digit phone number");
        return;
      }

      clearError();

      // Send with +91 prefix
      const fullPhoneNumber = `+91${phoneNumber}`;
      const result = await sendOTP(fullPhoneNumber, role);

      if (result.success) {
        setStep("otp");
        setCountdown(60);
        toast.success(`OTP sent to ${fullPhoneNumber}`);
      } else {
        toast.error(result.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const onVerifyOTP = async (data) => {
    try {
      clearError();

      // Send with +91 prefix
      const fullPhoneNumber = `+91${phoneNumber}`;
      const result = await verifyOTP(fullPhoneNumber, data.otp, role);

      if (result.success) {
        toast.success("Login successful!");
        // Navigation will be handled by the auth store
      } else {
        toast.error(result.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

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
      case "client":
        return "Client Login";
      case "technician":
        return "Technician Login";
      case "admin":
        return "Admin Login";
      default:
        return "Login";
    }
  };

  const resendOTP = async () => {
    try {
      await sendOTP(phoneNumber, role);
      setCountdown(60);
      toast.success("OTP resent!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const goBack = () => {
    setStep("phone");
    reset();
  };

  return (
    <AuthLayout
      title={getRoleTitle()}
      subtitle={
        step === "phone"
          ? "Enter your phone number to continue"
          : "Enter the OTP sent to your WhatsApp"
      }
    >
      <AnimatePresence mode="wait">
        {step === "phone" ? (
          <motion.form
            key="phone"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onSendOTP)}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-sm text-gray-500">+91</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  className="w-full pl-12 pr-4 py-3 border rounded-xl transition-all duration-200 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              {displayPhoneNumber && (
                <p className="text-xs mt-1 text-gray-600">
                  OTP will be sent to: {displayPhoneNumber}
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading || phoneNumber.length !== 10}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? "Sending OTP..." : "Send OTP"}
            </motion.button>
          </motion.form>
        ) : (
          <motion.form
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onVerifyOTP)}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                OTP sent to <span className="font-semibold">{phoneNumber}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Verification Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register("otp", {
                    required: "OTP is required",
                    pattern: {
                      value: /^\d{6}$/,
                      message: "OTP must be 6 digits",
                    },
                  })}
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-center text-lg tracking-widest"
                />
              </div>
              {errors.otp && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.otp.message}
                </p>
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
