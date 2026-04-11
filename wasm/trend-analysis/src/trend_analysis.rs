/// Monthly trend analysis: MoM, YoY, moving average, seasonal index, overall trend.
///
/// Flat contract input (column-oriented):
/// - years: i32 array
/// - months: i32 array (1-12)
/// - total_sales: f64 array
///
/// @contractId ANA-004
/// @semanticClass analytic
/// @methodFamily temporal_pattern

use crate::utils::safe_divide;

/// Business constants (matching TS domain/constants)
const MONTHS_PER_YEAR: usize = 12;
const SHORT_TERM_MA_MONTHS: usize = 3;
const MEDIUM_TERM_MA_MONTHS: usize = 6;
const TREND_CHANGE_THRESHOLD: f64 = 0.03;

/// Trend direction: 0=up, 1=down, 2=flat
#[derive(Debug, Clone, Copy, PartialEq)]
#[repr(u8)]
pub enum TrendDirection {
    Up = 0,
    Down = 1,
    Flat = 2,
}

pub struct TrendAnalysisResult {
    /// Sorted indices (for TS to reorder dataPoints)
    pub sorted_indices: Vec<usize>,
    /// MoM changes (NaN = null)
    pub mom_changes: Vec<f64>,
    /// YoY changes (NaN = null)
    pub yoy_changes: Vec<f64>,
    /// 3-month moving average (NaN = null)
    pub moving_avg_3: Vec<f64>,
    /// 6-month moving average (NaN = null)
    pub moving_avg_6: Vec<f64>,
    /// Seasonal index (12 values)
    pub seasonal_index: Vec<f64>,
    /// Overall trend direction
    pub overall_trend: TrendDirection,
    /// Average monthly sales
    pub average_monthly_sales: f64,
}

/// Number of fixed output fields before variable-length arrays.
pub const FIXED_FIELDS: usize = 2; // overall_trend + average_monthly_sales

pub fn analyze_trend(
    years: &[i32],
    months: &[i32],
    total_sales: &[f64],
) -> TrendAnalysisResult {
    let n = years.len().min(months.len()).min(total_sales.len());

    if n == 0 {
        return TrendAnalysisResult {
            sorted_indices: vec![],
            mom_changes: vec![],
            yoy_changes: vec![],
            moving_avg_3: vec![],
            moving_avg_6: vec![],
            seasonal_index: vec![1.0; MONTHS_PER_YEAR],
            overall_trend: TrendDirection::Flat,
            average_monthly_sales: 0.0,
        };
    }

    // Sort by (year, month)
    let mut indices: Vec<usize> = (0..n).collect();
    indices.sort_by(|&a, &b| {
        let ya = years[a];
        let yb = years[b];
        if ya != yb { ya.cmp(&yb) } else { months[a].cmp(&months[b]) }
    });

    let sorted_sales: Vec<f64> = indices.iter().map(|&i| total_sales[i]).collect();
    let sorted_years: Vec<i32> = indices.iter().map(|&i| years[i]).collect();
    let sorted_months: Vec<i32> = indices.iter().map(|&i| months[i]).collect();

    // MoM changes
    let mom_changes: Vec<f64> = (0..n).map(|i| {
        if i == 0 { return f64::NAN; }
        let prev = sorted_sales[i - 1];
        if prev == 0.0 { f64::NAN } else { sorted_sales[i] / prev }
    }).collect();

    // YoY changes
    let yoy_changes: Vec<f64> = (0..n).map(|i| {
        let target_year = sorted_years[i] - 1;
        let target_month = sorted_months[i];
        for j in 0..n {
            if sorted_years[j] == target_year && sorted_months[j] == target_month {
                if sorted_sales[j] == 0.0 { return f64::NAN; }
                return sorted_sales[i] / sorted_sales[j];
            }
        }
        f64::NAN
    }).collect();

    // Moving averages
    let moving_avg_3 = calculate_moving_average(&sorted_sales, SHORT_TERM_MA_MONTHS);
    let moving_avg_6 = calculate_moving_average(&sorted_sales, MEDIUM_TERM_MA_MONTHS);

    // Seasonal index
    let seasonal_index = calculate_seasonal_index(&sorted_months, &sorted_sales);

    // Overall trend
    let sum: f64 = sorted_sales.iter().sum();
    let average_monthly_sales = sum / n as f64;
    let overall_trend = determine_overall_trend(&sorted_sales);

    TrendAnalysisResult {
        sorted_indices: indices,
        mom_changes,
        yoy_changes,
        moving_avg_3,
        moving_avg_6,
        seasonal_index,
        overall_trend,
        average_monthly_sales,
    }
}

