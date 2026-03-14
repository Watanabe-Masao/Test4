/// Invariant tests for grossProfit Rust implementation.
/// Corresponds to GP-INV-1 through GP-INV-12 from grossProfitInvariants.test.ts.

use gross_profit_wasm::cost_aggregation;
use gross_profit_wasm::discount_impact;
use gross_profit_wasm::est_method;
use gross_profit_wasm::inv_method;
use gross_profit_wasm::markup_rate;
use gross_profit_wasm::utils::safe_divide;

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
// GP-INV-1: COGS = opening + purchases - closing
// ════════════════════════════════════════════════════

#[test]
fn inv_method_cogs_identity_normal() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 500_000.0, 900_000.0);
    assert!(!r.is_null);
    assert_close(r.cogs, 1_000_000.0 + 500_000.0 - 800_000.0, 1e-10);
}

#[test]
fn inv_method_cogs_identity_large_purchase() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 10_000_000.0, 900_000.0);
    assert!(!r.is_null);
    assert_close(r.cogs, 1_000_000.0 + 10_000_000.0 - 800_000.0, 1e-10);
}

#[test]
fn inv_method_cogs_identity_equal_inventory() {
    let r = inv_method::calculate_inv_method(500_000.0, 500_000.0, 500_000.0, 900_000.0);
    assert!(!r.is_null);
    assert_close(r.cogs, 500_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-2: grossProfit = totalSales - COGS
// ════════════════════════════════════════════════════

#[test]
fn inv_method_gp_identity() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 500_000.0, 900_000.0);
    assert_close(r.gross_profit, 900_000.0 - r.cogs, 1e-10);
}

#[test]
fn inv_method_gp_identity_negative() {
    let r = inv_method::calculate_inv_method(2_000_000.0, 100_000.0, 500_000.0, 500_000.0);
    assert_close(r.gross_profit, 500_000.0 - r.cogs, 1e-10);
    assert!(r.gross_profit < 0.0);
}

// ════════════════════════════════════════════════════
// GP-INV-3: grossProfitRate = safeDivide(grossProfit, totalSales, 0)
// ════════════════════════════════════════════════════

#[test]
fn inv_method_gp_rate_identity() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 500_000.0, 900_000.0);
    let expected = safe_divide(r.gross_profit, 900_000.0, 0.0);
    assert_close(r.gross_profit_rate, expected, 1e-10);
}

#[test]
fn inv_method_gp_rate_zero_sales() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 500_000.0, 0.0);
    assert_close(r.gross_profit_rate, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-4: null inventory → all null
// ════════════════════════════════════════════════════

#[test]
fn inv_method_null_opening() {
    let r = inv_method::calculate_inv_method(f64::NAN, 800_000.0, 500_000.0, 900_000.0);
    assert!(r.is_null);
}

#[test]
fn inv_method_null_closing() {
    let r = inv_method::calculate_inv_method(1_000_000.0, f64::NAN, 500_000.0, 900_000.0);
    assert!(r.is_null);
}

#[test]
fn inv_method_null_both() {
    let r = inv_method::calculate_inv_method(f64::NAN, f64::NAN, 500_000.0, 900_000.0);
    assert!(r.is_null);
}

// ════════════════════════════════════════════════════
// GP-INV-5: grossSales = safeDivide(coreSales, 1 - discountRate, coreSales)
// ════════════════════════════════════════════════════

#[test]
fn est_method_gross_sales_identity() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    let expected = safe_divide(800_000.0, 1.0 - 0.05, 800_000.0);
    assert_close(r.gross_sales, expected, 1e-10);
}

