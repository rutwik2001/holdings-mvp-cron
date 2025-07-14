// lib/mongodb.ts
import 'dotenv/config';
import { MongoClient, MongoClientOptions } from 'mongodb';
require('dotenv').config();

// MongoDB connection URI from environment variable
const uri: string = process.env.MONGODB_URI!;
const options: MongoClientOptions = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Extend the global object to include a cached MongoDB client promise
declare global {
  // Allows global reuse of MongoClient promise to prevent multiple connections in development
  // The `var` keyword ensures the declaration is hoisted
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Reuse the MongoDB connection across hot reloads in development
if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  // Connect to MongoDB and cache the promise globally
  global._mongoClientPromise = client.connect();
}

// Reuse the cached client promise
clientPromise = global._mongoClientPromise;

export default clientPromise;
