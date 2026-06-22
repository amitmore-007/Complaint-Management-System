import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['work', 'break'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userRole: { type: String, enum: ['admin', 'technician', 'client'], required: true },
    userName: { type: String, required: true },
    userPhone: { type: String, required: true },

    date: { type: String, required: true }, // "YYYY-MM-DD"

    checkInTime: { type: Date },
    checkOutTime: { type: Date },

    currentStatus: {
      type: String,
      enum: ['working', 'on_break', 'checked_out'],
      default: 'working',
    },
    currentSessionStart: { type: Date, default: null },

    sessions: [sessionSchema],

    totalWorkSeconds: { type: Number, default: 0 },
    totalBreakSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// one record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
