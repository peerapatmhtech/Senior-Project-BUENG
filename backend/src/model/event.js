// src/model/event.js

import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: String,
    genre: String,
    description: String,
    link: String,
    image: String,
    createdByAI: Boolean,
    email: String,
  },
  { timestamps: true }
);

export const Event = mongoose.model("Event", eventSchema);
