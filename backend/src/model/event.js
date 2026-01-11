// src/model/event.js

import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: String,
    date: mongoose.Schema.Types.Mixed,
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

export const Event = mongoose.model('Event', eventSchema);
