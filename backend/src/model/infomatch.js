// src/model/event.js

import mongoose from "mongoose";

const infoMatchSchema = new mongoose.Schema(
  {
    detail: String,
    usermatchjoined: Boolean,
    emailjoined: Boolean,
    email: String,
    chance: Number,
    usermatch: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const InfoMatch = mongoose.model("InfoMatch", infoMatchSchema);