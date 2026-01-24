import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    displayName: String,
    email: { type: String, unique: true },
    photoURL: String,
    photosOrder: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Gmail = mongoose.model('gmails', userSchema);
