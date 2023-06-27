import express from "express";
import multer from "multer";
import cors from "cors";
import { parseOfficeAsync } from "officeparser";
import  getTextFromPDF  from "./getTextFromPDF.js";

const parsers = [
  { ext: ["pdf"], parser: getTextFromPDF },
  { ext: ["docx", "xlsx", "pptx", "odt", "odp", "ods"], parser: parseOfficeAsync },
];

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

app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const fileExtension = getFileExtension(file.originalname);

        if (!isFormatSupported(fileExtension)) {
          console.log("Unsupported format:", fileExtension);
          return {
            filename: file.originalname,
            text: null,
            error: "Unsupported format",
          };
        }

        try {
          const parser = parsers.find((p) => p.ext.includes(fileExtension));
          const data = await parser.parser(file.buffer);

          return { filename: file.originalname, text: data, error: null };
        } catch (err) {
          console.log("Error parsing file:", err);
          return {
            filename: file.originalname,
            text: null,
            error: "Error parsing file",
          };
        }
      })
    );

    res.send(processedFiles);
    console.log("Data sent");
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).send("Error uploading files");
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
