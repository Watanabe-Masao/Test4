/// Edge case tests: boundary conditions, zero inputs, NaN, large values.

use gross_profit_wasm::cost_aggregation;
use gross_profit_wasm::discount_impact;
use gross_profit_wasm::est_method;
use gross_profit_wasm::inv_method;
use gross_profit_wasm::markup_rate;

fn assert_close(a: f64, b: f64, tol: f64) {
    assert!(
        (a - b).abs() < tol,
        "expected {} ≈ {} (diff: {}, tol: {})",
        a,
        b,
        (a - b).abs(),
        tol
    );
}

// ════════════════════════════════════════════════════
// Zero inputs
// ════════════════════════════════════════════════════

#[test]
fn inventory_cost_all_zero() {
    assert_close(cost_aggregation::calculate_inventory_cost(0.0, 0.0), 0.0, 1e-10);
}

#[test]
fn transfer_totals_all_zero() {
    let r = cost_aggregation::calculate_transfer_totals(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    assert_close(r.transfer_price, 0.0, 1e-10);
    assert_close(r.transfer_cost, 0.0, 1e-10);
}

#[test]
fn discount_rate_both_zero() {
    assert_close(est_method::calculate_discount_rate(0.0, 0.0), 0.0, 1e-10);
}

#[test]
fn core_sales_all_zero() {
    let r = est_method::calculate_core_sales(0.0, 0.0, 0.0);
    assert_close(r.core_sales, 0.0, 1e-10);
    assert!(!r.is_over_delivery);
}

#[test]
fn markup_rates_all_zero() {
    let r = markup_rate::calculate_markup_rates(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.25);
    assert_close(r.average_markup_rate, 0.0, 1e-10);
    assert_close(r.core_markup_rate, 0.25, 1e-10); // fallback
}

#[test]
fn discount_impact_all_zero() {
    assert_close(
        discount_impact::calculate_discount_impact(0.0, 0.0, 0.0),
        0.0,
        1e-10,
    );
}

#[test]
fn inv_method_all_zero() {
    let r = inv_method::calculate_inv_method(0.0, 0.0, 0.0, 0.0);
    assert!(!r.is_null);
    assert_close(r.cogs, 0.0, 1e-10);
    assert_close(r.gross_profit, 0.0, 1e-10);
    assert_close(r.gross_profit_rate, 0.0, 1e-10);
}

#[test]
fn est_method_all_zero() {
    let r = est_method::calculate_est_method(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    assert_close(r.gross_sales, 0.0, 1e-10);
    assert_close(r.cogs, 0.0, 1e-10);
    assert_close(r.margin, 0.0, 1e-10);
    assert_close(r.margin_rate, 0.0, 1e-10);
    assert_close(r.closing_inventory, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Negative values
// ════════════════════════════════════════════════════

#[test]
fn inventory_cost_negative_delivery() {
    // negative deliverySalesCost means result > totalCost
    assert_close(
        cost_aggregation::calculate_inventory_cost(500_000.0, -100_000.0),
        600_000.0,
        1e-10,
    );
}

#[test]
fn inv_method_negative_gross_profit() {
    // COGS > totalSales → negative gross profit
    let r = inv_method::calculate_inv_method(2_000_000.0, 100_000.0, 500_000.0, 500_000.0);
    assert!(!r.is_null);
    assert!(r.gross_profit < 0.0);
    assert!(r.gross_profit_rate < 0.0);
}

#[test]
fn core_sales_negative_result_clamped() {
    // deliveries exceed total sales
    let r = est_method::calculate_core_sales(10_000.0, 50_000.0, 50_000.0);
    assert_close(r.core_sales, 0.0, 1e-10);
    assert!(r.is_over_delivery);
    assert_close(r.over_delivery_amount, 90_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Large values (1e12+)
// ════════════════════════════════════════════════════

#[test]
fn inventory_cost_large() {
    let r = cost_aggregation::calculate_inventory_cost(1e15, 1e14);
    assert!(r.is_finite());
    assert_close(r, 9e14, 1e-10);
}

#[test]
fn inv_method_large_values() {
    let r = inv_method::calculate_inv_method(1e12, 1e12, 1e12, 1e12);
    assert!(r.cogs.is_finite());
    assert!(r.gross_profit.is_finite());
    assert!(r.gross_profit_rate.is_finite());
}

#[test]
fn est_method_large_values() {
    let r = est_method::calculate_est_method(1e12, 0.05, 0.3, 1e9, 1e12, 1e12);
    assert!(r.gross_sales.is_finite());
    assert!(r.cogs.is_finite());
    assert!(r.margin.is_finite());
    assert!(r.margin_rate.is_finite());
    assert!(r.closing_inventory.is_finite());
}

#[test]
fn markup_rates_large_values() {
    let r = markup_rate::calculate_markup_rates(1e12, 7e11, 1e11, 7e10, 5e10, 3.5e10, 0.3);
    assert!(r.average_markup_rate.is_finite());
    assert!(r.core_markup_rate.is_finite());
}

#[test]
fn transfer_totals_large_values() {
    let r = cost_aggregation::calculate_transfer_totals(
        1e12, 1e12, 1e12, 1e12, 1e12, 1e12, 1e12, 1e12,
    );
    assert!(r.transfer_price.is_finite());
    assert!(r.transfer_cost.is_finite());
}

// ════════════════════════════════════════════════════
// NaN inputs (null sentinel)
// ════════════════════════════════════════════════════

#[test]
fn inv_method_nan_opening_only() {
    let r = inv_method::calculate_inv_method(f64::NAN, 800_000.0, 500_000.0, 900_000.0);
    assert!(r.is_null);
}

#[test]
fn inv_method_nan_closing_only() {
    let r = inv_method::calculate_inv_method(1_000_000.0, f64::NAN, 500_000.0, 900_000.0);
    assert!(r.is_null);
}

#[test]
fn inv_method_nan_both() {
    let r = inv_method::calculate_inv_method(f64::NAN, f64::NAN, 500_000.0, 900_000.0);
    assert!(r.is_null);
}

#[test]
fn est_method_nan_opening() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, f64::NAN, 400_000.0);
    assert!(r.closing_inventory_is_null);
    // Other fields still computed
    assert!(r.gross_sales.is_finite());
    assert!(r.cogs.is_finite());
}

// ════════════════════════════════════════════════════
// safeDivide edge cases via public functions
// ════════════════════════════════════════════════════

#[test]
fn discount_rate_zero_sales_nonzero_discount() {
    // safeDivide(50000, 0+50000, 0) = 50000/50000 = 1
    assert_close(est_method::calculate_discount_rate(0.0, 50_000.0), 1.0, 1e-10);
}

#[test]
fn est_method_100_percent_discount_fallback() {
    // 1 - 1.0 = 0 → safeDivide(coreSales, 0, coreSales) = coreSales
    let r = est_method::calculate_est_method(800_000.0, 1.0, 0.3, 0.0, 1_000_000.0, 400_000.0);
    assert_close(r.gross_sales, 800_000.0, 1e-10);
}

#[test]
fn discount_impact_100_percent_discount_fallback() {
    // 1 - 1.0 = 0 → safeDivide(1.0, 0, 1.0) = 1.0
    let r = discount_impact::calculate_discount_impact(800_000.0, 0.3, 1.0);
    // (1 - 0.3) × 800000 × 1.0 = 560000
    assert_close(r, 560_000.0, 1e-10);
}

#[test]
fn markup_rates_zero_core_price_fallback() {
    // Only delivery, no purchase or transfer → core fallback to default
    let r = markup_rate::calculate_markup_rates(0.0, 0.0, 100_000.0, 70_000.0, 0.0, 0.0, 0.42);
    assert_close(r.core_markup_rate, 0.42, 1e-10); // fallback to defaultMarkupRate
    // average uses all, so it's (100000-70000)/100000 = 0.3
    assert_close(r.average_markup_rate, 0.3, 1e-10);
}

#[test]
fn est_method_zero_core_sales_margin_rate() {
    // safeDivide(margin, 0, 0) = 0
    let r = est_method::calculate_est_method(0.0, 0.0, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert_close(r.margin_rate, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Boundary: coreSales exactly zero (not negative)
// ════════════════════════════════════════════════════

#[test]
fn core_sales_exact_boundary() {
    // totalSales == flower + directProduce → coreSales = 0, not over-delivery
    let r = est_method::calculate_core_sales(500_000.0, 300_000.0, 200_000.0);
    assert_close(r.core_sales, 0.0, 1e-10);
    assert!(!r.is_over_delivery);
    assert_close(r.over_delivery_amount, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// Precision: small differences
// ════════════════════════════════════════════════════

#[test]
fn inv_method_tiny_difference() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 999_999.99, 500_000.0, 900_000.0);
    assert!(!r.is_null);
    // COGS = 1000000 + 500000 - 999999.99 = 500000.01
    assert_close(r.cogs, 500_000.01, 1e-8);
    assert!(r.cogs.is_finite());
}

#[test]
fn discount_rate_tiny_amounts() {
    let r = est_method::calculate_discount_rate(1e-10, 1e-10);
    // 1e-10 / (1e-10 + 1e-10) = 0.5
    assert_close(r, 0.5, 1e-10);
}
