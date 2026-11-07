/**
 * renderToCanvas の非同期描画の競合のテスト。
 *
 * 差し替えているもの（確認の範囲）:
 * - 素材画像の読み込み（./assets の loadAssets）: 呼ばれるたびに保留の Promise を作り、テストが完了・失敗の順番を決める。
 *   素材ごとの共有キャッシュ（loadImage）は使わない（キャッシュは assets.ts のまま変えていない）
 * - フォントの読み込み（./fonts の ensureFonts）: すぐに完了する
 * - Canvas: 2D の描画命令を記録する偽物。描かれたピクセルは確かめず、「どの要求の素材画像で描いたか」を
 *   drawImage に渡された画像で見分ける
 * 描画の処理（renderCard・renderEnergyCard・裏面）そのものは差し替えていない。実際のピクセルは実ブラウザで確かめる。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCard } from '../model/card';
import type { ImageMap } from './assets';

interface PendingLoad {
  keys: readonly string[];
  resolve: () => void;
  reject: (error: Error) => void;
}

const loads: PendingLoad[] = [];
let label = '';

vi.mock('./assets', () => ({
  loadAssets: (keys: readonly string[]) =>
    new Promise<ImageMap>((resolve, reject) => {
      const tag = label;
      loads.push({
        keys,
        resolve: () =>
          resolve(
            Object.fromEntries(
              keys.map((k) => [k, { tag, key: k } as unknown as HTMLImageElement]),
            ),
          ),
        reject,
      });
    }),
  loadImage: () => Promise.reject(new Error('テストでは使わない')),
}));
vi.mock('./fonts', () => ({ ensureFonts: () => Promise.resolve() }));

const { cancelRenderToCanvas, drawRenderable, prepareRenderable, renderToCanvas, renderablePng } =
  await import('./renderable');
const { drawCard, exportPng, prepareCard } = await import('./draw');

/** 2D の描画命令を記録する偽物の Canvas。drawImage に渡された画像の tag を drawn に残す */
const fakeCanvas = () => {
  const drawn: string[] = [];
  const ctx = new Proxy(
    {
      measureText: (t: string) => ({ width: t.length * 10 }),
      drawImage: (img: { tag: string }) => drawn.push(img.tag),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    } as Record<string, unknown>,
    {
      get: (target, prop) => (prop in target ? target[prop as string] : () => {}),
      set: (target, prop, value) => {
        target[prop as string] = value;
        return true;
      },
    },
  );
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob: (cb: (b: Blob | null) => void) =>
      cb(new Blob([drawn.join(',')], { type: 'image/png' })),
  } as unknown as HTMLCanvasElement;
  /** 最後の描画で使われた要求の tag（何も描かれていなければ null） */
  const last = () => drawn.at(-1) ?? null;
  return { canvas, drawn, last };
};

/** 要求を始める。label はその要求の読み込みで返る画像の目印 */
const start = <T>(tag: string, run: () => Promise<T>) => {
  label = tag;
  const before = loads.length;
  const promise = run();
  return { promise, load: () => loads[before]! };
};

/** Promise の結果（reject も値として受け取る） */
const outcome = <T>(p: Promise<T>) =>
  p.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

/** 保留の読み込みが登録されるまで（prepareRenderable の中の await を進める） */
const settle = () => new Promise<void>((r) => setTimeout(r, 0));

const front = { kind: 'card', card: createCard() } as const;
const back = { kind: 'back' } as const;

beforeEach(() => {
  loads.length = 0;
});
afterEach(() => vi.unstubAllGlobals());

