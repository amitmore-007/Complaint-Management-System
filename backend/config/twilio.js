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
    console.log('📱 Sending status update notification:', { phoneNumber, complaintId, status, clientName });
    
    // Ensure phone number is in correct format
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('whatsapp:+')) {
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone.replace(/^0+/, '');
      }
      formattedPhone = 'whatsapp:' + formattedPhone;
    }
    
    console.log('📱 Formatted phone number:', formattedPhone);
    
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

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: formattedPhone
    });

    console.log('✅ Status update notification sent successfully:', result.sid);
    
    return {
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    console.error('❌ Failed to send status update notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default client;
