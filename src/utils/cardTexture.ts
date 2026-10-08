import * as THREE from 'three';
import { CardColor, CardValue } from '../types/uno';

const textureCache = new Map<string, THREE.CanvasTexture>();

interface ColorFillConfig {
  bg: string;
  dark: string;
  light: string;
  accent: string;
  rgbaLight: string;
  rgbaDark: string;
}

const COLOR_FILLS: Record<CardColor, ColorFillConfig> = {
  red: {
    bg: '#e11d48',
    dark: '#9f1239',
    light: '#fb7185',
    accent: '#fff1f2',
    rgbaLight: 'rgba(251, 113, 133, 0.65)',
    rgbaDark: 'rgba(159, 18, 57, 0.75)',
  },
  blue: {
    bg: '#2563eb',
    dark: '#1e40af',
    light: '#60a5fa',
    accent: '#eff6ff',
    rgbaLight: 'rgba(96, 165, 250, 0.65)',
    rgbaDark: 'rgba(30, 64, 175, 0.75)',
  },
  green: {
    bg: '#16a34a',
    dark: '#15803d',
    light: '#4ade80',
    accent: '#f0fdf4',
    rgbaLight: 'rgba(74, 222, 128, 0.65)',
    rgbaDark: 'rgba(21, 128, 61, 0.75)',
  },
  yellow: {
    bg: '#eab308',
    dark: '#ca8a04',
    light: '#fde047',
    accent: '#fefce8',
    rgbaLight: 'rgba(253, 224, 71, 0.70)',
    rgbaDark: 'rgba(202, 138, 4, 0.75)',
  },
  wild: {
    bg: '#7c3aed',
    dark: '#4c1d95',
    light: '#c084fc',
    accent: '#faf5ff',
    rgbaLight: 'rgba(192, 132, 252, 0.70)',
    rgbaDark: 'rgba(30, 27, 75, 0.85)',
  },
};

/**
 * Generates or retrieves a high-resolution transparent glass Three.js CanvasTexture for any card.
 */
