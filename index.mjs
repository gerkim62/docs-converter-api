import express from "express";
import multer from "multer";
import cors from "cors";
import { parseOfficeAsync } from "officeparser";
import { getTextFromPDF } from "./getTextFromPDF.js";

import { writeFileSync, unlinkSync } from "fs";

import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 650,
  chunkOverlap: 100,
});

import mime from "mime";

import { getText } from "any-text";

const parsers = [
  { ext: ["pdf"], parser: getTextFromPDF },
  {
    ext: ["docx", "xlsx", "pptx", "odt", "odp", "ods"],
    parser: parseOfficeAsync,
  },
  {
    // DOC
    // DOCX
    // DOT
    // PDF
    // CSV
    // TXT
    // XLS
    // XLSX
    // JSON
    //we dont repeat already supported extensions
    ext: ["doc", "dot", "csv", "txt", "xls", "json"],
    parser: extractUsingGetText,
  },
];

async function extractUsingGetText(fileBuffer, filename) {
  try {
    // Save the file from the buffer
    const tempFilePath = `./${filename}`;
    writeFileSync(tempFilePath, fileBuffer);

    // Get the text content from the file
    const text = await getText(tempFilePath);

    // Clear the temporary file
    unlinkSync(tempFilePath);

    return text;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

const supportedExtensions = parsers
  .flatMap(({ ext }) => ext)
  .map((ext) => {
    return { ext, mime: mime.getType(ext) };
  });

function getFileExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

function isFormatSupported(extension) {
  return parsers.some((parser) => parser.ext.includes(extension));
}

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send(
    "get text from document " +
      supportedExtensions.map((ext) => ext.ext).join(", ")
  );
});

//supported extensions
app.get("/supported", (req, res) => {
  res.json(supportedExtensions);
});

app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const fileExtension = getFileExtension(file.originalname);

        if (!isFormatSupported(fileExtension)) {
          //console.log("Unsupported format:", fileExtension);
          return {
            filename: file.originalname,
            text: null,
            error: "Unsupported format",
            docOutput: [],
          };
        }

        try {
          const parser = parsers.find((p) => p.ext.includes(fileExtension));
          const data = await parser.parser(file.buffer, file.originalname);

          const docOutput = await splitter.splitDocuments([
            new Document({
              pageContent: data,
              metadata: { filename: file.originalname },
            }),
          ]);

          return {
            filename: file.originalname,
            // text: data,
            error: null,
            docOutput,
          };
        } catch (err) {
          //console.log("Error parsing file:", err);
          return {
            filename: file.originalname,
            text: null,
            error: "Error parsing file",
            docOutput: [],
          };
        }
      })
    );

    res.json(processedFiles);
    //console.log("Data sent");
    //console.log(processedFiles);
  } catch (error) {
    //console.error("Error uploading files:", error);
    res.status(500).send("Error uploading files");
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
