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
mod tests {
    use super::*;

    #[test]
    fn normal_division() {
        assert_eq!(safe_divide(10.0, 2.0, 0.0), 5.0);
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
}
