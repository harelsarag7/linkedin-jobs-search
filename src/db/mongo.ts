import mongoose from 'mongoose';

export const connectToMongo = async () => {
  try {
    const uri = process.env.MONGODB_URI || '';
    await mongoose.connect(uri, {
        family: 4,
      });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};
