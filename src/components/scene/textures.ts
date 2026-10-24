import * as THREE from 'three';

/**
 * Procedural texture generators for 3D Kirana grocery items.
 * Uses HTML5 2D canvas with SRGBColorSpace and high anisotropy.
 */

export function createSaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Background gradient: clean white with soft warm ambient tint
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.5, '#F8FAF9');
  grad.addColorStop(1, '#ECEFEF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Top header band (Mint Green #BBF1D2 + Coral #FF9D9D accent line)
  ctx.fillStyle = '#BBF1D2';
  ctx.fillRect(0, 0, 1024, 220);

  ctx.fillStyle = '#FF9D9D';
  ctx.fillRect(0, 210, 1024, 16);

  // Brand Name
  ctx.fillStyle = '#191E1B';
  ctx.font = 'bold 76px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('टाटा नमक', 512, 110);

  ctx.font = '600 34px Poppins, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('IODIZED SALT', 512, 165);

  // Slogan
  ctx.font = 'italic 28px Poppins, sans-serif';
  ctx.fillStyle = '#49544E';
  ctx.fillText('देश का नमक · शुद्धता की गारंटी', 512, 280);

  // Middle graphic: Salt crystals graphic
  ctx.fillStyle = '#BBF1D2';
  ctx.beginPath();
  ctx.arc(512, 490, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FF9D9D';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#191E1B';
  ctx.font = 'bold 58px Poppins, sans-serif';
  ctx.fillText('1 kg', 512, 500);

  ctx.font = '500 24px Poppins, sans-serif';
  ctx.fillStyle = '#49544E';
  ctx.fillText('NET WEIGHT', 512, 535);

  // Nutrition / Quality stamp
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#191E1B';
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 640, 664, 140);
  ctx.fillRect(180, 640, 664, 140);

  ctx.fillStyle = '#191E1B';
  ctx.font = '600 24px Poppins, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('आयोडीन युक्त · VACUUM EVAPORATED', 210, 685);
  ctx.font = '400 20px Poppins, sans-serif';
  ctx.fillStyle = '#49544E';
  ctx.fillText('सुरक्षित और साफ · दैनिक आहार के लिए उत्तम', 210, 725);
  ctx.fillText('FSSAI Lic No: 10014022002652', 210, 755);

  // Green veg logo
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 4;
  ctx.strokeRect(770, 675, 46, 46);
  ctx.fillStyle = '#22C55E';
  ctx.beginPath();
  ctx.arc(793, 698, 14, 0, Math.PI * 2);
  ctx.fill();

  // Bottom seal band
  ctx.fillStyle = '#FF9D9D';
  ctx.fillRect(0, 920, 1024, 104);

  ctx.fillStyle = '#191E1B';
  ctx.font = 'bold 36px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOLPROOF VERIFIED BATCH', 512, 985);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createSugarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Background: warm translucent-feel gradient (Peach #FFC5AA to Pale Lime #EEF8CD)
  const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, '#FFF6F0');
  grad.addColorStop(0.5, '#FDFBF0');
  grad.addColorStop(1, '#FFF2EB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Sugar diamond pattern watermark
  ctx.strokeStyle = 'rgba(255, 197, 170, 0.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x < 1024; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 500, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 1024);
    ctx.lineTo(x + 500, 0);
    ctx.stroke();
  }

  // Header band in Peach #FFC5AA
  ctx.fillStyle = '#FFC5AA';
  ctx.fillRect(0, 0, 1024, 230);

  ctx.fillStyle = '#EEF8CD';
  ctx.fillRect(0, 218, 1024, 14);

  ctx.fillStyle = '#191E1B';
  ctx.font = 'bold 80px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('शुद्ध चीनी', 512, 115);

  ctx.font = '600 36px Poppins, sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('PURE REFINED SUGAR', 512, 175);

  // Central circular crest
  ctx.fillStyle = '#EEF8CD';
  ctx.beginPath();
  ctx.arc(512, 500, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFC5AA';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = '#191E1B';
  ctx.font = 'bold 74px Poppins, sans-serif';
  ctx.fillText('2 kg', 512, 510);

  ctx.font = '600 26px Poppins, sans-serif';
  ctx.fillStyle = '#49544E';
  ctx.fillText('सल्फर मुक्त · M-30 GRADE', 512, 555);

  // Bottom info strip
  ctx.fillStyle = '#FFC5AA';
  ctx.fillRect(0, 890, 1024, 134);

  ctx.fillStyle = '#191E1B';
  ctx.font = 'bold 36px Poppins, sans-serif';
  ctx.fillText('किराना विशेष पैक · 2 KILOGRAMS', 512, 965);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createScaleDisplayTexture(weightText: string = '1.000 kg'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark LCD/LED bezel
  ctx.fillStyle = '#0F1512';
  ctx.fillRect(0, 0, 512, 256);

  // Inner display screen
  ctx.fillStyle = '#16231C';
  ctx.fillRect(16, 16, 480, 224);

  // Segment grid scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let y = 16; y < 240; y += 4) {
    ctx.fillRect(16, y, 480, 1.5);
  }

  // Glowing Mint green readout (#BBF1D2)
  ctx.shadowColor = '#BBF1D2';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#BBF1D2';
  ctx.font = 'bold 88px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(weightText, 450, 130);

  // Auxiliary indicators
  ctx.shadowBlur = 4;
  ctx.font = 'bold 22px Poppins, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STABLE ●', 40, 75);
  ctx.fillText('TARE 0.000', 40, 195);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFC5AA';
  ctx.fillText('BOLPROOF READY', 450, 195);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createLedgerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Cream bahi-khata parchment paper
  ctx.fillStyle = '#FDFBEF';
  ctx.fillRect(0, 0, 1024, 1024);

  // Spine seam
  ctx.fillStyle = '#E8E0C9';
  ctx.fillRect(504, 0, 16, 1024);

  // Traditional red header margin
  ctx.strokeStyle = '#D9534F';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, 140);
  ctx.lineTo(460, 140);
  ctx.moveTo(560, 140);
  ctx.lineTo(960, 140);
  ctx.stroke();

  // Ruled horizontal lines in pale blue-grey
  ctx.strokeStyle = '#D1D9D6';
  ctx.lineWidth = 1.5;
  for (let y = 180; y < 980; y += 44) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(470, y);
    ctx.moveTo(550, y);
    ctx.lineTo(980, y);
    ctx.stroke();
  }

  // Left page header
  ctx.fillStyle = '#8B2624';
  ctx.font = 'bold 32px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('।। श्री गणेशाय नमः ।।', 256, 100);

  ctx.fillStyle = '#191E1B';
  ctx.font = '500 22px Poppins, sans-serif';
  ctx.fillText('दुकान रसीद बही (खाता)', 256, 130);

  // Handwritten entries on left page
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1A365D'; // Royal blue ink
  ctx.font = '500 24px Poppins, sans-serif';
  ctx.fillText('१. चीनी (शुद्ध) — २ किलो', 60, 220);
  ctx.fillText('   मूल्य: ₹८०/- (Clear)', 80, 264);

  // Highlighted unclear item in Coral
  ctx.fillStyle = '#B91C1C';
  ctx.font = 'bold 24px Poppins, sans-serif';
  ctx.fillText('२. नमक — मात्रा ? (अस्पष्ट)', 60, 352);

  ctx.fillStyle = '#FF9D9D';
  ctx.fillRect(60, 362, 380, 8);

  ctx.fillStyle = '#49544E';
  ctx.font = '400 20px Poppins, sans-serif';
  ctx.fillText('   BOLPROOF प्रश्न: कितना चाहिए?', 80, 396);
  ctx.fillText('   विकल्प: 500g / 1kg / 2kg', 80, 440);

  // Right page header
  ctx.fillStyle = '#191E1B';
  ctx.font = 'bold 28px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ऑर्डर सत्यापन पर्ची', 760, 100);

  ctx.font = '20px Poppins, sans-serif';
  ctx.fillStyle = '#49544E';
  ctx.fillText('VOICE ORDER DRAFT #2841', 760, 130);

  // Right page confirmed state
  ctx.textAlign = 'left';
  ctx.fillStyle = '#065F46'; // Forest green
  ctx.font = '600 24px Poppins, sans-serif';
  ctx.fillText('✓ चीनी: २ कि.ग्रा.', 580, 220);
  ctx.fillText('✓ नमक: १ कि.ग्रा. (पुष्ट)', 580, 264);

  // Mint confirmation stamp
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 4;
  ctx.strokeRect(620, 340, 280, 100);
  ctx.fillStyle = '#BBF1D2';
  ctx.fillRect(622, 342, 276, 96);

  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 28px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('सत्यापित (VERIFIED)', 760, 385);
  ctx.font = '18px Poppins, sans-serif';
  ctx.fillText('NO GUESSWORK', 760, 415);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
