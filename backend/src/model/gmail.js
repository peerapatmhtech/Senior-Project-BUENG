import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    displayName: String,
    email: { type: String, unique: true },
    photoURL: String,
    photosOrder: { type: [String], default: [] },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Gmail = mongoose.model('gmails', userSchema);