#[test]
fn est_method_gross_sales_zero_discount() {
    let r = est_method::calculate_est_method(800_000.0, 0.0, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert_close(r.gross_sales, 800_000.0, 1e-10);
}

#[test]
fn est_method_gross_sales_50_percent_discount() {
    let r = est_method::calculate_est_method(800_000.0, 0.5, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert_close(r.gross_sales, 1_600_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-6: COGS = grossSales × (1 - markupRate) + costInclusionCost
// ════════════════════════════════════════════════════

#[test]
fn est_method_cogs_identity() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    let expected = r.gross_sales * (1.0 - 0.3) + 10_000.0;
    assert_close(r.cogs, expected, 1e-10);
}

#[test]
fn est_method_cogs_zero_markup() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.0, 10_000.0, 1_000_000.0, 400_000.0);
    let expected = r.gross_sales * 1.0 + 10_000.0;
    assert_close(r.cogs, expected, 1e-10);
}

#[test]
fn est_method_cogs_zero_cost_inclusion() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 0.0, 1_000_000.0, 400_000.0);
    let expected = r.gross_sales * 0.7;
    assert_close(r.cogs, expected, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-7: margin = coreSales - COGS
// ════════════════════════════════════════════════════

#[test]
fn est_method_margin_identity() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert_close(r.margin, 800_000.0 - r.cogs, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-8: marginRate = safeDivide(margin, coreSales, 0)
// ════════════════════════════════════════════════════

#[test]
fn est_method_margin_rate_identity() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    let expected = safe_divide(r.margin, 800_000.0, 0.0);
    assert_close(r.margin_rate, expected, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-7 (closing): closingInventory = opening + purchases - COGS
// ════════════════════════════════════════════════════

#[test]
fn est_method_closing_inventory_identity() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert!(!r.closing_inventory_is_null);
    let expected = 1_000_000.0 + 400_000.0 - r.cogs;
    assert_close(r.closing_inventory, expected, 1e-10);
}

#[test]
fn est_method_closing_inventory_null_opening() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, f64::NAN, 400_000.0);
    assert!(r.closing_inventory_is_null);
}

