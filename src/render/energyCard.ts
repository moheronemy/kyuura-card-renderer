import { ENERGY_LABELS, type EnergyType } from '../model/card';
import type { ImageMap } from './assets';
import { CARD_HEIGHT, CARD_WIDTH, cardFont, drawEnergy, drawParagraph } from './renderCard';

/**
 * エネルギーカード。枠の素材がまだないので、仮の表示（カードの形・名前・タイプのアイコン・説明）で描く。
 * 本来の枠を実装したら、この型はそのままで描き方だけを差しかえる。
 */
export interface EnergyCardData {
  name: string;
  /** 基本エネルギーが出すタイプ。特殊エネルギーは空のことがある */
  provides: EnergyType[];
  special: boolean;
  /** 特殊エネルギーの説明 */
  text: string;
}

export const createEnergyCard = (): EnergyCardData => ({
  name: '',
  provides: [],
  special: false,
  text: '',
});

/** 仮の表示に使う素材 */
export const ENERGY_PLACEHOLDER_ASSETS = ['sprite'] as const;

/** 仮の表示の地の色（タイプごと） */
const TYPE_COLORS: Record<EnergyType, [string, string]> = {
  colorless: ['#f4f1e8', '#cfc8b4'],
  grass: ['#d8f0c8', '#5aa84a'],
  fire: ['#fbd5c8', '#e0533a'],
  water: ['#cfe4f7', '#3d8fd6'],
  lightning: ['#fdf0b8', '#e7b416'],
  psychic: ['#ead6f2', '#9a5bb5'],
  fighting: ['#f0dccb', '#b5703a'],
  darkness: ['#c9c9d1', '#3b3b46'],
  metal: ['#e4e8ec', '#8a949e'],
};
const SPECIAL_COLORS: [string, string] = ['#eeeeee', '#9e9e9e'];

const BORDER = 16;
const RADIUS = 18;

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/** 仮の表示の右下に書く文 */
export const ENERGY_PLACEHOLDER_NOTE = '仮の表示';

/** エネルギーカードを仮の表示で描く。ctx は 400×560 のカード座標で描ける状態にしておく */
export const renderEnergyCard = (
  ctx: CanvasRenderingContext2D,
  card: EnergyCardData,
  assets: ImageMap,
) => {
  const main = card.provides[0];
  const [light, dark] = card.special || !main ? SPECIAL_COLORS : TYPE_COLORS[main];
  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.textBaseline = 'alphabetic';

  // 外枠（旧裏の黄色い縁）と内側
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, RADIUS);
  ctx.fillStyle = '#f3d23a';
  ctx.fill();
  const inner = { x: BORDER, y: BORDER, w: CARD_WIDTH - BORDER * 2, h: CARD_HEIGHT - BORDER * 2 };
  roundRect(ctx, inner.x, inner.y, inner.w, inner.h, 8);
  const grad = ctx.createLinearGradient(0, inner.y, 0, inner.y + inner.h);
  grad.addColorStop(0, light);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fill();

  // 名前と種類
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'left';
  ctx.font = cardFont(24);
  ctx.fillText(card.name || 'エネルギー', inner.x + 14, inner.y + 38, inner.w - 28);
  ctx.font = cardFont(13, 500);
  ctx.fillText(card.special ? '特殊エネルギー' : '基本エネルギー', inner.x + 14, inner.y + 60);

  // 中央のタイプのアイコン（特殊エネルギーで出すタイプが決まっていないときは無色を薄く）
  const icons = card.provides.length ? card.provides.slice(0, 4) : (['colorless'] as EnergyType[]);
  const size = icons.length === 1 ? 170 : icons.length === 2 ? 120 : 90;
  const gap = 12;
  const total = icons.length * size + (icons.length - 1) * gap;
  const cy = card.special ? 200 : 250;
  ctx.save();
  if (!card.provides.length) ctx.globalAlpha = 0.35;
  icons.forEach((type, i) => {
    drawEnergy(
      ctx,
      assets.sprite,
      type,
      (CARD_WIDTH - total) / 2 + i * (size + gap),
      cy - size / 2,
      size,
    );
  });
  ctx.restore();

  if (!card.special && main) {
    ctx.textAlign = 'center';
    ctx.font = cardFont(18);
    ctx.fillText(`${ENERGY_LABELS[main]}エネルギー`, CARD_WIDTH / 2, cy + size / 2 + 34);
  }

  // 特殊エネルギーの説明
  if (card.special && card.text) {
    const box = { x: inner.x + 14, y: 318, w: inner.w - 28, h: 170 };
    roundRect(ctx, box.x - 6, box.y - 6, box.w + 12, box.h + 12, 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    drawParagraph(ctx, card.text, { ...box, size: 15, lineHeight: 22 });
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.textAlign = 'right';
  ctx.font = cardFont(11, 500);
  ctx.fillText(ENERGY_PLACEHOLDER_NOTE, inner.x + inner.w - 10, inner.y + inner.h - 10);
};

export const energyCardText = (card: EnergyCardData): string =>
  [
    card.name,
    card.text,
    card.special ? '特殊エネルギー' : '基本エネルギー',
    ENERGY_PLACEHOLDER_NOTE,
    ...card.provides.map((t) => `${ENERGY_LABELS[t]}エネルギー`),
  ].join('');
