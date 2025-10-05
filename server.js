const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// Route for main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for mobile version
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_mobile.html'));
});

// Route for report
app.get('/report', (req, res) => {
    res.sendFile(path.join(__dirname, 'report.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Health App running on port ${PORT}`);
    console.log(`📱 Visit: http://localhost:${PORT}`);
});
