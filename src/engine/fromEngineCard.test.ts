import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromEngineCard, rarityOf, seriesOf, type EngineCardRecord } from './fromEngineCard';

const none = { ja: null, en: null };

const pokemon = (
  over: Partial<NonNullable<EngineCardRecord['pokemon']>> = {},
): EngineCardRecord['pokemon'] => ({
  stage: 'basic',
  evolves_from: null,
  hp: 40,
  types: ['fire'],
  weaknesses: [{ type: 'water' }],
  resistances: [],
  retreat_cost: 1,
  rules_text: null,
  powers: [],
  attacks: [],
  ...over,
});

// kyuura_cards.json の PMCG1-016（ポニータ）から、描画に使う項目を写したもの
const ponyta: EngineCardRecord = {
  id: 'PMCG1-016',
  jp_set: 'PMCG1',
  category: 'pokemon',
  name: { ja: 'ポニータ', en: 'Ponyta' },
  pokemon: pokemon({
    attacks: [
      {
        name: { ja: 'けりとばす', en: 'Smash Kick' },
        cost: ['colorless', 'colorless'],
        damage: { display: '20' },
        text: none,
      },
      {
        name: { ja: 'ほのおのしっぽ', en: 'Flame Tail' },
        cost: ['fire', 'fire'],
        damage: { display: '30' },
        text: none,
      },
    ],
  }),
  trainer: null,
  energy: null,
  jp_print: { level: 10, rarity: '●(C)' },
};

describe('fromEngineCard', () => {
  it('ポケモンの印刷の項目を CardData にする', () => {
    const item = fromEngineCard(ponyta);
    expect(item.kind).toBe('card');
    if (item.kind !== 'card') return;
    const c = item.card;
    expect(c).toMatchObject({
      series: 'base',
      stage: 'basic',
      type: 'fire',
      name: 'ポニータ',
      hp: '40',
      level: '10',
      weakness: 'water',
      resistance: null,
      resistanceValue: '',
      retreat: 1,
      rarity: '●',
    });
    expect(c.moves).toEqual([
      { name: 'けりとばす', damage: '20', text: '', cost: ['colorless', 'colorless'] },
      { name: 'ほのおのしっぽ', damage: '30', text: '', cost: ['fire', 'fire'] },
    ]);
    expect(c.holo.style).toBe('none');
  });

  it('ポケモンパワーはワザ欄の先頭に書き、進化・抵抗力・キラも写す', () => {
    const item = fromEngineCard({
      ...ponyta,
      id: 'PMCG1-015',
      name: { ja: 'フシギバナ', en: 'Venusaur' },
      pokemon: pokemon({
        stage: 'stage2',
        evolves_from: { ja: 'フシギソウ', en: 'Ivysaur' },
        types: ['grass'],
        weaknesses: [{ type: 'fire' }],
        resistances: [{ type: 'lightning', value: 30 }],
        retreat_cost: 6,
        powers: [
          {
            kind: 'pokemon_power',
            name: { ja: 'エナジートランス', en: null },
            text: { ja: '説明', en: null },
          },
        ],
        attacks: [
          {
            name: { ja: 'ソーラービーム', en: null },
            cost: ['grass', 'grass', 'grass', 'grass'],
            damage: { display: '60' },
            text: null,
          },
        ],
      }),
      jp_print: { level: 67, rarity: '★(キラ)' },
    });
    if (item.kind !== 'card') throw new Error(item.kind);
    expect(item.card).toMatchObject({
      stage: 'stage2',
      evolvesFrom: 'フシギソウ',
      resistance: 'lightning',
      resistanceValue: '-30',
      retreat: 4,
      rarity: '★',
      holo: { style: 'swirl', area: 'art' },
    });
    expect(item.card.moves.map((m) => m.name)).toEqual([
      'ポケモンパワー：エナジートランス',
      'ソーラービーム',
    ]);
    expect(item.card.moves[0]).toMatchObject({ text: '説明', cost: [], damage: '' });
    expect(
      fromEngineCard({ ...ponyta, jp_print: { rarity: '-(キラ)' } }, { holo: false }),
    ).toMatchObject({
      card: { holo: { style: 'none' } },
    });
  });

  it('ベイビィはたねとして描き、日本語がないときは英語を使う', () => {
    const item = fromEngineCard({
      ...ponyta,
      pokemon: pokemon({
        stage: 'baby',
        attacks: [
          {
            name: { ja: null, en: 'Tackle' },
            cost: [],
            damage: null,
            text: { ja: null, en: 'Flip a coin.' },
          },
        ],
      }),
    });
    if (item.kind !== 'card') throw new Error(item.kind);
    expect(item.card.stage).toBe('basic');
    expect(item.card.moves[0]).toEqual({
      name: 'Tackle',
      damage: '',
      text: 'Flip a coin.',
      cost: [],
    });
  });

  it('トレーナーはトレーナーの枠と説明', () => {
    const item = fromEngineCard({
      ...ponyta,
      category: 'trainer',
      name: { ja: 'きずぐすり', en: 'Potion' },
      pokemon: null,
      trainer: { text: { ja: 'ダメージカウンターを2個とる。', en: null } },
      jp_print: { rarity: '●(C)' },
    });
    if (item.kind !== 'card') throw new Error(item.kind);
    expect(item.card).toMatchObject({
      stage: 'trainer',
      name: 'きずぐすり',
      trainerText: 'ダメージカウンターを2個とる。',
    });
  });

  it('エネルギーは仮の表示のデータにする', () => {
    const base = { ...ponyta, category: 'energy', pokemon: null, trainer: null };
    expect(
      fromEngineCard({
        ...base,
        name: { ja: '草エネルギー', en: null },
        energy: { kind: 'basic', provides: ['grass'], text: null },
      }),
    ).toEqual({
      kind: 'energy',
      card: { name: '草エネルギー', provides: ['grass'], special: false, text: '' },
    });
    expect(
      fromEngineCard({
        ...base,
        name: { ja: '無色2個エネルギー', en: null },
        energy: {
          kind: 'special',
          provides: [],
          text: { ja: null, en: 'Provides ColorlessColorless energy.' },
        },
      }),
    ).toEqual({
      kind: 'energy',
      card: {
        name: '無色2個エネルギー',
        provides: [],
        special: true,
        text: 'Provides ColorlessColorless energy.',
      },
    });
  });
});

