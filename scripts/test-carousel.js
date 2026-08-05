/**
 * Test: carousel slide widths must equal the carousel container width,
 * regardless of image load state. This reproduces the "photo seeps into
 * the next slide" bug when slide[0] (eager-loaded) is wider than the
 * carousel container because slides only set min-width: 100%.
 *
 * Usage: node scripts/test-carousel.js
 * Exit 0 = pass, exit 1 = fail.
 */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CHROME = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

if (!CHROME) {
    console.error('NO_BROWSER — install Chrome or Edge to run this test.');
    process.exit(2);
}

async function main() {
    const userData = path.join(os.tmpdir(), 'cc-carousel-test-' + Date.now());
    const port = 9333;
    const launcher = spawn(CHROME, [
        '--headless=new',
        `--remote-debugging-port=${port}`,
        '--user-data-dir=' + userData,
        '--window-size=390,844',
        'file:///d:/kuliah/undangan/index.html',
    ], { stdio: 'ignore' });

    await new Promise(r => setTimeout(r, 3000));

    const list = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
    const page = list.find(t => t.type === 'page');
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 0;
    const pend = new Map();
    const send = (method, params = {}) => new Promise((res, rej) => {
        const i = ++id;
        pend.set(i, { res, rej });
        ws.send(JSON.stringify({ id: i, method, params }));
    });
    ws.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); }
    };
    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });

    async function ev(expr) {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        return r.result && r.result.value;
    }

    // Open the invitation so the gallery is rendered & laid out
    await ev(`document.getElementById('btn-open').click()`);
    await new Promise(r => setTimeout(r, 1400));

    const m = JSON.parse(await ev(`(function(){
        const track = document.querySelector('.carousel-track');
        const car = document.querySelector('.gallery-carousel');
        const slides = [...document.querySelectorAll('.carousel-slide')];
        return JSON.stringify({
            carW: car.getBoundingClientRect().width,
            slideWs: slides.map(s => s.getBoundingClientRect().width)
        });
    })()`));

    ws.close();
    launcher.kill();
    try { fs.rmSync(userData, { recursive: true, force: true }); } catch (e) {}

    const badSlides = m.slideWs.filter(w => Math.abs(w - m.carW) > 0.5);
    if (badSlides.length > 0) {
        console.error(`FAIL: carousel=${m.carW}px but slides=[${m.slideWs.join(', ')}]px`);
        console.error(`       ${badSlides.length} slide(s) wider than the container (${badSlides[0]}px vs ${m.carW}px).`);
        process.exit(1);
    }
    console.log(`PASS: carousel=${m.carW}px, all ${m.slideWs.length} slides equal width.`);
    process.exit(0);
}

main().catch(e => { console.error('TEST_ERROR:', e); process.exit(1); });
