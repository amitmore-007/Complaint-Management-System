import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER
};

// Check if all required variables are present
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOTP = async (phoneNumber, otp) => {
  try {
    console.log('📱 Sending OTP:', { phoneNumber, otp });
    
    // Ensure phone number is in correct format
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('whatsapp:+')) {
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone.replace(/^0+/, '');
      }
      formattedPhone = 'whatsapp:' + formattedPhone;
    }
    
    console.log('📱 Formatted phone number:', formattedPhone);
    
    const message = `🔐 Your FixFlow verification code is: *${otp}*\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone. 🔒`;

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedPhone
    });

    console.log('✅ OTP sent successfully:', result.sid);
    
    return {
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    console.error('❌ Failed to send OTP:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const sendStatusUpdate = async (phoneNumber, message) => {
  try {
    const twilioMessage = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phoneNumber}`,
      body: message
    });
    
    console.log('Status update sent:', twilioMessage.sid);
    return { success: true, messageId: twilioMessage.sid };
  } catch (error) {
    console.error('Twilio status update error:', error);
    return { success: false, error: error.message };
  }
};

export const sendAssignmentNotification = async (phoneNumber, technicianName, complaintId) => {
  try {
    console.log('📱 Sending assignment notification:', { phoneNumber, technicianName, complaintId });
    
    // Ensure phone number is in correct format
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('whatsapp:+')) {
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone.replace(/^0+/, '');
      }
      formattedPhone = 'whatsapp:' + formattedPhone;
    }
    
    console.log('📱 Formatted phone number:', formattedPhone);
    
    const message = `🔧 *Complaint Assignment Update*\n\n` +
                   `Your complaint #${complaintId} has been assigned to our technician *${technicianName}*.\n\n` +
                   `The technician will contact you soon to resolve your issue.\n\n` +
                   `Thank you for choosing FixFlow! 🚀`;

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedPhone
    });

    console.log('✅ Assignment notification sent successfully:', result.sid);
    
    return {
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    console.error('❌ Failed to send assignment notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const sendProgressUpdate = async (clientPhone, complaintId, status) => {
  const statusMessages = {
    'in-progress': `⚡ *FixFlow Update*

Great news! Work has started on your complaint *${complaintId}*.

Our technician is now working to resolve your issue. We'll keep you updated on the progress.

Thank you for your patience!`,
    
    'resolved': `✅ *FixFlow - Issue Resolved*

Excellent! Your complaint *${complaintId}* has been successfully resolved.

Thank you for choosing FixFlow. We hope our service met your expectations.

Please rate your experience in the app when convenient.`
  };
  
  const message = statusMessages[status];
  if (message) {
    return await sendStatusUpdate(clientPhone, message);
  }
  
  return { success: false, error: 'Invalid status for notification' };
};

// Additional function for custom notifications
export const sendCustomNotification = async (clientPhone, complaintId, customMessage) => {
  const message = `📱 *FixFlow Notification*

Complaint ID: *${complaintId}*

${customMessage}

Thank you for choosing FixFlow!`;
  
  return await sendStatusUpdate(clientPhone, message);
};

export const sendStatusUpdateNotification = async (phoneNumber, complaintId, status, clientName) => {
  try {
    console.log('🔄 ===== TWILIO DEBUG START =====');
    console.log('📱 Sending status update notification with params:', { 
      phoneNumber, 
      complaintId, 
      status, 
      clientName,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
      twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER
    });
    
    // Validate inputs
    if (!phoneNumber || !complaintId || !status || !clientName) {
      console.error('❌ Missing required parameters for status update notification');
      console.log('Received params:', { phoneNumber, complaintId, status, clientName });
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }
    
    // Check Twilio configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
      console.error('❌ Twilio configuration incomplete');
      console.log('Config status:', {
        accountSid: !!process.env.TWILIO_ACCOUNT_SID,
        authToken: !!process.env.TWILIO_AUTH_TOKEN,
        whatsappNumber: !!process.env.TWILIO_WHATSAPP_NUMBER
      });
      return {
        success: false,
        error: 'Twilio configuration incomplete'
      };
    }
    
    // Ensure phone number is in correct format
    let formattedPhone = phoneNumber;
    console.log('📱 Original phone number:', phoneNumber);
    
    if (!formattedPhone.startsWith('whatsapp:+')) {
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone.replace(/^0+/, '');
      }
      formattedPhone = 'whatsapp:' + formattedPhone;
    }
    
    console.log('📱 Formatted phone number:', formattedPhone);
    
    // ⚠️ IMPORTANT: WhatsApp Sandbox Setup Check
    console.log('⚠️ ===== WHATSAPP SANDBOX SETUP =====');
    console.log('📋 For WhatsApp messages to work, ensure:');
    console.log('1. Your phone number is added to Twilio WhatsApp Sandbox');
    console.log('2. You have sent "join <sandbox-keyword>" to +1 415 523 8886');
    console.log('3. Your phone number format is correct: +91XXXXXXXXXX');
    console.log('4. You are using the Twilio Sandbox WhatsApp number: whatsapp:+14155238886');
    console.log('Current phone being used:', formattedPhone);
    console.log('⚠️ ===== SANDBOX SETUP CHECK END =====');
    
    let message = '';
    let emoji = '';
    
    switch (status) {
      case 'in-progress':
        emoji = '🔄';
        message = `${emoji} *Complaint Status Update*\n\n` +
                 `Hi ${clientName}!\n\n` +
                 `Great news! Our technician has started working on your complaint #${complaintId}.\n\n` +
                 `Status: *Work in Progress*\n\n` +
                 `We'll keep you updated on the progress. Thank you for your patience! 🛠️`;
        break;
        
      case 'resolved':
        emoji = '✅';
        message = `${emoji} *Complaint Resolved*\n\n` +
                 `Hi ${clientName}!\n\n` +
                 `Excellent news! Your complaint #${complaintId} has been successfully resolved.\n\n` +
                 `Status: *Completed*\n\n` +
                 `Thank you for using FixFlow! We hope you're satisfied with our service. 🎉`;
        break;
        
      default:
        emoji = '📋';
        message = `${emoji} *Complaint Status Update*\n\n` +
                 `Hi ${clientName}!\n\n` +
                 `Your complaint #${complaintId} status has been updated.\n\n` +
                 `Status: *${status.replace('-', ' ').toUpperCase()}*\n\n` +
                 `Thank you for choosing FixFlow! 🚀`;
    }

    console.log('📱 Message to send:');
    console.log(message);
    console.log('📱 Twilio params:', {
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedPhone,
      messageLength: message.length
    });

    console.log('📡 Attempting to send via Twilio...');
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedPhone
    });

    console.log('✅ Twilio response received:', {
      sid: result.sid,
      status: result.status,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      dateCreated: result.dateCreated,
      dateSent: result.dateSent,
      direction: result.direction,
      uri: result.uri
    });
    
    // Additional status check
    console.log('📊 Message Status Explanation:');
    switch (result.status) {
      case 'queued':
        console.log('🟡 QUEUED: Message is queued and will be sent soon');
        console.log('💡 If message stays queued, check WhatsApp sandbox setup');
        break;
      case 'sent':
        console.log('🟢 SENT: Message was sent to WhatsApp');
        break;
      case 'delivered':
        console.log('✅ DELIVERED: Message was delivered to recipient');
        break;
      case 'failed':
        console.log('🔴 FAILED: Message failed to send');
        break;
      case 'undelivered':
        console.log('🟠 UNDELIVERED: Message could not be delivered');
        break;
    }
    
    console.log('🔄 ===== TWILIO DEBUG END =====');
    
    return {
      success: true,
      messageId: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error('❌ ===== TWILIO ERROR DEBUG =====');
    console.error('❌ Failed to send status update notification:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status,
      details: error.details
    });
    
    if (error.code) {
      console.error('Twilio Error Code:', error.code);
      console.error('Twilio Error Message:', error.message);
      
      // Common Twilio error codes debugging
      switch (error.code) {
        case 21211:
          console.error('❌ Invalid phone number format');
          console.error('💡 Ensure format: +91XXXXXXXXXX');
          break;
        case 21214:
          console.error('❌ Invalid phone number - not a mobile number');
          break;
        case 21408:
          console.error('❌ Permission to send an SMS/WhatsApp message not enabled');
          console.error('💡 Check Twilio console permissions');
          break;
        case 63007:
          console.error('❌ WhatsApp message failed - recipient may not have WhatsApp');
          console.error('💡 Ensure recipient has WhatsApp and is in sandbox');
          break;
        case 63016:
          console.error('❌ Phone number not verified in WhatsApp sandbox');
          console.error('💡 Add phone number to sandbox and send join message');
          break;
        default:
          console.error('❌ Unknown Twilio error code');
      }
    }
    
    console.error('❌ ===== TWILIO ERROR DEBUG END =====');
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

export default client;
