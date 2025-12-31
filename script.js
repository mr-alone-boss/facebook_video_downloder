const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ 
        status: 'Server is running', 
        message: 'Facebook Ad Video Downloader API',
        endpoint: '/extract-video (POST)'
    });
});

app.post('/extract-video', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.includes('facebook.com/ads/library')) {
        return res.json({ success: false, error: 'Invalid URL' });
    }
    
    let browser;
    try {
        console.log('Launching browser...');
        
        // UPDATED: Render-compatible Puppeteer launch config
        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        let videoUrl = null;
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        page.on('response', async (response) => {
            const responseUrl = response.url();
            const contentType = response.headers()['content-type'] || '';
            
            if ((contentType.includes('video') || responseUrl.includes('.mp4')) 
                && !videoUrl) {
                videoUrl = responseUrl;
                console.log('Video found:', videoUrl);
            }
        });
        
        console.log('Navigating to URL...');
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) video.play();
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
            console.log('No video element found or already playing');
        }
        
        await browser.close();
        
        if (videoUrl) {
            res.json({ success: true, videoUrl: videoUrl });
        } else {
            res.json({ success: false, error: 'No video found in this ad' });
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (browser) await browser.close();
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
