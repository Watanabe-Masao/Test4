/// Safe division matching TS `safeDivide` behavior exactly.
///
/// TS implementation:
/// ```typescript
/// return denominator !== 0 ? numerator / denominator : fallback
/// ```
///
/// In Rust, `f64 == 0.0` matches both `+0.0` and `-0.0` (IEEE 754).
/// `NaN != 0.0` is true (same as JS `NaN !== 0`), so NaN denominators
/// proceed to division, producing NaN — matching TS behavior.
#[inline]
pub fn safe_divide(numerator: f64, denominator: f64, fallback: f64) -> f64 {
    if denominator != 0.0 {
        numerator / denominator
    } else {
        fallback
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_division() {
        assert_eq!(safe_divide(10.0, 2.0, 0.0), 5.0);
        assert!((safe_divide(7.0, 3.0, 0.0) - 2.3333333333333335).abs() < 1e-14);
        assert_eq!(safe_divide(-6.0, 3.0, 0.0), -2.0);
        assert_eq!(safe_divide(6.0, -3.0, 0.0), -2.0);
        assert_eq!(safe_divide(-6.0, -3.0, 0.0), 2.0);
    }

    #[test]
    fn zero_denominator_returns_fallback() {
        assert_eq!(safe_divide(10.0, 0.0, 0.0), 0.0);
        assert_eq!(safe_divide(10.0, 0.0, 99.0), 99.0);
        assert_eq!(safe_divide(0.0, 0.0, 0.0), 0.0);
        assert_eq!(safe_divide(0.0, 0.0, -1.0), -1.0);
    }

    #[test]
    fn negative_zero_denominator_returns_fallback() {
        // -0.0 == 0.0 is true in IEEE 754
        assert_eq!(safe_divide(10.0, -0.0, 0.0), 0.0);
        assert_eq!(safe_divide(10.0, -0.0, 42.0), 42.0);
    }

    #[test]
    fn nan_denominator_returns_nan() {
        // NaN != 0.0 is true → proceeds to division → NaN
        assert!(safe_divide(10.0, f64::NAN, 0.0).is_nan());
        assert!(safe_divide(0.0, f64::NAN, 0.0).is_nan());
        assert!(safe_divide(f64::NAN, f64::NAN, 0.0).is_nan());
    }

    #[test]
    fn nan_numerator() {
        assert!(safe_divide(f64::NAN, 5.0, 0.0).is_nan());
        // NaN numerator but den == 0 → fallback
        assert_eq!(safe_divide(f64::NAN, 0.0, 99.0), 99.0);
    }

    #[test]
    fn infinity_denominator() {
        assert_eq!(safe_divide(10.0, f64::INFINITY, 0.0), 0.0);
        // 10.0 / -inf = -0.0
        assert!(safe_divide(10.0, f64::NEG_INFINITY, 0.0).is_sign_negative());
        assert_eq!(safe_divide(10.0, f64::NEG_INFINITY, 0.0), 0.0); // -0.0 == 0.0
    }

    #[test]
    fn infinity_numerator() {
        assert_eq!(safe_divide(f64::INFINITY, 2.0, 0.0), f64::INFINITY);
        assert_eq!(safe_divide(f64::NEG_INFINITY, 2.0, 0.0), f64::NEG_INFINITY);
        // inf / inf = NaN
        assert!(safe_divide(f64::INFINITY, f64::INFINITY, 0.0).is_nan());
    }
}
