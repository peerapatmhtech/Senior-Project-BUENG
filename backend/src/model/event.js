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

// Cascade Delete: เมื่อลบ Event ให้ลบ Like และ InfoMatch ที่เกี่ยวข้องด้วย
eventSchema.pre('findOneAndDelete', async function (next) {
  const eventId = this.getQuery()._id;
  if (eventId) {
    await mongoose.model('Like').deleteMany({ eventId });
    await mongoose.model('InfoMatch').deleteMany({ eventId });
  }
  next();
});

// สำหรับ deleteMany (ถ้ามี)
eventSchema.pre('deleteMany', async function (next) {
  const query = this.getQuery();
  const events = await this.model.find(query).select('_id');
  const eventIds = events.map((e) => e._id);
  if (eventIds.length > 0) {
    await mongoose.model('Like').deleteMany({ eventId: { $in: eventIds } });
    await mongoose.model('InfoMatch').deleteMany({ eventId: { $in: eventIds } });
  }
  next();
});

export const Event = mongoose.model('Event', eventSchema);
