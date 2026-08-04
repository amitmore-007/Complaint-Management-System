import McpOAuthClient from "../models/McpOAuthClient.js";
import McpAuthCode from "../models/McpAuthCode.js";
import McpRefreshToken from "../models/McpRefreshToken.js";

export const mcpOAuthData = {
  clients: {
    findByClientId: (clientId) => McpOAuthClient.findOne({ clientId }),
    create: (data) => McpOAuthClient.create(data),
  },

  authCodes: {
    create: (data) => McpAuthCode.create(data),
    findByCode: (code) => McpAuthCode.findOne({ code }),
    deleteByCode: (code) => McpAuthCode.deleteOne({ code }),
  },

  refreshTokens: {
    create: (data) => McpRefreshToken.create(data),
    findByHash: (tokenHash) => McpRefreshToken.findOne({ tokenHash }),
    deleteByHash: (tokenHash) => McpRefreshToken.deleteOne({ tokenHash }),
  },
};
