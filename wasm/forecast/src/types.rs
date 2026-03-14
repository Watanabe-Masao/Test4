/// Standard deviation result
pub struct StdDevResult {
    pub mean: f64,
    pub std_dev: f64,
}

/// Anomaly detection result for a single data point
pub struct AnomalyEntry {
    pub day: f64,
    pub value: f64,
    pub mean: f64,
    pub std_dev: f64,
    pub z_score: f64,
    pub is_anomaly: bool,
}

/// Weighted moving average entry
pub struct WmaEntry {
    pub day: f64,
    pub actual: f64,
    pub wma: f64,
}

/// Linear regression result
pub struct RegressionResult {
    pub slope: f64,
    pub intercept: f64,
    pub r_squared: f64,
}

/// Trend analysis result (numeric fields only; dataPoints stay in TS)
pub struct TrendResult {
    /// MoM changes (NaN = null)
    pub mom_changes: Vec<f64>,
    /// YoY changes (NaN = null)
    pub yoy_changes: Vec<f64>,
    /// 3-month moving average (NaN = null)
    pub moving_avg_3: Vec<f64>,
    /// 6-month moving average (NaN = null)
    pub moving_avg_6: Vec<f64>,
    /// Seasonal index (always length 12)
    pub seasonal_index: Vec<f64>,
    /// 0 = up, 1 = down, 2 = flat
    pub overall_trend: u8,
    /// Average monthly sales
    pub average_monthly_sales: f64,
}
