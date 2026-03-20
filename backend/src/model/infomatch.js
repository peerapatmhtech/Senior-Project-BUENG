import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const infoMatchSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    detail: { type: String }, // Event title or detail
    email: { type: String, required: true, index: true, alias: 'userEmail' }, // User A
    usermatch: { type: String, required: true, index: true, alias: 'matchedUserEmail' }, // User B
    chance: { type: Number },
    status: {
      type: String,
      enum: [
        'pending', // Waiting for a mutual like
        'matched', // Both users liked each other
        'unmatched',
      ],
      default: 'pending',
      index: true,
    },
    // The user who initiated the like or the AI matching
    initiatorEmail: {
      type: String,
      required: true,
    },
    university: {
      type: String,
      default: 'Bangkok University',
    },
    lastMatchedAt: {
      type: Date,
      default: Date.now,
    },
    // Tracks how many times this potential match has been skipped
    skipCount: {
      type: Number,
      default: 0,
    },
    read: {
      type: Boolean,
      default: false,
    },
    swipedBy: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Ensures a unique potential match between two users for a specific event
// Updated based on USER request: { userEmail: 1, matchedUserEmail: 1, eventId: 1 }
infoMatchSchema.index({ email: 1, usermatch: 1, eventId: 1 }, { unique: true });

// Cascade Delete: เมื่อลบ InfoMatch ให้ลบประวัติการแชทกับ AI ที่เกี่ยวข้องด้วย
infoMatchSchema.pre('findOneAndDelete', async function (next) {
  const matchId = this.getQuery()._id;
  if (matchId) {
    await mongoose.model('AiChatMessage').deleteMany({ roomId: matchId });
  }
  next();
});

// สำหรับ deleteMany (เช่นเวลาลบ User)
infoMatchSchema.pre('deleteMany', async function (next) {
  const query = this.getQuery();
  const matches = await this.model.find(query).select('_id');
  const matchIds = matches.map((m) => m._id);
  if (matchIds.length > 0) {
    await mongoose.model('AiChatMessage').deleteMany({ roomId: { $in: matchIds } });
  }
  next();
});

export const InfoMatch = mongoose.model('InfoMatch', infoMatchSchema);
