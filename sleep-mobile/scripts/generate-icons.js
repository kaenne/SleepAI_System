/**
 * Icon generator for SleepAI app.
 * Generates all required PNG assets from SVG templates.
 *
 * Usage:
 *   npm run generate:icons
 *   (or: node scripts/generate-icons.js)
 *
 * Requires: @resvg/resvg-js  (installed as devDependency)
 */

const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'images');

// ── Helpers ──────────────────────────────────────────────────────────────────

function render(svgString, widthPx) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: widthPx },
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

function save(filename, buffer) {
  const dest = path.join(OUT, filename);
  fs.writeFileSync(dest, buffer);
  console.log(`✅  ${filename}  (${buffer.length} bytes)`);
}

// ── SVG Design ───────────────────────────────────────────────────────────────
//
//  Color palette:
//    Background  #0d0428 → #1b0d45 (deep space gradient)
//    Moon        #F4D070  (warm golden)
//    Wave / line #A78BFA  (soft purple, matches app tint)
//    Stars       #FFFFFF  varying opacity

/**
 * Main icon SVG — square 1024×1024, dark background, crescent moon, EEG wave.
 */
function mainIconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="bg" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#1e0e50"/>
      <stop offset="100%" stop-color="#080318"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F4D070" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#F4D070" stop-opacity="0"/>
    </radialGradient>
    <!-- Crescent mask: white=visible, black=hidden -->
    <mask id="crescent" maskUnits="userSpaceOnUse">
      <rect width="1024" height="1024" fill="black"/>
      <circle cx="435" cy="390" r="228" fill="white"/>
      <circle cx="552" cy="328" r="198" fill="black"/>
    </mask>
    <filter id="starGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>

  <!-- Moon ambient glow -->
  <circle cx="435" cy="390" r="290" fill="url(#glow)"/>

  <!-- Crescent moon -->
  <circle cx="435" cy="390" r="228" fill="#F4D070" mask="url(#crescent)"/>

  <!-- Moon highlight rim -->
  <circle cx="435" cy="390" r="228" fill="none" stroke="#FDE88A" stroke-width="4" mask="url(#crescent)" opacity="0.5"/>

  <!-- ── Stars ── -->
  <!-- 4-pointed sparkle (top-right) -->
  <path d="M790,148 L795,163 L810,168 L795,173 L790,188 L785,173 L770,168 L785,163 Z"
        fill="white" opacity="0.95" filter="url(#starGlow)"/>

  <!-- Small sparkle (mid-right) -->
  <path d="M656,238 L659,247 L668,250 L659,253 L656,262 L653,253 L644,250 L653,247 Z"
        fill="white" opacity="0.75" filter="url(#starGlow)"/>

  <!-- Dot stars -->
  <circle cx="718" cy="185" r="5"   fill="white" opacity="0.80"/>
  <circle cx="855" cy="244" r="4"   fill="white" opacity="0.70"/>
  <circle cx="828" cy="132" r="3"   fill="white" opacity="0.65"/>
  <circle cx="164" cy="226" r="4"   fill="white" opacity="0.70"/>
  <circle cx="136" cy="378" r="3"   fill="white" opacity="0.50"/>
  <circle cx="872" cy="408" r="3.5" fill="white" opacity="0.58"/>
  <circle cx="660" cy="138" r="2.5" fill="white" opacity="0.55"/>
  <circle cx="695" cy="588" r="3"   fill="white" opacity="0.38"/>
  <circle cx="880" cy="620" r="2.5" fill="white" opacity="0.32"/>
  <circle cx="110" cy="560" r="2"   fill="white" opacity="0.28"/>

  <!-- ── EEG / brain-wave line (AI theme) ── -->
  <polyline
    points="68,768 130,768 168,704 208,832 248,716 286,768
             336,768 374,708 412,828 450,768 494,768
             532,712 570,824 608,768 652,768
             690,712 728,824 766,768 820,768
             858,702 896,834 934,768 960,768"
    fill="none" stroke="#A78BFA" stroke-width="10"
    stroke-linecap="round" stroke-linejoin="round" opacity="0.70"/>

  <!-- EEG inner highlight -->
  <polyline
    points="68,768 130,768 168,704 208,832 248,716 286,768
             336,768 374,708 412,828 450,768 494,768
             532,712 570,824 608,768 652,768
             690,712 728,824 766,768 820,768
             858,702 896,834 934,768 960,768"
    fill="none" stroke="#D4B8FF" stroke-width="4"
    stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
