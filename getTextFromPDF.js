const pdfjsLib = require("pdfjs-dist");

async function getTextFromPDF(path) {
  let doc = await pdfjsLib.getDocument(path).promise;
  let numPages = doc.numPages;
  let result = "";

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
    let page = await doc.getPage(pageNumber);
    let content = await page.getTextContent();
    let strings = content.items.map(function (item) {
      return item.str;
    });

    result += `\n${strings.join(" ")}\n`;
  }

  return result;
}

module.exports = { getTextFromPDF };
