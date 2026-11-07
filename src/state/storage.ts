import { createCard, parseCard, type CardData } from '../model/card';

// 旧リポジトリ名（pcigen）の接頭辞のまま。変えると保存済みのカードが読めなくなる
const KEY = 'pcigen:card:v1';

export const loadSavedCard = (): CardData => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseCard(JSON.parse(raw)) : createCard();
  } catch {
    return createCard();
  }
};

export type SaveResult = 'saved' | 'savedWithoutImages' | 'failed';

/** 画像が大きすぎて保存しきれないときは、画像を除いて保存する */
export const saveCard = (card: CardData): SaveResult => {
  try {
    localStorage.setItem(KEY, JSON.stringify(card));
    return 'saved';
  } catch {
    try {
      const light: CardData = {
        ...card,
        art: { ...card.art, src: null },
        evoArt: { ...card.evoArt, src: null },
      };
      localStorage.setItem(KEY, JSON.stringify(light));
      return 'savedWithoutImages';
    } catch {
      return 'failed';
    }
  }
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('ファイルを読み込めませんでした'));
    reader.readAsDataURL(file);
  });

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** ファイル名に使えない文字を取り除く */
export const safeFilename = (name: string, ext: string) =>
  `${name.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || 'card'}.${ext}`;
