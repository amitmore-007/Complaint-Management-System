import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wrench, Users, CheckCircle, Clock, Star, Phone, Award, BarChart3, HeadphonesIcon, Zap, Globe, MapPin, Camera, MessageSquare, Bell, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import ThemeToggle from '../components/common/ThemeToggle.jsx';
import DashboardPreview from '../components/common/DashboardPreview.jsx';

const Landing = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const handleGetStarted = () => {
    navigate('/role-selection');
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

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const features = [
    {
      icon: <Phone className="h-8 w-8" />,
      title: "WhatsApp OTP Login",
      description: "Secure authentication via WhatsApp OTP - no passwords needed!"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Real-time Updates",
      description: "Get instant notifications and status updates for all your complaints"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Smart Assignment",
      description: "Automatic technician assignment using intelligent round-robin system"
    },
    {
      icon: <Star className="h-8 w-8" />,
      title: "Professional Service",
      description: "Quality assured service with feedback and rating system"
    },
    {
      icon: <Camera className="h-8 w-8" />,
      title: "Photo Documentation",
      description: "Upload images to better describe issues and track resolution progress"
    },
    {
      icon: <Bell className="h-8 w-8" />,
      title: "Smart Notifications",
      description: "Receive instant updates via WhatsApp, SMS, and in-app notifications"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Advanced Analytics",
      description: "Comprehensive reporting and analytics for better decision making"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Multi-Location Support",
      description: "Manage complaints across multiple locations and branches seamlessly"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Complaints Resolved", icon: <CheckCircle className="h-8 w-8" /> },
    { number: "500+", label: "Active Technicians", icon: <Wrench className="h-8 w-8" /> },
    { number: "98%", label: "Customer Satisfaction", icon: <Star className="h-8 w-8" /> },
    { number: "24/7", label: "Support Available", icon: <HeadphonesIcon className="h-8 w-8" /> }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Facility Manager",
      company: "TechCorp Inc.",
      image: "/api/placeholder/64/64",
      rating: 5,
      text: "CMS has transformed how we handle maintenance requests. The WhatsApp integration makes it so easy for our staff to report issues, and the real-time tracking keeps everyone informed."
    },
    {
      name: "Mike Chen",
      role: "Senior Technician",
      company: "ServicePro Solutions",
      image: "/api/placeholder/64/64",
      rating: 5,
      text: "As a technician, I love how organized everything is. I get assignments instantly, can update status on the go, and the photo upload feature helps me document my work perfectly."
    },
    {
      name: "Emily Rodriguez",
      role: "Operations Director",
      company: "Global Facilities",
      image: "/api/placeholder/64/64",
      rating: 5,
      text: "The analytics and reporting features give us incredible insights. We've reduced our average resolution time by 40% since implementing CMS."
    }
  ];

  const processSteps = [
    {
      role: "Client",
      steps: [
        "Login with your phone number",
        "Create a complaint with details & photos",
        "Get automatically assigned to a technician",
        "Track progress in real-time",
        "Rate the service once resolved"
      ],
      color: "primary",
      icon: <Users className="h-16 w-16" />
    },
    {
      role: "Technician",
      steps: [
        "Receive complaint assignments",
        "View client details and location",
        "Update status (In Progress/Resolved)",
        "Add notes and photos during service",
        "Complete and move to next complaint"
      ],
      color: "success",
      icon: <Wrench className="h-16 w-16" />
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
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
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="w-20 h-12 sm:w-28 sm:h-14 flex items-center justify-center overflow-hidden  rounded-lg">
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
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <motion.button
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-lg flex items-center group transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>
              <div className="sm:hidden">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        className="relative py-12 sm:py-16 lg:py-24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className={`absolute -top-40 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl ${
            isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'
          }`}></div>
          <div className={`absolute -bottom-40 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl ${
            isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
          }`}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Content Section - Always first on mobile */}
            <div className="text-center lg:text-left order-1 lg:order-1">
              <motion.h1 
                variants={itemVariants}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 lg:mb-8"
              >
                <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
                  isDarkMode 
                    ? 'from-gray-100 via-blue-200 to-blue-300' 
                    : 'from-gray-900 via-blue-800 to-blue-900'
                }`}>
                  Streamline Your
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Complaint Management
                </span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className={`text-base sm:text-lg md:text-xl lg:text-2xl mb-6 lg:mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                Professional complaint management system with <span className="font-semibold text-blue-600">WhatsApp OTP authentication</span>, 
                real-time updates, and intelligent technician assignment for seamless service delivery.
              </motion.p>
              
              <motion.div 
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 lg:mb-8 justify-center lg:justify-start"
              >
                <motion.button
                  onClick={handleGetStarted}
                  className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10 flex items-center">
                    <Zap className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="hidden sm:inline">Start Managing Complaints</span>
                    <span className="sm:hidden">Get Started</span>
                    <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </motion.button>
                
                <motion.button
                  className={`group border-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center transition-all duration-300 ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400' 
                      : 'border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Camera className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">View Demo</span>
                  <span className="sm:hidden">Demo</span>
                </motion.button>
              </motion.div>
              
              <motion.div 
                variants={itemVariants}
                className={`flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6 text-xs sm:text-sm justify-center lg:justify-start ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span className="font-medium">Free to get started</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span className="font-medium">No credit card required</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span className="font-medium">Setup in 5 minutes</span>
                </div>
              </motion.div>
            </div>
            
            {/* Hero Dashboard Preview - Now second on mobile */}
            <motion.div 
              variants={itemVariants}
              className="relative order-2 lg:order-2 mt-8 lg:mt-0"
            >
              <div className={`relative rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 shadow-2xl mx-auto max-w-sm sm:max-w-md lg:max-w-none lg:ml-8 xl:ml-16 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-gray-800/50 to-gray-700/50' 
                  : 'bg-gradient-to-br from-blue-100 to-green-100'
              }`}>
                <DashboardPreview isDarkMode={isDarkMode} />
                
                {/* Floating Status Cards */}
                <motion.div
                  className={`hidden md:block absolute -top-3 -right-3 p-3 rounded-xl shadow-lg ${
                    isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
                  }`}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className={`text-xs font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Real-time
                    </span>
                  </div>
                </motion.div>
                
                <motion.div
                  className={`hidden md:block absolute -bottom-3 -left-3 p-3 rounded-xl shadow-lg ${
                    isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
                  }`}
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                >
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-3 w-3 text-blue-600" />
                    <span className={`text-xs font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      WhatsApp
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        className={`py-16 backdrop-blur-lg transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'
        }`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center"
              >
                <motion.div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    isDarkMode ? 'bg-blue-800/50' : 'bg-blue-100'
                  }`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="text-blue-600">
                    {stat.icon}
                  </div>
                </motion.div>
                <h3 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stat.number}
                </h3>
                <p className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        className={`py-16 lg:py-20 transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50' 
            : 'bg-gradient-to-br from-gray-50 to-white'
        }`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-12 lg:mb-16">
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Powerful Features for <span className="text-blue-600">Every User</span>
            </h2>
            <p className={`text-lg sm:text-xl max-w-3xl mx-auto ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Experience the future of complaint management with our comprehensive suite of features designed for efficiency and user satisfaction.
            </p>
          </motion.div
          >
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group"
              >
                <motion.div 
                  className={`text-center h-full p-6 lg:p-8 rounded-2xl backdrop-blur-sm transition-all duration-300 border-2 hover:shadow-2xl ${
                    isDarkMode 
                      ? 'bg-gray-800/30 border-gray-700/50 hover:border-blue-500/50 hover:bg-gray-800/50' 
                      : 'bg-white/60 border-gray-200 hover:border-blue-200 hover:bg-white/80'
                  }`}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6 group-hover:scale-110 transition-transform duration-300 ${
                    isDarkMode ? 'bg-blue-800/80 shadow-lg' : 'bg-blue-100 shadow-md'
                  }`}>
                    <div className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className={`text-lg lg:text-xl font-semibold mb-3 lg:mb-4 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {feature.title}
                  </h3>
                  <p className={`leading-relaxed text-sm lg:text-base ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {feature.description}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-16 lg:py-24 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 lg:mb-6"
          >
            Ready to Transform Your Service?
          </motion.h2>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg sm:text-xl text-blue-100 mb-8 lg:mb-12 leading-relaxed max-w-2xl mx-auto"
          >
            Join thousands of satisfied users who have streamlined their complaint management process with CMS. Start your free trial today.
          </motion.p>
          
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center"
          >
            <motion.button
              onClick={handleGetStarted}
              className="group relative overflow-hidden bg-white text-blue-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto justify-center"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center">
                <Zap className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                Start Free Trial
                <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className={`py-12 transition-colors duration-300 ${
        isDarkMode ? 'bg-black text-white' : 'bg-gray-900 text-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-16 h-10 flex items-center justify-center overflow-hidden bg-white/10 rounded-lg">
                <img 
                  src="/assets/Logo.png" 
                  alt="CMS Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold">CMS</span>
            </div>
            
            <div className="text-center md:text-right text-gray-400">
              <p>&copy; 2025 CMS. All rights reserved.</p>
              <p className="text-sm mt-1">Professional Complaint Management System</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