export function getCardFrontTexture(color: CardColor, value: CardValue): THREE.CanvasTexture {
  const cacheKey = `glass_${color}_${value}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const w = 512;
    const h = 768;
    const cfg = COLOR_FILLS[color] || COLOR_FILLS.wild;

    // Clear background to preserve true transparency
    ctx.clearRect(0, 0, w, h);

    // 1. Outer Translucent Beveled Glass Border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    roundRect(ctx, 0, 0, w, h, 36);
    ctx.fill();

    // Outer Glass Rim Stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 4;
    roundRect(ctx, 2, 2, w - 4, h - 4, 34);
    ctx.stroke();

    // Gold / Metallic Laser Inlay Wire
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    roundRect(ctx, 8, 8, w - 16, h - 16, 30);
    ctx.stroke();

    // 2. Inner Translucent Crystal Gradient Fill
    const innerPad = 14;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, cfg.rgbaLight);
    grad.addColorStop(0.5, color === 'wild' ? 'rgba(88, 28, 135, 0.75)' : cfg.rgbaLight);
    grad.addColorStop(1, cfg.rgbaDark);
    ctx.fillStyle = grad;
    roundRect(ctx, innerPad, innerPad, w - innerPad * 2, h - innerPad * 2, 26);
    ctx.fill();

    // Fine holographic mesh texture inside the glass
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = innerPad; x < w - innerPad; x += 16) {
      for (let y = innerPad; y < h - innerPad; y += 16) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Specular diagonal gloss reflection band across the glass
    const sheen = ctx.createLinearGradient(0, 0, w, h * 0.65);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    sheen.addColorStop(0.35, 'rgba(255, 255, 255, 0.12)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.moveTo(innerPad, innerPad);
    ctx.lineTo(w - innerPad, innerPad);
    ctx.lineTo(w - innerPad, h * 0.45);
    ctx.lineTo(innerPad, h * 0.68);
    ctx.closePath();
    ctx.fill();

    // 3. Center large angled oval (Frosted Glass Lens)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-28 * Math.PI) / 180);

    if (color === 'wild') {
      // 4-quadrant chromatic crystalline lens
      const rX = 175;
      const rY = 245;

      // Outer rim
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0, rX + 8, rY + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clip inside oval for 4 quadrants
      ctx.beginPath();
      ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
      ctx.clip();

      const quadrantColors = [
        'rgba(225, 29, 72, 0.88)',
        'rgba(37, 99, 235, 0.88)',
        'rgba(234, 179, 8, 0.88)',
        'rgba(22, 163, 74, 0.88)',
      ];
      ctx.fillStyle = quadrantColors[0];
      ctx.fillRect(-rX, -rY, rX, rY);
      ctx.fillStyle = quadrantColors[1];
      ctx.fillRect(0, -rY, rX, rY);
      ctx.fillStyle = quadrantColors[2];
      ctx.fillRect(-rX, 0, rX, rY);
      ctx.fillStyle = quadrantColors[3];
      ctx.fillRect(0, 0, rX, rY);
    } else {
      // Frosted semi-translucent lens with drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 6;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 168, 235, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle lens specular sheen
      ctx.shadowColor = 'transparent';
      const lensSheen = ctx.createLinearGradient(-150, -200, 150, 0);
      lensSheen.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      lensSheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = lensSheen;
      ctx.beginPath();
      ctx.ellipse(0, 0, 164, 230, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Center symbol / text
    drawCardCenterSymbol(ctx, w / 2, h / 2, value, color);

    // 5. Corner indices (top-left & bottom-right rotated)
    drawCornerIndex(ctx, 42, 48, value, color, false);
    drawCornerIndex(ctx, w - 42, h - 48, value, color, true);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates transparent glass card back texture with dark smoked obsidian finish
 */
export function getCardBackTexture(): THREE.CanvasTexture {
  const cacheKey = 'glass_card_back';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const w = 512;
    const h = 768;

    ctx.clearRect(0, 0, w, h);

    // Outer translucent rim
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    roundRect(ctx, 0, 0, w, h, 36);
    ctx.fill();

    // Outer Glass Rim Stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 4;
    roundRect(ctx, 2, 2, w - 4, h - 4, 34);
    ctx.stroke();

    // Gold foil pinstripe
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    roundRect(ctx, 8, 8, w - 16, h - 16, 30);
    ctx.stroke();

    // Translucent smoked obsidian / midnight blue glass
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, 'rgba(30, 27, 75, 0.72)');
    bgGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.80)');
    bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0.85)');
    ctx.fillStyle = bgGrad;
    roundRect(ctx, 14, 14, w - 28, h - 28, 26);
    ctx.fill();

    // Holographic diamond matrix
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 30; x < w - 30; x += 32) {
      for (let y = 30; y < h - 30; y += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Center angled oval
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-28 * Math.PI) / 180);

    // Glowing amber / gold border rim
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 0, 175, 240, 0, 0, Math.PI * 2);
    ctx.fill();

    const ovalGrad = ctx.createLinearGradient(-150, -200, 150, 200);
    ovalGrad.addColorStop(0, 'rgba(244, 63, 94, 0.95)');
    ovalGrad.addColorStop(0.5, 'rgba(220, 38, 38, 0.95)');
    ovalGrad.addColorStop(1, 'rgba(153, 27, 27, 0.95)');
    ctx.fillStyle = ovalGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 162, 225, 0, 0, Math.PI * 2);
    ctx.fill();

    // "UNO" embossed letters
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 110px "Outfit", Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UNO', 0, -10);

    // "3D" subtext badge
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 36px "Outfit", Arial Black, sans-serif';
    ctx.fillText('3D', 0, 68);

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

function drawCardCenterSymbol(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  value: CardValue,
  color: CardColor
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cfg = COLOR_FILLS[color] || COLOR_FILLS.wild;
  const isWild = color === 'wild';

  if (!isWild) {
    ctx.fillStyle = cfg.bg;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
  }

  if (value === 'skip') {
    ctx.lineWidth = 26;
    ctx.strokeStyle = cfg.bg;
    ctx.beginPath();
    ctx.arc(cx, cy, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    const rad = 75 * 0.7071;
    ctx.moveTo(cx - rad, cy - rad);
    ctx.lineTo(cx + rad, cy + rad);
    ctx.stroke();
  } else if (value === 'reverse') {
    drawReverseArrows(ctx, cx, cy, cfg.bg, 68);
  } else if (value === 'draw2') {
    ctx.font = '900 135px "Outfit", Arial Black, sans-serif';
    ctx.fillText('+2', cx, cy);
  } else if (value === 'wild') {
    ctx.font = '900 78px "Outfit", Arial Black, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.strokeText('WILD', cx, cy);
    ctx.fillText('WILD', cx, cy);
  } else if (value === 'wild4') {
    drawMiniWildCards(ctx, cx, cy - 25);
    ctx.font = '900 130px "Outfit", Arial Black, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.strokeText('+4', cx, cy + 50);
    ctx.fillText('+4', cx, cy + 50);
  } else {
    ctx.font = '900 200px "Outfit", Arial Black, sans-serif';
    ctx.fillText(value, cx, cy);
  }

  ctx.restore();
}

function drawCornerIndex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: CardValue,
  color: CardColor,
  rotated: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  if (rotated) {
    ctx.rotate(Math.PI);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  let text: string = value;
  let fontSize = 48;
  if (value === 'skip') text = '⊘';
  else if (value === 'reverse') text = '⇄';
  else if (value === 'draw2') {
    text = '+2';
    fontSize = 38;
  } else if (value === 'wild') {
    text = 'W';
    fontSize = 44;
  } else if (value === 'wild4') {
    text = '+4';
    fontSize = 38;
  }

  ctx.font = `900 ${fontSize}px "Outfit", Arial Black, sans-serif`;
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

function drawReverseArrows(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  radius: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.stroke();

  drawArrowHead(ctx, cx + radius * Math.cos(-Math.PI * 0.2), cy + radius * Math.sin(-Math.PI * 0.2), Math.PI * 0.25, 22);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  drawArrowHead(ctx, cx + radius * Math.cos(Math.PI * 0.8), cy + radius * Math.sin(Math.PI * 0.8), Math.PI * 1.25, 22);

  ctx.restore();
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.6);
  ctx.lineTo(-size * 0.6, 0);
  ctx.lineTo(-size, size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMiniWildCards(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const cards = [
    { c: '#2563eb', rot: -0.3, ox: -35 },
    { c: '#16a34a', rot: -0.1, ox: -12 },
    { c: '#e11d48', rot: 0.1, ox: 12 },
    { c: '#eab308', rot: 0.3, ox: 35 },
  ];

  cards.forEach(({ c, rot, ox }) => {
    ctx.save();
    ctx.translate(cx + ox, cy);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    roundRect(ctx, -22, -32, 44, 64, 5);
    ctx.fill();
    ctx.fillStyle = c;
    roundRect(ctx, -19, -29, 38, 58, 4);
    ctx.fill();
    ctx.restore();
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
