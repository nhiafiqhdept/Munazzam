import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Master standard SVG with elegant rounded squircle frame
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Deep Slate Navy to Dark Forest Emerald -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#091428" />
      <stop offset="50%" stop-color="#0c1e34" />
      <stop offset="100%" stop-color="#043927" />
    </linearGradient>

    <!-- Emerald Teal Accent Gradient -->
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Indigo Purple Accent Gradient -->
    <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a78bfa" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>

    <!-- Gold Accent Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>

    <!-- Central Glow Filter -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)" />
  <rect width="508" height="508" x="2" y="2" rx="106" fill="none" stroke="#10b981" stroke-width="2.5" stroke-opacity="0.2" />

  <!-- Subtle Ambient Geometric Shield Arc -->
  <path d="M 120 180 C 120 100, 392 100, 392 180 C 392 330, 256 410, 256 410 C 256 410, 120 330, 120 180 Z" 
        fill="none" 
        stroke="url(#emeraldGrad)" 
        stroke-width="3" 
        stroke-opacity="0.15" 
        stroke-dasharray="8 8" />

  <!-- Outer Network Connecting Rings -->
  <circle cx="256" cy="256" r="140" fill="none" stroke="#34d399" stroke-width="2.5" stroke-opacity="0.25" stroke-dasharray="4 6" />
  <circle cx="256" cy="256" r="95" fill="none" stroke="#60a5fa" stroke-width="2" stroke-opacity="0.2" />

  <!-- Dynamic Coordination Vector Pillars / Connectors -->
  <!-- Center to Top (Leadership / Hierarchy) -->
  <line x1="256" y1="256" x2="256" y2="135" stroke="url(#emeraldGrad)" stroke-width="5" stroke-linecap="round" />
  <!-- Center to Top-Right -->
  <line x1="256" y1="256" x2="360" y2="195" stroke="url(#emeraldGrad)" stroke-width="4.5" stroke-linecap="round" stroke-opacity="0.9" />
  <!-- Center to Bottom-Right -->
  <line x1="256" y1="256" x2="360" y2="315" stroke="url(#indigoGrad)" stroke-width="4.5" stroke-linecap="round" stroke-opacity="0.85" />
  <!-- Center to Bottom (Foundation) -->
  <line x1="256" y1="256" x2="256" y2="375" stroke="url(#indigoGrad)" stroke-width="5" stroke-linecap="round" />
  <!-- Center to Bottom-Left -->
  <line x1="256" y1="256" x2="152" y2="315" stroke="url(#indigoGrad)" stroke-width="4.5" stroke-linecap="round" stroke-opacity="0.85" />
  <!-- Center to Top-Left -->
  <line x1="256" y1="256" x2="152" y2="195" stroke="url(#emeraldGrad)" stroke-width="4.5" stroke-linecap="round" stroke-opacity="0.9" />

  <!-- Outer Perimeter Inter-Node Connecting Struts -->
  <path d="M 256 135 L 360 195 L 360 315 L 256 375 L 152 315 L 152 195 Z" 
        fill="none" 
        stroke="url(#emeraldGrad)" 
        stroke-width="3" 
        stroke-opacity="0.5" 
        stroke-linejoin="round" />

  <!-- Organizational Nodes (Satellites) -->
  <!-- Top Node (Crown/Direction - Gold/Emerald) -->
  <circle cx="256" cy="135" r="22" fill="#091428" stroke="url(#goldGrad)" stroke-width="4" />
  <circle cx="256" cy="135" r="10" fill="url(#goldGrad)" />
  <circle cx="256" cy="135" r="4" fill="#ffffff" />

  <!-- Top-Right Node (Operations) -->
  <circle cx="360" cy="195" r="18" fill="#091428" stroke="url(#emeraldGrad)" stroke-width="3.5" />
  <circle cx="360" cy="195" r="8" fill="url(#emeraldGrad)" />

  <!-- Bottom-Right Node (Records/Treasury) -->
  <circle cx="360" cy="315" r="18" fill="#091428" stroke="url(#indigoGrad)" stroke-width="3.5" />
  <circle cx="360" cy="315" r="8" fill="url(#indigoGrad)" />

  <!-- Bottom Node (Base/Community) -->
  <circle cx="256" cy="375" r="19" fill="#091428" stroke="url(#indigoGrad)" stroke-width="3.5" />
  <circle cx="256" cy="375" r="8.5" fill="url(#indigoGrad)" />

  <!-- Bottom-Left Node (Programs) -->
  <circle cx="152" cy="315" r="18" fill="#091428" stroke="url(#indigoGrad)" stroke-width="3.5" />
  <circle cx="152" cy="315" r="8" fill="url(#indigoGrad)" />

  <!-- Top-Left Node (Academics) -->
  <circle cx="152" cy="195" r="18" fill="#091428" stroke="url(#emeraldGrad)" stroke-width="3.5" />
  <circle cx="152" cy="195" r="8" fill="url(#emeraldGrad)" />

  <!-- Central Hub / Core Nucleus (Executive Structure) -->
  <circle cx="256" cy="256" r="46" fill="#0a192f" stroke="url(#emeraldGrad)" stroke-width="5" />
  
  <!-- Central Geometric Hexagon Diamond -->
  <polygon points="256,224 284,240 284,272 256,288 228,272 228,240" 
           fill="url(#emeraldGrad)" 
           stroke="#ffffff" 
           stroke-width="2.5" 
           stroke-linejoin="round" />

  <!-- Central Luminous Core Starlet -->
  <circle cx="256" cy="256" r="7" fill="#ffffff" />
