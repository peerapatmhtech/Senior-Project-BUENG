import mongoose from "mongoose";
const Schema = mongoose.Schema;

const userEventSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "deleted", "archived"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

userEventSchema.index({ email: 1, eventId: 1 }, { unique: true });

export const UserEvent = mongoose.model("UserEvent", userEventSchema);