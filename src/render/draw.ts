import type { CardData } from '../model/card';
import { drawRenderable, prepareRenderable, renderablePng } from './renderable';
import type { RenderImages } from './renderCard';

/** 描画に必要な画像とフォントをすべて読み込む */
export const prepareCard = (card: CardData): Promise<RenderImages> =>
  prepareRenderable({ kind: 'card', card });

/** canvas の大きさを scale 倍にして、カードを描く */
export const drawCard = (
  canvas: HTMLCanvasElement,
  card: CardData,
  images: RenderImages,
  scale = 1,
) => drawRenderable(canvas, { kind: 'card', card }, images, scale);

/** PNG として書き出す */
export const exportPng = (card: CardData, scale: number): Promise<Blob> =>
  renderablePng({ kind: 'card', card }, scale);
