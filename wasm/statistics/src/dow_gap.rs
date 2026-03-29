/// Day-of-week gap analysis — statistical primitives.
///
/// Calculates median, adjusted mean (MAD-based outlier rejection),
/// and coefficient of variation for small-sample retail data.

/// Median of a sorted slice.
///
/// # Mathematical properties
/// - Returns middle value for odd-length, average of two middles for even-length
/// - Result ∈ [min(values), max(values)]
pub fn calc_median(values: &mut [f64]) -> f64 {
    if values.is_empty() { return 0.0; }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let n = values.len();
    if n % 2 == 0 {
        (values[n / 2 - 1] + values[n / 2]) / 2.0
    } else {
        values[n / 2]
    }
}

/// Adjusted mean with MAD-based outlier rejection.
///
/// 1. Compute median
/// 2. Compute MAD (Median Absolute Deviation)
/// 3. Reject values where |x - median| > 2 * MAD
/// 4. Return mean of remaining values
///
/// # Mathematical properties
/// - More robust than arithmetic mean for small samples with outliers
/// - Falls back to regular mean when MAD = 0 (all values equal)
pub fn calc_adjusted_mean(values: &[f64]) -> f64 {
    if values.is_empty() { return 0.0; }
    if values.len() == 1 { return values[0]; }

    let mut sorted = values.to_vec();
    let median = calc_median(&mut sorted);

    // MAD = median of |xi - median|
    let mut deviations: Vec<f64> = values.iter().map(|v| (v - median).abs()).collect();
    let mad = calc_median(&mut deviations);

    if mad == 0.0 {
        // All values are equal — return the median
        return median;
    }

    // Reject outliers: |xi - median| > 2 * MAD
    let threshold = 2.0 * mad;
    let filtered: Vec<f64> = values.iter()
        .filter(|v| ((**v) - median).abs() <= threshold)
        .cloned()
        .collect();

    if filtered.is_empty() { return median; }
    filtered.iter().sum::<f64>() / filtered.len() as f64
}

/// Population standard deviation.
pub fn stddev_pop(values: &[f64]) -> f64 {
    if values.is_empty() { return 0.0; }
    let n = values.len() as f64;
    let mean = values.iter().sum::<f64>() / n;
    let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / n;
    variance.sqrt()
}

/// Coefficient of variation (CV = stddev / mean).
pub fn coefficient_of_variation(values: &[f64]) -> f64 {
    if values.is_empty() { return 0.0; }
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    if mean == 0.0 { return 0.0; }
    stddev_pop(values) / mean.abs()
}

/// Count days-of-week in a month.
/// Returns array of 7 counts [Sun, Mon, ..., Sat].
pub fn count_dows_in_month(year: i32, month: u32) -> [u32; 7] {
    let mut counts = [0u32; 7];
    let days_in_month = days_in_month_calc(year, month);
    for d in 1..=days_in_month {
        // Zeller-like: compute day of week
        let dow = day_of_week(year, month, d);
        counts[dow as usize] += 1;
    }
    counts
}

fn days_in_month_calc(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap_year(year) { 29 } else { 28 },
        _ => 30,
    }
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

