const fs = require("fs");
const path = require("path");
const TempFileManager = require("../utils/tempFileManager");

/**
 * Cleanup script to remove temporary files from the project
 */
function cleanupTempFiles() {
    console.log("🧹 Starting temporary file cleanup...");
    
    const directoriesToClean = [
        "./temp",
        "./tmp",
        "./controllers/tmp"
    ];
    
    let totalDeleted = 0;
    
    directoriesToClean.forEach(dirPath => {
        try {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                console.log(`📁 Checking directory: ${dirPath}`);
                
                files.forEach(file => {
                    const filePath = path.join(dirPath, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.isFile()) {
                        if (TempFileManager.safeDelete(filePath)) {
                            console.log(`✅ Deleted: ${file}`);
                            totalDeleted++;
                        } else {
                            console.log(`❌ Failed to delete: ${file}`);
                        }
                    }
                });
                
                // Try to remove empty directories
                try {
                    const remainingFiles = fs.readdirSync(dirPath);
                    if (remainingFiles.length === 0) {
                        fs.rmdirSync(dirPath);
                        console.log(`🗑️  Removed empty directory: ${dirPath}`);
                    }
                } catch (err) {
                    // Directory not empty or other error, that's fine
                }
            } else {
                console.log(`📁 Directory doesn't exist: ${dirPath}`);
            }
        } catch (err) {
            console.error(`❌ Error processing directory ${dirPath}:`, err.message);
        }
    });
    
    console.log(`\n🎉 Cleanup complete! Deleted ${totalDeleted} temporary files.`);
}

// Run cleanup if this script is executed directly
if (require.main === module) {
    cleanupTempFiles();
}

module.exports = { cleanupTempFiles }; 