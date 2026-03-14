use crate::types::InvMethodResult;
use crate::utils::safe_divide;

/// Calculate gross profit using the inventory method.
///
/// Null propagation: if either opening or closing inventory is NaN (null sentinel),
/// the entire result is null (is_null = true).
///
/// Steps:
/// 1. cogs = openingInventory + totalPurchaseCost - closingInventory
/// 2. grossProfit = totalSales - cogs
/// 3. grossProfitRate = grossProfit / totalSales  [fallback: 0]
pub fn calculate_inv_method(
    opening_inventory: f64,
    closing_inventory: f64,
    total_purchase_cost: f64,
    total_sales: f64,
) -> InvMethodResult {
    if opening_inventory.is_nan() || closing_inventory.is_nan() {
        return InvMethodResult {
            is_null: true,
            cogs: 0.0,
            gross_profit: 0.0,
            gross_profit_rate: 0.0,
        };
    }

    let cogs = opening_inventory + total_purchase_cost - closing_inventory;
    let gross_profit = total_sales - cogs;
    let gross_profit_rate = safe_divide(gross_profit, total_sales, 0.0);

    InvMethodResult {
        is_null: false,
        cogs,
        gross_profit,
        gross_profit_rate,
    }
}
