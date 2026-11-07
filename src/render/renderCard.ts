import type { Layout, Rect, TextBox, IconSlot } from '../layout/layout';
import { ENERGY_TYPES, type Artwork, type CardData, type EnergyType } from '../model/card';
import type { ImageMap } from './assets';
import { drawHolo } from './holo';
import { fitText, textBlockHeight, wrapText } from './text';

export const CARD_WIDTH = 400;
export const CARD_HEIGHT = 560;
export const FONT_FAMILY = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

/** sprite.png の1アイコンの大きさ */
const SPRITE_CELL = 28;

export interface RenderImages {
  assets: ImageMap;
  art?: HTMLImageElement;
  evoArt?: HTMLImageElement;
}

/** カードの文字のフォント指定（太さ・大きさ） */
export const cardFont = (size: number, weight = 700): string =>
  `${weight} ${size}px ${FONT_FAMILY}`;
const font = cardFont;

/** 画像が枠いっぱいに収まるように置いたときの描画位置 */
export const artworkPlacement = (
  img: { width: number; height: number },
  win: Rect,
  art: Pick<Artwork, 'x' | 'y' | 'scale'>,
): Rect => {
  const s = Math.max(win.w / img.width, win.h / img.height) * art.scale;
  const w = img.width * s;
  const h = img.height * s;
  return { x: win.x + (win.w - w) / 2 + art.x, y: win.y + (win.h - h) / 2 + art.y, w, h };
};

const drawArtwork = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  win: Rect,
  art: Artwork,
  shape: 'rect' | 'circle',
) => {
  const p = artworkPlacement(img, win, art);
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.ellipse(win.x + win.w / 2, win.y + win.h / 2, win.w / 2, win.h / 2, 0, 0, Math.PI * 2);
  } else {
    // 枠画像で隠れる程度に少し広めに切り抜く
    ctx.rect(win.x - 2, win.y - 2, win.w + 4, win.h + 4);
  }
  ctx.clip();
  ctx.drawImage(img, p.x, p.y, p.w, p.h);
  ctx.restore();
};

/** sprite.png からエネルギーのアイコンを 1 つ描く */
export const drawEnergy = (
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement | undefined,
  type: EnergyType,
  x: number,
  y: number,
  size: number,
) => {
  if (!sprite) return;
  const sy = ENERGY_TYPES.indexOf(type) * SPRITE_CELL;
  ctx.drawImage(sprite, 0, sy, SPRITE_CELL, SPRITE_CELL, x, y, size, size);
};

/** 小さくするときの下限（元の大きさに対する割合） */
const MIN_TEXT_SCALE = 0.6;

/** 枠に収まるように文字を小さくしながら段落を描く */
export const drawParagraph = (
  ctx: CanvasRenderingContext2D,
  text: string,
  box: TextBox,
  weight = 500,
) => {
  if (!text) return;
  const fit = fitText(text, { ...box, minSize: box.size * MIN_TEXT_SCALE }, (size) => {
    ctx.font = font(size, weight);
    return (t) => ctx.measureText(t).width;
  });
  ctx.font = font(fit.size, weight);
  ctx.textAlign = 'left';
  fit.lines.forEach((line, i) => ctx.fillText(line, box.x, box.y + fit.size + i * fit.lineHeight));
};

const drawName = (ctx: CanvasRenderingContext2D, card: CardData, layout: Layout) => {
  const { name, level } = layout;
  const cardName =
    card.series === 'pcg' && card.stage !== 'trainer' && card.isEx && card.name
      ? /ex$/i.test(card.name)
        ? card.name
        : `${card.name}ex`
      : card.name;
  ctx.font = font(name.size);
  ctx.textAlign = name.align;
  ctx.fillText(cardName, name.x, name.y, name.maxWidth);
  if (level && card.level && name.align === 'left') {
    const nameWidth = Math.min(ctx.measureText(card.name).width, name.maxWidth);
    ctx.font = font(level.size);
    ctx.textAlign = 'left';
    ctx.fillText(`LV.${card.level}`, name.x + nameWidth + 6, name.y);
  }
};

