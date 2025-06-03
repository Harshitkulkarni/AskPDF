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
  console.log("Received query:", userQuery);

  try {
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_KEY,
    });

    console.log("Connecting to vector store...");
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333/",
        collectionName: "AskPdf",
      }
    );

    // Increase the number of retrieved chunks for more context
    const retriever = vectorStore.asRetriever({
      k: 5, // Retrieve more relevant chunks
      minRelevanceScore: 0.7, // Only get highly relevant content
    });

    console.log("Retrieving relevant content...");
    const relevantDocs = await retriever.invoke(userQuery);

    if (!relevantDocs || relevantDocs.length === 0) {
      return res.json({
        message:
          "I couldn't find any relevant information in the PDF to answer your question. Could you please rephrase your question or ask about a different topic from the document?",
        docs: [],
      });
    }

    // Create a more detailed system prompt
    const systemPrompt = `You are a highly knowledgeable AI assistant analyzing a PDF document. Your task is to provide detailed, well-structured answers based on the document's content.

Context from the PDF:
${relevantDocs
  .map((doc, idx) => `[Section ${idx + 1}]: ${doc.pageContent}`)
  .join("\n\n")}

Instructions for providing detailed answers:
1. Thoroughly analyze all provided context sections
2. Structure your response in a clear, organized manner
3. Use bullet points or numbered lists when appropriate
4. Include specific quotes or references from the document when relevant
5. If the information seems incomplete, acknowledge what might be missing
6. Provide examples or elaborations when they would help clarify the answer
7. If there are multiple aspects to the question, address each one separately
8. Maintain accuracy - only state what is supported by the document
9. Use formatting (like sections or emphasis) to make the response more readable
10. If relevant, explain technical terms or concepts mentioned in the context

Question: "${userQuery}"

Please provide a comprehensive response that thoroughly addresses the question while staying true to the document's content.`;

    console.log("Generating response...");
    const chatResult = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery },
      ],
    });

    // Extract relevant sections for context
    const relevantSections = relevantDocs.map((doc) => ({
      content: doc.pageContent.substring(0, 200) + "...", // Preview of each section
      relevance: doc.metadata?.relevance || "N/A",
    }));

    return res.json({
      message: chatResult.choices[0].message.content,
      context: {
        relevantSections,
        totalSections: relevantDocs.length,
        query: userQuery,
      },
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return res.status(500).json({
      message:
        "An error occurred while processing your request. Please try again.",
      error: error.message,
    });
  }
});

app.listen(8000, () => {
  console.log("server listening at port 8000");
});
