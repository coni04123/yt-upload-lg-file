const puppeteer = require("puppeteer");
require("dotenv").config();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const uploadEpisode = async ({ filePath, title, description, transcriptionLink }) => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    let episodeUrl = null;

    // Set global timeouts to 120 seconds
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    await page.goto('https://app.redcircle.com/sign-in?goto=%2F&', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'builttogrowpodcast@gmail.com');
    await page.type('input[name="password"]', 'Superman09!!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    if (await page.$('.main-content') !== null) {
        console.log('Logged in successfully!');

        await page.waitForSelector('div[title="Built To Grow Fitness Business"]');
        await page.click('div[title="Built To Grow Fitness Business"]');

        // Get the current URL
        const currentUrl = page.url();

        // Append "/ep/create" to the URL
        const createEpisodeUrl = `${currentUrl.replace(/\/$/, '')}/ep/create`;

        // Navigate to the new URL
        await page.goto(createEpisodeUrl, { waitUntil: 'networkidle2' });

        await page.waitForSelector('iframe');

        while (page.$('iframe') !== null) {
            await sleep(1000); // wait 1 second
            await page.keyboard.press('Escape');
        }

        await page.type('#title', title);
        await page.evaluate((html) => {
            const quill = document.querySelector('.ql-editor');
            quill.innerHTML = html;
        }, description);

        console.log(filePath)

        await page.$('input[type="file"][accept*="audio"]').then(input => input.uploadFile(filePath));

        await page.evaluate(() => {
          const strongs = Array.from(document.querySelectorAll('span.ant-checkbox-label'));
          const dropDown = strongs.find(str => str.textContent.trim() === 'Transcribe Episode');
          if (dropDown) {
            dropDown.click();
          }
        });

        await page.evaluate(() => {
          const strongs = Array.from(document.querySelectorAll('strong'));
          const dropDown = strongs.find(str => str.textContent.trim() === 'More Options');
          if (dropDown) {
            dropDown.click();
          }
        });

        await page.type('#transcriptInfo_url', transcriptionLink);
        await page.click('#transcriptInfo_type'); 
        await page.waitForSelector('div[title="VTT"]');

        await page.click('div[title="VTT"]');

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('span'));
          const publishBtn = buttons.find(btn => btn.textContent.trim() === 'Save as Draft');
          if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.click();
          }
        });

        while (page.url().endsWith('/create')) {
            await sleep(1000); // wait 60 seconds
        }
        episodeUrl = page.url();

        await page.goto("https://app.redcircle.com/shows", { waitUntil: 'networkidle2' });

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('span.m-lxs'));
          const builtBtn = buttons.find(btn => btn.textContent.trim() === 'Built');
          if (builtBtn) {
            builtBtn.click();
          }
        });

        await page.waitForSelector('a[data-testid="tooltip-wrapped-text"]');
        await page.click('a[data-testid="tooltip-wrapped-text"]');

    } else {
        console.log('Login failed.');
    }

    await browser.close();
    return { success: true, message: episodeUrl };
  } catch (error) {
    console.log(error)
    return { success: false, error: error.message };
  }
}

module.exports = { uploadEpisode };
