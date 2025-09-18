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
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phoneNumber}`,
      body: `Your FixFlow verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`
    });
    
    console.log('OTP sent successfully:', message.sid);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Twilio OTP error:', error);
    return { success: false, error: error.message };
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

export const sendAssignmentNotification = async (clientPhone, technicianName, complaintId) => {
  const message = `🔧 *FixFlow Update*

Your complaint *${complaintId}* has been assigned to our technician *${technicianName}*.

You will receive updates as work progresses. Thank you for choosing FixFlow!

Need help? Reply to this message.`;
  
  return await sendStatusUpdate(clientPhone, message);
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

export default client;
