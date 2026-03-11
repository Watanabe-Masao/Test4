# アーキテクチャ4層構成図

Presentation は表示に専念し、Application はユースケースを調停し、Domain は業務的正しさを定義し、Infrastructure は外部技術を実装する。依存の中心は Domain に寄せ、具体実装の配線は Composition Root に集約する。

```
Presentation = 見せる
Application  = 進める
Domain       = 正しさを決める
Infrastructure = 外界と繋ぐ
```

## 基本レイヤー図

```mermaid
flowchart TB
    P[Presentation\npages / components / charts / theme\n責務: 表示と入力受付]
    A[Application\nhooks / usecases / stores / context / workers\n責務: ユースケース調停・状態遷移]
    D[Domain\nmodels / calculations / constants / repository interfaces\n責務: 業務ルール・純粋計算・不変条件]
    I[Infrastructure\nduckdb / storage / fileImport / export / i18n / pwa\n責務: 外部技術の具体実装]

    P --> A
    A --> D
    A --> I

    note1[Presentation は\n業務計算・永続化詳細を持たない]
    note2[Domain は\n他層に依存しない]
    note3[Infrastructure は\nPort / Interface の実装を提供]

    P -.-> note1
    D -.-> note2
    I -.-> note3
```

## 依存方向を強調した図

```mermaid
flowchart LR
    P[Presentation]
    A[Application]
    D[Domain]
    I[Infrastructure]

    P --> A
    A --> D
    A --> I

    C[Composition Root\nmain.tsx / App.tsx\n具体実装の配線]
    C --> A
    C --> I
```

## 実務向けの責務分解図

```mermaid
flowchart TB
    subgraph Presentation [Presentation]
        P1[Pages]
        P2[Components / Charts]
        P3[Presentation Hooks]
    end

    subgraph Application [Application]
        A1[UseCases]
        A2[Application Hooks]
        A3[Stores]
        A4[Ports / Context]
        A5[Workers]
        A6[ViewModel / 画面向け整形]
    end

    subgraph Domain [Domain]
        D1[Models]
        D2[Calculations]
        D3[Policies / Invariants]
        D4[Repository Interfaces]
    end

    subgraph Infrastructure [Infrastructure]
        I1[IndexedDB Storage]
        I2[DuckDB WASM]
        I3[File Import]
        I4[Export]
        I5[i18n / PWA]
    end

    P1 --> A1
    P2 --> A2
    P3 --> A2

    A1 --> D2
    A2 --> D1
    A2 --> D2
    A3 --> A2
    A1 --> A4
    A2 --> A4
    A4 --> I1
    A4 --> I2
    A4 --> I3
    A4 --> I4
    A4 --> I5
```

## 守りたい境界を入れた図

```mermaid
flowchart TB
    UI[Presentation\n描画・入力]
    UC[Application\n比較制御 / 読込調停 / 状態更新 / ViewModel化]
    DM[Domain\n集計 / KPI / 比較ロジック / 制約]
    INF[Infrastructure\nIndexedDB / DuckDB / FileImport / Export]

    UI -->|ユーザー操作| UC
    UC -->|純粋計算依頼| DM
    UC -->|データ取得依頼| INF
    INF -->|生データ / 永続化結果| UC
    DM -->|計算結果| UC
    UC -->|画面表示用データ| UI

    X1[禁止:\nPresentation -> Infrastructure 直参照]
    X2[禁止:\nDomain -> React / Zustand / DuckDB]
    X3[注意:\nApplication に責務を集めすぎない]

    UI -.-> X1
    DM -.-> X2
    UC -.-> X3
```
