import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent,
} from 'react';
import cardBackUrl from '../assets/card/pcardback.jpg';
import { layoutGuides } from '../layout/guides';
import { getLayout } from '../layout/layout';
import type { CardData } from '../model/card';
import { drawCard, prepareCard } from '../render/draw';
import { holoPath } from '../render/holo';
import { CARD_HEIGHT, CARD_WIDTH } from '../render/renderCard';
import type { CardAction } from '../state/cardReducer';
import { GuideOverlay } from './GuideOverlay';

// 保存キーは旧リポジトリ名（pcigen）の接頭辞にそろえている
const GUIDES_KEY = 'pcigen:guides';

const loadShowGuides = () => {
  try {
    return localStorage.getItem(GUIDES_KEY) === '1';
  } catch {
    return false;
  }
};

interface Props {
  card: CardData;
  dispatch: Dispatch<CardAction>;
}

export const Preview = ({ card, dispatch }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [showGuides, setShowGuides] = useState(loadShowGuides);
  /** 確認モードで表示する、マウスの位置のカード座標 */
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  // 最新の card をイベントハンドラから参照する
  const cardRef = useRef(card);
  useEffect(() => {
    cardRef.current = card;
  }, [card]);

  useEffect(() => {
    let cancelled = false;
    prepareCard(card)
      .then((images) => {
        if (cancelled || !canvasRef.current) return;
        // 画面では高解像度ディスプレイ向けに2倍で描く
        drawCard(canvasRef.current, card, images, 2);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [card]);

  /** 画面上の座標をカード座標（400×560）に変換する */
  const toCard = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, k: 1 };
    const k = CARD_WIDTH / rect.width;
    return { x: (clientX - rect.left) * k, y: (clientY - rect.top) * k, k };
  };

  const inArtWindow = (clientX: number, clientY: number) => {
    const c = cardRef.current;
    if (!c.art.src) return false;
    const { x, y } = toCard(clientX, clientY);
    const w = getLayout(c).artWindow;
    return x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h;
  };

  // ホイールでの拡大縮小（スクロールを止めるため passive: false で登録する）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!inArtWindow(e.clientX, e.clientY)) return;
      e.preventDefault();
      dispatch({ type: 'zoomArt', key: 'art', factor: Math.exp(-e.deltaY * 0.001) });
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const tiltRef = useRef<HTMLDivElement>(null);
  const holoOn = card.holo.style !== 'none' && card.holo.intensity > 0;

  /** マウスの位置に合わせて、カードを少し傾けて光の当たり方を動かす */
  const onTilt = (e: PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    // 確認モードでは座標を読みやすくするため傾けない
    if (!el || !holoOn || flipped || showGuides || e.pointerType === 'touch') return;
    const rect = el.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    // ドラッグ中は傾けない（位置合わせがずれるため）
    const tilt = drag.current ? 0 : 1;
    el.style.setProperty('--rx', `${(0.5 - py) * 14 * tilt}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * 14 * tilt}deg`);
    el.classList.add('hovering');
  };

  const onTiltEnd = () => {
    const el = tiltRef.current;
    if (!el) return;
    for (const v of ['--mx', '--my', '--rx', '--ry']) el.style.removeProperty(v);
    el.classList.remove('hovering');
  };

  const holoMask = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${CARD_WIDTH} ${CARD_HEIGHT}' preserveAspectRatio='none'><path fill='white' fill-rule='evenodd' d='${holoPath(card.holo.area, getLayout(card).artWindow)}'/></svg>`,
  )}")`;

  return (
    <div className="preview">
      <div ref={tiltRef} className="card-tilt" onPointerMove={onTilt} onPointerLeave={onTiltEnd}>
        <div
          className={`card-flip${flipped ? ' flipped' : ''}`}
          data-testid="card-flip"
          onDoubleClick={() => setFlipped((f) => !f)}
        >
          <canvas
            ref={canvasRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            className={card.art.src ? 'draggable' : undefined}
            role="img"
            aria-label={`カードのプレビュー${card.name ? `：${card.name}` : ''}`}
            data-testid="card-canvas"
            onPointerDown={(e) => {
              if (!inArtWindow(e.clientX, e.clientY)) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (showGuides) {
                const p = toCard(e.clientX, e.clientY);
                setPointer({ x: Math.round(p.x), y: Math.round(p.y) });
              }
              const d = drag.current;
              if (!d || d.id !== e.pointerId) return;
              const { k } = toCard(e.clientX, e.clientY);
              dispatch({
                type: 'moveArt',
                key: 'art',
                dx: (e.clientX - d.x) * k,
                dy: (e.clientY - d.y) * k,
              });
              drag.current = { ...d, x: e.clientX, y: e.clientY };
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onPointerLeave={() => setPointer(null)}
          />
          {holoOn && (
            <div
              className="holo-shine"
              data-testid="holo-shine"
              aria-hidden
              style={
                {
                  '--holo-intensity': card.holo.intensity,
                  maskImage: holoMask,
                  WebkitMaskImage: holoMask,
                } as CSSProperties
              }
            />
          )}
          {showGuides && <GuideOverlay guides={layoutGuides(getLayout(card))} />}
          <img
            className="card-back"
            src={cardBackUrl}
            alt="カードの裏面"
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            draggable={false}
            aria-hidden={!flipped}
          />
        </div>
      </div>
      <div className="preview-tools">
        <button
          type="button"
          className="small"
          aria-pressed={flipped}
          onClick={() => setFlipped((f) => !f)}
        >
          {flipped ? 'おもてを見る' : 'うらを見る'}
        </button>
        <label className="guide-toggle">
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(e) => {
              const on = e.target.checked;
              setShowGuides(on);
              setPointer(null);
              try {
                localStorage.setItem(GUIDES_KEY, on ? '1' : '0');
              } catch {
                // 保存できなくても表示は切り替わる
              }
            }}
          />
          レイアウト確認
        </label>
      </div>
      {showGuides && (
        <p className="guide-coords muted" aria-live="polite">
          {pointer
            ? `カード座標 x: ${pointer.x} / y: ${pointer.y}`
            : 'カードの上にマウスを乗せると座標が出ます（400×560）'}
          <br />
          <span className="guide-legend">
            <span className="guide-image">■</span>画像 <span className="guide-text">■</span>文字{' '}
            <span className="guide-icon">■</span>アイコン <span className="guide-area">■</span>範囲
          </span>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
};
