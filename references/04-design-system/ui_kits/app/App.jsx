// Main dashboard app — composes the UI kit into a clickthrough prototype.
// Uses globals set by the component files (NavRail, DataSidebar, ...).

function makePoints(start, n, amp, drift, seed) {
  // stable pseudo-random series
  let r = seed
  const pts = []
  for (let i = 0; i < n; i++) {
    r = (r * 9301 + 49297) % 233280
    const noise = ((r / 233280) - 0.5) * amp
    const day = new Date(2025, 10, 1 + i)
    const md = `${day.getMonth() + 1}/${day.getDate()}`
    pts.push({ x: md, y: Math.max(0.05, Math.min(0.98, start + drift * i + noise)) })
  }
  return pts
}

const N = 30
const SALES_SERIES = [
  { name: '売上', color: '#6366f1', points: makePoints(0.55, N, 0.18, 0.004, 7) },
  { name: '予算', color: '#22c55e', dashed: true, points: makePoints(0.62, N, 0.06, 0.003, 91) },
  { name: '前年', color: '#64748b', dashed: true, points: makePoints(0.50, N, 0.16, 0.003, 221) },
]
const FACTOR_ITEMS = [
  { name: '客数', value: 184_500 },
  { name: '客単価', value: 92_300 },
  { name: '販売点数', value: -41_200 },
  { name: '価格', value: 33_800 },
  { name: '構成比', value: -18_400 },
]
const CATEGORIES = [
  { name: '青果', sales: 3840200, share: 30.8, gpRate: 32.4, pi: 1.42, yoy: 5.2, color: '#22c55e' },
  { name: '精肉', sales: 2615800, share: 21.0, gpRate: 28.7, pi: 1.18, yoy: 2.8, color: '#ef4444' },
  { name: '鮮魚', sales: 1942300, share: 15.6, gpRate: 24.1, pi: 0.92, yoy: -3.1, color: '#06b6d4' },
  { name: '惣菜', sales: 1588400, share: 12.7, gpRate: 38.2, pi: 1.04, yoy: 8.4, color: '#f59e0b' },
  { name: 'デイリー', sales: 1204100, share:  9.7, gpRate: 26.0, pi: 0.81, yoy: 1.2, color: '#fbbf24' },
  { name: 'ドライ',   sales: 1292400, share: 10.2, gpRate: 21.3, pi: 0.75, yoy: -1.8, color: '#8b5cf6' },
]

const INITIAL_FILES = [
  { id: 1, name: '売上日計_202511.xlsx', rows: 48293, period: '2025-11-01 — 11-30', kind: 'sales' },
  { id: 2, name: '仕入実績_202511.csv', rows: 12841, period: '2025-11-01 — 11-30', kind: 'purchase' },
  { id: 3, name: '予算_202511.xlsx',     rows:   214, period: '2025-11 月次',       kind: 'budget' },
]

const CALC_STATUS = [
  { id: 'gp', name: '粗利計算', state: 'done' },
  { id: 'fd', name: '要因分解', state: 'done' },
  { id: 'fc', name: '需要予測', state: 'running' },
  { id: 'wt', name: '天気相関', state: 'idle' },
]

function Dashboard({ hoverIndex, setHoverIndex }) {
  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="売上" value="12,483,200" unit="¥" trend={4.0}
          sub="予算 ¥12,000,000 達成" formula="Σ(日別売上)" accent="primary" />
        <KpiCard label="粗利" value="3,095,800" unit="¥" trend={1.2}
          sub="粗利率 24.8%" formula="売上 − 原価"
          badge={{ kind: 'ok', text: '実在庫' }} accent="success-dark" />
        <KpiCard label="客数" value="9,724" unit="人" trend={-0.8}
          sub="PI値 1.24 / 日" formula="Σ(レシート)" accent="cyan-dark" />
        <KpiCard label="客単価" value="1,284" unit="¥" trend={-2.1}
          sub="2,483 → 2,501 点" formula="売上 ÷ 客数"
          badge={{ kind: 'est', text: '推定' }} accent="purple-dark" />
      </div>

      <div className="widget-grid">
        <ChartCard title="日別売上推移"
          subtitle="2025年11月 · vs 予算 / 前年"
          chips={
            <>
              <button className="chip is-on">売上</button>
              <button className="chip">予算</button>
              <button className="chip">前年</button>
            </>
          }>
          <LineChartMini series={SALES_SERIES}
            currentIndex={hoverIndex}
            onIndex={setHoverIndex} />
        </ChartCard>

        <FactorDecomp title="売上要因分解 (前年比)" total={251000} items={FACTOR_ITEMS} />
      </div>

      <div className="widget-grid">
        <CategoryTable rows={CATEGORIES} />
        <ChartCard title="曜日別 売上パターン" subtitle="過去4週平均"
          chips={<><button className="chip is-on">売上</button><button className="chip">客数</button></>}>
          <BarChartMini bars={[
            { label: '月', value: -0.15 },
            { label: '火', value: -0.08 },
            { label: '水', value: 0.05 },
            { label: '木', value: 0.12 },
            { label: '金', value: 0.45 },
            { label: '土', value: 0.85 },
            { label: '日', value: 0.62 },
          ]} />
        </ChartCard>
      </div>
    </>
  )
}

