import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Lock, Check, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import axios from "axios";
import AuthLayout from "../../components/auth/AuthLayout";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ROLE_LABELS = {
  client: "Client",
  technician: "Technician",
  admin: "Admin",
};

// Standalone OTP login used only to prove identity for an MCP OAuth grant.
// Deliberately does NOT touch useAuthStore — granting MCP access shouldn't
// log this browser tab into the CMS app or overwrite an existing session.
const AuthorizeConsent = () => {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const clientName = searchParams.get("client_name");
  const redirectUri = searchParams.get("redirect_uri");
  const codeChallenge = searchParams.get("code_challenge");
  const state = searchParams.get("state") || "";

  const [role, setRole] = useState(null);
  const [step, setStep] = useState("phone"); // 'phone' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  React.useEffect(() => {
    let timer;
    if (countdown > 0) timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!clientId || !redirectUri || !codeChallenge) {
    return (
      <AuthLayout title="Invalid request" subtitle="This authorization link is missing required parameters.">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Please restart the connection from your MCP client.
        </p>
      </AuthLayout>
    );
  }

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(value);
  };

  const sendOtp = async () => {
    if (phoneNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/${role}/auth/send-otp`, {
        phoneNumber: `+91${phoneNumber}`,
      });
      setStep("otp");
      setCountdown(60);
      toast.success(`OTP sent to +91${phoneNumber}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (data) => {
    setIsLoading(true);
    try {
      const verifyRes = await axios.post(`${API_BASE_URL}/${role}/auth/verify-otp`, {
        phoneNumber: `+91${phoneNumber}`,
        otp: data.otp,
      });

      const completeRes = await axios.post(`${API_BASE_URL.replace(/\/api$/, "")}/mcp-oauth/authorize/complete`, {
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        state,
        token: verifyRes.data.token,
      });

      window.location.href = completeRes.data.redirect_uri;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to verify OTP");
      setIsLoading(false);
    }
  };

  if (!role) {
    return (
      <AuthLayout
        title="Connect to CMS"
        subtitle={`${clientName || "An MCP client"} wants to access your CMS account`}
        showBackButton={false}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            Sign in below to grant access. You can revoke access at any time by asking an admin.
          </p>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <motion.button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Continue as {label}
            </motion.button>
          ))}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={`Connect as ${ROLE_LABELS[role]}`}
      subtitle={step === "phone" ? "Enter your phone number to continue" : "Enter the OTP sent to your WhatsApp"}
      showBackButton={false}
    >
      <AnimatePresence mode="wait">
        {step === "phone" ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
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
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setRole(null)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Back
              </button>
              <motion.button
                type="button"
                onClick={sendOtp}
                disabled={isLoading || phoneNumber.length !== 10}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onVerifyOtp)}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                OTP sent to <span className="font-semibold">+91{phoneNumber}</span>
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
                    pattern: { value: /^\d{6}$/, message: "OTP must be 6 digits" },
                  })}
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-center text-lg tracking-widest"
                />
              </div>
              {errors.otp && <p className="mt-1 text-sm text-red-600">{errors.otp.message}</p>}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  reset();
                }}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Back
              </button>
              <motion.button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <span>Allow Access</span>
                    <Check className="h-5 w-5" />
                  </>
                )}
              </motion.button>
            </div>

            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Resend OTP in {countdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
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

export default AuthorizeConsent;
