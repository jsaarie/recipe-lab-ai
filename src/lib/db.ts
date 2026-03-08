import { MongoClient } from "mongodb";

// Lazily instantiated so that builds succeed without MONGODB_URI configured.
// In serverless environments, we connect on each cold start and cache within
// the same execution context. The client is replaced if the topology closes.

function createClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing environment variable: MONGODB_URI");
  }
  return new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
  });
}

const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
};

function getClient(): MongoClient {
  const existing = globalWithMongo._mongoClient;
  if (existing) {
    // Discard if topology is closed/destroyed
    const topology = (existing as unknown as { topology?: { s?: { state?: string } } }).topology;
    const state = topology?.s?.state;
    if (state === "closed" || state === "destroyed") {
      globalWithMongo._mongoClient = undefined;
    }
  }
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = createClient();
  }
  return globalWithMongo._mongoClient;
}

// Proxy that defers connection until the first method call
const clientProxy = new Proxy({} as MongoClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default clientProxy;
