import mongoose from "mongoose";
import dns from "dns";

// Windows sometimes leaves Node's resolver pointed at a dead local DNS proxy,
// which breaks the SRV lookup that mongodb+srv:// URIs need (querSrv
// ECONNREFUSED). Instead of trusting the configured server list, actually try
// the SRV lookup and fall back to public resolvers only when it fails.
async function ensureSrvResolvable(uri) {
  if (!uri.startsWith("mongodb+srv://")) return;

  const host = uri
    .slice("mongodb+srv://".length)
    .split("/")[0]
    .split("@")
    .pop();

  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  } catch {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
  }
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in .env.local");
  }

  if (cached.conn) return cached.conn; // reuse existing

  if (!cached.promise) {
    await ensureSrvResolvable(MONGODB_URI);

    const opts = {
      bufferCommands: false,
      dbName: "ppt_generator", // ✅ single fixed DB name
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log("✅ MongoDB connected");
        return mongoose;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection error:", error);
        cached.promise = null; // Reset promise on error so we can retry
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // Reset on error
    throw error;
  }
}
