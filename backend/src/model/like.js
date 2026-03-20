// models/Like.js
import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    userEmail: { 
      type: String, 
      required: true,
      match: [/^\w+([.-]?\w+)*@bumail\.net$/, 'Please fill a valid @bumail.net address']
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    eventTitle: { type: String },
  },
  { timestamps: true }
);

likeSchema.index({ userEmail: 1, eventId: 1 });

export const Like = mongoose.model('Like', likeSchema);
