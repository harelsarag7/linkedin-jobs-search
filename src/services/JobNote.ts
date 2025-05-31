// src/services/jobService.ts

import { Types } from 'mongoose'
import { Job } from '../models/Job' // adjust the path as needed

/**
 * Return just the notes for a given jobId.
 * Each note has its own `id` (string), `content`, and `createdAt` (ISO string).
 */
export async function getJobNotes(
  jobId: string
): Promise<{ jobId: string; notes: Array<{ id: string; content: string; createdAt: string }> }> {
  if (!Types.ObjectId.isValid(jobId)) {
    return { jobId, notes: [] }
  }

  // Fetch only the `notes` field (lean → plain JS object)
  const jobDoc = await Job.findById(jobId).select('notes').lean().exec()
  if (!jobDoc) {
    return { jobId, notes: [] }
  }

  // Map each subdocument note into { id, content, createdAt }
  const mappedNotes = (jobDoc.notes || [])
    .map(n => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { jobId, notes: mappedNotes }
}

/**
 * Append a new note to a job, only if the given userId owns that job.
 * Returns the updated list of notes (each with id, content, createdAt).
 */
export async function addJobNoteService(
  userId: string,
  jobId: string,
  content: string
): Promise<Array<{ id: string; content: string; createdAt: string }>> {
  // 1) Validate IDs
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error(`Invalid userId: ${userId}`)
  }
  if (!Types.ObjectId.isValid(jobId)) {
    throw new Error(`Invalid jobId: ${jobId}`)
  }

  // 2) Find the job by ID
  const jobDoc = await Job.findById(jobId).exec()
  if (!jobDoc) {
    throw new Error(`Job not found for ID: ${jobId}`)
  }

  // 3) Verify ownership
  if (jobDoc.user_id.toString() !== userId) {
    throw new Error(`User ${userId} is not authorized to add a note to this job`)
  }

  // 4) Generate a unique ID for the new note
  const newNoteId = new Types.ObjectId().toString()

  // 5) Append the new note subdocument (must match noteSchema shape)
  jobDoc.notes.push({
    id: newNoteId,
    content: content,
    createdAt: new Date(),
  })

  // 6) Save the updated job document
  const updatedDoc = await jobDoc.save()

  // 7) Map each note to { id, content, createdAt (ISO string) }
  const mappedNotes = updatedDoc.notes
    .map(n => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))


  return mappedNotes
}
