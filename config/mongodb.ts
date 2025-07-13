// lib/mongodb.ts
import 'dotenv/config';
import { MongoClient, MongoClientOptions } from 'mongodb';
require('dotenv').config();

const uri: string = process.env.MONGODB_URI!;
const options: MongoClientOptions = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Extend the NodeJS global object to include the _mongoClientPromise property
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Reuse the MongoDB connection across hot reloads in development
if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;
