import mongoose from 'mongoose';
import { noteSchema } from './Note';

const jobSchema = new mongoose.Schema({
  email: { type: String, required: true },
  title: String,
  company: String,
  location: String,
  timeText: String,
  jobId: String,
  url: { type: String, required: true },
  companyLogo: { type: String, required: false },
  agoTime: { type: String, required: false },
  salary: { type: String, required: false, default: 'Not specified' },
  description: String,
  savedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['ready_to_apply', 'applied', 'interviewing', 'offer', 'rejected'], default: 'ready_to_apply' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appliedAt: { type: Date, default: null },

    // 3️⃣ Add your new `notes` field as an array of subdocuments
    notes: {
      type: [noteSchema],
      default: [], // start with an empty array if no notes yet
    },
});

export const Job = mongoose.model('Job', jobSchema);
