const fs = require("fs");
const path = require("path");
const os = require("os");

console.log(`🔧 Initializing TempFileManager utility...`);

/**
 * Utility class for managing temporary files with automatic cleanup
 */
class TempFileManager {
    /**
     * Creates a temporary file with automatic cleanup
     * @param {string} prefix - File prefix
     * @param {string} suffix - File suffix (including extension)
     * @param {string} directory - Directory to create file in (defaults to system temp dir)
     * @returns {string} Path to the temporary file
     */
    static createTempFile(prefix = "temp", suffix = ".tmp", directory = null) {
        const tempDir = directory || os.tmpdir();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const fileName = `${prefix}-${timestamp}-${random}${suffix}`;
        const filePath = path.join(tempDir, fileName);
        
        console.log(`📁 Creating temp file: ${filePath}`);
        console.log(`📂 Directory: ${tempDir}`);
        console.log(`🏷️  Prefix: ${prefix}, Suffix: ${suffix}`);
        
        return filePath;
    }

    /**
     * Safely deletes a file if it exists
     * @param {string} filePath - Path to the file to delete
     * @returns {boolean} True if file was deleted or didn't exist, false if deletion failed
     */
    static safeDelete(filePath) {
        console.log(`🧹 Attempting to delete file: ${filePath}`);
        
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
                fs.unlinkSync(filePath);
                console.log(`✅ File deleted successfully`);
                return true;
            } else {
                console.log(`⚠️  File does not exist: ${filePath}`);
                return true; // File didn't exist, which is fine
            }
        } catch (error) {
            console.error(`❌ Failed to delete file ${filePath}: ${error.message}`);
            return false;
        }
    }

    /**
     * Creates a temporary file and returns a cleanup function
     * @param {string} prefix - File prefix
     * @param {string} suffix - File suffix
     * @param {string} directory - Directory to create file in
     * @returns {Object} Object with filePath and cleanup function
     */
    static createWithCleanup(prefix = "temp", suffix = ".tmp", directory = null) {
        console.log(`🔧 Creating temp file with cleanup function`);
        const filePath = this.createTempFile(prefix, suffix, directory);
        return {
            filePath,
            cleanup: () => {
                console.log(`🧹 Cleanup function called for: ${filePath}`);
                return this.safeDelete(filePath);
            }
        };
    }

    /**
     * Cleans up multiple temporary files
     * @param {string[]} filePaths - Array of file paths to delete
     * @returns {number} Number of files successfully deleted
     */
    static cleanupMultiple(filePaths) {
        console.log(`🧹 Cleaning up ${filePaths.length} files...`);
        let deletedCount = 0;
        
        for (const filePath of filePaths) {
            if (this.safeDelete(filePath)) {
                deletedCount++;
            }
        }
        
        console.log(`✅ Cleanup completed: ${deletedCount}/${filePaths.length} files deleted`);
        return deletedCount;
    }

    /**
     * Ensures a directory exists and creates it if necessary
     * @param {string} dirPath - Directory path
     * @returns {boolean} True if directory exists or was created successfully
     */
    static ensureDirectory(dirPath) {
        console.log(`📁 Ensuring directory exists: ${dirPath}`);
        
        try {
            if (!fs.existsSync(dirPath)) {
                console.log(`📁 Creating directory: ${dirPath}`);
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`✅ Directory created successfully`);
            } else {
                console.log(`✅ Directory already exists: ${dirPath}`);
            }
            return true;
        } catch (error) {
            console.error(`❌ Failed to create directory ${dirPath}: ${error.message}`);
            return false;
        }
    }

    /**
     * Checks if a file exists
     * @param {string} filePath - Path to the file
     * @returns {boolean} True if file exists, false otherwise
     */
    static exists(filePath) {
        const exists = fs.existsSync(filePath);
        console.log(`🔍 File exists check: ${filePath} - ${exists ? '✅ Yes' : '❌ No'}`);
        return exists;
    }
}

console.log(`✅ TempFileManager utility initialized successfully`);

module.exports = TempFileManager;