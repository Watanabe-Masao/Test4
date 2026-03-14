/// Safe division matching TS `safeDivide` behavior exactly.
///
/// TS implementation:
/// ```typescript
/// return denominator !== 0 ? numerator / denominator : fallback
/// ```
#[inline]
pub fn safe_divide(numerator: f64, denominator: f64, fallback: f64) -> f64 {
    if denominator != 0.0 {
        numerator / denominator
    } else {
        fallback
    }
}

#[cfg(test)]
pub fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a,
        b,
        (a - b).abs(),
        tol
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_division() {
        assert_eq!(safe_divide(10.0, 2.0, 0.0), 5.0);
        assert_eq!(safe_divide(-6.0, 3.0, 0.0), -2.0);
    }

    #[test]
    fn zero_denominator_returns_fallback() {
        assert_eq!(safe_divide(10.0, 0.0, 0.0), 0.0);
        assert_eq!(safe_divide(10.0, 0.0, 99.0), 99.0);
    }

    #[test]
    fn negative_zero_denominator_returns_fallback() {
        assert_eq!(safe_divide(10.0, -0.0, 42.0), 42.0);
    }

    #[test]
    fn nan_denominator_returns_nan() {
        assert!(safe_divide(10.0, f64::NAN, 0.0).is_nan());
    }
}
