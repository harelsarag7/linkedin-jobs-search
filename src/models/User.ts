import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: false },
  phone: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  location: { type: String, required: false },
  bio: { type: String, required: false },
  linkedinUrl: { type: String, required: false },
  githubUrl: { type: String, required: false },
  personalWebsite: { type: String, required: false },
  desiredJobTitle: { type: String, required: false },
  employmentType: { type: String, required: false },
  minSalary: { type: Number, required: false, default: 0 },
  maxSalary: { type: Number, required: false, default: 0 },
  searchRadius: { type: Number, required: false, default: 0 },
  openToRemote: { type: Boolean, required: false, default: true },
  skills: { type: [String], required: false, default: [] },
  blockedCompanies: { type: [String], required: false, default: [] },
  resumeUrl: { type: String, required: false },
  keywords: { type: [String], required: false, default: [] },

  UserAgent: { type: String, required: false },
  li_at: { type: String, required: false },  // LinkedIn cookie

  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.model('User', userSchema)
