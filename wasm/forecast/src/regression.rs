use crate::types::RegressionResult;

/// Linear regression: y = slope * x + intercept
/// Matches TS `linearRegression` in advancedForecast.ts exactly.
///
/// Input: pre-filtered entries (values > 0).
/// n < 2 → { slope: 0, intercept: 0, rSquared: 0 }
/// denom == 0 → { slope: 0, intercept: sumY/n, rSquared: 0 }
pub fn linear_regression(keys: &[f64], values: &[f64]) -> RegressionResult {
    let n = keys.len().min(values.len());
    if n < 2 {
        return RegressionResult {
            slope: 0.0,
            intercept: 0.0,
            r_squared: 0.0,
        };
    }

    let mut sum_x: f64 = 0.0;
    let mut sum_y: f64 = 0.0;
    let mut sum_xy: f64 = 0.0;
    let mut sum_x2: f64 = 0.0;

    for i in 0..n {
        let x = keys[i];
        let y = values[i];
        sum_x += x;
        sum_y += y;
        sum_xy += x * y;
        sum_x2 += x * x;
    }

    let nf = n as f64;
    let denom = nf * sum_x2 - sum_x * sum_x;

    if denom == 0.0 {
        return RegressionResult {
            slope: 0.0,
            intercept: sum_y / nf,
            r_squared: 0.0,
        };
    }

    let slope = (nf * sum_xy - sum_x * sum_y) / denom;
    let intercept = (sum_y - slope * sum_x) / nf;

    // R² calculation
    let y_mean = sum_y / nf;
    let mut ss_tot: f64 = 0.0;
    let mut ss_res: f64 = 0.0;

    for i in 0..n {
        let x = keys[i];
        let y = values[i];
        ss_tot += (y - y_mean).powi(2);
        ss_res += (y - (slope * x + intercept)).powi(2);
    }

    let r_squared = if ss_tot == 0.0 {
        0.0
    } else {
        1.0 - ss_res / ss_tot
    };

    RegressionResult {
        slope,
        intercept,
        r_squared,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::assert_close;

    #[test]
    fn fewer_than_two_points() {
        let r = linear_regression(&[1.0], &[100.0]);
        assert_eq!(r.slope, 0.0);
        assert_eq!(r.intercept, 0.0);
        assert_eq!(r.r_squared, 0.0);
    }

    #[test]
    fn perfect_linear() {
        // y = 2x + 10
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
        let vals = [12.0, 14.0, 16.0, 18.0, 20.0];
        let r = linear_regression(&keys, &vals);
        assert_close(r.slope, 2.0, 1e-10);
        assert_close(r.intercept, 10.0, 1e-10);
        assert_close(r.r_squared, 1.0, 1e-10);
    }

    #[test]
    fn r_squared_bounds() {
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
        let vals = [100.0, 120.0, 95.0, 130.0, 110.0];
        let r = linear_regression(&keys, &vals);
        assert!(r.r_squared >= 0.0);
        assert!(r.r_squared <= 1.0);
    }

    #[test]
    fn constant_values() {
        let keys = [1.0, 2.0, 3.0, 4.0];
        let vals = [50.0, 50.0, 50.0, 50.0];
        let r = linear_regression(&keys, &vals);
        assert_close(r.slope, 0.0, 1e-10);
        assert_close(r.intercept, 50.0, 1e-10);
        assert_eq!(r.r_squared, 0.0);
    }

    #[test]
    fn monotonic_increasing_positive_slope() {
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0];
        let vals = [10.0, 20.0, 30.0, 40.0, 50.0];
        let r = linear_regression(&keys, &vals);
        assert!(r.slope > 0.0);
    }

    #[test]
    fn all_outputs_finite() {
        let keys = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
        let vals = [95000.0, 102000.0, 98000.0, 110000.0, 105000.0,
                    115000.0, 108000.0, 120000.0, 112000.0, 125000.0];
        let r = linear_regression(&keys, &vals);
        assert!(r.slope.is_finite());
        assert!(r.intercept.is_finite());
        assert!(r.r_squared.is_finite());
    }
}
