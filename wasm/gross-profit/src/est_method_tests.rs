/// est_method — 推定法テスト（数学的不変条件付き）
#[cfg(test)]
mod tests {
    use crate::est_method::*;

    const T: f64 = 1e-6;

    // ── calculate_discount_rate ──

    #[test]
    fn discount_rate_basic() {
        // rate = discount / (sales + discount) = 20000 / (980000 + 20000) = 0.02
        let r = calculate_discount_rate(980000.0, 20000.0);
        assert!((r - 0.02).abs() < T);
    }

    #[test]
    fn discount_rate_zero() {
        assert_eq!(calculate_discount_rate(1000000.0, 0.0), 0.0);
    }

    #[test]
    fn discount_rate_zero_both() {
        assert_eq!(calculate_discount_rate(0.0, 0.0), 0.0);
    }

    #[test]
    fn invariant_discount_rate_bounded() {
        // 0 ≤ rate < 1 for non-negative inputs where sales > 0
        let r = calculate_discount_rate(500000.0, 30000.0);
        assert!(r >= 0.0 && r < 1.0, "discount rate must be in [0, 1)");
    }

    #[test]
    fn invariant_discount_rate_reconstruction() {
        // rate × (sales + discount) = discount (再構成性)
        let sales = 980000.0;
        let discount = 20000.0;
        let rate = calculate_discount_rate(sales, discount);
        assert!(
            (rate * (sales + discount) - discount).abs() < T,
            "rate × grossSales must reconstruct discount"
        );
    }

    // ── calculate_core_sales ──

    #[test]
    fn core_sales_normal() {
        let r = calculate_core_sales(1000000.0, 50000.0, 30000.0);
        assert_eq!(r.core_sales, 920000.0);
        assert!(!r.is_over_delivery);
    }

    #[test]
    fn core_sales_over_delivery() {
        let r = calculate_core_sales(100000.0, 60000.0, 50000.0);
        assert_eq!(r.core_sales, 0.0);
        assert!(r.is_over_delivery);
        assert_eq!(r.over_delivery_amount, 10000.0);
    }

    #[test]
    fn invariant_core_sales_non_negative() {
        // core_sales ≥ 0 always
        let r = calculate_core_sales(0.0, 50000.0, 50000.0);
        assert!(r.core_sales >= 0.0);
    }

    #[test]
    fn invariant_core_sales_identity() {
        // core_sales + flower + direct_produce = total_sales (when no over-delivery)
        let total = 1000000.0;
        let flower = 50000.0;
        let direct = 30000.0;
        let r = calculate_core_sales(total, flower, direct);
        if !r.is_over_delivery {
            assert!(
                (r.core_sales + flower + direct - total).abs() < T,
                "core + flower + direct must equal total"
            );
        }
    }

    // ── calculate_est_method ──

    #[test]
    fn est_method_basic() {
        let r = calculate_est_method(1000000.0, 0.02, 0.25, 5000.0, 500000.0, 800000.0);
        assert!(r.gross_sales > 0.0);
        assert!(r.cogs > 0.0);
    }

    #[test]
    fn est_method_null_opening() {
        let r = calculate_est_method(1000000.0, 0.02, 0.25, 5000.0, f64::NAN, 800000.0);
        assert!(r.closing_inventory_is_null);
    }

    #[test]
    fn est_method_zero_discount() {
        // discount_rate = 0 → grossSales = coreSales
        let r = calculate_est_method(1000000.0, 0.0, 0.25, 0.0, f64::NAN, 0.0);
        assert!((r.gross_sales - 1000000.0).abs() < T);
    }

    #[test]
    fn invariant_est_gross_sales_geq_core_sales() {
        // grossSales ≥ coreSales (discount inflates gross)
        let r = calculate_est_method(1000000.0, 0.02, 0.25, 5000.0, f64::NAN, 0.0);
        assert!(r.gross_sales >= 1000000.0 - T,
            "grossSales must be >= coreSales");
    }

    #[test]
    fn invariant_est_margin_identity() {
        // margin = coreSales - cogs
        let core_sales = 1000000.0;
        let r = calculate_est_method(core_sales, 0.02, 0.25, 5000.0, f64::NAN, 0.0);
        assert!(
            (r.margin - (core_sales - r.cogs)).abs() < T,
            "margin must equal coreSales - cogs"
        );
    }

    #[test]
    fn invariant_est_margin_rate_identity() {
        // marginRate × coreSales = margin
        let core_sales = 1000000.0;
        let r = calculate_est_method(core_sales, 0.02, 0.25, 5000.0, f64::NAN, 0.0);
        assert!(
            (r.margin_rate * core_sales - r.margin).abs() < T,
            "marginRate × coreSales must equal margin"
        );
    }

    #[test]
    fn invariant_est_closing_inventory_identity() {
        // closingInventory = opening + purchase - cogs
        let opening = 500000.0;
        let purchase = 800000.0;
        let r = calculate_est_method(1000000.0, 0.02, 0.25, 5000.0, opening, purchase);
        assert!(!r.closing_inventory_is_null);
        assert!(
            (r.closing_inventory - (opening + purchase - r.cogs)).abs() < T,
            "closingInventory must equal opening + purchase - cogs"
        );
    }

    #[test]
    fn invariant_higher_markup_raises_margin() {
        // Higher markup rate → lower COGS → higher margin (monotonicity)
        let r1 = calculate_est_method(1000000.0, 0.02, 0.20, 0.0, f64::NAN, 0.0);
        let r2 = calculate_est_method(1000000.0, 0.02, 0.30, 0.0, f64::NAN, 0.0);
        assert!(r2.margin > r1.margin,
            "Higher markup rate must increase margin");
    }
}
