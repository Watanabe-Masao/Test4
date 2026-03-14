use crate::stddev::calculate_stddev;
use crate::types::AnomalyEntry;
use crate::utils::safe_divide;

/// Detect anomalies using z-score method.
/// Matches TS `detectAnomalies` in forecast.ts exactly.
///
/// Input: pre-sorted, pre-filtered entries (keys ascending, values > 0).
/// entries.len() < 3 → empty
/// stdDev == 0 → empty
/// Returns ONLY entries where |zScore| > threshold (anomalies only).
pub fn detect_anomalies(keys: &[f64], values: &[f64], threshold: f64) -> Vec<AnomalyEntry> {
    let n = keys.len().min(values.len());
    if n < 3 {
        return vec![];
    }

    let stats = calculate_stddev(&values[..n]);
    if stats.std_dev == 0.0 {
        return vec![];
    }

    let mut results = Vec::new();
    for i in 0..n {
        let z_score = safe_divide(values[i] - stats.mean, stats.std_dev, 0.0);
        let is_anomaly = z_score.abs() > threshold;
        if is_anomaly {
            results.push(AnomalyEntry {
                day: keys[i],
                value: values[i],
                mean: stats.mean,
                std_dev: stats.std_dev,
                z_score,
                is_anomaly: true,
            });
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::assert_close;

    #[test]
    fn empty_input() {
        let r = detect_anomalies(&[], &[], 2.0);
        assert!(r.is_empty());
    }

    #[test]
    fn fewer_than_3() {
        let r = detect_anomalies(&[1.0, 2.0], &[100.0, 200.0], 2.0);
        assert!(r.is_empty());
    }

    #[test]
    fn constant_values_no_anomalies() {
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
        let vals = [100.0, 100.0, 100.0, 100.0, 100.0];
        let r = detect_anomalies(&keys, &vals, 2.0);
        assert!(r.is_empty()); // stdDev == 0 → empty
    }

    #[test]
    fn obvious_anomaly_detected() {
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
        let vals = [100.0, 105.0, 98.0, 102.0, 99.0, 101.0, 103.0, 97.0, 100.0, 500.0];
        let r = detect_anomalies(&keys, &vals, 2.0);
        assert!(!r.is_empty());
        // The 500 value should be detected as anomaly
        assert!(r.iter().any(|a| assert_close(a.value, 500.0, 1e-10) == () && a.is_anomaly));
    }

    #[test]
    fn is_anomaly_matches_zscore_threshold() {
        let keys: Vec<f64> = (1..=20).map(|i| i as f64).collect();
        let mut vals: Vec<f64> = vec![100.0; 20];
        vals[19] = 300.0; // outlier
        let threshold = 1.5;
        let r = detect_anomalies(&keys, &vals, threshold);
        for entry in &r {
            assert!(entry.z_score.abs() > threshold);
            assert!(entry.is_anomaly);
        }
    }

    #[test]
    fn all_returned_entries_are_anomalies() {
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
        let vals = [100.0, 100.0, 100.0, 100.0, 1000.0];
        let r = detect_anomalies(&keys, &vals, 1.0);
        for entry in &r {
            assert!(entry.is_anomaly);
        }
    }
}
