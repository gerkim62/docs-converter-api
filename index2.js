import { extractText } from "office-text-extractor";
import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;
    const results = await processFiles(files);
    // console.log("results: ", results);
    console.log("results available: ", results.length);

    //instead of using res.json, use sse instead, only this line below should use sse
    res.send(results); // Send the results as JSON
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).send("Error uploading files");
  }
});

async function processFiles(files) {
  const results = [];

  for (const file of files) {
    console.log("filename: " + file.originalname);

    const filePath = path.join(process.cwd(), file.originalname);

    fs.writeFileSync(filePath, file.buffer); // Save the uploaded file to disk

    //this library has a bug where it disconnects so the res wont be sent but aborted after this line
    const text = await extractText(filePath);

    if (text) {
      results.push({ filename: file.originalname, text });
    } else {
      console.log("Unsupported file:", file.originalname);
    }

    // Delete the file after extraction (optional)
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
      }
    });
  }

  return results;
}

const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
