require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const AWS = require('aws-sdk');
const cors = require('cors');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

function extractSentencesAndCount(text, word) {
  const regex = new RegExp(`[^.!?]*\\b${word}\\b[^.!?]*[.!?]`, 'gi');
  let matches = text.match(regex) || [];
  let sum=0;
  return matches.map(sentence => {
    const count = (sentence.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
    sum+=count;
    //console.log(sentence, count);
    return { sentence, count };
  }
  ).filter(sentence => sentence.count > 0).map(sentence => ({ ...sentence, count: sum }));
}

function generateCSV(data) {
  const csvWriter = createCsvWriter({
    path: 'output/sentences.csv',
    header: [
      {id: 'sentence', title: 'Sentence'},
      {id: 'count', title: 'Word Count'}
    ]
  });
  
  // Write data to CSV file`
  csvWriter.writeRecords(data)
    .then(() => {
      console.log('CSV file has been written successfully.');
    })
    .catch(err => {
      console.error('Error writing CSV file:', err);
    });
}

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const word = req.body.word;

  if (!file || !word) {
    return res.status(400).send('File and word are required.');
  }

  fs.readFile(file.path, 'utf8', (err, fileContent) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).send('Failed to read the file');
    }

    // Extract sentences containing the word and count occurrences
    const sentencesData = extractSentencesAndCount(fileContent, word);
    
    // Generate CSV from the extracted data
    generateCSV(sentencesData);

    res.send({
      message: 'File uploaded and processed successfully',
      word: word,
      sentences: sentencesData.map(item => item.sentence),
      count: sentencesData.map(item => item.count)      
      // filePath should be updated correctly upon S3 upload confirmation
    });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
