# ballistic-js

[![Unit Tests](https://github.com/key/ballistic-js/actions/workflows/test.yml/badge.svg)](https://github.com/key/ballistic-js/actions/workflows/test.yml)
[![Deploy to GitHub Pages](https://github.com/key/ballistic-js/actions/workflows/deploy.yml/badge.svg)](https://github.com/key/ballistic-js/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

日本語対応の弾道軌道計算アプリケーション

## デモ

[https://key.github.io/ballistic-js/](https://key.github.io/ballistic-js/)

## 機能

- 🎯 空気抵抗を考慮した正確な弾道計算
- 📊 リアルタイムな軌道の可視化
- 📏 距離別の速度・エネルギー表示（50m, 100m, 150m, 200m, 300m）
- 🇯🇵 完全日本語対応のユーザーインターフェース
- ⚙️ カスタマイズ可能な入力パラメータ：
  - 初速度 (fps)
  - 発射角度
  - 初期高度
  - 弾体質量
  - 抗力係数
  - 断面積
  - 空気密度

## 技術スタック

- Vanilla JavaScript (ES6+)
- HTML5 Canvas API
- CSS3
- Jest (テスティング)
- GitHub Actions (CI/CD)

## ローカル開発

### 前提条件

- Node.js 18.x 以上
- npm

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/key/ballistic-js.git
cd ballistic-js

# 依存関係のインストール
npm install
```

### テストの実行

```bash
# 単体テストの実行
npm test

# カバレッジレポート付きテスト
npm run test:coverage

# ウォッチモードでのテスト
npm run test:watch
```

### ローカルサーバーの起動

```bash
# Python 3を使用
python -m http.server 8000

# Node.jsを使用（http-serverをグローバルインストール済みの場合）
http-server
```

ブラウザで `http://localhost:8000` を開いてアプリケーションにアクセスします。

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容について議論してください。

1. フォーク
2. フィーチャーブランチの作成 (`git checkout -b feature/amazing-feature`)
3. 変更のコミット (`git commit -m 'feat: 素晴らしい機能を追加'`)
4. ブランチへのプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストの作成

## ライセンス

このプロジェクトは MIT ライセンスのもとで公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 作者

ballistic-js contributors

---

Made with ❤️ and physics
