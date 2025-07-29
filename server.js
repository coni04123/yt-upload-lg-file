require("dotenv").config();
const express = require("express");
const app = express();
const apiRoutes = require("./routes/apiRoutes");

console.log(`🚀 Starting YouTube Upload Large File Server...`);
console.log(`📅 Server start time: ${new Date().toISOString()}`);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
console.log(`✅ JSON middleware configured with 50MB limit`);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`❌ Server error: ${err.message}`);
    console.error(`📊 Error stack: ${err.stack}`);
    
    if (err.code === 'RANGE_NOT_SATISFIABLE' || err.message.includes('Range Not Satisfiable')) {
        console.log(`🔄 Range error detected, sending 416 response`);
        return res.status(416).json({ 
            error: 'Range Not Satisfiable', 
            message: 'The requested range cannot be satisfied. Please try again.',
            details: err.message 
        });
    }
    
    if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
        console.log(`🌐 Network error detected`);
        return res.status(503).json({ 
            error: 'Service Unavailable', 
            message: 'Network connection issue. Please try again.',
            details: err.message 
        });
    }
    
    console.log(`❌ Unhandled error, sending 500 response`);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred.',
        details: err.message 
    });
});

app.use("/api", apiRoutes);
console.log(`✅ API routes configured`);

app.use("/video", express.static("video", {
    setHeaders: (res, path) => {
        res.set('Accept-Ranges', 'bytes');
        res.set('Cache-Control', 'public, max-age=3600');
    }
}));
console.log(`✅ Static video directory configured with proper headers`);

const PORT = process.env.PORT || 3000;
console.log(`🌐 Server will listen on port: ${PORT}`);

app.listen(PORT, () => {
    console.log(`\n🎉 Server is running!`);
    console.log(`🔗 Server URL: http://localhost:${PORT}`);
    console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📁 Video Directory: http://localhost:${PORT}/video`);
    
    console.log(`\n✨ Server ready to handle requests!`);
    console.log(`🛡️  Error handling configured for range and network issues`);
});
