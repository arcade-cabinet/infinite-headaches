const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Ensure correct usage
if (process.argv.length < 4) {
    console.log("Usage: node scripts/dev/convert-exr.js <input.exr> <output.env>");
    process.exit(1);
}

const inputPath = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);

if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found at ${inputPath}`);
    process.exit(1);
}

(async () => {
    console.log(`Launching headless browser to convert ${path.basename(inputPath)}...`);
    
    // 1. Launch Headless Browser
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        protocolTimeout: 300000 // 5 minutes timeout for heavy processing
    });
    const page = await browser.newPage();

    // Pipe browser logs to node console
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    // 2. Inject Babylon.js library logic
    // We load Babylon.js from CDN for simplicity in this script context
    await page.addScriptTag({ url: 'https://cdn.babylonjs.com/babylon.js' });
    await page.addScriptTag({ url: 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js' });

    await page.evaluate(() => {
        // Basic HTML scaffolding for the engine
        const canvas = document.createElement('canvas');
        canvas.id = "renderCanvas";
        document.body.appendChild(canvas);
        
        // Null engine to avoid WebGL context requirement if possible, 
        // BUT EnvironmentTextureTools needs a real engine usually.
        // We try to create a real engine. If WebGL is missing in headless, this might fail without software rasterizer.
        try {
            window.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
            window.scene = new BABYLON.Scene(window.engine);
        } catch (e) {
            window.error = e.message;
        }
    });

    // Check for engine creation errors
    const engineError = await page.evaluate(() => window.error);
    if (engineError) {
        console.error("Failed to create Babylon Engine in headless mode (likely no WebGL):", engineError);
        console.error("Note: This script requires a customized Puppeteer env with WebGL support or a real browser.");
        await browser.close();
        process.exit(1);
    }

    // 3. Read local EXR file as Base64
    console.log("Reading EXR file...");
    const exrBuffer = fs.readFileSync(inputPath);
    const exrBase64 = exrBuffer.toString('base64');
    const dataUrl = `data:image/exr;base64,${exrBase64}`; 

    console.log("Processing Texture (this may take a moment)...");

    // 4. Run Conversion Logic inside the browser
    try {
        const envBase64 = await page.evaluate(async (url) => {
            return new Promise((resolve, reject) => {
                console.log("Starting conversion in browser...");
                
                if (!window.BABYLON) {
                    reject("BABYLON global not found");
                    return;
                }

                // Check for HDRCubeTexture support
                if (!window.BABYLON.HDRCubeTexture) {
                    reject("BABYLON.HDRCubeTexture not found - loaders might be missing");
                    return;
                }

                try {
                    // Load the EXR
                    console.log("Creating HDRCubeTexture...");
                    const texture = new window.BABYLON.HDRCubeTexture(url, window.scene, 512, false, true, false, true);
                    
                    if (!texture) {
                        reject("Failed to create texture object");
                        return;
                    }
                    
                    console.log("Texture created. Checking observables...");
                    if (!texture.onLoadObservable) {
                        console.error("onLoadObservable is missing on texture object", texture);
                        reject("onLoadObservable is missing");
                        return;
                    }

                    // Wait for load, then convert
                    texture.onLoadObservable.add(() => {
                        console.log("Texture loaded. Starting env conversion...");
                        window.BABYLON.EnvironmentTextureTools.CreateEnvTextureAsync(texture)
                            .then((buffer) => {
                                console.log("Conversion complete. Processing buffer...");
                                // Convert ArrayBuffer back to Base64
                                const blob = new Blob([buffer]);
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            })
                            .catch((err) => reject("CreateEnvTextureAsync failed: " + err.message));
                    });

                    if (texture.onErrorObservable) {
                         texture.onErrorObservable.add((err) => {
                            console.error("Texture load error:", err);
                            reject("Texture load error");
                        });
                    }
                   
                } catch (err) {
                    reject("Exception during texture setup: " + err.message);
                }
            });
        }, dataUrl);

        // 5. Save to Disk
        const base64Data = envBase64.replace(/^data:.+;base64,/, "");
        fs.writeFileSync(outputPath, base64Data, 'base64');
        
        console.log(`Success: ${outputPath} created.`);
    } catch (e) {
        console.error("Conversion failed:", e);
    }
    
    await browser.close();
})();
