const ffbinaries = require('ffbinaries');
const path = require('path');
const fs = require('fs');

const platforms = ['mac-64', 'windows-64', 'linux-64'];
const destBase = path.join(__dirname, '..', 'bin');

async function download() {
  for (const platform of platforms) {
    const platformFolder = platform.includes('mac') ? 'darwin' : (platform.includes('windows') ? 'win32' : 'linux');
    const dest = path.join(destBase, platformFolder);
    
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    console.log(`Downloading binaries for ${platform}...`);
    
    ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], { destination: dest, platform: platform }, (err, data) => {
      if (err) {
        console.error(`Error downloading for ${platform}:`, err);
      } else {
        console.log(`Successfully downloaded for ${platform}.`);
      }
    });
  }
}

download();