fn calculate_moving_average(values: &[f64], window: usize) -> Vec<f64> {
    values.iter().enumerate().map(|(i, _)| {
        if i < window - 1 { return f64::NAN; }
        let mut sum = 0.0;
        for j in (i + 1 - window)..=i {
            sum += values[j];
        }
        sum / window as f64
    }).collect()
}

fn calculate_seasonal_index(months: &[i32], sales: &[f64]) -> Vec<f64> {
    let mut buckets = vec![(0.0, 0usize); MONTHS_PER_YEAR];
    let mut grand_total = 0.0;
    let mut grand_count = 0usize;

    for (i, &m) in months.iter().enumerate() {
        let idx = (m - 1) as usize;
        if idx < MONTHS_PER_YEAR {
            buckets[idx].0 += sales[i];
            buckets[idx].1 += 1;
            grand_total += sales[i];
            grand_count += 1;
        }
    }

    let grand_avg = safe_divide(grand_total, grand_count as f64, 0.0);
    if grand_avg == 0.0 {
        return vec![1.0; MONTHS_PER_YEAR];
    }

    buckets.iter().map(|(total, count)| {
        if *count == 0 { return 1.0; }
        (total / *count as f64) / grand_avg
    }).collect()
}

fn determine_overall_trend(sorted_sales: &[f64]) -> TrendDirection {
    if sorted_sales.len() < 4 { return TrendDirection::Flat; }

    let n = sorted_sales.len();
    let recent_start = n.saturating_sub(SHORT_TERM_MA_MONTHS);
    let prev_start = n.saturating_sub(MEDIUM_TERM_MA_MONTHS);
    let prev_end = recent_start;

    if prev_start >= prev_end { return TrendDirection::Flat; }

    let recent: &[f64] = &sorted_sales[recent_start..];
    let previous: &[f64] = &sorted_sales[prev_start..prev_end];

    let recent_avg = recent.iter().sum::<f64>() / recent.len() as f64;
    let prev_avg = previous.iter().sum::<f64>() / previous.len() as f64;

    if prev_avg == 0.0 { return TrendDirection::Flat; }

    let change_rate = (recent_avg - prev_avg) / prev_avg;
    if change_rate > TREND_CHANGE_THRESHOLD { TrendDirection::Up }
    else if change_rate < -TREND_CHANGE_THRESHOLD { TrendDirection::Down }
    else { TrendDirection::Flat }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input() {
        let r = analyze_trend(&[], &[], &[]);
        assert!(r.mom_changes.is_empty());
        assert_eq!(r.seasonal_index.len(), 12);
        assert_eq!(r.overall_trend, TrendDirection::Flat);
    }

    #[test]
    fn upward_trend() {
        let years = [2025, 2025, 2025, 2025, 2025, 2025];
        let months = [1, 2, 3, 4, 5, 6];
        let sales = [100.0, 110.0, 120.0, 130.0, 140.0, 150.0];
        let r = analyze_trend(&years, &months, &sales);
        assert_eq!(r.overall_trend, TrendDirection::Up);
    }

    #[test]
    fn downward_trend() {
        let years = [2025, 2025, 2025, 2025, 2025, 2025];
        let months = [1, 2, 3, 4, 5, 6];
        let sales = [150.0, 140.0, 130.0, 120.0, 110.0, 100.0];
        let r = analyze_trend(&years, &months, &sales);
        assert_eq!(r.overall_trend, TrendDirection::Down);
    }
}
