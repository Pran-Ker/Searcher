require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const AWS = require('aws-sdk');
const app = express();
const upload = multer({ dest: 'uploads/' });

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  const word = req.body.word;
  
  // console.log('AWS Access Key:', process.env.AWS_ACCESS_KEY_ID);
  // console.log('AWS Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY);
  // console.log('AWS Region:', process.env.AWS_REGION);
  // console.log('AWS Bucket:', process.env.S3_BUCKET_NAME);

  if (!file || !word) {
    return res.status(400).send('File and word are required.');
  }
  console.log('AWS Bucket:', process.env.S3_BUCKET_NAME);

  // Read the file
  fs.readFile(file.path, (err, fileContent) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).send('Failed to read the file');
    }

    const sentences = extractSentences(fileContent, word);


    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.originalname, 
      Body: fileContent
    };


    //Upload to S3

    s3.upload(params, function(err, data) {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(500).send('Failed to upload file');
      }
      console.log('File uploaded successfully. Location:');
      res.send({
        message: 'File uploaded successfully',
        word: word,
        sentences: sentences,
        filePath: data.Location
      });
    });
  });
});

function extractSentences(text, word) {
  const regex = new RegExp(`[^.!?]*\\b${word}\\b[^.!?]*[.!?]`, 'gi');
  return text.match(regex) || [];
}

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
