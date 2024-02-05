import express from "express";
import ViteExpress from "vite-express";
import { attachWebsocketServer } from "@vlcn.io/ws-server";
import { getResidentSchemaVersion } from "@vlcn.io/ws-server/dist/DB.js";
import * as http from "http";
import { nanoid } from 'nanoid'
import { generate } from "random-words";

const PORT = parseInt(process.env.PORT || "8080");

const app = express();
app.use(express.json());
const server = http.createServer(app);

const wsConfig = {
  dbFolder: "./dbs",
  schemaFolder: "./src/schemas",
  pathPattern: /\/sync/,
};

// For this test we stick to a single, static room
const dbFileName = "win-test";
const schemaFileName = "main2.sql";
const dbCache = attachWebsocketServer(server, wsConfig);
const schemaVersion = getResidentSchemaVersion(schemaFileName, wsConfig);
const idb = await dbCache.getAndRef(dbFileName, schemaFileName, schemaVersion);
const conn = idb.getDB();

const router = express.Router()

router.get("/", (req, res) => {
  const stmt = conn.prepare("SELECT * FROM test");
  const items = stmt.all();
  return res.send(items);
});

router.post("/", (req, res) => {
  try {
    const id = nanoid();
    const name = req.body.name ?? generate({ exactly: 3, join: " " });
    const stmt = conn.prepare("INSERT INTO test (id, name) VALUES (?, ?)");
    stmt.run(id, name);
    res.send({ id, name });
  } catch (error) {
    console.error(error);
    res.sendStatus(400);
  }
});

app.use('/api', router)
server.listen(PORT, () =>
  console.log("info", `listening on http://localhost:${PORT}!`)
);

ViteExpress.bind(app, server);
