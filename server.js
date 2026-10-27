
require("dotenv").config();

const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");

const app = express();
const port = 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(cors());


app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  console.log("Webhook verification failed");
  return res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  const data = req.body;

  console.log("Webhook event received:", JSON.stringify(data, null, 2));

  io.emit("pushNotification", {
    message: "A webhook event was received",
    data,
  });

  return res.status(200).json({
    message: "Event received successfully",
  });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
app.get("/", (req, res) => {
  res.send(`
    <h1>Webhook Server</h1>
    <p>Server is running on port 3000.</p>
    <p>Send POST requests to <code>/webhook</code> to submit events.</p>
  `);
});
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
