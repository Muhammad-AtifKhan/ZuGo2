const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.send('Simple server works!');
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Simple test server running on http://localhost:5000');
});