/// Cross-validation tests: golden fixtures matching TS reference implementation.
/// Values taken from grossProfitInvariants.test.ts and grossProfit domain tests.

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
// calculateInventoryCost golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_inventory_cost_normal() {
    assert_close(
        cost_aggregation::calculate_inventory_cost(500_000.0, 70_000.0),
        430_000.0,
        1e-10,
    );
}

#[test]
fn golden_inventory_cost_zero() {
    assert_close(
        cost_aggregation::calculate_inventory_cost(0.0, 0.0),
        0.0,
        1e-10,
    );
}

#[test]
fn golden_inventory_cost_equal() {
    assert_close(
        cost_aggregation::calculate_inventory_cost(300_000.0, 300_000.0),
        0.0,
        1e-10,
    );
}

// ════════════════════════════════════════════════════
// calculateTransferTotals golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_transfer_totals() {
    let r = cost_aggregation::calculate_transfer_totals(
        10_000.0, 7_000.0, 5_000.0, 3_500.0, 8_000.0, 5_600.0, 3_000.0, 2_100.0,
    );
    assert_close(r.transfer_price, 26_000.0, 1e-10);
    assert_close(r.transfer_cost, 18_200.0, 1e-10);
}

// ════════════════════════════════════════════════════
// calculateDiscountRate golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_discount_rate_normal() {
    let r = est_method::calculate_discount_rate(900_000.0, 50_000.0);
    // 50000 / (900000 + 50000) = 50000 / 950000
    assert_close(r, 50_000.0 / 950_000.0, 1e-10);
}

#[test]
fn golden_discount_rate_zero_discount() {
    assert_close(est_method::calculate_discount_rate(900_000.0, 0.0), 0.0, 1e-10);
}

#[test]
fn golden_discount_rate_zero_sales() {
    // 50000 / (0 + 50000) = 1.0
    assert_close(est_method::calculate_discount_rate(0.0, 50_000.0), 1.0, 1e-10);
}

#[test]
fn golden_discount_rate_both_zero() {
    // safeDivide(0, 0, 0) = 0
    assert_close(est_method::calculate_discount_rate(0.0, 0.0), 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// calculateCoreSales golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_core_sales_normal() {
    let r = est_method::calculate_core_sales(900_000.0, 50_000.0, 30_000.0);
    assert_close(r.core_sales, 820_000.0, 1e-10);
    assert!(!r.is_over_delivery);
    assert_close(r.over_delivery_amount, 0.0, 1e-10);
}

#[test]
fn golden_core_sales_over_delivery() {
    let r = est_method::calculate_core_sales(100_000.0, 80_000.0, 50_000.0);
    assert_close(r.core_sales, 0.0, 1e-10);
    assert!(r.is_over_delivery);
    assert_close(r.over_delivery_amount, 30_000.0, 1e-10);
}

#[test]
fn golden_core_sales_exact_zero() {
    let r = est_method::calculate_core_sales(100_000.0, 60_000.0, 40_000.0);
    assert_close(r.core_sales, 0.0, 1e-10);
    assert!(!r.is_over_delivery);
    assert_close(r.over_delivery_amount, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// calculateMarkupRates golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_markup_rates_normal() {
    let r = markup_rate::calculate_markup_rates(
        500_000.0, 350_000.0, 100_000.0, 70_000.0, 50_000.0, 35_000.0, 0.3,
    );
    // allPrice = 650_000, allCost = 455_000
    // averageMarkupRate = (650000 - 455000) / 650000 = 195000 / 650000
    assert_close(r.average_markup_rate, 195_000.0 / 650_000.0, 1e-10);
    // corePrice = 550_000, coreCost = 385_000
    // coreMarkupRate = (550000 - 385000) / 550000 = 165000 / 550000 = 0.3
    assert_close(r.core_markup_rate, 0.3, 1e-10);
}

#[test]
fn golden_markup_rates_zero_fallback() {
    let r = markup_rate::calculate_markup_rates(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3);
    assert_close(r.average_markup_rate, 0.0, 1e-10);
    assert_close(r.core_markup_rate, 0.3, 1e-10);
}

// ════════════════════════════════════════════════════
// calculateDiscountImpact golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_discount_impact_normal() {
    let r = discount_impact::calculate_discount_impact(800_000.0, 0.3, 0.05);
    // (1 - 0.3) × 800000 × (0.05 / 0.95)
    let expected = 0.7 * 800_000.0 * (0.05 / 0.95);
    assert_close(r, expected, 1e-10);
}

#[test]
fn golden_discount_impact_zero() {
    assert_close(
        discount_impact::calculate_discount_impact(800_000.0, 0.3, 0.0),
        0.0,
        1e-10,
    );
}

// ════════════════════════════════════════════════════
// calculateInvMethod golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_inv_method_normal() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 500_000.0, 900_000.0);
    assert!(!r.is_null);
    assert_close(r.cogs, 700_000.0, 1e-10);
    assert_close(r.gross_profit, 200_000.0, 1e-10);
    assert_close(r.gross_profit_rate, 200_000.0 / 900_000.0, 1e-10);
}

#[test]
fn golden_inv_method_null_opening() {
    let r = inv_method::calculate_inv_method(f64::NAN, 800_000.0, 500_000.0, 900_000.0);
    assert!(r.is_null);
}

#[test]
fn golden_inv_method_zero_sales() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 500_000.0, 0.0);
    assert!(!r.is_null);
    assert_close(r.cogs, 700_000.0, 1e-10);
    assert_close(r.gross_profit, -700_000.0, 1e-10);
    assert_close(r.gross_profit_rate, 0.0, 1e-10); // safeDivide(x, 0, 0)
}

// ════════════════════════════════════════════════════
// calculateEstMethod golden fixtures
// ════════════════════════════════════════════════════

#[test]
fn golden_est_method_normal() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert!(!r.closing_inventory_is_null);

    // grossSales = 800000 / 0.95
    let gross_sales = 800_000.0 / 0.95;
    assert_close(r.gross_sales, gross_sales, 1e-10);

    // cogs = grossSales * 0.7 + 10000
    let cogs = gross_sales * 0.7 + 10_000.0;
    assert_close(r.cogs, cogs, 1e-10);

    // margin = 800000 - cogs
    assert_close(r.margin, 800_000.0 - cogs, 1e-10);

    // marginRate = margin / 800000
    assert_close(r.margin_rate, (800_000.0 - cogs) / 800_000.0, 1e-10);

    // closingInventory = 1000000 + 400000 - cogs
    assert_close(r.closing_inventory, 1_000_000.0 + 400_000.0 - cogs, 1e-10);
}

#[test]
fn golden_est_method_null_inventory() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, f64::NAN, 400_000.0);
    assert!(r.closing_inventory_is_null);
    // Other fields are still computed
    assert_close(r.gross_sales, 800_000.0 / 0.95, 1e-10);
}

#[test]
fn golden_est_method_100_percent_discount() {
    // discountRate = 1.0 → 1 - 1 = 0 → safeDivide fallback = coreSales
    let r = est_method::calculate_est_method(800_000.0, 1.0, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert_close(r.gross_sales, 800_000.0, 1e-10); // fallback to coreSales
}

#[test]
fn golden_est_method_zero_core_sales() {
    let r = est_method::calculate_est_method(0.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert_close(r.gross_sales, 0.0, 1e-10);
    assert_close(r.cogs, 10_000.0, 1e-10); // 0 * 0.7 + 10000
    assert_close(r.margin, -10_000.0, 1e-10);
    assert_close(r.margin_rate, 0.0, 1e-10); // safeDivide(-10000, 0, 0)
}
