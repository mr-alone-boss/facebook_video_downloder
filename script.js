const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/extract-video', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.includes('facebook.com/ads/library')) {
        return res.json({ success: false, error: 'Invalid URL' });
    }
    
    let browser;
    try {
        console.log('Launching browser...');
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        let videoUrl = null;
        
        // Intercept network requests
        page.on('response', async (response) => {
            try {
                const responseUrl = response.url();
                const contentType = response.headers()['content-type'] || '';
                
                if ((contentType.includes('video') || responseUrl.includes('.mp4')) && !videoUrl) {
                    videoUrl = responseUrl;
                    console.log('Video found:', videoUrl);
                }
            } catch (e) {
                // Ignore
            }
        });
        
        console.log('Navigating to URL...');
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        // FIXED: Use setTimeout instead of waitForTimeout
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try to play
        try {
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) video.play();
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
            console.log('Play attempted');
        }
        
        await browser.close();
        
        if (videoUrl) {
            res.json({ success: true, videoUrl: videoUrl });
        } else {
            res.json({ success: false, error: 'No video found' });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
