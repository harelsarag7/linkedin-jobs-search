import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;

if (!ENCRYPTION_ALGORITHM || !ENCRYPTION_KEY || !ENCRYPTION_IV) {
    throw new Error('Encryption configuration is not set properly');
}
export const encrypt = (text: string) => {
	try {
		const cipher = crypto.createCipheriv(
			ENCRYPTION_ALGORITHM,
			Buffer.from(ENCRYPTION_KEY, 'hex'),
			Buffer.from(ENCRYPTION_IV, 'hex')
		);
		let encrypted = cipher.update(text, 'utf8', 'hex');
		encrypted += cipher.final('hex');
		return encrypted;
	} catch (error: unknown) {
        // Handle the error appropriately
        if (error instanceof Error) {
		    throw new Error('Encryption failed: ' + error.message);
        } else {
            throw new Error('Encryption failed: Unknown error');
        }
	}
};
