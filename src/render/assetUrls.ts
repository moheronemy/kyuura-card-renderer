// src/assets/card の素材画像の URL（ファイル名（拡張子なし）→ URL）。
// import.meta.glob を使わず静的な import で並べるのは、ライブラリとして配ったときに
// 使う側のバンドラーがそのまま扱えるようにするため。素材を足したら、ここにも 1 行足す（assetUrls.test.ts が照合する）。
import button_sprite from '../assets/card/button_sprite.png';
import pcard1 from '../assets/card/pcard1.png';
import pcard2 from '../assets/card/pcard2.png';
import pcard3 from '../assets/card/pcard3.png';
import pcard4 from '../assets/card/pcard4.png';
import pcard5 from '../assets/card/pcard5.png';
import pcard6 from '../assets/card/pcard6.png';
import pcard7 from '../assets/card/pcard7.png';
import pcardback from '../assets/card/pcardback.jpg';
import pcarde1 from '../assets/card/pcarde1.png';
import pcarde2 from '../assets/card/pcarde2.png';
import pcarde3 from '../assets/card/pcarde3.png';
import pcarde4 from '../assets/card/pcarde4.png';
import pcarde5 from '../assets/card/pcarde5.png';
import pcarde6 from '../assets/card/pcarde6.png';
import pcarde7 from '../assets/card/pcarde7.png';
import pcarde8 from '../assets/card/pcarde8.png';
import pcarde9 from '../assets/card/pcarde9.png';
import pcardneo1 from '../assets/card/pcardneo1.png';
import pcardneo2 from '../assets/card/pcardneo2.png';
import pcardneo3 from '../assets/card/pcardneo3.png';
import pcardneo4 from '../assets/card/pcardneo4.png';
import pcardneo5 from '../assets/card/pcardneo5.png';
import pcardneo6 from '../assets/card/pcardneo6.png';
import pcardneo7 from '../assets/card/pcardneo7.png';
import pcardneo8 from '../assets/card/pcardneo8.png';
import pcardneo9 from '../assets/card/pcardneo9.png';
import pcardpcg from '../assets/card/pcardpcg.png';
import pcardpcg1 from '../assets/card/pcardpcg1.png';
import pcardpcg2 from '../assets/card/pcardpcg2.png';
import pcardpcg3 from '../assets/card/pcardpcg3.png';
import pcardpcg4 from '../assets/card/pcardpcg4.png';
import pcardpcg5 from '../assets/card/pcardpcg5.png';
import pcardpcg6 from '../assets/card/pcardpcg6.png';
import pcardpcg7 from '../assets/card/pcardpcg7.png';
import pcardpcg8 from '../assets/card/pcardpcg8.png';
import pcardpcg9 from '../assets/card/pcardpcg9.png';
import pcardtrainer from '../assets/card/pcardtrainer.png';
import pcardtrainere from '../assets/card/pcardtrainere.png';
import pcgexrule from '../assets/card/pcgexrule.png';
import pokebody from '../assets/card/pokebody.png';
import pokepower from '../assets/card/pokepower.png';
import resistance from '../assets/card/resistance.png';
import sprite from '../assets/card/sprite.png';
import stage1 from '../assets/card/stage1.png';
import stage2 from '../assets/card/stage2.png';
import stagee1 from '../assets/card/stagee1.png';
import stagee2 from '../assets/card/stagee2.png';
import stageneo1 from '../assets/card/stageneo1.png';
import stageneo2 from '../assets/card/stageneo2.png';
import type_sprite from '../assets/card/type_sprite.png';

export const ASSET_URLS: Readonly<Record<string, string>> = {
  button_sprite,
  pcard1,
  pcard2,
  pcard3,
  pcard4,
  pcard5,
  pcard6,
  pcard7,
  pcardback,
  pcarde1,
  pcarde2,
  pcarde3,
  pcarde4,
  pcarde5,
  pcarde6,
  pcarde7,
  pcarde8,
  pcarde9,
  pcardneo1,
  pcardneo2,
  pcardneo3,
  pcardneo4,
  pcardneo5,
  pcardneo6,
  pcardneo7,
  pcardneo8,
  pcardneo9,
  pcardpcg,
  pcardpcg1,
  pcardpcg2,
  pcardpcg3,
  pcardpcg4,
  pcardpcg5,
  pcardpcg6,
  pcardpcg7,
  pcardpcg8,
  pcardpcg9,
  pcardtrainer,
  pcardtrainere,
  pcgexrule,
  pokebody,
  pokepower,
  resistance,
  sprite,
  stage1,
  stage2,
  stagee1,
  stagee2,
  stageneo1,
  stageneo2,
  type_sprite,
};
