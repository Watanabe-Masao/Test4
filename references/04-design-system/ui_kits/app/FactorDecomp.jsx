// Factor decomposition widget — a small waterfall list with +/- bars.
// This is a signature visual of the product.

function FactorDecomp({ title, total, items }) {
  const max = Math.max(...items.map(i => Math.abs(i.value)))
  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">{title}</div>
          <div className="chart-subtitle">売上差異 = 客数 × 客単価 × 点数 × 価格 × 構成比</div>
        </div>
        <div className="fac-total">
          <span className="ds-eyebrow">合計差異</span>
          <span className={`mono fac-total-v ${total >= 0 ? 'trend-up' : 'trend-down'}`}>
            {total >= 0 ? '+' : ''}¥{total.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="fac-list">
        {items.map((it) => {
          const pct = (Math.abs(it.value) / max) * 100
          const pos = it.value >= 0
          return (
            <div key={it.name} className="fac-row">
              <div className="fac-name">{it.name}</div>
              <div className="fac-bar-wrap">
                <div className="fac-bar-mid" />
                <div
                  className={`fac-bar ${pos ? 'pos' : 'neg'}`}
                  style={{
                    width: `${pct / 2}%`,
                    left: pos ? '50%' : `${50 - pct / 2}%`,
                  }}
                />
              </div>
              <div className={`fac-val mono ${pos ? 'trend-up' : 'trend-down'}`}>
                {pos ? '+' : ''}¥{it.value.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

window.FactorDecomp = FactorDecomp
