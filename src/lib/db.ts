import { MongoClient } from "mongodb";

// Lazily instantiated so that builds succeed without MONGODB_URI configured.
// The client is created on first access and cached for reuse.

function createClient(): MongoClient {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing environment variable: MONGODB_URI");
  }
  return new MongoClient(uri);
}

const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
};

function getClient(): MongoClient {
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
