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

/** canvas の大きさを scale 倍（400×560 が 1）にして描く */
export const drawRenderable = (
  canvas: HTMLCanvasElement,
  item: RenderableCard,
  images: RenderImages,
  scale = 1,
) => {
  canvas.width = Math.round(CARD_WIDTH * scale);
  canvas.height = Math.round(CARD_HEIGHT * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D が使えません');
  ctx.setTransform(canvas.width / CARD_WIDTH, 0, 0, canvas.height / CARD_HEIGHT, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  renderRenderable(ctx, item, images);
};

/** 読み込みから描画までをまとめて行う */
export const renderToCanvas = async (
  canvas: HTMLCanvasElement,
  item: RenderableCard,
  scale = 1,
) => {
  const images = await prepareRenderable(item);
  drawRenderable(canvas, item, images, scale);
};

/** PNG として書き出す */
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
