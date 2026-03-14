use crate::types::TransferTotalsResult;

/// Calculate inventory cost by deducting delivery sales cost from total cost.
///
/// TS: `totalCost - deliverySalesCost`
pub fn calculate_inventory_cost(total_cost: f64, delivery_sales_cost: f64) -> f64 {
    total_cost - delivery_sales_cost
}

/// Calculate transfer totals by summing all 4 transfer directions.
///
/// Directions: inter-store in/out + inter-department in/out
pub fn calculate_transfer_totals(
    inter_store_in_price: f64,
    inter_store_in_cost: f64,
    inter_store_out_price: f64,
    inter_store_out_cost: f64,
    inter_department_in_price: f64,
    inter_department_in_cost: f64,
    inter_department_out_price: f64,
    inter_department_out_cost: f64,
) -> TransferTotalsResult {
    TransferTotalsResult {
        transfer_price: inter_store_in_price
            + inter_store_out_price
            + inter_department_in_price
            + inter_department_out_price,
        transfer_cost: inter_store_in_cost
            + inter_store_out_cost
            + inter_department_in_cost
            + inter_department_out_cost,
    }
}
