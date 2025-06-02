import express from "express";
import cors from "cors";
import multer from "multer";
import { Queue } from "bullmq";
import OpenAI from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import "dotenv/config";

//console.log(process.env.OPENAI_KEY);
const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

const queue = new Queue("file-upload-queue", {
  connection: {
    host: "localhost",
    port: "6379",
  },
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({
    status: "every thing is fine",
  });
});

app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  await queue.add(
    "file-ready",
    JSON.stringify({
      filename: req.file.originalname,
      destination: req.file.destination,
      path: req.file.path,
    })
  );
  return res.json({ message: "file uploaded" });
});

app.get("/chat", async (req, res) => {
  const userQuery = req.query.message;
  //query the db for the context which are stored in the form of vector
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_KEY,
  });
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: "http://localhost:6333/",
      collectionName: "AskPdf",
    }
  );
  //retriving from the store
  const retriever = vectorStore.asRetriever({
    k: 2,
  });
  const result = await retriever.invoke("userQuery");

  // along with  the retrived data promting to the open ai chat model
  const promt = `you are a helpfull AI Assistant who answer the user query based on the availabel context from the pdf file.
  ${JSON.stringify(result)}`;

  const chatResult = await client.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: promt },
      { role: "user", content: userQuery },
    ],
  });
  return res.json({
    message: chatResult.choices[0].message.content,
    docs: result,
  });
});

app.listen(8000, () => {
  console.log("server listening at port 8000");
});
