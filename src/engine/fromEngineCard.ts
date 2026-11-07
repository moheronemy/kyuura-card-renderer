import {
  ENERGY_TYPES,
  MAX_RETREAT,
  createCard,
  normalizeCard,
  type CardData,
  type EnergyType,
  type Move,
  type Rarity,
  type Series,
} from '../model/card';
import type { EnergyCardData } from '../render/energyCard';
import type { RenderableCard } from '../render/renderable';

/**
 * kyuura-engine の同梱カードデータ（kyuura_engine/data/kyuura_cards.json の `cards` の 1 件）のうち、
 * 描画に使う項目。ほかの項目があってもかまわない（使わない）。
 */
export interface EngineText {
  ja: string | null;
  en: string | null;
}

export interface EngineAttack {
  name: EngineText;
  cost: string[];
  damage: { display: string | null } | null;
  text: EngineText | null;
}

export interface EnginePower {
  kind: string;
  name: EngineText;
  text: EngineText | null;
}

export interface EngineCardRecord {
  id: string;
  jp_set: string;
  category: 'pokemon' | 'trainer' | 'energy' | string;
  name: EngineText;
  pokemon: {
    stage: string | null;
    evolves_from: EngineText | null;
    hp: number | null;
    types: string[];
    weaknesses: { type: string }[];
    resistances: { type: string; value?: number | null }[];
    retreat_cost: number | null;
    rules_text: EngineText | null;
    powers: EnginePower[];
    attacks: EngineAttack[];
  } | null;
  trainer: { text: EngineText | null } | null;
  energy: { kind: string; provides: string[]; text: EngineText | null } | null;
  jp_print?: { level?: number | null; rarity?: string | null; series?: string | null } | null;
}

const isEnergyType = (v: unknown): v is EnergyType =>
  typeof v === 'string' && (ENERGY_TYPES as readonly string[]).includes(v);

const energyTypes = (list: readonly string[] | null | undefined): EnergyType[] =>
  (list ?? []).filter(isEnergyType);

/** 日本語を優先し、なければ英語 */
const text = (t: EngineText | null | undefined): string => t?.ja ?? t?.en ?? '';

/** neo の時期の弾（neo1〜4・neo のプロモ・イントロパック★neo）なら neo の枠 */
const NEO_SETS = /^(neo|PRN|NIP)/;

/** 弾の記号からシリーズ（枠）を決める。エンジンのカードは旧裏と neo の時期だけ */
export const seriesOf = (record: Pick<EngineCardRecord, 'jp_set' | 'pokemon'>): Series => {
  if (NEO_SETS.test(record.jp_set)) return 'neo';
  // 旧裏の枠には悪・鋼のアイコンがないので、使うカードは neo の枠で描く
  const p = record.pokemon;
  const used = p
    ? [
        ...p.types,
        ...p.weaknesses.map((w) => w.type),
        ...p.resistances.map((r) => r.type),
        ...p.attacks.flatMap((a) => a.cost),
      ]
    : [];
  return used.some((t) => t === 'darkness' || t === 'metal') ? 'neo' : 'base';
};

/** 印刷のレアリティ（「●(C)」「★(R)(闇からの挑戦)」「-(キラ)」など）をレンダラーの記号にする */
export const rarityOf = (printed: string | null | undefined): Rarity => {
  const s = printed ?? '';
  if (s.startsWith('★★★')) return '★★★';
  if (s.startsWith('★') || s.startsWith('☆')) return '★';
  if (s.startsWith('◆') || s.startsWith('♦') || s.startsWith('◇')) return '◆';
  if (s.startsWith('●')) return '●';
  return '';
};

const stageOf = (stage: string | null): CardData['stage'] =>
  stage === 'stage1' || stage === 'stage2' ? stage : 'basic'; // ベイビィ（baby）は枠がないので、たねとして描く

const attackMove = (a: EngineAttack): Move => ({
  name: text(a.name),
  damage: a.damage?.display ?? '',
  text: text(a.text),
  cost: energyTypes(a.cost),
});

/** 旧裏・neo のポケモンパワーは、ワザ欄に「ポケモンパワー：名前」と説明を書く */
const powerMove = (p: EnginePower): Move => ({
  name: `ポケモンパワー：${text(p.name)}`,
  damage: '',
  text: text(p.text),
  cost: [],
});

const pokemonCard = (record: EngineCardRecord, base: CardData): CardData => {
  const p = record.pokemon;
  if (!p) return base;
  const resistance = p.resistances[0];
  const moves = [...p.powers.map(powerMove), ...p.attacks.map(attackMove)];
  return {
    ...base,
    stage: stageOf(p.stage),
    type: energyTypes(p.types)[0] ?? 'colorless',
    hp: p.hp == null ? '' : String(p.hp),
    level: record.jp_print?.level == null ? '' : String(record.jp_print.level),
    evolvesFrom: text(p.evolves_from),
    moves: moves.length ? moves : base.moves,
    weakness: energyTypes(p.weaknesses.map((w) => w.type))[0] ?? null,
    resistance: resistance && isEnergyType(resistance.type) ? resistance.type : null,
    resistanceValue: resistance?.value ? `-${resistance.value}` : '',
    retreat: Math.max(0, Math.min(MAX_RETREAT, p.retreat_cost ?? 0)),
    // ルール文（「ひかる」ポケモンの枚数の制限など）は図鑑の説明の欄に書く
    pokedex: text(p.rules_text),
  };
};

/** エンジンのエネルギーカードを、エネルギーの仮の表示のデータにする */
export const energyFromEngineCard = (record: EngineCardRecord): EnergyCardData => ({
  name: text(record.name),
  provides: energyTypes(record.energy?.provides),
  special: record.energy?.kind !== 'basic',
  text: text(record.energy?.text),
});

export interface FromEngineCardOptions {
  /** 印刷がキラのカードにキラ加工をかける（既定 true） */
  holo?: boolean;
}

/**
 * kyuura-engine のカードデータを、レンダラーで描けるデータにする。
 * イラスト・イラストレーター・図鑑の説明・カード番号はエンジンのデータにないので空のまま。
 */
export const fromEngineCard = (
  record: EngineCardRecord,
  options: FromEngineCardOptions = {},
): RenderableCard => {
  if (record.category === 'energy') return { kind: 'energy', card: energyFromEngineCard(record) };

  const series = seriesOf(record);
  const printedRarity = record.jp_print?.rarity ?? '';
  const base: CardData = {
    ...createCard(),
    series,
    name: text(record.name),
    rarity: rarityOf(printedRarity),
  };
  if ((options.holo ?? true) && printedRarity.includes('キラ')) {
    base.holo = { style: series === 'neo' ? 'cosmos' : 'swirl', area: 'art', intensity: 0.5 };
  }
  const card =
    record.category === 'trainer'
      ? { ...base, stage: 'trainer' as const, trainerText: text(record.trainer?.text) }
      : pokemonCard(record, base);
  return { kind: 'card', card: normalizeCard(card) };
};
