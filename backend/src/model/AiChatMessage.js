import mongoose from 'mongoose';

const aiChatMessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String, // 'user' or 'ai'
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export const AiChatMessage = mongoose.model('AiChatMessage', aiChatMessageSchema);
