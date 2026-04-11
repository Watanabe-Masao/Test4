/// DOW gap statistics: mean, median, adjusted mean (MAD-based outlier removal).
///
/// Small-sample robust statistics for retail weekly data (n=4-5).

use crate::utils::safe_divide;

/// MAD consistency constant (Iglewicz & Hoaglin)
const CONSISTENCY_CONSTANT: f64 = 0.6745;
/// Modified z-score threshold for outlier detection
const MODIFIED_Z_THRESHOLD: f64 = 3.5;

pub struct DowStatistics {
    pub mean: f64,
    pub median: f64,
    pub adjusted_mean: f64,
}

pub fn calc_median(values: &[f64]) -> f64 {
    if values.is_empty() { return 0.0; }
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

pub fn calc_adjusted_mean(values: &[f64]) -> f64 {
    if values.is_empty() { return 0.0; }
    let sum: f64 = values.iter().sum();
    let mean = safe_divide(sum, values.len() as f64, 0.0);
    if values.len() < 3 { return mean; }

    let med = calc_median(values);
    let abs_devs: Vec<f64> = values.iter().map(|v| (v - med).abs()).collect();
    let mad = calc_median(&abs_devs);
    if mad == 0.0 { return mean; }

    let filtered: Vec<f64> = values.iter()
        .filter(|&&v| safe_divide(CONSISTENCY_CONSTANT * (v - med).abs(), mad, 0.0) <= MODIFIED_Z_THRESHOLD)
        .cloned()
        .collect();
    if filtered.is_empty() { return mean; }
    safe_divide(filtered.iter().sum::<f64>(), filtered.len() as f64, 0.0)
}

pub fn compute_dow_statistics(values: &[f64]) -> DowStatistics {
    if values.is_empty() {
        return DowStatistics { mean: 0.0, median: 0.0, adjusted_mean: 0.0 };
    }
    let mean = safe_divide(values.iter().sum::<f64>(), values.len() as f64, 0.0);
    let median = calc_median(values);
    let adjusted_mean = calc_adjusted_mean(values);
    DowStatistics { mean, median, adjusted_mean }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn median_odd() { assert_eq!(calc_median(&[3.0, 1.0, 2.0]), 2.0); }

    #[test]
    fn median_even() { assert_eq!(calc_median(&[1.0, 2.0, 3.0, 4.0]), 2.5); }

    #[test]
    fn median_empty() { assert_eq!(calc_median(&[]), 0.0); }

    #[test]
    fn adjusted_mean_no_outliers() {
        let v = [100.0, 110.0, 105.0, 95.0, 100.0];
        let am = calc_adjusted_mean(&v);
        assert!((am - 102.0).abs() < 1.0); // close to simple mean
    }
}
