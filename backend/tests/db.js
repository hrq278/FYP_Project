const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let server;

const connect = async () => {
  server = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
  await mongoose.connect(server.getUri());
};

const clear = async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

const close = async () => {
  await mongoose.disconnect();
  if (server) await server.stop();
};

module.exports = { connect, clear, close };
