import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = {
  MSG91_AUTHKEY: process.env.MSG91_AUTHKEY,
  MSG91_INTEGRATED_NUMBER: process.env.MSG91_INTEGRATED_NUMBER,
  MSG91_NAMESPACE: process.env.MSG91_NAMESPACE,
};

// Check if all required variables are present
for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const MSG91_API_URL =
  "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

export const sendOTP = async (phoneNumber, otp) => {
  try {

    // Ensure phone number is in correct format (with country code)
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^0+/, "");
    }
    // Remove + for MSG91
    formattedPhone = formattedPhone.replace("+", "");

    const payload = {
      integrated_number: process.env.MSG91_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "cms_otp",
          language: {
            code: "en",
            policy: "deterministic",
          },
          namespace: process.env.MSG91_NAMESPACE,
          to_and_components: [
            {
              to: [formattedPhone],
              components: {
                body_1: {
                  type: "text",
                  value: otp,
                },
                button_1: {
                  type: "text",
                  subtype: "url",
                  value: otp.toString().substring(0, 15),
                },
              },
            },
          ],
        },
      },
    };

    const response = await axios.post(MSG91_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTHKEY,
        accept: "application/json",
      },
    });

    if (response.data.status === "success") {
      return {
        success: true,
        messageId: response.data.request_id,
        data: response.data,
      };
    } else {
      return {
        success: false,
        error: response.data.errors || "Failed to send OTP",
      };
    }
  } catch (error) {
    console.error("❌ MSG91 OTP error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const sendStatusUpdate = async (
  phoneNumber,
  clientName,
  complaintId,
  status
) => {
  try {
   

    // Ensure phone number is in correct format
     let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^0+/, "");
    }
    formattedPhone = formattedPhone.replace("+", "");

    let templateName = "";
    let components = {};

    switch (status) {
      case "assigned":
        templateName = "status_updates";
        components = {
          body_1: {
            type: "text",
            value: clientName,
          },
          body_2: {
            type: "text",
            value: complaintId,
          },
        };
        break;

      case "in-progress":
        templateName = "complaint_started_update";
        components = {
          body_1: {
            type: "text",
            value: clientName,
          },
          body_2: {
            type: "text",
            value: complaintId,
          },
        };
        break;

      case "resolved":
        templateName = "complaint_completed_update";
        components = {
          body_1: {
            type: "text",
            value: clientName,
          },
          body_2: {
            type: "text",
            value: complaintId,
          },
        };
        break;

      default:
        throw new Error(`Unsupported status: ${status}`);
    }

    const payload = {
      integrated_number: process.env.MSG91_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en",
            policy: "deterministic",
          },
          namespace: process.env.MSG91_NAMESPACE,
          to_and_components: [
            {
              to: [formattedPhone],
              components: components,
            },
          ],
        },
      },
    };

    const response = await axios.post(MSG91_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTHKEY,
        accept: "application/json",
      },
    });

    if (response.data.status === "success") {
      return {
        success: true,
        messageId: response.data.request_id,
        data: response.data,
      };
    } else {
      return {
        success: false,
        error: response.data.errors || "Failed to send status update",
      };
    }
  } catch (error) {
    console.error(
      "❌ MSG91 status update error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const sendAssignmentNotification = async (
  phoneNumber,
  technicianName,
  complaintId,
  clientName
) => {
  try {

    if (!phoneNumber || !complaintId || !technicianName) {
      console.error("❌ Missing required parameters for assignment notification");
      return { success: false, error: "Missing required parameters" };
    }

    // Ensure phone number is in correct format
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^0+/, "");
    }
    formattedPhone = formattedPhone.replace("+", "");

    // Use the status_updates template for assignment notifications
    const payload = {
      integrated_number: process.env.MSG91_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "status_updates",
          language: {
            code: "en",
            policy: "deterministic",
          },
          namespace: process.env.MSG91_NAMESPACE,
          to_and_components: [
            {
              to: [formattedPhone],
              components: {
                body_1: {
                  type: "text",
                  value: clientName || "Customer",
                },
                body_2: {
                  type: "text",
                  value: complaintId,
                },
              },
            },
          ],
        },
      },
    };

    const response = await axios.post(MSG91_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTHKEY,
        accept: "application/json",
      },
    });

    if (response.data.status === "success") {
      return {
        success: true,
        messageId: response.data.request_id,
        data: response.data,
      };
    } else {
      return {
        success: false,
        error: response.data.errors || "Failed to send assignment notification",
      };
    }
  } catch (error) {
    console.error("❌ Assignment notification error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    };
  }
};

export const sendProgressUpdate = async (
  clientPhone,
  complaintId,
  status,
  clientName
) => {
  return await sendStatusUpdate(clientPhone, clientName, complaintId, status);
};

export const sendStatusUpdateNotification = async (
  phoneNumber,
  complaintId,
  status,
  clientName
) => {
  return await sendStatusUpdate(phoneNumber, clientName, complaintId, status);
};

export default {
  sendOTP,
  sendStatusUpdate,
  sendAssignmentNotification,
  sendProgressUpdate,
  sendStatusUpdateNotification,
};