describe('renderToCanvas: 同じ Canvas では最後に始めた要求だけが描く', () => {
  it('1. A→B の順に始め、B→A の順に読み込みが終わっても B が残る', async () => {
    const c = fakeCanvas();
    const a = start('A', () => renderToCanvas(c.canvas, front));
    const b = start('B', () => renderToCanvas(c.canvas, back));
    await settle();
    b.load().resolve();
    expect.soft(await outcome(b.promise)).toEqual({ ok: true, value: true });
    expect(c.last()).toBe('B');
    a.load().resolve();
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: false });
    expect(c.last()).toBe('B');
    expect(c.drawn).not.toContain('A');
  });

  it('2. A の読み込みが先に終わっても、B が始まっていれば A は描かない', async () => {
    const c = fakeCanvas();
    const a = start('A', () => renderToCanvas(c.canvas, front));
    const b = start('B', () => renderToCanvas(c.canvas, back));
    await settle();
    a.load().resolve();
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: false });
    expect(c.drawn).toEqual([]);
    b.load().resolve();
    expect.soft(await outcome(b.promise)).toEqual({ ok: true, value: true });
    expect(c.drawn).toEqual(['B']);
  });

  it('3. 別の Canvas の要求は互いに無効にしない', async () => {
    const c1 = fakeCanvas();
    const c2 = fakeCanvas();
    const a = start('A', () => renderToCanvas(c1.canvas, back));
    const b = start('B', () => renderToCanvas(c2.canvas, back));
    await settle();
    b.load().resolve();
    a.load().resolve();
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: true });
    expect.soft(await outcome(b.promise)).toEqual({ ok: true, value: true });
    expect(c1.drawn).toEqual(['A']);
    expect(c2.drawn).toEqual(['B']);
  });

  it('4. cancelRenderToCanvas のあとは古い要求を描かない（ほかの Canvas とピクセルはそのまま）', async () => {
    const c1 = fakeCanvas();
    const c2 = fakeCanvas();
    const shown = start('shown', () => renderToCanvas(c1.canvas, back));
    await settle();
    shown.load().resolve();
    await shown.promise;
    const a = start('A', () => renderToCanvas(c1.canvas, front));
    const other = start('other', () => renderToCanvas(c2.canvas, back));
    await settle();
    expect(cancelRenderToCanvas(c1.canvas)).toBe(true);
    expect(cancelRenderToCanvas(c1.canvas)).toBe(false); // 待機中の要求はもうない
    a.load().resolve();
    other.load().resolve();
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: false });
    expect.soft(await outcome(other.promise)).toEqual({ ok: true, value: true });
    expect(c1.drawn).toEqual(['shown']); // キャンセルは今のピクセルを消さない
    expect(c2.drawn).toEqual(['other']);
  });

  it('5. 待機中に新しい要求が失敗しても、古い要求は復活しない', async () => {
    const c = fakeCanvas();
    const a = start('A', () => renderToCanvas(c.canvas, front));
    const b = start('B', () => renderToCanvas(c.canvas, back));
    await settle();
    b.load().reject(new Error('B の読み込みに失敗'));
    expect(await outcome(b.promise)).toMatchObject({
      ok: false,
      error: { message: 'B の読み込みに失敗' },
    }); // 有効な要求の失敗は失敗のまま
    a.load().resolve();
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: false });
    expect(c.drawn).toEqual([]);
  });

  it('6. 無効になった要求の読み込みの失敗は reject せず、新しい描画を壊さない', async () => {
    const c = fakeCanvas();
    const a = start('A', () => renderToCanvas(c.canvas, front));
    const b = start('B', () => renderToCanvas(c.canvas, back));
    await settle();
    a.load().reject(new Error('A の読み込みに失敗'));
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: false });
    b.load().resolve();
    expect.soft(await outcome(b.promise)).toEqual({ ok: true, value: true });
    expect(c.drawn).toEqual(['B']);
  });

  it('7. 待機中に drawRenderable で直接描くと、古い要求はあとから上書きしない', async () => {
    const c = fakeCanvas();
    const a = start('A', () => renderToCanvas(c.canvas, front));
    await settle();
    label = 'direct';
    const images = await (async () => {
      const p = prepareRenderable(back);
      await settle();
      loads.at(-1)!.resolve();
      return p;
    })();
    drawRenderable(c.canvas, back, images);
    expect(c.drawn).toEqual(['direct']);
    a.load().resolve();
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: false });
    expect(c.drawn).toEqual(['direct']);
  });

  it('8. 表面から裏面へ切り替えたあと、古い表面を再表示しない（閲覧者の切替を想定）', async () => {
    const c = fakeCanvas();
    const first = start('front-1', () => renderToCanvas(c.canvas, front));
    await settle();
    first.load().resolve();
    expect.soft(await outcome(first.promise)).toEqual({ ok: true, value: true });
    // 別の表面を描き始めたが、読み込み中に閲覧者が切り替わって裏面にする
    const pending = start('front-2', () => renderToCanvas(c.canvas, front));
    const flip = start('back', () => renderToCanvas(c.canvas, back));
    await settle();
    flip.load().resolve();
    expect.soft(await outcome(flip.promise)).toEqual({ ok: true, value: true });
    pending.load().resolve();
    expect.soft(await outcome(pending.promise)).toEqual({ ok: true, value: false });
    expect(c.last()).toBe('back');
    expect(c.drawn.filter((t) => t === 'front-2')).toEqual([]);
  });
});

describe('9. 今までの使い方', () => {
  it('ひとつだけの renderToCanvas は描いて true で終わる。エネルギーも描ける', async () => {
    const c = fakeCanvas();
    const r = start('E', () =>
      renderToCanvas(
        c.canvas,
        {
          kind: 'energy',
          card: { name: '草エネルギー', provides: ['grass'], special: false, text: '' },
        },
        0.5,
      ),
    );
    await settle();
    r.load().resolve();
    expect.soft(await outcome(r.promise)).toEqual({ ok: true, value: true });
    expect(c.drawn).toEqual(['E']); // sprite のアイコン 1 つ
    expect([c.canvas.width, c.canvas.height]).toEqual([200, 280]);
  });

  it('同じ Canvas でも、前の要求が終わってから次を始めればどちらも描く', async () => {
    const c = fakeCanvas();
    const a = start('A', () => renderToCanvas(c.canvas, back));
    await settle();
    a.load().resolve();
    expect.soft(await outcome(a.promise)).toEqual({ ok: true, value: true });
    const b = start('B', () => renderToCanvas(c.canvas, back));
    await settle();
    b.load().resolve();
    expect.soft(await outcome(b.promise)).toEqual({ ok: true, value: true });
    expect(c.drawn).toEqual(['A', 'B']);
  });

  it('エディタの prepareCard → drawCard で描ける', async () => {
    const c = fakeCanvas();
    const p = start('editor', () => prepareCard(createCard()));
    await settle();
    p.load().resolve();
    drawCard(c.canvas, createCard(), await p.promise, 2);
    expect(c.drawn[0]).toBe('editor');
    expect([c.canvas.width, c.canvas.height]).toEqual([800, 1120]);
  });

  it('PNG の書き出し（exportPng・renderablePng）は自分の Canvas に描いて Blob を返す', async () => {
    const created: ReturnType<typeof fakeCanvas>[] = [];
    vi.stubGlobal('document', {
      createElement: () => {
        const c = fakeCanvas();
        created.push(c);
        return c.canvas;
      },
    });
    const e = start('png-editor', () => exportPng(createCard(), 1));
    const b = start('png-back', () => renderablePng(back, 0.5));
    await settle();
    b.load().resolve();
    e.load().resolve();
    const [eb, bb] = await Promise.all([e.promise, b.promise]);
    expect(await eb.text()).toContain('png-editor');
    expect(await bb.text()).toBe('png-back');
    expect(created.map((c) => c.drawn[0])).toEqual(['png-editor', 'png-back']);
  });
});
