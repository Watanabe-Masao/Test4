use crate::types::WmaEntry;

/// Calculate weighted moving average.
/// Matches TS `calculateWMA` in advancedForecast.ts exactly.
///
/// Input: pre-sorted, pre-filtered entries (keys ascending, values > 0).
/// If entries.len() < window, each entry gets wma = actual.
/// Weights: 1, 2, ..., window (most recent gets highest weight).
pub fn calculate_wma(keys: &[f64], values: &[f64], window: usize) -> Vec<WmaEntry> {
    let n = keys.len().min(values.len());
    if n == 0 {
        return vec![];
    }

    if n < window {
        return (0..n)
            .map(|i| WmaEntry {
                day: keys[i],
                actual: values[i],
                wma: values[i],
            })
            .collect();
    }

    let total_weight: f64 = (window * (window + 1)) as f64 / 2.0;
    let mut results = Vec::with_capacity(n);

    for i in 0..n {
        let day = keys[i];
        let actual = values[i];

        if i < window - 1 {
            results.push(WmaEntry {
                day,
                actual,
                wma: actual,
            });
            continue;
        }

        let mut weighted_sum = 0.0;
        let start = i + 1 - window;
        for j in 0..window {
            let weight = (j + 1) as f64;
            weighted_sum += values[start + j] * weight;
        }
        results.push(WmaEntry {
            day,
            actual,
            wma: weighted_sum / total_weight,
        });
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::assert_close;

    #[test]
    fn empty_input() {
        let r = calculate_wma(&[], &[], 5);
        assert!(r.is_empty());
    }

    #[test]
    fn fewer_than_window() {
        let keys = [1.0, 2.0, 3.0];
        let vals = [100.0, 200.0, 300.0];
        let r = calculate_wma(&keys, &vals, 5);
        assert_eq!(r.len(), 3);
        for entry in &r {
            assert_close(entry.wma, entry.actual, 1e-10);
        }
    }

    #[test]
    fn single_element() {
        let r = calculate_wma(&[1.0], &[42.0], 5);
        assert_eq!(r.len(), 1);
        assert_close(r[0].wma, 42.0, 1e-10);
    }

    #[test]
    fn exact_window_size() {
        // window=3, weights=[1,2,3], totalWeight=6
        let keys = [1.0, 2.0, 3.0];
        let vals = [10.0, 20.0, 30.0];
        let r = calculate_wma(&keys, &vals, 3);
        assert_eq!(r.len(), 3);
        // First two: wma = actual
        assert_close(r[0].wma, 10.0, 1e-10);
        assert_close(r[1].wma, 20.0, 1e-10);
        // Third: (10*1 + 20*2 + 30*3) / 6 = 140/6 ≈ 23.333...
        assert_close(r[2].wma, 140.0 / 6.0, 1e-10);
    }

    #[test]
    fn wma_within_input_range() {
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
        let vals = [100.0, 110.0, 105.0, 120.0, 115.0, 130.0, 125.0];
        let r = calculate_wma(&keys, &vals, 3);
        let min_val = 100.0_f64;
        let max_val = 130.0_f64;
        for entry in &r {
            assert!(entry.wma >= min_val - 1e-10);
            assert!(entry.wma <= max_val + 1e-10);
        }
    }
}
