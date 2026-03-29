/// inv_method — 在庫法テスト（数学的不変条件付き）
#[cfg(test)]
mod tests {
    use crate::inv_method::calculate_inv_method;

    const T: f64 = 1e-10;

    // ── 正常ケース ──

    #[test]
    fn basic_calculation() {
        let r = calculate_inv_method(50000.0, 30000.0, 100000.0, 150000.0);
        assert!(!r.is_null);
        // cogs = 50000 + 100000 - 30000 = 120000
        assert!((r.cogs - 120000.0).abs() < T);
        // gp = 150000 - 120000 = 30000
        assert!((r.gross_profit - 30000.0).abs() < T);
    }

    #[test]
    fn null_opening_inventory() {
        let r = calculate_inv_method(f64::NAN, 30000.0, 100000.0, 150000.0);
        assert!(r.is_null);
    }

    #[test]
    fn null_closing_inventory() {
        let r = calculate_inv_method(50000.0, f64::NAN, 100000.0, 150000.0);
        assert!(r.is_null);
    }

    #[test]
    fn zero_sales() {
        let r = calculate_inv_method(50000.0, 30000.0, 100000.0, 0.0);
        assert_eq!(r.gross_profit_rate, 0.0);
    }

    // ── 数学的不変条件 ──

    #[test]
    fn invariant_cogs_identity() {
        // COGS = Opening + Purchase - Closing (在庫等式)
        let opening = 50000.0;
        let closing = 30000.0;
        let purchase = 100000.0;
        let r = calculate_inv_method(opening, closing, purchase, 200000.0);
        assert!(
            (r.cogs - (opening + purchase - closing)).abs() < T,
            "COGS must equal Opening + Purchase - Closing"
        );
    }

    #[test]
    fn invariant_gp_identity() {
        // GP = Sales - COGS
        let sales = 150000.0;
        let r = calculate_inv_method(50000.0, 30000.0, 100000.0, sales);
        assert!(
            (r.gross_profit - (sales - r.cogs)).abs() < T,
            "Gross Profit must equal Sales - COGS"
        );
    }

    #[test]
    fn invariant_gp_rate_identity() {
        // GP Rate × Sales = GP
        let sales = 150000.0;
        let r = calculate_inv_method(50000.0, 30000.0, 100000.0, sales);
        assert!(
            (r.gross_profit_rate * sales - r.gross_profit).abs() < T,
            "GP Rate × Sales must equal GP"
        );
    }

    #[test]
    fn invariant_closing_increases_gp() {
        // Higher closing inventory → lower COGS → higher GP (monotonicity)
        let r1 = calculate_inv_method(50000.0, 30000.0, 100000.0, 150000.0);
        let r2 = calculate_inv_method(50000.0, 40000.0, 100000.0, 150000.0);
        assert!(r2.gross_profit > r1.gross_profit,
            "Higher closing inventory must increase GP");
    }

    #[test]
    fn invariant_purchase_increases_cogs() {
        // Higher purchase → higher COGS (monotonicity)
        let r1 = calculate_inv_method(50000.0, 30000.0, 100000.0, 150000.0);
        let r2 = calculate_inv_method(50000.0, 30000.0, 120000.0, 150000.0);
        assert!(r2.cogs > r1.cogs,
            "Higher purchase must increase COGS");
    }
}