</svg>`;
}

/**
 * Foreground-only icon for Android adaptive icon (transparent background).
 * Content scaled to safe-zone (inner ~68% of canvas = ~696px, ~164px padding).
 */
function foregroundIconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F4D070" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#F4D070" stop-opacity="0"/>
    </radialGradient>
    <mask id="crescent" maskUnits="userSpaceOnUse">
      <rect width="1024" height="1024" fill="black"/>
      <circle cx="480" cy="440" r="200" fill="white"/>
      <circle cx="584" cy="384" r="173" fill="black"/>
    </mask>
    <filter id="sg" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Moon glow (subtle, transparent bg so softer) -->
  <circle cx="480" cy="440" r="260" fill="url(#glow)"/>

  <!-- Crescent moon (no bg — transparent) -->
  <circle cx="480" cy="440" r="200" fill="#F4D070" mask="url(#crescent)"/>
  <circle cx="480" cy="440" r="200" fill="none" stroke="#FDE88A" stroke-width="3.5"
          mask="url(#crescent)" opacity="0.45"/>

  <!-- Stars -->
  <path d="M740,195 L744,207 L756,211 L744,215 L740,227 L736,215 L724,211 L736,207 Z"
        fill="white" opacity="0.95" filter="url(#sg)"/>
  <path d="M620,285 L623,293 L631,296 L623,299 L620,307 L617,299 L609,296 L617,293 Z"
        fill="white" opacity="0.72" filter="url(#sg)"/>

  <circle cx="676" cy="230" r="4.5" fill="white" opacity="0.78"/>
  <circle cx="800" cy="280" r="3.5" fill="white" opacity="0.65"/>
  <circle cx="780" cy="182" r="3"   fill="white" opacity="0.60"/>
  <circle cx="250" cy="270" r="3.5" fill="white" opacity="0.65"/>
  <circle cx="220" cy="420" r="2.5" fill="white" opacity="0.48"/>
  <circle cx="840" cy="450" r="3"   fill="white" opacity="0.55"/>

  <!-- EEG wave (inside safe zone vertically) -->
  <polyline
    points="164,720 210,720 238,672 268,768 298,684 326,720
             364,720 392,674 422,766 452,720 488,720
             516,678 546,762 576,720 612,720
             640,676 670,764 700,720 740,720
             768,670 798,770 828,720 860,720"
    fill="none" stroke="#A78BFA" stroke-width="9"
    stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
  <polyline
    points="164,720 210,720 238,672 268,768 298,684 326,720
             364,720 392,674 422,766 452,720 488,720
             516,678 546,762 576,720 612,720
             640,676 670,764 700,720 740,720
             768,670 798,770 828,720 860,720"
    fill="none" stroke="#D4B8FF" stroke-width="3.5"
    stroke-linecap="round" stroke-linejoin="round" opacity="0.32"/>
</svg>`;
}

/**
 * Monochrome icon for Android themed/notification icons.
 * White shapes on transparent background.
 */
function monochromeIconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <mask id="crescent" maskUnits="userSpaceOnUse">
      <rect width="1024" height="1024" fill="black"/>
      <circle cx="480" cy="440" r="200" fill="white"/>
      <circle cx="584" cy="384" r="173" fill="black"/>
    </mask>
  </defs>

  <!-- Crescent (white) -->
  <circle cx="480" cy="440" r="200" fill="white" mask="url(#crescent)"/>

  <!-- Stars -->
  <path d="M740,195 L744,207 L756,211 L744,215 L740,227 L736,215 L724,211 L736,207 Z"
        fill="white" opacity="0.90"/>
  <circle cx="676" cy="230" r="4.5" fill="white" opacity="0.75"/>
  <circle cx="800" cy="280" r="3.5" fill="white" opacity="0.60"/>
  <circle cx="250" cy="270" r="3.5" fill="white" opacity="0.60"/>
  <circle cx="840" cy="450" r="3"   fill="white" opacity="0.50"/>

  <!-- EEG wave -->
  <polyline
    points="164,720 210,720 238,672 268,768 298,684 326,720
             364,720 392,674 422,766 452,720 488,720
             516,678 546,762 576,720 612,720
             640,676 670,764 700,720 740,720
             768,670 798,770 828,720 860,720"
    fill="none" stroke="white" stroke-width="9"
    stroke-linecap="round" stroke-linejoin="round" opacity="0.80"/>
