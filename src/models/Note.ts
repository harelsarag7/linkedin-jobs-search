import mongoose from 'mongoose'

export const noteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // Unique identifier for the note
    content: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
)
