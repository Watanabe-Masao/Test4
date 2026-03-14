use crate::types::TrendResult;
use crate::utils::safe_divide;

/// Trend change threshold: ±3% for up/down determination.
/// Matches TS `TREND_CHANGE_THRESHOLD` in trendAnalysis.ts.
const TREND_CHANGE_THRESHOLD: f64 = 0.03;

/// Analyze trend from monthly data points.
/// Matches TS `analyzeTrend` in trendAnalysis.ts exactly.
///
/// Input: parallel arrays (years, months, total_sales), NOT pre-sorted.
/// This function sorts by (year, month) internally.
///
/// Output: TrendResult with all computed fields. DataPoints reconstruction
/// is handled by the TS adapter (Rust only returns computed values).
pub fn analyze_trend(years: &[f64], months: &[f64], total_sales: &[f64]) -> TrendResult {
    let n = years.len().min(months.len()).min(total_sales.len());

    if n == 0 {
        return TrendResult {
            mom_changes: vec![],
            yoy_changes: vec![],
            moving_avg_3: vec![],
            moving_avg_6: vec![],
            seasonal_index: vec![1.0; 12],
            overall_trend: 2, // flat
            average_monthly_sales: 0.0,
        };
    }

    // Build indices and sort by (year, month)
    let mut indices: Vec<usize> = (0..n).collect();
    indices.sort_by(|&a, &b| {
        let ya = years[a] as i64;
        let yb = years[b] as i64;
        let ma = months[a] as i64;
        let mb = months[b] as i64;
        ya.cmp(&yb).then(ma.cmp(&mb))
    });

    let sorted_years: Vec<f64> = indices.iter().map(|&i| years[i]).collect();
    let sorted_months: Vec<f64> = indices.iter().map(|&i| months[i]).collect();
    let sorted_sales: Vec<f64> = indices.iter().map(|&i| total_sales[i]).collect();

    // MoM changes
    let mom_changes: Vec<f64> = (0..n)
        .map(|i| {
            if i == 0 {
                return f64::NAN;
            }
            let prev_sales = sorted_sales[i - 1];
            if prev_sales == 0.0 {
                f64::NAN
            } else {
                sorted_sales[i] / prev_sales
            }
        })
        .collect();

    // YoY changes
    let yoy_changes: Vec<f64> = (0..n)
        .map(|i| {
            let cur_year = sorted_years[i] as i64;
            let cur_month = sorted_months[i] as i64;
            // Find same month in previous year
            for j in 0..n {
                let y = sorted_years[j] as i64;
                let m = sorted_months[j] as i64;
                if y == cur_year - 1 && m == cur_month {
                    if sorted_sales[j] == 0.0 {
                        return f64::NAN;
                    }
                    return sorted_sales[i] / sorted_sales[j];
                }
            }
            f64::NAN
        })
        .collect();

    // Moving averages
    let moving_avg_3 = calculate_moving_average(&sorted_sales, 3);
    let moving_avg_6 = calculate_moving_average(&sorted_sales, 6);

    // Seasonal index
    let seasonal_index = calculate_seasonal_index(&sorted_months, &sorted_sales);

    // Average monthly sales
    let total: f64 = sorted_sales.iter().sum();
    let average_monthly_sales = total / n as f64;

    // Overall trend
    let overall_trend = determine_overall_trend(&sorted_sales);

    TrendResult {
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
    values
        .iter()
        .enumerate()
        .map(|(i, _)| {
            if i < window - 1 {
                return f64::NAN;
            }
            let mut sum = 0.0;
            for j in (i + 1 - window)..=i {
                sum += values[j];
            }
            sum / window as f64
        })
        .collect()
}

fn calculate_seasonal_index(months: &[f64], sales: &[f64]) -> Vec<f64> {
    let n = months.len().min(sales.len());
    let mut buckets_total = [0.0_f64; 12];
    let mut buckets_count = [0_u32; 12];
    let mut grand_total = 0.0;

    for i in 0..n {
        let m = months[i] as usize;
        if m >= 1 && m <= 12 {
            buckets_total[m - 1] += sales[i];
            buckets_count[m - 1] += 1;
        }
        grand_total += sales[i];
    }

    let grand_avg = safe_divide(grand_total, n as f64, 0.0);
    if grand_avg == 0.0 {
        return vec![1.0; 12];
    }

    (0..12)
        .map(|i| {
            if buckets_count[i] == 0 {
                1.0
            } else {
                buckets_total[i] / buckets_count[i] as f64 / grand_avg
            }
        })
        .collect()
}

fn determine_overall_trend(sorted_sales: &[f64]) -> u8 {
    let n = sorted_sales.len();
    if n < 4 {
        return 2; // flat
    }

    let start = if n >= 6 { n - 6 } else { 0 };
    let mid = n - 3;

    let previous3 = &sorted_sales[start..mid];
    if previous3.is_empty() {
        return 2; // flat
    }

    let recent3 = &sorted_sales[mid..];
    let recent_avg: f64 = recent3.iter().sum::<f64>() / recent3.len() as f64;
    let previous_avg: f64 = previous3.iter().sum::<f64>() / previous3.len() as f64;

    if previous_avg == 0.0 {
        return 2; // flat
    }

    let change_rate = (recent_avg - previous_avg) / previous_avg;
    if change_rate > TREND_CHANGE_THRESHOLD {
        0 // up
    } else if change_rate < -TREND_CHANGE_THRESHOLD {
        1 // down
    } else {
        2 // flat
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::assert_close;

    #[test]
    fn empty_input() {
        let r = analyze_trend(&[], &[], &[]);
        assert!(r.mom_changes.is_empty());
        assert_eq!(r.seasonal_index.len(), 12);
        assert_eq!(r.overall_trend, 2);
        assert_close(r.average_monthly_sales, 0.0, 1e-10);
    }

    #[test]
    fn seasonal_index_always_12() {
        let years = [2024.0, 2024.0, 2024.0];
        let months = [1.0, 2.0, 3.0];
        let sales = [100.0, 200.0, 300.0];
        let r = analyze_trend(&years, &months, &sales);
        assert_eq!(r.seasonal_index.len(), 12);
    }

    #[test]
    fn trend_up() {
        // Clearly increasing sales
        let years = [2024.0; 6];
        let months = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
        let sales = [100.0, 105.0, 110.0, 150.0, 160.0, 170.0];
        let r = analyze_trend(&years, &months, &sales);
        assert_eq!(r.overall_trend, 0); // up
    }

    #[test]
    fn trend_down() {
        let years = [2024.0; 6];
        let months = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
        let sales = [170.0, 160.0, 150.0, 110.0, 105.0, 100.0];
        let r = analyze_trend(&years, &months, &sales);
        assert_eq!(r.overall_trend, 1); // down
    }

    #[test]
    fn trend_flat() {
        let years = [2024.0; 6];
        let months = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
        let sales = [100.0, 101.0, 99.0, 100.0, 101.0, 100.0];
        let r = analyze_trend(&years, &months, &sales);
        assert_eq!(r.overall_trend, 2); // flat
    }

    #[test]
    fn mom_first_is_nan() {
        let years = [2024.0, 2024.0, 2024.0];
        let months = [1.0, 2.0, 3.0];
        let sales = [100.0, 200.0, 300.0];
        let r = analyze_trend(&years, &months, &sales);
        assert!(r.mom_changes[0].is_nan());
        assert_close(r.mom_changes[1], 2.0, 1e-10);
    }

    #[test]
    fn yoy_with_prev_year() {
        let years = [2023.0, 2023.0, 2024.0, 2024.0];
        let months = [1.0, 2.0, 1.0, 2.0];
        let sales = [100.0, 200.0, 120.0, 250.0];
        let r = analyze_trend(&years, &months, &sales);
        // 2024-01 vs 2023-01: 120/100 = 1.2
        assert_close(r.yoy_changes[2], 1.2, 1e-10);
        // 2024-02 vs 2023-02: 250/200 = 1.25
        assert_close(r.yoy_changes[3], 1.25, 1e-10);
    }

    #[test]
    fn all_outputs_finite_or_nan() {
        let years = [2024.0; 12];
        let months: Vec<f64> = (1..=12).map(|m| m as f64).collect();
        let sales = [1e6, 1.1e6, 1.05e6, 1.2e6, 1.15e6, 1.3e6,
                     1.25e6, 1.35e6, 1.1e6, 1.2e6, 1.3e6, 1.4e6];
        let r = analyze_trend(&years, &months, &sales);
        assert!(r.average_monthly_sales.is_finite());
        for &v in &r.seasonal_index {
            assert!(v.is_finite());
        }
    }
}
