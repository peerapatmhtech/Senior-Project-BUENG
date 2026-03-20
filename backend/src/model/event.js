// src/model/event.js

import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: String,
    date: Date, // Changed from Mixed to Date
    dateRaw: mongoose.Schema.Types.Mixed, // Keep original date object for reference
    email: String,
    address: mongoose.Schema.Types.Mixed,
    genre: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    description: String,
    link: String,
    image: String,
    thumbnail: String,
    venue: mongoose.Schema.Types.Mixed,
    ticket_info: mongoose.Schema.Types.Mixed,
    event_location_map: mongoose.Schema.Types.Mixed,
    createdByAI: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ title: 1, link: 1 }, { unique: true });
// Add text index for search
eventSchema.index({ title: 'text', description: 'text', address: 'text' });

export const Event = mongoose.model('Event', eventSchema);
