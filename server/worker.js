import { Worker } from "bullmq";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import "dotenv/config";

//console.log(process.env.OPENAI_KEY);

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    const data = JSON.parse(job.data);
    console.log("jobs : ", data);
    /*
        -- path:data.path get the path from her
        -- read the pdf from the path
        -- chunk the pdf 
        -- call the openai embedding model for every chunck
        -- store the chunck in qudrant db
        
    */
    // LOAD THE PDF
    console.log("data.path ", data.path);
    const loader = new PDFLoader(data.path);
    const docs = await loader.load();
    docs[0];
    console.log("docs: ", docs);

    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: process.env.OPENAI_KEY,
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333/",
        collectionName: "langchainjs-testing",
      }
    );
    await vectorStore.addDocuments(docs);
    console.log("all docs are added to vector db");
  },
  {
    concurrency: 100,
    connection: {
      host: "localhost",
      port: "6379",
    },
  }
);
