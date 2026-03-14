use crate::types::MarkupRateResult;
use crate::utils::safe_divide;

/// Calculate average and core markup rates.
///
/// - averageMarkupRate: (allPrice - allCost) / allPrice  [fallback: 0]
///   includes purchase + delivery + transfer
/// - coreMarkupRate: (corePrice - coreCost) / corePrice  [fallback: defaultMarkupRate]
///   includes purchase + transfer only (excludes delivery)
pub fn calculate_markup_rates(
    purchase_price: f64,
    purchase_cost: f64,
    delivery_price: f64,
    delivery_cost: f64,
    transfer_price: f64,
    transfer_cost: f64,
    default_markup_rate: f64,
) -> MarkupRateResult {
    let all_price = purchase_price + delivery_price + transfer_price;
    let all_cost = purchase_cost + delivery_cost + transfer_cost;
    let average_markup_rate = safe_divide(all_price - all_cost, all_price, 0.0);

    let core_price = purchase_price + transfer_price;
    let core_cost = purchase_cost + transfer_cost;
    let core_markup_rate = safe_divide(core_price - core_cost, core_price, default_markup_rate);

    MarkupRateResult {
        average_markup_rate,
        core_markup_rate,
    }
}
