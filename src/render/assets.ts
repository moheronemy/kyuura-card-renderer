import { ASSET_URLS } from './assetUrls';

export const assetUrl = (key: string): string => {
  const url = ASSET_URLS[key];
  if (!url) throw new Error(`素材画像が見つかりません: ${key}`);
  return url;
};

const cache = new Map<string, Promise<HTMLImageElement>>();

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`画像を読み込めませんでした: ${src.slice(0, 80)}`));
      img.src = src;
    });
    // 失敗したものはキャッシュに残さず、次回また読み込みを試みる
    p.catch(() => cache.delete(src));
    cache.set(src, p);
  }
  return p;
};

export type ImageMap = Record<string, HTMLImageElement>;

/** 素材名の一覧をまとめて読み込む */
export const loadAssets = async (keys: readonly string[]): Promise<ImageMap> => {
  const entries = await Promise.all(
    keys.map(async (k) => [k, await loadImage(assetUrl(k))] as const),
  );
  return Object.fromEntries(entries);
};
