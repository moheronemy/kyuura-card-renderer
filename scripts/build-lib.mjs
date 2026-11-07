// ライブラリとして配る形（dist-lib/）を作る。
// tsc で JS と型定義を出し、素材画像を同じ相対位置に写す。バンドルはしない
// （素材の import と @fontsource の CSS の import は、使う側のバンドラー（Vite など）が扱う）。
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';

const out = 'dist-lib';
rmSync(out, { recursive: true, force: true });
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.lib.json'], { stdio: 'inherit' });
cpSync('src/assets/card', `${out}/assets/card`, { recursive: true });
console.log(`${out}/ を作りました`);
