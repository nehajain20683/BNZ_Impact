// src/lib/generate-pdf.ts
// Generates real PDF buffers from HTML using puppeteer-core + chromium
// Works on Vercel serverless (uses @sparticuz/chromium-min)

async function getBrowser() {
  // On Vercel (production), use serverless chromium
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import('@sparticuz/chromium-min');
    const puppeteer = await import('puppeteer-core');
    const executablePath = await chromium.default.executablePath(
      `https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar`
    );
    return puppeteer.default.launch({
      args:           chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath,
      headless:       true,
    });
  }

  // Local dev: use system Chrome/Chromium
  const puppeteer = await import('puppeteer-core');
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const fs = await import('fs');
  const executablePath = possiblePaths.find(p => fs.existsSync(p)) || '';

  if (!executablePath) {
    throw new Error('Chrome not found locally. On Vercel this uses @sparticuz/chromium-min automatically.');
  }

  return puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function htmlToPdfBuffer(html: string, landscape = false): Promise<Buffer> {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format:    landscape ? 'A4' : 'A4',
      landscape,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) await browser.close();
  }
}