describe('seriesOf / rarityOf', () => {
  it('neo の時期の弾と、悪・鋼を使うカードは neo の枠', () => {
    expect(seriesOf({ jp_set: 'neo2', pokemon: null })).toBe('neo');
    expect(seriesOf({ jp_set: 'PRN', pokemon: null })).toBe('neo');
    expect(seriesOf({ jp_set: 'NIP1X', pokemon: null })).toBe('neo');
    expect(seriesOf({ jp_set: 'PMCG4', pokemon: null })).toBe('base');
    expect(seriesOf({ jp_set: 'PF3', pokemon: pokemon({ types: ['darkness'] }) })).toBe('neo');
  });

  it('印刷のレアリティを記号にする', () => {
    expect(
      [
        '●(C)',
        '●(U)',
        '◆(U)',
        '♦(U)',
        '◇',
        '★(R)(闇からの挑戦)',
        '☆(R)',
        '★★★(キラ)',
        '-(キラ)',
        '-',
        null,
      ].map(rarityOf),
    ).toEqual(['●', '●', '◆', '◆', '◆', '★', '★', '★★★', '', '', '']);
  });
});

// エンジンの同梱データ全体での確かめ（任意）。KYUURA_CARDS_JSON に kyuura_cards.json の場所を入れたときだけ動く
const cardsJson = process.env.KYUURA_CARDS_JSON;
describe.runIf(cardsJson)('エンジンの全カード', () => {
  it('すべて変換でき、空の名前がない', () => {
    const { cards } = JSON.parse(readFileSync(cardsJson!, 'utf8')) as { cards: EngineCardRecord[] };
    const kinds: Record<string, number> = {};
    for (const record of cards) {
      const item = fromEngineCard(record);
      kinds[item.kind] = (kinds[item.kind] ?? 0) + 1;
      if (item.kind !== 'back') expect(item.card.name, record.id).not.toBe('');
    }
    expect(kinds.card! + kinds.energy!).toBe(cards.length);
  });
});