#[test]
fn est_method_closing_inventory_large_purchase() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 5_000_000.0);
    assert!(!r.closing_inventory_is_null);
    let expected = 1_000_000.0 + 5_000_000.0 - r.cogs;
    assert_close(r.closing_inventory, expected, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-9: discountRate = safeDivide(discountAmount, sales+discount, 0)
// ════════════════════════════════════════════════════

#[test]
fn discount_rate_identity() {
    let r = est_method::calculate_discount_rate(900_000.0, 50_000.0);
    let expected = safe_divide(50_000.0, 900_000.0 + 50_000.0, 0.0);
    assert_close(r, expected, 1e-10);
}

#[test]
fn discount_rate_zero_discount() {
    let r = est_method::calculate_discount_rate(900_000.0, 0.0);
    assert_close(r, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-10: coreSales < 0 → isOverDelivery=true, coreSales=0
// ════════════════════════════════════════════════════

#[test]
fn core_sales_normal() {
    let r = est_method::calculate_core_sales(900_000.0, 50_000.0, 30_000.0);
    assert_close(r.core_sales, 820_000.0, 1e-10);
    assert!(!r.is_over_delivery);
    assert_close(r.over_delivery_amount, 0.0, 1e-10);
}

#[test]
fn core_sales_over_delivery() {
    let r = est_method::calculate_core_sales(100_000.0, 80_000.0, 50_000.0);
    assert_close(r.core_sales, 0.0, 1e-10);
    assert!(r.is_over_delivery);
    assert_close(r.over_delivery_amount, 30_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-11: transfer totals = sum of 4 directions
// ════════════════════════════════════════════════════

#[test]
fn transfer_totals_price_sum() {
    let r = cost_aggregation::calculate_transfer_totals(
        10_000.0, 7_000.0, 5_000.0, 3_500.0, 8_000.0, 5_600.0, 3_000.0, 2_100.0,
    );
    assert_close(r.transfer_price, 26_000.0, 1e-10);
}

#[test]
fn transfer_totals_cost_sum() {
    let r = cost_aggregation::calculate_transfer_totals(
        10_000.0, 7_000.0, 5_000.0, 3_500.0, 8_000.0, 5_600.0, 3_000.0, 2_100.0,
    );
    assert_close(r.transfer_cost, 18_200.0, 1e-10);
}

#[test]
fn transfer_totals_all_zero() {
    let r = cost_aggregation::calculate_transfer_totals(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    assert_close(r.transfer_price, 0.0, 1e-10);
    assert_close(r.transfer_cost, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-11 (inventory cost): totalCost - deliverySalesCost
// ════════════════════════════════════════════════════

#[test]
fn inventory_cost_subtraction() {
    let r = cost_aggregation::calculate_inventory_cost(500_000.0, 70_000.0);
    assert_close(r, 430_000.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-8 (discount impact): loss cost formula
// ════════════════════════════════════════════════════

#[test]
fn discount_impact_normal() {
    let r = discount_impact::calculate_discount_impact(800_000.0, 0.3, 0.05);
    let expected = (1.0 - 0.3) * 800_000.0 * safe_divide(0.05, 1.0 - 0.05, 0.05);
    assert_close(r, expected, 1e-10);
}

#[test]
fn discount_impact_zero_discount() {
    let r = discount_impact::calculate_discount_impact(800_000.0, 0.3, 0.0);
    assert_close(r, 0.0, 1e-10);
}

#[test]
fn discount_impact_zero_core_sales() {
    let r = discount_impact::calculate_discount_impact(0.0, 0.3, 0.05);
    assert_close(r, 0.0, 1e-10);
}

#[test]
fn discount_impact_full_markup() {
    let r = discount_impact::calculate_discount_impact(800_000.0, 1.0, 0.05);
    assert_close(r, 0.0, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-9 (markup rates): bounds and fallback
// ════════════════════════════════════════════════════

#[test]
fn markup_rates_normal_bounds() {
    let r = markup_rate::calculate_markup_rates(
        500_000.0, 350_000.0, 100_000.0, 70_000.0, 50_000.0, 35_000.0, 0.3,
    );
    assert!(r.average_markup_rate >= 0.0 && r.average_markup_rate <= 1.0);
    assert!(r.core_markup_rate >= 0.0 && r.core_markup_rate <= 1.0);
}

#[test]
fn markup_rates_cost_equals_price() {
    let r = markup_rate::calculate_markup_rates(100.0, 100.0, 50.0, 50.0, 30.0, 30.0, 0.3);
    assert_close(r.average_markup_rate, 0.0, 1e-10);
    assert_close(r.core_markup_rate, 0.0, 1e-10);
}

#[test]
fn markup_rates_all_zero_fallback() {
    let r = markup_rate::calculate_markup_rates(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3);
    assert_close(r.average_markup_rate, 0.0, 1e-10);
    assert_close(r.core_markup_rate, 0.3, 1e-10); // fallback to defaultMarkupRate
}

#[test]
fn markup_rates_core_excludes_delivery() {
    let r = markup_rate::calculate_markup_rates(
        500_000.0, 350_000.0, 100_000.0, 70_000.0, 50_000.0, 35_000.0, 0.3,
    );
    // core = (purchase + transfer) only
    let core_price = 500_000.0 + 50_000.0;
    let core_cost = 350_000.0 + 35_000.0;
    let expected = (core_price - core_cost) / core_price;
    assert_close(r.core_markup_rate, expected, 1e-10);
}

// ════════════════════════════════════════════════════
// GP-INV-12: All outputs finite
// ════════════════════════════════════════════════════

#[test]
fn all_inv_method_outputs_finite() {
    let r = inv_method::calculate_inv_method(1_000_000.0, 800_000.0, 500_000.0, 900_000.0);
    assert!(r.cogs.is_finite());
    assert!(r.gross_profit.is_finite());
    assert!(r.gross_profit_rate.is_finite());
}

#[test]
fn all_est_method_outputs_finite() {
    let r = est_method::calculate_est_method(800_000.0, 0.05, 0.3, 10_000.0, 1_000_000.0, 400_000.0);
    assert!(r.gross_sales.is_finite());
    assert!(r.cogs.is_finite());
    assert!(r.margin.is_finite());
    assert!(r.margin_rate.is_finite());
    assert!(r.closing_inventory.is_finite());
}

#[test]
fn all_outputs_finite_extreme_values() {
    let r = inv_method::calculate_inv_method(1e12, 1e12, 1e12, 1e12);
    assert!(r.cogs.is_finite());
    assert!(r.gross_profit.is_finite());
    assert!(r.gross_profit_rate.is_finite());
}

// ════════════════════════════════════════════════════
// Markup ⇔ Discount Impact cross-consistency
// ════════════════════════════════════════════════════

#[test]
fn higher_markup_lower_loss() {
    let low_markup_loss = discount_impact::calculate_discount_impact(800_000.0, 0.2, 0.05);
    let high_markup_loss = discount_impact::calculate_discount_impact(800_000.0, 0.5, 0.05);
    assert!(high_markup_loss < low_markup_loss);
}
