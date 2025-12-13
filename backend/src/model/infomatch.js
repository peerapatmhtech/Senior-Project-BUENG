import mongoose from "mongoose";
const Schema = mongoose.Schema;

const infoMatchSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    detail: { type: String }, // Event title or detail
    email: { type: String, required: true, index: true }, // User A
    usermatch: { type: String, required: true, index: true }, // User B
    chance: { type: Number },
    status: {
      type: String,
      enum: [
        "pending", // Waiting for a mutual like
        "matched", // Both users liked each other
        "unmatched",
      ],
      default: "pending",
      index: true,
    },
    // The user who initiated the like first
    initiatorEmail: {
      type: String,
      required: true,
    },
    // Tracks how many times this potential match has been skipped
    skipCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ensures a unique potential match between two users for a specific event
infoMatchSchema.index({ eventId: 1, email: 1, usermatch: 1 }, { unique: true });

export const InfoMatch = mongoose.model("InfoMatch", infoMatchSchema);
