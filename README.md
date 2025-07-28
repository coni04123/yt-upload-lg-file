# YouTube Upload Large File

A Node.js application for uploading large files from Dropbox to YouTube and RedCircle with automatic temporary file cleanup.

## Prerequisites

### FFmpeg Installation
This application uses FFmpeg for audio compression. Install it using one of these methods:

**Windows (using Chocolatey):**
```bash
choco install ffmpeg
```

**Windows (using winget):**
```bash
winget install ffmpeg
```

**macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

## Installation

```bash
npm install express dotenv googleapis axios dropbox node-fetch qs puppeteer fluent-ffmpeg
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Dropbox API
DROPBOX_CLIENT_ID=your_dropbox_client_id
DROPBOX_CLIENT_SECRET=your_dropbox_client_secret
DROPBOX_REFRESH_TOKEN=your_dropbox_refresh_token

# YouTube API
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=your_youtube_redirect_uri
YOUTUBE_REFRESH_TOKEN=your_youtube_refresh_token

# Server
PORT=3000
```

## Usage

### Start the server
```bash
npm start
```

### Clean up temporary files
```bash
npm run cleanup
```

## API Endpoints

### Transfer Dropbox to YouTube
```http
POST /api/transfer
Content-Type: application/json

{
  "path": "/path/to/dropbox/file.mp4",
  "title": "Video Title",
  "description": "Video Description",
  "tags": "tag1,tag2,tag3",
  "thumbnails": "https://example.com/thumbnail.jpg"
}
```

### Share Dropbox File
```http
POST /api/share
Content-Type: application/json

{
  "path": "/path/to/dropbox/file",
  "mode": "download" // or "raw"
}
```

### Unshare Dropbox File
```http
POST /api/unshare
Content-Type: application/json

{
  "path": "/path/to/dropbox/file"
}
```

### Upload to RedCircle
```http
POST /api/redcircle
Content-Type: application/json

{
  "filePath": "/path/to/dropbox/audio.wav",
  "title": "Episode Title",
  "description": "Episode Description",
  "transcriptionLink": "https://example.com/transcript.vtt"
}
```

## Temporary File Management

The application includes robust temporary file management with automatic cleanup:

- **Automatic Cleanup**: All temporary files are automatically deleted after use, even if errors occur
- **Safe Deletion**: Uses safe deletion methods that handle missing files gracefully
- **Utility Functions**: `TempFileManager` utility provides consistent file management across the application
- **Cleanup Script**: Run `npm run cleanup` to remove any existing temporary files

### Temporary File Locations
- `./temp/` - General temporary files
- `./tmp/` - RedCircle upload temporary files
- System temp directory - YouTube thumbnail temporary files

## Features

- ✅ Automatic temporary file cleanup
- ✅ Error handling with proper cleanup
- ✅ Dropbox to YouTube video transfer
- ✅ Dropbox file sharing/unsharing
- ✅ RedCircle podcast episode upload with audio compression
- ✅ YouTube thumbnail support
- ✅ Comprehensive logging
- ✅ FFmpeg audio compression for large files

## Project Structure

```
├── controllers/
│   ├── redcircleController.js    # RedCircle upload handling
│   └── transferController.js     # Dropbox/YouTube transfer handling
├── services/
│   ├── dropboxService.js         # Dropbox API integration
│   ├── redcircleService.js       # RedCircle automation
│   └── youtubeService.js         # YouTube API integration
├── utils/
│   ├── logger.js                 # Logging utility
│   └── tempFileManager.js        # Temporary file management
├── scripts/
│   └── cleanup.js                # Cleanup script
├── routes/
│   └── apiRoutes.js              # API route definitions
├── server.js                     # Main server file
└── package.json
```
