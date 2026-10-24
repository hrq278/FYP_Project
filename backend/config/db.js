const dns = require("dns").promises;
const mongoose = require("mongoose");

// Some networks (e.g. the university's) block the DNS lookups a mongodb+srv:// address needs. Then we connect
// to the cluster's three servers directly. These are this project's Atlas hosts (not secret); override with
// MONGO_DIRECT_HOSTS / MONGO_REPLICA_SET in .env if the cluster changes.
const DIRECT_HOSTS = (
  process.env.MONGO_DIRECT_HOSTS ||
  [0, 1, 2].map((i) => `ac-o3ywzcp-shard-00-0${i}.tavy5nf.mongodb.net:27017`).join(",")
).split(",");
const REPLICA_SET = process.env.MONGO_REPLICA_SET || "atlas-9bowx9-shard-0";

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("DNS timeout")), ms))]);

// mongodb+srv://user:pass@cluster.x.mongodb.net/db?opts -> mongodb://user:pass@h1,h2,h3/db?opts&tls=true&...
const directUri = (srvUri) => {
  const u = new URL(srvUri);
  const params = new URLSearchParams(u.search);
  params.set("tls", "true");
  params.set("authSource", params.get("authSource") || "admin");
  params.set("replicaSet", REPLICA_SET);
  const auth = u.username ? `${u.username}${u.password ? `:${u.password}` : ""}@` : "";
  return `mongodb://${auth}${DIRECT_HOSTS.join(",")}${u.pathname || "/"}?${params}`;
};

const srvLookupWorks = async (srvUri) => {
  const host = new URL(srvUri).hostname;
  try {
    await withTimeout(Promise.all([dns.resolveSrv(`_mongodb._tcp.${host}`), dns.resolveTxt(host)]), 5000);
    return true;
  } catch {
    return false;
  }
};

const connectDB = async () => {
  let uri = process.env.MONGO_URI;
  try {
    if (uri?.startsWith("mongodb+srv://") && !(await srvLookupWorks(uri))) {
      console.log("MongoDB: this network blocks the Atlas DNS lookup, connecting to the servers directly");
      uri = directUri(uri);
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.directUri = directUri;