const drawHp = (ctx: CanvasRenderingContext2D, card: CardData, layout: Layout) => {
  if (!layout.hp || !card.hp) return;
  const { right, y } = layout.hp;
  ctx.textAlign = 'right';
  ctx.font = font(22);
  ctx.fillText(card.hp, right, y, 52);
  const w = Math.min(ctx.measureText(card.hp).width, 52);
  ctx.font = font(10);
  ctx.fillText('HP', right - w - 2, y);
};

/** 「ポケパワー」「ポケボディー」見出し画像の縦横比（700×177） */
const BADGE_ASPECT = 700 / 177;

interface MoveBlock {
  height: number;
  draw: (top: number) => void;
}

/** わざ欄の上下と各ブロックの間の最小の間隔 */
const MIN_MOVE_GAP = 4;

const drawMoves = (
  ctx: CanvasRenderingContext2D,
  card: CardData,
  layout: Layout,
  images: RenderImages,
) => {
  const m = layout.moves;
  if (!m) return;
  const sprite = images.assets.sprite;
  const badge = m.ability ? images.assets[m.ability.badge] : undefined;

  /** 文字の大きさを決めて、わざ欄に並べるブロックを作る */
  const buildBlocks = (textSize: number, nameSize: number): MoveBlock[] => {
    const textLineH = textSize + 3 * (textSize / m.textSize);
    const wrap = (text: string, width: number) => {
      ctx.font = font(textSize, 500);
      return text ? wrapText(text, width, (t) => ctx.measureText(t).width) : [];
    };
    const drawLines = (lines: string[], x: number, nameBaseline: number) => {
      ctx.textAlign = 'left';
      ctx.font = font(textSize, 500);
      lines.forEach((line, k) =>
        ctx.fillText(line, x, nameBaseline + 4 + textSize + k * textLineH),
      );
    };
    const textHeight = (lines: string[]) =>
      lines.length ? 4 + textBlockHeight(lines.length, textSize, textLineH) : 0;

    const blocks: MoveBlock[] = [];

    // ポケパワー・ポケボディー：見出し画像の右に名前、その下に説明
    if (m.ability && badge) {
      const bh = m.ability.badgeHeight;
      const bw = bh * BADGE_ASPECT;
      const lines = wrap(card.ability.text, m.damageRight - m.iconX);
      const lineH = Math.max(bh, nameSize);
      blocks.push({
        height: lineH + textHeight(lines),
        draw: (top) => {
          const nameBaseline = top + (lineH + nameSize * 0.8) / 2;
          ctx.drawImage(badge, m.iconX, top + (lineH - bh) / 2, bw, bh);
          const nameX = m.iconX + bw + 8;
          ctx.textAlign = 'left';
          ctx.font = font(nameSize);
          ctx.fillText(card.ability.name, nameX, nameBaseline, m.damageRight - nameX);
          drawLines(lines, m.iconX, top + lineH);
        },
      });
    }

    for (const move of card.moves) {
      const lines = wrap(move.text, m.textWidth);
      blocks.push({
        height: nameSize + textHeight(lines),
        draw: (top) => {
          const nameBaseline = top + nameSize * 0.9;
          // エネルギー：2個ずつ並べ、名前の行の高さを中心にそろえる
          const rows = Math.ceil(move.cost.length / 2);
          const gap = 2;
          const gridH = rows * m.iconSize + (rows - 1) * gap;
          const gridTop = nameBaseline - nameSize * 0.35 - gridH / 2;
          move.cost.forEach((type, j) => {
            const x = m.iconX + (j % 2) * (m.iconSize + gap);
            const y = gridTop + Math.floor(j / 2) * (m.iconSize + gap);
            drawEnergy(ctx, sprite, type, x, y, m.iconSize);
          });

          ctx.textAlign = 'left';
          ctx.font = font(nameSize);
          ctx.fillText(move.name, m.nameX, nameBaseline, m.damageRight - m.nameX - 44);
          if (move.damage) {
            ctx.textAlign = 'right';
            ctx.fillText(move.damage, m.damageRight, nameBaseline, 60);
          }
          drawLines(lines, m.textX, nameBaseline);
        },
      });
    }
    return blocks;
  };

  // 収まらないときは、まず説明文を小さくし、それでも足りなければ名前も少し小さくする
  const available = m.bottom - m.top;
  const fits = (blocks: MoveBlock[]) =>
    blocks.reduce((sum, b) => sum + b.height, 0) + (blocks.length + 1) * MIN_MOVE_GAP <= available;
  let textScale = 1;
  let nameScale = 1;
  let blocks = buildBlocks(m.textSize, m.nameSize);
  while (!fits(blocks) && nameScale > 0.75) {
    if (textScale > MIN_TEXT_SCALE) textScale = Math.max(MIN_TEXT_SCALE, textScale - 0.05);
    else nameScale = Math.max(0.75, nameScale - 0.05);
    blocks = buildBlocks(m.textSize * textScale, m.nameSize * nameScale);
  }
  if (blocks.length === 0) return;

  // 各ブロックの間と上下を同じ間隔にして並べる（収まらないときは詰めて並べる）
  const contentH = blocks.reduce((sum, b) => sum + b.height, 0);
  const gap = Math.max(MIN_MOVE_GAP, (available - contentH) / (blocks.length + 1));
  let top = m.top + gap;
  blocks.forEach((block, i) => {
    if (m.divider && i > 0) {
      const y = Math.round(top - gap / 2) + 0.5;
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(m.divider[0], y);
      ctx.lineTo(m.divider[1], y);
      ctx.stroke();
      ctx.restore();
    }
    block.draw(top);
    top += block.height + gap;
  });
};

