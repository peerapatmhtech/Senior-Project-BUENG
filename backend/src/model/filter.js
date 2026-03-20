import mongoose from 'mongoose';

const GmailSchema = new mongoose.Schema(
  {
    email: { 
      type: String,
      match: [/^\w+([.-]?\w+)*@bumail\.net$/, 'Please fill a valid @bumail.net address']
    },
    genres: [String],
    subGenres: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  { timestamps: true }
);

GmailSchema.index({ email: 1 });

export const Filter = mongoose.model('filters', GmailSchema);
