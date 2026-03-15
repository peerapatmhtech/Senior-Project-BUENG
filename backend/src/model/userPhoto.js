import mongoose from 'mongoose';

const userPhotoSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    filename: String,
    storagePath: String,
    title: String,
  },
  { timestamps: true }
);

export const UserPhoto = mongoose.model('UserPhoto', userPhotoSchema);
