import { Worker } from "bullmq";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import "dotenv/config";

//console.log(process.env.OPENAI_KEY);

const COLLECTION_NAME = "AskPdf";

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    try {
      const data = JSON.parse(job.data);
      console.log("Processing PDF:", data.path);

      // Load the PDF
      const loader = new PDFLoader(data.path);
      const docs = await loader.load();
      console.log(`Loaded ${docs.length} pages from PDF`);

      // Split text into chunks
      const textSplitter = new CharacterTextSplitter({
        separator: "\n",
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitDocs = await textSplitter.splitDocuments(docs);
      console.log(`Split into ${splitDocs.length} chunks`);

      // Initialize embeddings
      const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: process.env.OPENAI_KEY,
      });

      // Initialize vector store
      console.log("Connecting to Qdrant...");
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: "http://localhost:6333/",
          collectionName: COLLECTION_NAME,
        }
      );

      // Store documents
      console.log("Storing document chunks in vector database...");
      await vectorStore.addDocuments(splitDocs);
      console.log(
        `Successfully stored ${splitDocs.length} chunks in Qdrant collection: ${COLLECTION_NAME}`
      );
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw error; // Re-throw to mark the job as failed
    }
  },
  {
    concurrency: 5, // Reduced concurrency to avoid overwhelming the embedding API
    connection: {
      host: "localhost",
      port: "6379",
    },
  }
);

// Log worker status
worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
});
