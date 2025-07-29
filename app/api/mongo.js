const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://eliasnuru456:mICRRn0nG4WQpg4S@cluster0.y2mdtvi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const options = {};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

async function getDb() {
  const client = await clientPromise;
  return client.db(); // default DB, can specify name if needed
}

module.exports = { getDb };