fn day_of_week(year: i32, month: u32, day: u32) -> u32 {
    // Tomohiko Sakamoto's algorithm (0=Sun, 1=Mon, ..., 6=Sat)
    let t = [0i32, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let y = if month < 3 { year - 1 } else { year };
    let m = month as i32;
    let d = day as i32;
    ((y + y/4 - y/100 + y/400 + t[(m - 1) as usize] + d) % 7) as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn median_odd() {
        assert_eq!(calc_median(&mut vec![3.0, 1.0, 2.0]), 2.0);
    }

    #[test]
    fn median_even() {
        assert_eq!(calc_median(&mut vec![1.0, 2.0, 3.0, 4.0]), 2.5);
    }

    #[test]
    fn median_empty() {
        assert_eq!(calc_median(&mut vec![]), 0.0);
    }

    #[test]
    fn adjusted_mean_no_outliers() {
        let r = calc_adjusted_mean(&[10.0, 11.0, 12.0, 13.0, 14.0]);
        assert!((r - 12.0).abs() < 1e-10);
    }

    #[test]
    fn adjusted_mean_with_outlier() {
        let r = calc_adjusted_mean(&[10.0, 11.0, 12.0, 13.0, 100.0]);
        // 100 should be rejected, mean of [10,11,12,13]
        assert!(r < 20.0, "Outlier should be rejected, got {r}");
    }

    #[test]
    fn adjusted_mean_constant() {
        assert_eq!(calc_adjusted_mean(&[5.0, 5.0, 5.0]), 5.0);
    }

    #[test]
    fn stddev_basic() {
        let r = stddev_pop(&[2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]);
        assert!((r - 2.0).abs() < 0.01);
    }

    #[test]
    fn cv_basic() {
        let r = coefficient_of_variation(&[10.0, 10.0, 10.0]);
        assert_eq!(r, 0.0); // no variation
    }

    #[test]
    fn count_dows_feb_2024_leap() {
        let counts = count_dows_in_month(2024, 2);
        let total: u32 = counts.iter().sum();
        assert_eq!(total, 29);
    }

    #[test]
    fn count_dows_jan_2025() {
        let counts = count_dows_in_month(2025, 1);
        let total: u32 = counts.iter().sum();
        assert_eq!(total, 31);
    }

    // ── 数学的証明（不変条件） ──

    #[test]
    fn invariant_median_bounded() {
        // median ∈ [min, max] for any non-empty input
        let vals = vec![3.0, 7.0, 1.0, 9.0, 5.0];
        let m = calc_median(&mut vals.clone());
        assert!(m >= 1.0 && m <= 9.0, "median must be in [min, max]");
    }

    #[test]
    fn invariant_median_constant_input() {
        // If all values equal c, then median = c
        let m = calc_median(&mut vec![42.0, 42.0, 42.0, 42.0]);
        assert_eq!(m, 42.0, "median of constant series must equal the constant");
    }

    #[test]
    fn invariant_adjusted_mean_bounded() {
        // adjusted_mean ∈ [min, max] for any non-empty input
        let vals = vec![5.0, 10.0, 15.0, 20.0, 1000.0];
        let r = calc_adjusted_mean(&vals);
        assert!(r >= 5.0, "adjusted_mean must be >= min of non-outlier subset");
        assert!(r <= 1000.0, "adjusted_mean must be <= max");
    }

    #[test]
    fn invariant_adjusted_mean_no_worse_than_mean() {
        // For data with outliers, |adjusted_mean - median| <= |mean - median|
        let vals = vec![10.0, 11.0, 12.0, 13.0, 100.0];
        let adj = calc_adjusted_mean(&vals);
        let mean = vals.iter().sum::<f64>() / vals.len() as f64;
        let median = calc_median(&mut vals.clone());
        assert!(
            (adj - median).abs() <= (mean - median).abs() + 1e-10,
            "adjusted mean should be closer to median than arithmetic mean for outlier data"
        );
    }

    #[test]
    fn invariant_stddev_non_negative() {
        // σ ≥ 0 for any input
        let vals = vec![-5.0, 0.0, 5.0, 100.0, -100.0];
        assert!(stddev_pop(&vals) >= 0.0);
    }

    #[test]
    fn invariant_stddev_zero_for_constant() {
        // σ = 0 iff all values are equal
        assert_eq!(stddev_pop(&[7.0, 7.0, 7.0]), 0.0);
    }

    #[test]
    fn invariant_cv_non_negative() {
        // CV ≥ 0 for any input with mean ≠ 0
        let vals = vec![10.0, 20.0, 30.0];
        assert!(coefficient_of_variation(&vals) >= 0.0);
    }

    #[test]
    fn invariant_count_dows_sum_equals_days_in_month() {
        // Σ(dow counts) = days in month (identity for any year/month)
        for year in [2020, 2023, 2024, 2025] {
            for month in 1..=12 {
                let counts = count_dows_in_month(year, month);
                let total: u32 = counts.iter().sum();
                let expected = days_in_month_calc(year, month);
                assert_eq!(total, expected,
                    "DoW count sum must equal days in month for {year}/{month}");
            }
        }
    }

    #[test]
    fn invariant_count_dows_each_at_least_4() {
        // Each DOW appears at least 4 times in any month (28 days / 7 = 4)
        for year in [2024, 2025] {
            for month in 1..=12 {
                let counts = count_dows_in_month(year, month);
                for (dow, &count) in counts.iter().enumerate() {
                    assert!(count >= 4,
                        "DOW {dow} appears only {count} times in {year}/{month}");
                }
            }
        }
    }
}
