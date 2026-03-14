use crate::types::StdDevResult;
use crate::utils::safe_divide;

/// Calculate population standard deviation.
/// Matches TS `calculateStdDev` in forecast.ts exactly.
///
/// Empty input → { mean: 0.0, std_dev: 0.0 }
/// Uses population variance (divides by N, not N-1).
pub fn calculate_stddev(values: &[f64]) -> StdDevResult {
    if values.is_empty() {
        return StdDevResult {
            mean: 0.0,
            std_dev: 0.0,
        };
    }

    let sum: f64 = values.iter().sum();
    let n = values.len() as f64;
    let mean = safe_divide(sum, n, 0.0);

    let variance_sum: f64 = values.iter().map(|v| (v - mean).powi(2)).sum();
    let variance = safe_divide(variance_sum, n, 0.0);

    StdDevResult {
        mean,
        std_dev: variance.sqrt(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::assert_close;

    #[test]
    fn empty_returns_zero() {
        let r = calculate_stddev(&[]);
        assert_eq!(r.mean, 0.0);
        assert_eq!(r.std_dev, 0.0);
    }

    #[test]
    fn single_value() {
        let r = calculate_stddev(&[42.0]);
        assert_close(r.mean, 42.0, 1e-10);
        assert_close(r.std_dev, 0.0, 1e-10);
    }

    #[test]
    fn constant_values() {
        let r = calculate_stddev(&[5.0, 5.0, 5.0, 5.0]);
        assert_close(r.mean, 5.0, 1e-10);
        assert_close(r.std_dev, 0.0, 1e-10);
    }

    #[test]
    fn known_values() {
        // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, stddev=2
        let r = calculate_stddev(&[2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]);
        assert_close(r.mean, 5.0, 1e-10);
        assert_close(r.std_dev, 2.0, 1e-10);
    }

    #[test]
    fn stddev_always_non_negative() {
        let r = calculate_stddev(&[-100.0, 100.0, -50.0, 50.0]);
        assert!(r.std_dev >= 0.0);
        assert!(r.std_dev.is_finite());
    }
}
