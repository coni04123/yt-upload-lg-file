const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const ffmpeg = require('fluent-ffmpeg');
const { safeDelete } = require("../utils/tempFileManager");

const MAX_SIZE_MB = 250;

require("dotenv").config();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFileSizeMB(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
}

function compressAudioIfNeeded(audioPath) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Checking file size for: ${audioPath}`);
    const originalSize = getFileSizeMB(audioPath);
    console.log(`📊 Original file size: ${originalSize.toFixed(2)} MB`);
    
    if (originalSize <= MAX_SIZE_MB) {
      console.log(`✅ File is under ${MAX_SIZE_MB}MB limit. No compression needed.`);
      return resolve(audioPath);
    }

    console.log(`⚠️  File is ${originalSize.toFixed(2)}MB, exceeds ${MAX_SIZE_MB}MB limit. Starting compression...`);
    
    // Check if ffmpeg is available
    try {
      const ffmpegPath = require('child_process').execSync('where ffmpeg', { encoding: 'utf8' }).trim();
      console.log(`🎬 FFmpeg found at: ${ffmpegPath}`);
    } catch (error) {
      console.warn("❌ FFmpeg not found in PATH. File compression will be skipped.");
      console.warn(`📊 Original file size: ${originalSize.toFixed(2)} MB`);
      console.warn(`📏 Maximum allowed size: ${MAX_SIZE_MB} MB`);
      console.warn("⚠️  The file may be too large for RedCircle upload.");
      return resolve(audioPath); // Return original file without compression
    }

    const ext = path.extname(audioPath);
    const outputPath = audioPath.replace(ext, `.compressed.mp3`);
    console.log(`🎵 Starting audio compression...`);
    console.log(`📁 Output path: ${outputPath}`);

    ffmpeg(audioPath)
      .audioBitrate('128k')
      .format('mp3')
      .on('start', (commandLine) => {
        console.log(`🚀 FFmpeg command started: ${commandLine}`);
      })
      .on('end', () => {
        const compressedSize = getFileSizeMB(outputPath);
        console.log(`✅ Compression completed!`);
        console.log(`📊 Original: ${originalSize.toFixed(2)}MB, Compressed: ${compressedSize.toFixed(2)}MB`);
        console.log(`📉 Size reduction: ${((originalSize - compressedSize) / originalSize * 100).toFixed(1)}%`);
        
        if (compressedSize > MAX_SIZE_MB) {
          console.log(`❌ Compressed file is still larger than ${MAX_SIZE_MB}MB!`);
          fs.unlinkSync(outputPath);
          return reject(new Error('Compressed file is still larger than 250MB!'));
        }
        console.log(`✅ Compressed file is within size limit.`);
        return resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg compression error:', err.message);
        return reject(new Error('Compression failed: ' + err.message));
      })
      .save(outputPath);
  });
}

const uploadEpisode = async ({ filePath, title, description, transcriptionLink, schedulingTime }) => {
  console.log(`\n🎙️  Starting RedCircle episode upload...`);
  console.log(`📁 File path: ${filePath}`);
  console.log(`📝 Title: ${title}`);
  console.log(`🔗 Transcription link: ${transcriptionLink}`);
  
  let browser = null;
  try {
    console.log(`🌐 Launching browser...`);
    browser = await puppeteer.launch({ headless: false });
    console.log(`✅ Browser launched successfully`);
    
    const page = await browser.newPage();
    console.log(`📄 New page created`);
    
    let episodeUrl = null;

    // Set global timeouts to 120 seconds
    page.setDefaultTimeout(600000);
    page.setDefaultNavigationTimeout(600000);
    console.log(`⏱️  Timeouts set to 600 seconds`);

    console.log(`🌐 Navigating to RedCircle login page...`);
    await page.goto('https://app.redcircle.com/sign-in?goto=%2F&', { waitUntil: 'networkidle2' });
    console.log(`✅ Login page loaded`);

    console.log(`🔐 Logging in...`);
    await page.type('input[name="email"]', 'builttogrowpodcast@gmail.com');
    console.log(`📧 Email entered`);
    await page.type('input[name="password"]', 'Superman09!!');
    console.log(`🔑 Password entered`);
    await page.click('button[type="submit"]');
    console.log(`🖱️  Login button clicked`);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log(`✅ Login navigation completed`);

    if (await page.$('.main-content') !== null) {
        console.log(`✅ Login successful!`);

        console.log(`🎯 Selecting podcast show...`);
        await page.waitForSelector('div[title="Built To Grow Fitness Business"]');
        await page.click('div[title="Built To Grow Fitness Business"]');
        console.log(`✅ Podcast show selected`);

        // Get the current URL
        const currentUrl = page.url();
        console.log(`📄 Current URL: ${currentUrl}`);

        // Append "/ep/create" to the URL
        const createEpisodeUrl = `${currentUrl.replace(/\/$/, '')}/ep/create`;
        console.log(`🌐 Navigating to episode creation: ${createEpisodeUrl}`);

        // Navigate to the new URL
        await page.goto(createEpisodeUrl, { waitUntil: 'networkidle2' });
        console.log(`✅ Episode creation page loaded`);

        console.log(`⏳ Waiting for iframe to load...`);
        await page.waitForSelector('iframe');
        console.log(`✅ Iframe found`);

        console.log(`⌨️  Pressing Escape keys to dismiss modals...`);
        await sleep(1000);
        await page.keyboard.press('Escape');
        console.log(`🔄 Escape 1 pressed`);
        await sleep(1000);
        await page.keyboard.press('Escape');
        console.log(`🔄 Escape 2 pressed`);
        await sleep(1000);
        await page.keyboard.press('Escape');
        console.log(`🔄 Escape 3 pressed`);
        await sleep(1000);
        await page.keyboard.press('Escape');
        console.log(`🔄 Escape 4 pressed`);
        await sleep(1000);
        await page.keyboard.press('Escape');
        console.log(`🔄 Escape 5 pressed`);
        await sleep(1000);
        await page.keyboard.press('Escape');
        console.log(`🔄 Escape 6 pressed`);

        console.log(`📝 Filling episode title...`);
        await page.type('#title', title);
        console.log(`✅ Title filled: ${title}`);

        console.log(`📝 Filling episode description...`);
        await page.evaluate((html) => {
            const quill = document.querySelector('.ql-editor');
            quill.innerHTML = html;
        }, description);
        console.log(`✅ Description filled`);

        console.log(`📁 Processing audio file: ${filePath}`);
        const compressedFilePath = await compressAudioIfNeeded(filePath);
        console.log(`✅ Audio file processed: ${compressedFilePath}`);

        console.log(`📤 Uploading audio file...`);
        await page.$('input[type="file"][accept*="audio"]').then(input => input.uploadFile(compressedFilePath));
        console.log(`✅ Audio file uploaded`);

        console.log(`🕒 Scheduling episode for: ${schedulingTime}`);
        await page.waitForSelector('[data-type="month"]');
        await page.click('[data-type="month"]');  // Focus on month
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.type(schedulingTime);
        console.log(`✅ Episode scheduled for: ${schedulingTime}`);

        console.log(`🎙️  Enabling transcription...`);
        await page.evaluate(() => {
          const strongs = Array.from(document.querySelectorAll('span.ant-checkbox-label'));
          const dropDown = strongs.find(str => str.textContent.trim() === 'Transcribe Episode');
          if (dropDown) {
            dropDown.click();
          }
        });
        console.log(`✅ Transcription enabled`);

        console.log(`⚙️  Opening more options...`);
        await page.evaluate(() => {
          const strongs = Array.from(document.querySelectorAll('strong'));
          const dropDown = strongs.find(str => str.textContent.trim() === 'More Options');
          if (dropDown) {
            dropDown.click();
          }
        });
        console.log(`✅ More options opened`);

        console.log(`🔗 Setting transcription URL...`);
        await page.type('#transcriptInfo_url', transcriptionLink);
        console.log(`✅ Transcription URL set: ${transcriptionLink}`);

        console.log(`📋 Selecting VTT format...`);
        await page.click('#transcriptInfo_type'); 
        await page.waitForSelector('div[title="VTT"]');
        await page.click('div[title="VTT"]');
        console.log(`✅ VTT format selected`);

        console.log(`💾 Saving as draft...`);
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('span'));
          const publishBtn = buttons.find(btn => btn.textContent.trim() === 'Save as Draft');
          if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.click();
          }
        });
        console.log(`✅ Save as draft clicked`);

        console.log(`⏳ Waiting for episode creation to complete...`);
        while (page.url().endsWith('/create')) {
            await sleep(1000);
        }
        episodeUrl = page.url();
        console.log(`✅ Episode created successfully!`);
        console.log(`🔗 Episode URL: ${episodeUrl}`);

        console.log(`🌐 Navigating to shows page...`);
        await page.goto("https://app.redcircle.com/shows", { waitUntil: 'networkidle2' });
        console.log(`✅ Shows page loaded`);

        console.log(`🎯 Selecting Built show...`);
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('span.m-lxs'));
          const builtBtn = buttons.find(btn => btn.textContent.trim() === 'Built');
          if (builtBtn) {
            builtBtn.click();
          }
        });
        console.log(`✅ Built show selected`);

        console.log(`🔗 Clicking episode link...`);
        await page.waitForSelector('a[data-testid="tooltip-wrapped-text"]');
        await page.click('a[data-testid="tooltip-wrapped-text"]');
        console.log(`✅ Episode link clicked`);

        console.log(`🧹 Cleaning up compressed file...`);
        safeDelete(compressedFilePath); 
        console.log(`✅ Compressed file cleaned up`);

    } else {
        console.log(`❌ Login failed.`);
    }

    console.log(`🎉 Episode upload process completed successfully!`);
    return { success: true, message: episodeUrl };
  } catch (error) {
    console.log(`❌ Error during episode upload: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      console.log(`🌐 Closing browser...`);
      await browser.close();
      console.log(`✅ Browser closed`);
    }
  }
}

module.exports = { uploadEpisode };