const drawStats = (
  ctx: CanvasRenderingContext2D,
  card: CardData,
  layout: Layout,
  sprite: HTMLImageElement | undefined,
) => {
  const s = layout.stats;
  if (!s) return;
  ctx.font = font(s.labelSize);
  ctx.textAlign = 'left';
  s.labels?.forEach((l) => ctx.fillText(l.text, l.x, l.y));

  const icon = (type: EnergyType, slot: IconSlot) =>
    drawEnergy(ctx, sprite, type, slot.x, slot.y, slot.size);
  if (card.weakness) icon(card.weakness, s.weakness);
  if (card.resistance) {
    icon(card.resistance, s.resistance);
    if (card.resistanceValue) {
      ctx.font = font(s.labelSize + 1);
      ctx.textAlign = s.resistanceValue.align;
      ctx.fillText(card.resistanceValue, s.resistanceValue.x, s.resistanceValue.y);
    }
  }
  for (let i = 0; i < card.retreat; i++) {
    drawEnergy(
      ctx,
      sprite,
      'colorless',
      s.retreat.x + i * s.retreat.step,
      s.retreat.y,
      s.retreat.size,
    );
  }
};

const drawFooter = (ctx: CanvasRenderingContext2D, card: CardData, layout: Layout) => {
  const f = layout.footer;
  // 左・中央・右の文字が重ならないよう、幅を 1/3 ずつ（中央は少し狭く）に分け、長いものは横に詰める
  const width = f.right - f.left;
  ctx.font = font(f.size);
  if (card.illustrator) {
    ctx.textAlign = f.illustrator ? 'right' : 'left';
    ctx.fillText(
      `Illus. ${card.illustrator}`,
      f.illustrator?.x ?? f.left,
      f.illustrator?.y ?? f.y,
      f.illustrator?.maxWidth ?? width * 0.33,
    );
  }
  if (card.copyright) {
    ctx.textAlign = 'center';
    ctx.fillText(
      card.copyright,
      f.illustrator ? f.left + width * 0.33 : (f.left + f.right) / 2,
      f.y,
      width * (f.illustrator ? 0.64 : 0.3),
    );
  }
  const right = [card.number, card.rarity].filter(Boolean).join(' ');
  if (right) {
    ctx.textAlign = 'right';
    ctx.fillText(right, f.right, f.y, width * 0.33);
  }
};

