const puppeteer = require("puppeteer");
require("dotenv").config();

const uploadEpisode = async ({ filePath, title, description, transcriptionLink }) => {
    const browser = await puppeteer.launch({ headless: false }); // Show browser for debugging
    const page = await browser.newPage();

    await page.goto('https://app.redcircle.com/sign-in?goto=%2F&', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', 'builttogrowpodcast@gmail.com');
    await page.type('input[name="password"]', 'Superman09!!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    if (await page.$('.main-content') !== null) {
        console.log('Logged in successfully!');

        await page.waitForSelector('div[title="Built To Grow Fitness Business"]');
        await page.click('div[title="Built To Grow Fitness Business"]');

        // await page.waitForNavigation({ waitUntil: "networkidle2" });

        // Get the current URL
        const currentUrl = page.url();

        // Append "/ep/create" to the URL
        const createEpisodeUrl = `${currentUrl.replace(/\/$/, '')}/ep/create`;

        // Navigate to the new URL
        await page.goto(createEpisodeUrl, { waitUntil: 'networkidle2' });

        await page.waitForSelector('iframe');

        await page.keyboard.press('Escape');

        await page.type('#title', title);
        await page.evaluate((html) => {
            const quill = document.querySelector('.ql-editor');
            quill.innerHTML = html;
        }, description);

        await page.$('input[type="file"][accept*="audio"]').then(input => input.uploadFile(filePath));

        await page.evaluate(() => {
          const strongs = Array.from(document.querySelectorAll('span.ant-checkbox-label'));
          const dropDown = strongs.find(str => str.textContent.trim() === 'Transcribe Episode');
          if (dropDown) {
            dropDown.click();          // click
          }
        });
        
        await page.evaluate(() => {
          const strongs = Array.from(document.querySelectorAll('strong'));
          const dropDown = strongs.find(str => str.textContent.trim() === 'More Options');
          if (dropDown) {
            dropDown.click();          // click
          }
        });

        await page.type('#transcriptInfo_url', transcriptionLink);
        await page.click('#transcriptInfo_type'); 
        await page.waitForSelector('div[title="VTT"]');

        await page.click('div[title="VTT"]');

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.ant-btn-primary'));
          const publishBtn = buttons.find(btn => btn.textContent.trim() === 'Save As Draft');
          if (publishBtn) {
            publishBtn.disabled = false; // force-enable
            publishBtn.click();          // click
          }
        });

        while (page.url().endsWith('/create')) {
            console.log('On /create yet. Waiting 1 minute...');
            await sleep(1000); // wait 60 seconds
        }

        await page.goto("https://app.redcircle.com/shows", { waitUntil: 'networkidle2' });

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('span.m-lxs'));
          const builtBtn = buttons.find(btn => btn.textContent.trim() === 'Built');
          if (builtBtn) {
            builtBtn.click();          // click
            
          }
        });

        await page.waitForSelector('a[data-testid="tooltip-wrapped-text"]');
        await page.click('a[data-testid="tooltip-wrapped-text"]');


    } else {
        console.log('Login failed.');
    }

    await browser.close();
  }

  module.exports = { uploadEpisode };