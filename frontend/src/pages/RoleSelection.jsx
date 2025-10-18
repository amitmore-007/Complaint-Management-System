import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wrench, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import useAuthStore from '../store/authStore';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { isAuthenticated, user, checkAutoLogin } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const roles = [
    {
      id: 'client',
      title: 'Client',
      subtitle: 'Report & Track Issues',
      description: 'Create complaints, track progress, and manage your service requests with ease.',
      icon: <Users className="h-12 w-12" />,
      color: 'blue',
      features: ['Create Complaints', 'Track Progress', 'Photo Upload', 'Real-time Updates']
    },
    {
      id: 'technician',
      title: 'Technician',
      subtitle: 'Resolve & Serve',
      description: 'Receive assignments, update status, and provide quality service to clients.',
      icon: <Wrench className="h-12 w-12" />,
      color: 'green',
      features: ['Receive Assignments', 'Update Status', 'Add Service Notes', 'Complete Tasks']
    },
    {
      id: 'admin',
      title: 'Admin',
      subtitle: 'Manage & Monitor',
      description: 'Oversee operations, manage users, and monitor system performance.',
      icon: <Shield className="h-12 w-12" />,
      color: 'purple',
      features: ['Manage Users', 'View All Complaints', 'Generate Reports', 'System Control']
    }
  ];

  useEffect(() => {
    // Check for auto-login when component mounts
    const handleAutoLogin = async () => {
      const loginSuccess = await checkAutoLogin();
      if (loginSuccess && user) {
        navigate(`/${user.role}/dashboard`, { replace: true });
      }
    };

    handleAutoLogin();
  }, [checkAutoLogin, user, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleRoleSelect = (roleId) => {
    if (isAnimating) return;
    
    setSelectedRole(roleId);
    setIsAnimating(true);
    
    // Navigate after animation completes
    setTimeout(() => {
      navigate(`/auth/${roleId}`);
    }, 2000);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    hover: {
      y: -12,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    }
  };

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-600',
        bgLight: 'bg-blue-100',
        bgLightDark: 'bg-blue-800/80',
        text: 'text-blue-600',
        textDark: 'text-blue-300',
        hover: 'hover:bg-blue-700',
        border: 'border-blue-200',
        borderDark: 'border-blue-500'
      },
      green: {
        bg: 'bg-green-600',
        bgLight: 'bg-green-100',
        bgLightDark: 'bg-green-800/80',
        text: 'text-green-600',
        textDark: 'text-green-300',
        hover: 'hover:bg-green-700',
        border: 'border-green-200',
        borderDark: 'border-green-500'
      },
      purple: {
        bg: 'bg-purple-600',
        bgLight: 'bg-purple-100',
        bgLightDark: 'bg-purple-800/80',
        text: 'text-purple-600',
        textDark: 'text-purple-300',
        hover: 'hover:bg-purple-700',
        border: 'border-purple-200',
        borderDark: 'border-purple-500'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-20 left-20 w-64 h-64 rounded-full opacity-20 blur-3xl animate-pulse ${
          isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'
        }`}></div>
        <div className={`absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse ${
          isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
        }`}></div>
        <div className={`absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-20 blur-3xl animate-pulse ${
          isDarkMode ? 'bg-purple-900/40' : 'bg-purple-100'
        }`}></div>
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gray-900/80 border-gray-800/50' 
            : 'bg-white/80 border-gray-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <motion.button
              onClick={handleGoBack}
              className={`flex items-center space-x-2 transition-colors duration-200 ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-blue-400' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              whileHover={{ x: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium text-sm sm:text-base">Back to Home</span>
            </motion.button>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <motion.div 
                className="flex items-center space-x-2 sm:space-x-3"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="w-20 h-12 sm:w-28 sm:h-16 flex items-center justify-center overflow-hidden rounded-lg">
                  <img 
                    src="/assets/Logo.png" 
                    alt="CMS Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  CMS
                </span>
              </motion.div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 py-12 sm:py-16 lg:py-20">
        <motion.div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Title Section */}
          <motion.div 
            className="text-center mb-16"
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
            }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
                isDarkMode 
                  ? 'from-gray-100 to-gray-300' 
                  : 'from-gray-900 to-gray-700'
              }`}>
                Choose Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Role
              </span>
            </h1>
            <p className={`text-xl max-w-3xl mx-auto leading-relaxed ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Select your role to access the personalized dashboard and features designed for your needs.
            </p>
          </motion.div>

          {/* Role Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {roles.map((role, index) => {
              const colors = getColorClasses(role.color);
              return (
                <motion.div
                  key={role.id}
                  variants={cardVariants}
                  whileHover={!isAnimating ? "hover" : {}}
                  whileTap={!isAnimating ? "tap" : {}}
                  className="relative group cursor-pointer"
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <div className={`relative rounded-2xl p-8 h-full transition-all duration-300 border-2 hover:shadow-2xl ${
                    isDarkMode 
                      ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800/70' 
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl'
                  } ${
                    selectedRole === role.id 
                      ? `${isDarkMode ? colors.borderDark : colors.border} shadow-xl` 
                      : ''
                  }`}>
                    {/* Card Header */}
                    <div className="text-center mb-8">
                      <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 relative ${
                        isDarkMode ? colors.bgLightDark : colors.bgLight
                      }`}>
                        <div className={isDarkMode ? colors.textDark : colors.text}>
                          {role.icon}
                        </div>
                        
                        {/* Pulse effect for selected card */}
                        {selectedRole === role.id && (
                          <motion.div
                            className={`absolute inset-0 rounded-3xl ${isDarkMode ? colors.bgLightDark : colors.bgLight}`}
                            animate={{
                              scale: [1, 1.1, 1],
                              opacity: [0.7, 1, 0.7]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        )}
                      </div>
                      
                      <h2 className={`text-3xl font-bold mb-3 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>{role.title}</h2>
                      <p className={`text-lg font-medium mb-4 ${isDarkMode ? colors.textDark : colors.text}`}>
                        {role.subtitle}
                      </p>
                      <p className={`leading-relaxed px-4 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>{role.description}</p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4 mb-8 px-2">
                      {role.features.map((feature, featureIndex) => (
                        <motion.div
                          key={featureIndex}
                          className="flex items-center space-x-3"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.2 + featureIndex * 0.1 }}
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.bg}`}></div>
                          <span className={`font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>{feature}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="mt-auto px-2">
                      <div className={`w-full py-4 px-6 ${colors.bg} ${colors.hover} text-white rounded-xl font-semibold text-center transition-all duration-300 flex items-center justify-center group relative overflow-hidden`}>
                        <span className="relative z-10 flex items-center">
                          Continue as {role.title}
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                        </span>
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Enhanced Animation Overlay */}
      <AnimatePresence>
        {selectedRole && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex flex-col items-center justify-center min-h-screen px-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Central Hub */}
              <motion.div
                className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl flex items-center justify-center relative mb-12"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-6 h-6 bg-white rounded-full"></div>
                
                {/* Orbiting Elements */}
                {[0, 120, 240].map((rotation, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 bg-white rounded-full"
                    style={{
                      transformOrigin: "60px 0px",
                      transform: `rotate(${rotation}deg)`,
                    }}
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                      delay: i * 0.5
                    }}
                  />
                ))}
              </motion.div>

              {/* Loading Text */}
              <motion.div
                className="text-center max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.h3 
                  className={`text-2xl sm:text-3xl font-bold mb-6 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  Connecting to {roles.find(r => r.id === selectedRole)?.title} Portal
                </motion.h3>
                
                <div className="flex items-center justify-center space-x-2 mb-4">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-blue-600 rounded-full"
                      animate={{
                        y: [0, -15, 0],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
                
                <motion.p 
                  className={`text-base sm:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  Preparing your personalized experience...
                </motion.p>

                {/* Progress Indicator */}
                <motion.div 
                  className="mt-8 w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.8, ease: "easeInOut", delay: 0.2 }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleSelection;

