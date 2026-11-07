/**
 * kyuura-card-renderer をほかのアプリ（kyuura-engine-gui など）から使うための入口。
 * ここから export したものだけを公開の API とする（ほかのファイルの中身は変わることがある）。
 *
 * 使い方:
 *   const item = fromEngineCard(record);           // エンジンのカードデータ → 描けるデータ
 *   await renderToCanvas(canvas, item, 0.5);       // 200×280 で描く（400×560 が 1）
 */
export {
  ABILITY_KINDS,
  ENERGY_LABELS,
  ENERGY_TYPES,
  RARITIES,
  SERIES,
  STAGES,
  createCard,
  normalizeCard,
  parseCard,
  type Ability,
  type AbilityKind,
  type Artwork,
  type CardData,
  type EnergyType,
  type Holo,
  type Move,
  type Rarity,
  type Series,
  type Stage,
} from '../model/card';
export {
  createEnergyCard,
  ENERGY_PLACEHOLDER_NOTE,
  type EnergyCardData,
} from '../render/energyCard';
export { CARD_HEIGHT, CARD_WIDTH, type RenderImages } from '../render/renderCard';
export {
  cancelRenderToCanvas,
  drawRenderable,
  prepareRenderable,
  renderablePng,
  renderRenderable,
  renderToCanvas,
  type RenderableCard,
} from '../render/renderable';
export {
  energyFromEngineCard,
  fromEngineCard,
  rarityOf,
  seriesOf,
  type EngineAttack,
  type EngineCardRecord,
  type EnginePower,
  type EngineText,
  type FromEngineCardOptions,
} from '../engine/fromEngineCard';
