/// Daily estimated inventory calculation.
///
/// Flat contract input (column-oriented, all arrays length === days_in_month):
/// - daily_sales: total sales per day
/// - daily_flowers_price: flower sales price per day
/// - daily_direct_produce_price: direct produce price per day
/// - daily_cost_inclusion_cost: cost inclusion fee per day
/// - daily_total_cost: getDailyTotalCost applied by TS adapter (6 cost fields summed)
/// - daily_delivery_sales_cost: delivery sales cost (flowers.cost + directProduce.cost) per day
///
/// Scalar inputs:
/// - opening_inventory: required (not nullable for BIZ-009)
/// - closing_inventory: NaN = null (no physical count done)
/// - markup_rate: 値入率 (rateOwnership=engine assumption)
/// - discount_rate: 値引率 (rateOwnership=engine assumption)
///
/// @contractId BIZ-009
/// @semanticClass business
/// @methodFamily accounting

use crate::utils::safe_divide;

/// Fields per output row.
pub const FIELDS_PER_ROW: usize = 11;

/// Compute daily estimated inventory details.
///
/// Returns flat array: each row = [day, sales, coreSales, grossSales,
///   inventoryCost, estCogs, costInclusionCost, cumInventoryCost, cumEstCogs,
///   estimated, actual]
/// actual: NaN = null (no physical count on that day).
pub fn compute_estimated_inventory_details(
    daily_sales: &[f64],
    daily_flowers_price: &[f64],
    daily_direct_produce_price: &[f64],
    daily_cost_inclusion_cost: &[f64],
    daily_total_cost: &[f64],
    daily_delivery_sales_cost: &[f64],
    opening_inventory: f64,
    closing_inventory: f64, // NaN = null
    markup_rate: f64,
    discount_rate: f64,
    days_in_month: usize,
) -> Vec<f64> {
    let divisor = 1.0 - discount_rate;
    let mut result = Vec::with_capacity(days_in_month * FIELDS_PER_ROW);

    let mut cum_inventory_cost: f64 = 0.0;
    let mut cum_est_cogs: f64 = 0.0;

    for d in 0..days_in_month {
        let sales = daily_sales.get(d).copied().unwrap_or(0.0);
        let flowers_price = daily_flowers_price.get(d).copied().unwrap_or(0.0);
        let direct_produce_price = daily_direct_produce_price.get(d).copied().unwrap_or(0.0);
        let cost_inclusion_cost = daily_cost_inclusion_cost.get(d).copied().unwrap_or(0.0);
        let total_cost = daily_total_cost.get(d).copied().unwrap_or(0.0);
        let delivery_sales_cost = daily_delivery_sales_cost.get(d).copied().unwrap_or(0.0);

        // coreSales = sales - flowers.price - directProduce.price (no clamp)
        let core_sales = sales - flowers_price - direct_produce_price;

        // grossSales = coreSales / (1 - discountRate)
        let gross_sales = safe_divide(core_sales, divisor, core_sales);

        // inventoryCost = totalCost - deliverySalesCost
        let inventory_cost = total_cost - delivery_sales_cost;

        // estCogs = grossSales * (1 - markupRate) + costInclusionCost
        let est_cogs = gross_sales * (1.0 - markup_rate) + cost_inclusion_cost;

        cum_inventory_cost += inventory_cost;
        cum_est_cogs += est_cogs;

        // estimated = openingInventory + cumInventoryCost - cumEstCogs
        let estimated = opening_inventory + cum_inventory_cost - cum_est_cogs;

        // actual: only last day and only if closingInventory is not NaN
        let actual = if d == days_in_month - 1 && !closing_inventory.is_nan() {
            closing_inventory
        } else {
            f64::NAN // null sentinel
        };

        let day = (d + 1) as f64;
        result.extend_from_slice(&[
            day, sales, core_sales, gross_sales, inventory_cost, est_cogs,
            cost_inclusion_cost, cum_inventory_cost, cum_est_cogs, estimated, actual,
        ]);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_uniform() {
        let n = 5;
        let sales = vec![1000.0; n];
        let flowers = vec![100.0; n];
        let direct = vec![50.0; n];
        let cost_incl = vec![10.0; n];
        let total_cost = vec![800.0; n];
        let delivery_cost = vec![50.0; n];

        let r = compute_estimated_inventory_details(
            &sales, &flowers, &direct, &cost_incl, &total_cost, &delivery_cost,
            10000.0, 9500.0, 0.3, 0.05, n,
        );
        assert_eq!(r.len(), n * FIELDS_PER_ROW);

        // Day 1
        assert_eq!(r[0], 1.0); // day
        assert_eq!(r[1], 1000.0); // sales
        // coreSales = 1000 - 100 - 50 = 850
        assert_eq!(r[2], 850.0);
    }

    #[test]
    fn closing_null_nan() {
        let r = compute_estimated_inventory_details(
            &[100.0], &[0.0], &[0.0], &[0.0], &[80.0], &[0.0],
            1000.0, f64::NAN, 0.3, 0.0, 1,
        );
        // actual should be NaN (null)
        assert!(r[10].is_nan());
    }

    #[test]
    fn closing_present() {
        let r = compute_estimated_inventory_details(
            &[100.0], &[0.0], &[0.0], &[0.0], &[80.0], &[0.0],
            1000.0, 950.0, 0.3, 0.0, 1,
        );
        assert_eq!(r[10], 950.0);
    }

    #[test]
    fn cumulative_builds() {
        let r = compute_estimated_inventory_details(
            &[100.0, 200.0], &[0.0, 0.0], &[0.0, 0.0], &[0.0, 0.0],
            &[80.0, 160.0], &[0.0, 0.0],
            1000.0, f64::NAN, 0.3, 0.0, 2,
        );
        // Day 1: cumInventoryCost = 80, cumEstCogs = 100*0.7 = 70
        // Day 2: cumInventoryCost = 80+160=240, cumEstCogs = 70 + 200*0.7 = 210
        assert_eq!(r[7], 80.0); // day 1 cumInventoryCost
        assert_eq!(r[7 + FIELDS_PER_ROW], 240.0); // day 2 cumInventoryCost
    }
}
