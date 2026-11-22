import mongoose from 'mongoose';

mongoose.set('strictQuery', true);
// Without this, queries issued before a connection exists silently queue for
// 10s and then throw "buffering timed out", hiding the real connection error.
mongoose.set('bufferCommands', false);

// Cache on globalThis so dev hot reloads and concurrent server components
// share one connection instead of each opening (or racing) their own.
const cached = globalThis.__mongoose ?? (globalThis.__mongoose = { promise: null });

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add your MongoDB connection string to the project environment variables.'
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 })
      .then((m) => {
        console.log('MongoDB connected...');
        return m.connection;
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  return cached.promise;
};

export default connectDB;
