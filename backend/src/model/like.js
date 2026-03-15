// models/Like.js
import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    eventTitle: { type: String },
  },
  { timestamps: true }
);

export const Like = mongoose.model('Like', likeSchema);