/**
 * カードを描画する。必要な素材画像は読み込み済みのものを渡す（この関数は同期的に描き切る）。
 * ctx は 400×560 のカード座標で描けるよう、呼び出し側で拡大率を設定しておく。
 */
export const renderCard = (
  ctx: CanvasRenderingContext2D,
  card: CardData,
  layout: Layout,
  images: RenderImages,
) => {
  const { assets } = images;
  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.textBaseline = 'alphabetic';

  // イラスト枠（未設定なら白）
  const win = layout.artWindow;
  ctx.fillStyle = '#fff';
  ctx.fillRect(win.x, win.y, win.w, win.h);
  if (images.art) drawArtwork(ctx, images.art, win, card.art, 'rect');
  // イラストだけのキラは枠より下に、それ以外は枠の上（文字の下）にかける
  if (card.holo.area === 'art') drawHolo(ctx, card.holo, win);

  const frame = assets[layout.frame];
  if (frame) ctx.drawImage(frame, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  for (const key of layout.overlays) {
    const img = assets[key];
    if (img) ctx.drawImage(img, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  }
  if (layout.evoWindow && images.evoArt) {
    drawArtwork(ctx, images.evoArt, layout.evoWindow, card.evoArt, layout.evoWindow.shape);
  }
  if (card.holo.area !== 'art') drawHolo(ctx, card.holo, win);

  ctx.fillStyle = layout.textColor;
  const sprite = assets.sprite;

  drawName(ctx, card, layout);
  if (layout.stageLabel) {
    const s = layout.stageLabel;
    ctx.font = font(s.size);
    ctx.textAlign = 'left';
    ctx.fillText(s.text, s.x, s.y, 64);
  }
  if (layout.evolvesFrom && card.evolvesFrom) {
    const e = layout.evolvesFrom;
    ctx.font = font(e.size);
    ctx.textAlign = 'left';
    const text = `${card.evolvesFrom}から進化`;
    if (card.series === 'pcg') ctx.fillText(text, e.x, e.y, 140);
    else ctx.fillText(text, e.x, e.y);
  }
  drawHp(ctx, card, layout);
  if (layout.typeIcon) {
    const t = layout.typeIcon;
    drawEnergy(ctx, sprite, card.type, t.x, t.y, t.size);
  }
  if (layout.exRule) {
    drawParagraph(
      ctx,
      'ポケモンexがきぜつしたとき、\n相手プレイヤーはサイドを2枚とります。',
      layout.exRule,
    );
  }
  if (layout.info && card.info) {
    const i = layout.info;
    ctx.font = font(i.size);
    ctx.textAlign = 'center';
    ctx.fillText(card.info, i.x, i.y, i.maxWidth);
  }
  drawMoves(ctx, card, layout, images);
  drawStats(ctx, card, layout, sprite);
  if (layout.pokedex) drawParagraph(ctx, card.pokedex, layout.pokedex);
  if (layout.trainerText) drawParagraph(ctx, card.trainerText, layout.trainerText);
  drawFooter(ctx, card, layout);
};

/** カードに描かれる文字をすべて集める（Web フォントの読み込みに使う） */
export const cardText = (card: CardData): string =>
  [
    card.name,
    card.hp,
    card.level,
    card.evolvesFrom,
    card.info,
    card.pokedex,
    card.trainerText,
    card.illustrator,
    card.copyright,
    card.number,
    card.rarity,
    card.resistanceValue,
    card.ability.name,
    card.ability.text,
    ...card.moves.flatMap((m) => [m.name, m.damage, m.text]),
    'HPLV.Illus.exたねポケモン1進化2進化トレーナーから進化弱点抵抗力にげる0123456789',
    'ポケモンexがきぜつしたとき、相手プレイヤーはサイドを2枚とります。',
  ].join('');
