/// Ratio primitives — mathematical properties and invariants.
///
/// All ratio functions share the zero-denominator safety property:
/// denominator = 0 → result = 0 (never panics, never returns Infinity/NaN)

#[cfg(test)]
mod tests {
    use crate::*;

    const TOLERANCE: f64 = 1e-10;

    // ── safe_divide ──

    #[test]
    fn safe_divide_normal() {
        assert!((safe_divide(10.0, 5.0, 0.0) - 2.0).abs() < TOLERANCE);
    }

    #[test]
    fn safe_divide_zero_denom() {
        assert_eq!(safe_divide(10.0, 0.0, -1.0), -1.0);
    }

    #[test]
    fn safe_divide_zero_num() {
        assert_eq!(safe_divide(0.0, 5.0, 0.0), 0.0);
    }

    // ── achievement_rate ──

    #[test]
    fn achievement_100_percent() {
        assert!((calculate_achievement_rate(100.0, 100.0) - 1.0).abs() < TOLERANCE);
    }

    #[test]
    fn achievement_zero_target() {
        assert_eq!(calculate_achievement_rate(100.0, 0.0), 0.0);
    }

    // ── yoy_ratio ──

    #[test]
    fn yoy_same() {
        assert!((calculate_yoy_ratio(100.0, 100.0) - 1.0).abs() < TOLERANCE);
    }

    #[test]
    fn yoy_growth() {
        assert!((calculate_yoy_ratio(120.0, 100.0) - 1.2).abs() < TOLERANCE);
    }

    #[test]
    fn yoy_zero_prev() {
        assert_eq!(calculate_yoy_ratio(100.0, 0.0), 0.0);
    }

    // ── growth_rate ──

    #[test]
    fn growth_20_percent() {
        assert!((calculate_growth_rate(120.0, 100.0) - 0.2).abs() < TOLERANCE);
    }

    #[test]
    fn growth_negative() {
        assert!((calculate_growth_rate(90.0, 100.0) - (-0.1)).abs() < TOLERANCE);
    }

    #[test]
    fn growth_zero_prev() {
        assert_eq!(calculate_growth_rate(100.0, 0.0), 0.0);
    }

    // ── transaction_value ──

    #[test]
    fn tx_value_normal() {
        assert!((calculate_transaction_value(100000.0, 50.0) - 2000.0).abs() < TOLERANCE);
    }

    #[test]
    fn tx_value_zero_customers() {
        assert_eq!(calculate_transaction_value(100000.0, 0.0), 0.0);
    }

    // ── Mathematical invariants ──

    #[test]
    fn invariant_share_sum_one() {
        // If parts sum to whole, shares sum to 1
        let a = 30.0;
        let b = 70.0;
        let whole = a + b;
        let share_a = calculate_share(a, whole);
        let share_b = calculate_share(b, whole);
        assert!((share_a + share_b - 1.0).abs() < TOLERANCE);
    }

    #[test]
    fn invariant_markup_gp_identity() {
        // markup_rate * sales_price = gross_profit
        let gp = 25000.0;
        let sp = 100000.0;
        let rate = calculate_markup_rate(gp, sp);
        assert!((rate * sp - gp).abs() < TOLERANCE);
    }

    #[test]
    fn invariant_gp_rate_identity() {
        // gp_rate * sales = gross_profit
        let gp = 30000.0;
        let sales = 120000.0;
        let rate = calculate_gross_profit_rate(gp, sales);
        assert!((rate * sales - gp).abs() < TOLERANCE);
    }
}