</svg>
`;

// Maskable SVG with safe 80% inner margin for adaptive Android icons
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#091428" />
      <stop offset="50%" stop-color="#0c1e34" />
      <stop offset="100%" stop-color="#043927" />
    </linearGradient>

    <linearGradient id="emeraldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <linearGradient id="indigoGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a78bfa" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>

    <linearGradient id="goldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Square Background (no border radius for maskable) -->
  <rect width="512" height="512" fill="url(#bgGradM)" />

  <!-- Centered Scaled Content (80% Safe Zone) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <!-- Outer Network Connecting Rings -->
    <circle cx="256" cy="256" r="140" fill="none" stroke="#34d399" stroke-width="3" stroke-opacity="0.25" stroke-dasharray="4 6" />
    <circle cx="256" cy="256" r="95" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-opacity="0.2" />

    <!-- Connectors -->
    <line x1="256" y1="256" x2="256" y2="135" stroke="url(#emeraldGradM)" stroke-width="6" stroke-linecap="round" />
    <line x1="256" y1="256" x2="360" y2="195" stroke="url(#emeraldGradM)" stroke-width="5.5" stroke-linecap="round" />
    <line x1="256" y1="256" x2="360" y2="315" stroke="url(#indigoGradM)" stroke-width="5.5" stroke-linecap="round" />
    <line x1="256" y1="256" x2="256" y2="375" stroke="url(#indigoGradM)" stroke-width="6" stroke-linecap="round" />
    <line x1="256" y1="256" x2="152" y2="315" stroke="url(#indigoGradM)" stroke-width="5.5" stroke-linecap="round" />
    <line x1="256" y1="256" x2="152" y2="195" stroke="url(#emeraldGradM)" stroke-width="5.5" stroke-linecap="round" />

    <!-- Outer Structure Boundary -->
    <path d="M 256 135 L 360 195 L 360 315 L 256 375 L 152 315 L 152 195 Z" 
          fill="none" 
          stroke="url(#emeraldGradM)" 
          stroke-width="3.5" 
          stroke-opacity="0.55" 
          stroke-linejoin="round" />

    <!-- Satellites -->
    <circle cx="256" cy="135" r="24" fill="#091428" stroke="url(#goldGradM)" stroke-width="4.5" />
    <circle cx="256" cy="135" r="11" fill="url(#goldGradM)" />
    <circle cx="256" cy="135" r="4.5" fill="#ffffff" />

    <circle cx="360" cy="195" r="20" fill="#091428" stroke="url(#emeraldGradM)" stroke-width="4" />
    <circle cx="360" cy="195" r="9" fill="url(#emeraldGradM)" />

    <circle cx="360" cy="315" r="20" fill="#091428" stroke="url(#indigoGradM)" stroke-width="4" />
    <circle cx="360" cy="315" r="9" fill="url(#indigoGradM)" />

    <circle cx="256" cy="375" r="21" fill="#091428" stroke="url(#indigoGradM)" stroke-width="4" />
    <circle cx="256" cy="375" r="9.5" fill="url(#indigoGradM)" />

    <circle cx="152" cy="315" r="20" fill="#091428" stroke="url(#indigoGradM)" stroke-width="4" />
    <circle cx="152" cy="315" r="9" fill="url(#indigoGradM)" />

    <circle cx="152" cy="195" r="20" fill="#091428" stroke="url(#emeraldGradM)" stroke-width="4" />
    <circle cx="152" cy="195" r="9" fill="url(#emeraldGradM)" />

    <!-- Central Hub -->
    <circle cx="256" cy="256" r="48" fill="#0a192f" stroke="url(#emeraldGradM)" stroke-width="5.5" />
    <polygon points="256,222 286,239 286,273 256,290 226,273 226,239" 
             fill="url(#emeraldGradM)" 
             stroke="#ffffff" 
             stroke-width="3" 
             stroke-linejoin="round" />
    <circle cx="256" cy="256" r="8" fill="#ffffff" />
  </g>
</svg>
`;

async function buildAllIcons() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg.trim());
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardSvg.trim());

  const stdBuffer = Buffer.from(standardSvg);
  const maskBuffer = Buffer.from(maskableSvg);

  const standardSizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'icon-48x48.png', size: 48 },
    { name: 'icon-72x72.png', size: 72 },
    { name: 'icon-96x96.png', size: 96 },
    { name: 'icon-128x128.png', size: 128 },
    { name: 'icon-144x144.png', size: 144 },
    { name: 'icon-152x152.png', size: 152 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-384x384.png', size: 384 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  for (const item of standardSizes) {
    await sharp(stdBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(publicDir, item.name));
    console.log(`Created ${item.name} (${item.size}x${item.size})`);
  }

  // Generate favicon.ico from 32x32
  await sharp(stdBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // Maskable icons
  const maskableSizes = [
    { name: 'pwa-maskable-192x192.png', size: 192 },
    { name: 'pwa-maskable-512x512.png', size: 512 },
    { name: 'maskable-icon-512x512.png', size: 512 },
  ];

  for (const item of maskableSizes) {
    await sharp(maskBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(publicDir, item.name));
    console.log(`Created Maskable ${item.name} (${item.size}x${item.size})`);
  }

  console.log('All Munazzam PWA icons created successfully!');
}

buildAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