function PageEmpty({ icon, title, hint }) {
  return (
    <div className="empty-state">
      <div className="big">{icon}</div>
      <div className="es-title">{title}</div>
      <div className="es-sub">{hint}</div>
    </div>
  )
}

function App() {
  const [active, setActive] = React.useState('dashboard')
  const [range, setRange] = React.useState('月次')
  const [editMode, setEditMode] = React.useState(false)
  const [theme, setTheme] = React.useState('dark')
  const [files, setFiles] = React.useState(INITIAL_FILES)
  const [toasts, setToasts] = React.useState([])
  const [hoverIndex, setHoverIndex] = React.useState(null)

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleImport = () => {
    const id = Date.now()
    const f = { id, name: `新規ファイル_${id % 10000}.xlsx`, rows: 1000 + Math.floor(Math.random() * 40000), period: '2025-11 月次', kind: 'sales' }
    setFiles((p) => [...p, f])
    setToasts((p) => [...p, { id, text: `${f.name} をインポートしました` }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2500)
  }

  const page = (() => {
    switch (active) {
      case 'dashboard': return <Dashboard hoverIndex={hoverIndex} setHoverIndex={setHoverIndex} />
      case 'daily': return <PageEmpty icon="📅" title="日別売上分析" hint="日別推移・時間帯ドリルダウン・曜日パターン。左のダッシュボードから売上カードをクリックしても遷移できます。" />
      case 'factor': return <PageEmpty icon="📈" title="要因分解" hint="売上差異 = 客数 × 客単価 × 点数 × 価格 × 構成比 への分解。" />
      case 'category': return <PageEmpty icon="📦" title="カテゴリ分析" hint="部門 / ライン / クラス別の売上・PI値・構成比。" />
      case 'purchase': return <PageEmpty icon="🛒" title="仕入分析" hint="原価/売価の日別推移、値入率、カテゴリ別内訳。" />
      case 'budget': return <PageEmpty icon="💰" title="予算管理" hint="達成率、残予算ペース、前年比較。" />
      case 'forecast': return <PageEmpty icon="🔮" title="需要予測" hint="週別予測、曜日パターン、着地予測・ゴールシーク。" />
      case 'reports': return <PageEmpty icon="📋" title="レポート" hint="P&L サマリー、部門 KPI、CSV エクスポート。" />
      case 'weather': return <PageEmpty icon="🌤" title="天気相関" hint="気象庁データとの売上相関分析。" />
      case 'admin': return <PageEmpty icon="⚙️" title="管理" hint="ユーザー / 権限 / 店舗マスタ設定。" />
      default: return null
    }
  })()

  const titleOf = NAV_ITEMS_MAP[active] || { title: 'ページ', crumbs: ['管理'] }

  return (
    <div className="app-shell">
      <NavRail active={active} onNavigate={setActive} theme={theme}
        onToggleTheme={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')} />
      <DataSidebar files={files} onImport={handleImport} calcStatus={CALC_STATUS} />
      <div className="main-scroll">
        <div className="main">
          <Toolbar title={titleOf.title} breadcrumbs={titleOf.crumbs}
            range={range} onRange={setRange}
            editMode={editMode} onToggleEdit={() => setEditMode(!editMode)} />
          {page}
        </div>
      </div>
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <div className="toast-left" />
            <div>{t.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const NAV_ITEMS_MAP = {
  dashboard: { title: '全店舗ダッシュボード', crumbs: ['ホーム', 'ダッシュボード'] },
  daily:     { title: '日別売上分析',         crumbs: ['ホーム', '日別売上'] },
  factor:    { title: '要因分解',             crumbs: ['ホーム', '要因分解'] },
  category:  { title: 'カテゴリ分析',         crumbs: ['ホーム', 'カテゴリ'] },
  purchase:  { title: '仕入分析',             crumbs: ['ホーム', '仕入'] },
  budget:    { title: '予算管理',             crumbs: ['ホーム', '予算'] },
  forecast:  { title: '需要予測',             crumbs: ['ホーム', '需要予測'] },
  reports:   { title: 'レポート',             crumbs: ['ホーム', 'レポート'] },
  weather:   { title: '天気相関',             crumbs: ['ホーム', '天気相関'] },
  admin:     { title: '管理',                  crumbs: ['ホーム', '管理'] },
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
