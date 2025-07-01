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
- 🌡️ 環境条件（気温、気圧、湿度、標高）による空気密度の自動計算
- 💨 風速・風向の影響を考慮した軌道計算
- 📥 CSV形式でのデータエクスポート機能
- 🖱️ マウスホバーによる軌道上の詳細情報表示
- 🇯🇵 完全日本語対応のユーザーインターフェース
- ⚙️ カスタマイズ可能な入力パラメータ：
  - 初速度 (fps)
  - 発射角度
  - 初期高度
  - 弾体質量
  - 抗力係数
  - 断面積
  - 環境条件（気温、気圧、湿度、標高、風速、風向）

## 数学的公式

本アプリケーションで使用される弾道計算の数学的基礎を以下に示します。

### 1. 空気抵抗を考慮した弾道計算

#### 初速度成分

$$
\begin{align}
v_{x0} &= v_0 \cos(\theta) \\
v_{y0} &= v_0 \sin(\theta)
\end{align}
$$

- $v_0$: 初速度 (m/s)
- $\theta$: 発射角度 (rad)

#### 抗力（ドラッグ）

$$
F_{drag} = \frac{1}{2} C_d \rho A v^2
$$

- $C_d$: 抗力係数
- $\rho$: 空気密度 (kg/m³)
- $A$: 断面積 (m²)
- $v$: 相対速度 (m/s)

#### 風を考慮した相対速度

$$
\begin{align}
v_{rel,x} &= v_x - v_{wind,x} \\
v_{rel,y} &= v_y - v_{wind,y} \\
v_{rel} &= \sqrt{v_{rel,x}^2 + v_{rel,y}^2}
\end{align}
$$

#### 加速度成分

$$
\begin{align}
a_x &= -\frac{F_{drag}}{m} \cdot \frac{v_{rel,x}}{v_{rel}} \\
a_y &= -\frac{F_{drag}}{m} \cdot \frac{v_{rel,y}}{v_{rel}} - g
\end{align}
$$

- $m$: 弾体質量 (kg)
- $g$: 重力加速度 (9.81 m/s²)

#### 数値積分（オイラー法）

$$
\begin{align}
v_x(t+\Delta t) &= v_x(t) + a_x \Delta t \\
v_y(t+\Delta t) &= v_y(t) + a_y \Delta t \\
x(t+\Delta t) &= x(t) + v_x \Delta t \\
y(t+\Delta t) &= y(t) + v_y \Delta t
\end{align}
$$

- $\Delta t$: 時間ステップ (0.01秒)

### 2. 空気密度の計算

#### 標高による気圧補正（気圧高度公式）

$$
P_{sea\_level} = P \left(1 - \frac{0.0065 h}{288.15}\right)^{-5.255}
$$

- $P$: 観測地点の気圧 (hPa)
- $h$: 標高 (m)

#### 飽和水蒸気圧（マグヌス式）

$$
E_s = 6.1078 \times 10^{\frac{7.5T}{T + 237.3}}
$$

- $T$: 気温 (℃)
- $E_s$: 飽和水蒸気圧 (hPa)

#### 実際の水蒸気圧

$$
E = \frac{RH}{100} \times E_s
$$

- $RH$: 相対湿度 (%)

#### 空気密度（理想気体の状態方程式）

$$
\rho = \frac{P_d M_d + P_v M_v}{R T_{abs}}
$$

- $P_d$: 乾燥空気の分圧 (Pa) = $(P_{sea\_level} - E) \times 100$
- $P_v$: 水蒸気の分圧 (Pa) = $E \times 100$
- $M_d$: 乾燥空気のモル質量 (0.0289644 kg/mol)
- $M_v$: 水蒸気のモル質量 (0.01801528 kg/mol)
- $R$: 気体定数 (8.314462618 J/(mol·K))
- $T_{abs}$: 絶対温度 (K) = $T + 273.15$

### 3. エネルギーと運動量

#### 運動エネルギー

$$
E = \frac{1}{2} m v^2
$$

#### 運動量

$$
p = m v
$$

### 4. 空気抵抗なしの弾道計算（比較用）

#### 最大高度

$$
h_{max} = \frac{v_{y0}^2}{2g}
$$

#### 飛行時間

$$
t_{flight} = \frac{2 v_{y0}}{g}
$$

#### 最大射程

$$
R_{max} = v_{x0} \times t_{flight}
$$

## 参考文献

1. **大気モデル**: International Standard Atmosphere (ISA), ISO 2533:1975
2. **マグヌス式**: Magnus, G. (1844). "Versuche über die Spannkräfte des Wasserdampfs". Annalen der Physik und Chemie. 61: 225–247.
3. **弾道係数**: McCoy, R. L. (1999). "Modern Exterior Ballistics". Schiffer Publishing.
4. **数値積分法**: Euler, L. (1768). "Institutionum calculi integralis". Impensis Academiae Imperialis Scientiarum.

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
