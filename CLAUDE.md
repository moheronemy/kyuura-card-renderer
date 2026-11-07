# CLAUDE.md

## 変更してよいリポジトリ

変更してよいのは **kyuura-card-renderer（このリポジトリ）だけ** です。

- 編集・コミット・push はこのリポジトリの中だけで行います。
- 次のリポジトリは **読むだけ** にします。参考のために clone・pull・調査・ローカルでの実行はしてかまいませんが、ファイルの変更・コミット・push・Issue や PR の作成はしません。
  - [moheronemy/kyuura-engine](https://github.com/moheronemy/kyuura-engine)（対戦エンジン）
  - [moheronemy/kyuura-engine-gui](https://github.com/moheronemy/kyuura-engine-gui)（エンジンの GUI）
- 読むだけのリポジトリに直すべき点を見つけたときは、変更せずに、内容と直し方の案をユーザーに伝えます。
- 読むだけのリポジトリで依存を入れるなど、ローカルに生成物（`.venv`・`node_modules`・`dist` など）ができるのはかまいません。ただし、追跡されているファイルは変更しません。