</svg>`;
}

/**
 * Solid background for Android adaptive icon.
 */
function backgroundSvg(color = '#14083a') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${color}"/>
</svg>`;
}

/**
 * Splash icon — centred on transparent, slightly smaller.
 */
function splashIconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F4D070" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#F4D070" stop-opacity="0"/>
    </radialGradient>
    <mask id="crescent" maskUnits="userSpaceOnUse">
      <rect width="512" height="512" fill="black"/>
      <circle cx="215" cy="195" r="114" fill="white"/>
      <circle cx="276" cy="164" r="99" fill="black"/>
    </mask>
  </defs>

  <!-- Moon glow -->
  <circle cx="215" cy="195" r="148" fill="url(#glow)"/>

  <!-- Crescent -->
  <circle cx="215" cy="195" r="114" fill="#F4D070" mask="url(#crescent)"/>
  <circle cx="215" cy="195" r="114" fill="none" stroke="#FDE88A" stroke-width="2.5"
          mask="url(#crescent)" opacity="0.45"/>

  <!-- Stars -->
  <path d="M370,74 L373,83 L382,86 L373,89 L370,98 L367,89 L358,86 L367,83 Z"
        fill="white" opacity="0.92"/>
  <circle cx="338" cy="114" r="2.5" fill="white" opacity="0.75"/>
  <circle cx="400" cy="140" r="2"   fill="white" opacity="0.62"/>
  <circle cx="82"  cy="134" r="2"   fill="white" opacity="0.60"/>
  <circle cx="68"  cy="210" r="1.5" fill="white" opacity="0.45"/>

  <!-- EEG wave -->
  <polyline
    points="34,384 58,384 72,352 88,416 102,358 116,384
             134,384 148,354 162,414 176,384 194,384
             208,356 222,412 236,384 254,384
             268,356 282,412 296,384 316,384
             330,352 344,416 358,384 380,384"
    fill="none" stroke="#A78BFA" stroke-width="4.5"
    stroke-linecap="round" stroke-linejoin="round" opacity="0.70"/>
</svg>`;
}

/**
 * Favicon — simplified (just moon + one star).
 */
function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <radialGradient id="bg" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#1e0e50"/>
      <stop offset="100%" stop-color="#080318"/>
    </radialGradient>
    <mask id="crescent" maskUnits="userSpaceOnUse">
      <rect width="48" height="48" fill="black"/>
      <circle cx="20" cy="22" r="12" fill="white"/>
      <circle cx="26" cy="18" r="10.4" fill="black"/>
    </mask>
  </defs>
  <rect width="48" height="48" rx="10" fill="url(#bg)"/>
  <circle cx="20" cy="22" r="12" fill="#F4D070" mask="url(#crescent)"/>
  <circle cx="36" cy="10" r="2" fill="white" opacity="0.90"/>
  <circle cx="40" cy="18" r="1.5" fill="white" opacity="0.72"/>
</svg>`;
}

// ── Generate all icons ────────────────────────────────────────────────────────

console.log('\n🌙  SleepAI Icon Generator\n');

try {
  save('icon.png',                     render(mainIconSvg(),        1024));
  save('android-icon-foreground.png',  render(foregroundIconSvg(),  1024));
  save('android-icon-background.png',  render(backgroundSvg(),      1024));
  save('android-icon-monochrome.png',  render(monochromeIconSvg(),  1024));
  save('splash-icon.png',              render(splashIconSvg(),        512));
  save('favicon.png',                  render(faviconSvg(),            48));

  console.log('\n✨  Done! Rebuild the app to see the new icons.\n');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error('\n❌  Missing dependency. Run first:\n');
    console.error('    npm install --save-dev @resvg/resvg-js\n');
  } else {
    throw err;
  }
}
