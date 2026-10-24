const { directUri } = require("../config/db");

test("an SRV address becomes a direct three-host address with the same login, database and options", () => {
  const uri = directUri("mongodb+srv://user:p%40ss@fypcluster.tavy5nf.mongodb.net/maweshi?retryWrites=true&appName=fypCluster");
  const u = new URL(uri.replace("mongodb://", "http://").replace(/@[^/]+\//, "@host/"));
  expect(uri.startsWith("mongodb://user:p%40ss@ac-o3ywzcp-shard-00-00.tavy5nf.mongodb.net:27017,")).toBe(true);
  expect(uri.split("@")[1].split("/")[0].split(",")).toHaveLength(3);
  expect(u.pathname).toBe("/maweshi");
  expect(Object.fromEntries(u.searchParams)).toMatchObject({
    retryWrites: "true",
    appName: "fypCluster",
    tls: "true",
    authSource: "admin",
    replicaSet: "atlas-9bowx9-shard-0"
  });
});
