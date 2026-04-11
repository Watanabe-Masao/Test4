/// Pin interval gross profit calculation.
///
/// Calculates gross profit for each inventory pin interval using the
/// inventory method: COGS = Opening + Purchases - Closing.
///
/// Flat contract input (column-oriented):
/// - daily_sales: Float64Array, index i = day (i+1), length === days_in_month
/// - daily_total_cost: Float64Array, getDailyTotalCost applied by TS adapter
/// - pin_days: sorted ascending, 1-based day numbers
/// - pin_closing_inventory: closing inventory at each pin day
///
/// @contractId BIZ-011
/// @semanticClass business
/// @methodFamily accounting

use crate::utils::safe_divide;

/// Result for a single pin interval.
#[derive(Debug, Clone)]
pub struct PinIntervalResult {
    pub start_day: u32,
    pub end_day: u32,
    pub opening_inventory: f64,
    pub closing_inventory: f64,
    pub total_sales: f64,
    pub total_purchase_cost: f64,
    pub cogs: f64,
    pub gross_profit: f64,
    pub gross_profit_rate: f64,
}

/// Number of output fields per interval (for FFI flat output sizing).
pub const FIELDS_PER_INTERVAL: usize = 9;

/// Calculate pin intervals from flat contract input.
///
/// `opening_inventory`: period-start inventory. NaN means null → treated as 0.
/// `pin_days`: 1-based, ascending, each ∈ [1, days_in_month].
/// `pin_closing_inv`: closing inventory values, same length as pin_days.
pub fn calculate_pin_intervals(
    daily_sales: &[f64],
    daily_total_cost: &[f64],
    opening_inventory: f64,
    pin_days: &[u32],
    pin_closing_inv: &[f64],
    _days_in_month: u32,
) -> Vec<PinIntervalResult> {
    if pin_days.is_empty() {
        return vec![];
    }

    let opening = if opening_inventory.is_nan() { 0.0 } else { opening_inventory };
    let mut results = Vec::with_capacity(pin_days.len());
    let mut prev_day: u32 = 0;
    let mut prev_inventory = opening;

    for (i, &day) in pin_days.iter().enumerate() {
        let closing_inv = pin_closing_inv[i];

        let mut total_sales = 0.0;
        let mut total_purchase_cost = 0.0;

        // Sum from prevDay+1 to day (1-based → 0-based index)
        for d in (prev_day + 1)..=day {
            let idx = (d - 1) as usize;
            if idx < daily_sales.len() {
                total_sales += daily_sales[idx];
            }
            if idx < daily_total_cost.len() {
                total_purchase_cost += daily_total_cost[idx];
            }
        }

        let cogs = prev_inventory + total_purchase_cost - closing_inv;
        let gross_profit = total_sales - cogs;
        let gross_profit_rate = safe_divide(gross_profit, total_sales, 0.0);

        results.push(PinIntervalResult {
            start_day: prev_day + 1,
            end_day: day,
            opening_inventory: prev_inventory,
            closing_inventory: closing_inv,
            total_sales,
            total_purchase_cost,
            cogs,
            gross_profit,
            gross_profit_rate,
        });

        prev_day = day;
        prev_inventory = closing_inv;
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_interval() {
        // Opening=100, day 1-10 sales=10/day, cost=8/day, closing=100
        let sales = vec![10.0; 10];
        let cost = vec![8.0; 10];
        let r = calculate_pin_intervals(&sales, &cost, 100.0, &[10], &[100.0], 10);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0].start_day, 1);
        assert_eq!(r[0].end_day, 10);
        assert_eq!(r[0].total_sales, 100.0);
        assert_eq!(r[0].total_purchase_cost, 80.0);
        // COGS = 100 + 80 - 100 = 80
        assert_eq!(r[0].cogs, 80.0);
        // GP = 100 - 80 = 20
        assert_eq!(r[0].gross_profit, 20.0);
        // GPR = 20/100 = 0.2
        assert_eq!(r[0].gross_profit_rate, 0.2);
    }

    #[test]
    fn two_intervals() {
        let sales = vec![10.0; 20];
        let cost = vec![7.0; 20];
        let r = calculate_pin_intervals(&sales, &cost, 200.0, &[10, 20], &[210.0, 220.0], 20);
        assert_eq!(r.len(), 2);
        // Interval 1: start=1, end=10
        assert_eq!(r[0].start_day, 1);
        assert_eq!(r[0].end_day, 10);
        assert_eq!(r[0].opening_inventory, 200.0);
        assert_eq!(r[0].closing_inventory, 210.0);
        // Interval 2: start=11, end=20
        assert_eq!(r[1].start_day, 11);
        assert_eq!(r[1].opening_inventory, 210.0); // prev closing
    }

    #[test]
    fn empty_pins() {
        let r = calculate_pin_intervals(&[1.0; 10], &[1.0; 10], 100.0, &[], &[], 10);
        assert!(r.is_empty());
    }

    #[test]
    fn nan_opening_treated_as_zero() {
        let r = calculate_pin_intervals(&[10.0; 5], &[8.0; 5], f64::NAN, &[5], &[50.0], 5);
        assert_eq!(r[0].opening_inventory, 0.0);
    }

    #[test]
    fn zero_sales_rate_zero() {
        let r = calculate_pin_intervals(&[0.0; 5], &[0.0; 5], 100.0, &[5], &[100.0], 5);
        assert_eq!(r[0].gross_profit_rate, 0.0);
    }
}
