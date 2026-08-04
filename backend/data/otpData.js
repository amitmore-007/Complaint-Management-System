import OTP from "../models/OTP.js";

export const otpData = {
  /** Issuing a new code invalidates any previous one for this phone+role. */
  deleteForPhoneAndRole: ({ phoneNumber, role }) =>
    OTP.deleteMany({ phoneNumber, role }),

  create: (data) => OTP.create(data),

  deleteById: (id) => OTP.deleteOne({ _id: id }),

  findValid: ({ phoneNumber, otp, role }) =>
    OTP.findOne({
      phoneNumber,
      otp,
      role,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }),

  save: (record) => record.save(),
};
