// src/model/event.js

import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: String,
    genre: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    description: String,
    link: String,
    image: String,
    createdByAI: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ title: 1, link: 1 }, { unique: true });

export const Event = mongoose.model("Event", eventSchema);
