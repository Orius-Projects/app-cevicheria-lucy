import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

export async function setupTestDB(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long';
  process.env.JWT_EXPIRES_IN = '8h';

  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 }
  });
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
}

export async function teardownTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongo) {
    await mongo.stop();
  }
}

export async function clearTestDB(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
