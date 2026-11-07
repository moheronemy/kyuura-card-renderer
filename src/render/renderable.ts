import { getLayout, requiredAssets } from '../layout/layout';
import type { CardData } from '../model/card';
import { loadAssets, loadImage } from './assets';
import {
  ENERGY_PLACEHOLDER_ASSETS,
  energyCardText,
  renderEnergyCard,
  type EnergyCardData,
} from './energyCard';
import { ensureFonts } from './fonts';
import { CARD_HEIGHT, CARD_WIDTH, cardText, renderCard, type RenderImages } from './renderCard';

/**
 * 描けるカードの種類。
 * - `card`: ポケモン・トレーナー（枠の素材で描く）
 * - `energy`: エネルギー（今は仮の表示）
 * - `back`: カードの裏面（裏向きのカード・相手の手札など）
 */
export type RenderableCard =
  { kind: 'card'; card: CardData } | { kind: 'energy'; card: EnergyCardData } | { kind: 'back' };

/** 描くのに必要な画像とフォントをすべて読み込む */
export const prepareRenderable = async (item: RenderableCard): Promise<RenderImages> => {
  switch (item.kind) {
    case 'card': {
      const { card } = item;
      const layout = getLayout(card);
      const [assets, art, evoArt] = await Promise.all([
        loadAssets(requiredAssets(layout)),
        card.art.src ? loadImage(card.art.src) : undefined,
        layout.evoWindow && card.evoArt.src ? loadImage(card.evoArt.src) : undefined,
        ensureFonts(cardText(card)),
      ]);
      return { assets, art, evoArt };
    }
    case 'energy': {
      const [assets] = await Promise.all([
        loadAssets(ENERGY_PLACEHOLDER_ASSETS),
        ensureFonts(energyCardText(item.card)),
      ]);
      return { assets };
    }
    case 'back':
      return { assets: await loadAssets(['pcardback']) };
  }
};

/** ctx（400×560 のカード座標）へ描く。画像は prepareRenderable で読み込んだもの */
export const renderRenderable = (
  ctx: CanvasRenderingContext2D,
  item: RenderableCard,
  images: RenderImages,
) => {
  switch (item.kind) {
    case 'card':
      renderCard(ctx, item.card, getLayout(item.card), images);
      return;
    case 'energy':
      renderEnergyCard(ctx, item.card, images.assets);
      return;
    case 'back': {
      ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
      const back = images.assets.pcardback;
      if (back) ctx.drawImage(back, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    }
  }
};

/**
 * renderToCanvas の待機中の要求（Canvas ごとに、最後に始めた 1 件の目印）。
 * WeakMap なので Canvas を保持し続けない。要求が終わる・無効になると消す。
 */
const pending = new WeakMap<HTMLCanvasElement, object>();

/** canvas の大きさを scale 倍にして描く（内部用。待機中の要求には触れない） */
const paint = (
  canvas: HTMLCanvasElement,
  item: RenderableCard,
  images: RenderImages,
  scale: number,
) => {
  canvas.width = Math.round(CARD_WIDTH * scale);
  canvas.height = Math.round(CARD_HEIGHT * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D が使えません');
  ctx.setTransform(canvas.width / CARD_WIDTH, 0, 0, canvas.height / CARD_HEIGHT, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  renderRenderable(ctx, item, images);
};

/**
 * 指定した Canvas で待機中の renderToCanvas を無効にする（あとで読み込みが終わっても描かない）。
 * ほかの Canvas の要求・素材画像のキャッシュ・今描かれているピクセルには触れない。
 * 非公開の情報を今すぐ隠したいときは、呼び出し側で Canvas を消す・裏面を描くなどをする。
 * @returns 待機中の要求があって無効にしたら true
 */
export const cancelRenderToCanvas = (canvas: HTMLCanvasElement): boolean => pending.delete(canvas);

/**
 * canvas の大きさを scale 倍（400×560 が 1）にして、すぐに描く。
 * この Canvas で待機中の renderToCanvas は無効になる（あとから上書きしない）。
 */
export const drawRenderable = (
  canvas: HTMLCanvasElement,
  item: RenderableCard,
  images: RenderImages,
  scale = 1,
) => {
  cancelRenderToCanvas(canvas);
  paint(canvas, item, images, scale);
};

/**
 * 読み込みから描画までをまとめて行う。同じ Canvas では、最後に始めた要求だけが描く。
 *
 * - 描いたら true で終わる
 * - あとから同じ Canvas へ renderToCanvas・drawRenderable・cancelRenderToCanvas が呼ばれて無効になったら、
 *   描かずに false で終わる（読み込みに失敗していても reject しない）
 * - 有効なまま読み込み・描画に失敗したら reject する
 */
export const renderToCanvas = async (
  canvas: HTMLCanvasElement,
  item: RenderableCard,
  scale = 1,
): Promise<boolean> => {
  const token = {};
  pending.set(canvas, token);
  const current = () => pending.get(canvas) === token;
  let images: RenderImages;
  try {
    images = await prepareRenderable(item);
  } catch (error) {
    if (!current()) return false;
    pending.delete(canvas);
    throw error;
  }
  if (!current()) return false;
  pending.delete(canvas);
  paint(canvas, item, images, scale);
  return true;
};

/** PNG として書き出す（専用の Canvas に描くので、ほかの描画とは競合しない） */
export const renderablePng = async (item: RenderableCard, scale = 1): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  await renderToCanvas(canvas, item, scale);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG を作れませんでした'))),
      'image/png',
    ),
  );
};
