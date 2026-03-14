use crate::types::{CoreSalesResult, EstMethodResult};
use crate::utils::safe_divide;

/// Calculate discount rate from sales and discount amounts.
///
/// TS: `safeDivide(discountAmount, salesAmount + discountAmount, 0)`
pub fn calculate_discount_rate(sales_amount: f64, discount_amount: f64) -> f64 {
    safe_divide(discount_amount, sales_amount + discount_amount, 0.0)
}

/// Calculate core sales by deducting flower and direct produce from total sales.
///
/// Detects over-delivery (when deductions exceed total sales) and clamps to 0.
pub fn calculate_core_sales(
    total_sales: f64,
    flower_sales_price: f64,
    direct_produce_sales_price: f64,
) -> CoreSalesResult {
    let raw = total_sales - flower_sales_price - direct_produce_sales_price;
    if raw < 0.0 {
        CoreSalesResult {
            core_sales: 0.0,
            is_over_delivery: true,
            over_delivery_amount: -raw,
        }
    } else {
        CoreSalesResult {
            core_sales: raw,
            is_over_delivery: false,
            over_delivery_amount: 0.0,
        }
    }
}

/// Calculate estimated gross profit using the estimation method.
///
/// Steps:
/// 1. grossSales = coreSales / (1 - discountRate)  [fallback: coreSales]
/// 2. cogs = grossSales × (1 - markupRate) + costInclusionCost
/// 3. margin = coreSales - cogs
/// 4. marginRate = margin / coreSales  [fallback: 0]
/// 5. closingInventory = openingInventory + inventoryPurchaseCost - cogs  [null if opening is NaN]
pub fn calculate_est_method(
    core_sales: f64,
    discount_rate: f64,
    markup_rate: f64,
    cost_inclusion_cost: f64,
    opening_inventory: f64,
    inventory_purchase_cost: f64,
) -> EstMethodResult {
    let gross_sales = safe_divide(core_sales, 1.0 - discount_rate, core_sales);
    let cogs = gross_sales * (1.0 - markup_rate) + cost_inclusion_cost;
    let margin = core_sales - cogs;
    let margin_rate = safe_divide(margin, core_sales, 0.0);

    let (ci_is_null, closing_inventory) = if opening_inventory.is_nan() {
        (true, 0.0)
    } else {
        (false, opening_inventory + inventory_purchase_cost - cogs)
    };

    EstMethodResult {
        closing_inventory_is_null: ci_is_null,
        gross_sales,
        cogs,
        margin,
        margin_rate,
        closing_inventory,
    }
}
