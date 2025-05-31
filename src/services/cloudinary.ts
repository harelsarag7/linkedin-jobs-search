import crypto from 'crypto'
import { v2 as cloudinary } from 'cloudinary'
import path from 'path'
import { encrypt } from 'utils/hash'


const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  throw new Error('Cloudinary configuration is not set in environment variables')
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
})

/**
 * Uploads a given file path to Cloudinary under a user-specific encrypted folder and returns the secure URL.
 */
export async function uploadFileToCloudinary(
    userId: string,
    filePath: string,
    originalName: string
  ): Promise<string> {
    try {
        // generate a stable folder name
        const hash = crypto
        .createHash('sha256')
        .update(userId)
        .digest('hex')
        .slice(0, 20)
    
        // pull out the extension from the original file name
        const ext = path.extname(originalName).replace('.', '') // e.g. "pdf"
    
        const encryptedOriginalName = encrypt(originalName)
        // combine into a public_id under raw
        const publicId = `user_resumes/${hash}/${encryptedOriginalName}`
    
        const res = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        public_id: publicId,
        format: ext,           // forces .pdf on the end
        access_mode: 'public',
        })
    
        // now this URL will be …/raw/upload/v1234/user_resumes/###/####.pdf
        return res.secure_url
    } catch (err) {
        console.error('❌ Error uploading file to Cloudinary:', err)
        throw err
    }
}
