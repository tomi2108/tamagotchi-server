import express from "express";
import { inboxRoutes } from "./routes/inbox";
import { messageRoutes } from "./routes/message";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.get("/", (_req, res) => res.send("Server is running"));

app.use("/inbox", inboxRoutes);
app.use("/message", messageRoutes);

app.listen(port, () => console.log(`Server listening on port ${port}`));
