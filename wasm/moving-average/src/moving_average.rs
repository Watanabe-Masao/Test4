/// Trailing moving average with missingness policy.
///
/// Flat contract:
/// - values: Float64Array (NaN = null/missing value)
/// - statuses: Uint8Array (0 = ok, 1 = missing)
/// - window_size: usize
/// - policy: 0 = strict, 1 = partial
///
/// @contractId ANA-009
/// @semanticClass analytic
/// @methodFamily time_series

/// Status encoding for FFI.
const STATUS_OK: u8 = 0;
const STATUS_MISSING: u8 = 1;

/// Policy encoding for FFI.
const POLICY_STRICT: u8 = 0;
const POLICY_PARTIAL: u8 = 1;

pub struct MovingAveragePoint {
    pub value: f64, // NaN = null
    pub status: u8, // 0 = ok, 1 = missing
}

/// Compute trailing moving average.
///
/// Matching TS: temporal/computeMovingAverage.ts lines 33-62
pub fn compute_moving_average(
    values: &[f64],
    statuses: &[u8],
    window_size: usize,
    policy: u8,
) -> Vec<MovingAveragePoint> {
    let n = values.len().min(statuses.len());
    let mut result = Vec::with_capacity(n);

    for index in 0..n {
        let window_start = if index + 1 >= window_size {
            index + 1 - window_size
        } else {
            0
        };
        let window_len = index + 1 - window_start;

        // Not enough data for full window
        if window_len < window_size {
            result.push(MovingAveragePoint {
                value: f64::NAN,
                status: STATUS_MISSING,
            });
            continue;
        }

        // Count ok values in window
        let mut ok_count = 0usize;
        let mut ok_sum = 0.0f64;
        for i in window_start..=index {
            if statuses[i] == STATUS_OK && !values[i].is_nan() {
                ok_count += 1;
                ok_sum += values[i];
            }
        }

        if policy == POLICY_STRICT {
            if ok_count < window_size {
                result.push(MovingAveragePoint {
                    value: f64::NAN,
                    status: STATUS_MISSING,
                });
            } else {
                result.push(MovingAveragePoint {
                    value: ok_sum / window_size as f64,
                    status: STATUS_OK,
                });
            }
        } else {
            // partial
            if ok_count == 0 {
                result.push(MovingAveragePoint {
                    value: f64::NAN,
                    status: STATUS_MISSING,
                });
            } else {
                result.push(MovingAveragePoint {
                    value: ok_sum / ok_count as f64,
                    status: STATUS_OK,
                });
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_strict_window3() {
        let values = [10.0, 20.0, 30.0, 40.0, 50.0];
        let statuses = [0, 0, 0, 0, 0]; // all ok
        let r = compute_moving_average(&values, &statuses, 3, POLICY_STRICT);
        assert_eq!(r.len(), 5);
        assert!(r[0].value.is_nan()); // window too short
        assert!(r[1].value.is_nan()); // window too short
        assert!((r[2].value - 20.0).abs() < 1e-10); // (10+20+30)/3
        assert!((r[3].value - 30.0).abs() < 1e-10); // (20+30+40)/3
        assert!((r[4].value - 40.0).abs() < 1e-10); // (30+40+50)/3
    }

    #[test]
    fn partial_with_missing() {
        let values = [10.0, f64::NAN, 30.0, 40.0, 50.0];
        let statuses = [0, 1, 0, 0, 0]; // index 1 missing
        let r = compute_moving_average(&values, &statuses, 3, POLICY_PARTIAL);
        // index 2: window [10, NaN, 30], ok = [10, 30] → avg = 20
        assert!((r[2].value - 20.0).abs() < 1e-10);
        assert_eq!(r[2].status, STATUS_OK);
    }

    #[test]
    fn strict_rejects_missing_in_window() {
        let values = [10.0, f64::NAN, 30.0];
        let statuses = [0, 1, 0];
        let r = compute_moving_average(&values, &statuses, 3, POLICY_STRICT);
        assert!(r[2].value.is_nan()); // strict: missing in window → null
        assert_eq!(r[2].status, STATUS_MISSING);
    }

    #[test]
    fn window_size_1() {
        let values = [10.0, 20.0, 30.0];
        let statuses = [0, 0, 0];
        let r = compute_moving_average(&values, &statuses, 1, POLICY_STRICT);
        assert!((r[0].value - 10.0).abs() < 1e-10);
        assert!((r[1].value - 20.0).abs() < 1e-10);
        assert!((r[2].value - 30.0).abs() < 1e-10);
    }
}
