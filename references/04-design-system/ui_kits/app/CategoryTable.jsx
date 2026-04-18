// Category table — dense, tabular, mono numbers. PI値 / 構成比 / 前年比
function CategoryTable({ rows }) {
  const maxSales = Math.max(...rows.map(r => r.sales))
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">部門別 売上・粗利</div>
          <div className="chart-subtitle">2025年11月 累計</div>
        </div>
        <div className="chart-chips">
          <button className="chip is-on">売上</button>
          <button className="chip">粗利</button>
          <button className="chip">PI値</button>
        </div>
      </div>
      <table className="cat-table">
        <thead>
          <tr>
            <th>部門 / カテゴリ</th>
            <th className="num">売上</th>
            <th className="num">構成比</th>
            <th className="num">粗利率</th>
            <th className="num">PI値</th>
            <th className="num">前年比</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                <span className="cat-dot" style={{ background: r.color }} />
                {r.name}
              </td>
              <td className="num mono">
                <div className="cat-bar-cell">
                  <div className="cat-bar" style={{ width: `${(r.sales / maxSales) * 100}%`, background: r.color }} />
                  <span>¥{r.sales.toLocaleString()}</span>
                </div>
              </td>
              <td className="num mono">{r.share.toFixed(1)}%</td>
              <td className="num mono">{r.gpRate.toFixed(1)}%</td>
              <td className="num mono">{r.pi.toFixed(2)}</td>
              <td className={`num mono ${r.yoy >= 0 ? 'trend-up' : 'trend-down'}`}>
                {r.yoy >= 0 ? '+' : ''}{r.yoy.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

window.CategoryTable = CategoryTable
