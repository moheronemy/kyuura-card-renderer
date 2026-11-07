import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('assetUrls', () => {
  it('src/assets/card のファイルをすべて、過不足なく並べている', async () => {
    const dir = fileURLToPath(new URL('../assets/card', import.meta.url));
    const files = readdirSync(dir)
      .map((f) => f.replace(/\.\w+$/, ''))
      .sort();
    const { ASSET_URLS } = await import('./assetUrls');
    expect(Object.keys(ASSET_URLS).sort()).toEqual(files);
  });
});
