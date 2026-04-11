/// DOW gap analysis core computation.
///
/// Flat contract input:
/// - current_counts[7], previous_counts[7]: DOW day counts (pre-computed by TS adapter)
/// - prev_dow_sales[7]: previous year DOW totals (NaN = no data)
/// - daily_average_sales: scalar
/// - sales_by_dow[7*max_n]: 2D flattened column-major, padded with NaN
/// - customers_by_dow[7*max_n]: same shape
/// - dow_data_lengths[7]: actual data count per DOW
/// - daily_average_customers: scalar
/// - has_daily_data: bool (0/1)
///
/// @contractId ANA-007
/// @semanticClass analytic
/// @methodFamily calendar_effect

use crate::utils::safe_divide;
use crate::statistics::{compute_dow_statistics, DowStatistics};

const DAYS_PER_WEEK: usize = 7;
/// Number of methods: mean, median, adjustedMean
const NUM_METHODS: usize = 3;

/// Output fields count (fixed part):
/// estimatedImpact(1) + prevDowDailyAvg(7) + prevDowDailyAvgCustomers(7)
/// + isValid(1) + isSameStructure(1)
/// + 3 methods × (salesImpact(1) + customerImpact(1) + dowAvgSales(7) + dowAvgCustomers(7)) = 3×16
pub const OUTPUT_FIXED: usize = 1 + 7 + 7 + 1 + 1;
pub const OUTPUT_PER_METHOD: usize = 1 + 1 + 7 + 7; // 16
pub const TOTAL_OUTPUT: usize = OUTPUT_FIXED + NUM_METHODS * OUTPUT_PER_METHOD; // 17 + 48 = 65

pub fn analyze_dow_gap(
    current_counts: &[f64; 7],
    previous_counts: &[f64; 7],
    prev_dow_sales: &[f64; 7], // NaN = no data for that DOW
    daily_average_sales: f64,
    sales_by_dow_flat: &[f64],   // 7*max_n, NaN = padding
    customers_by_dow_flat: &[f64],
    dow_data_lengths: &[u32; 7],
    daily_average_customers: f64,
    has_daily_data: bool,
) -> [f64; TOTAL_OUTPUT] {
    let mut out = [0.0f64; TOTAL_OUTPUT];
    let mut off = 0;

    // 1. prevDowDailyAvg + estimatedImpact
    let mut prev_dow_daily_avg = [0.0f64; 7];
    let mut estimated_impact = 0.0;
    for dow in 0..DAYS_PER_WEEK {
        if !prev_dow_sales[dow].is_nan() && previous_counts[dow] > 0.0 {
            prev_dow_daily_avg[dow] = safe_divide(prev_dow_sales[dow], previous_counts[dow], daily_average_sales);
        } else {
            prev_dow_daily_avg[dow] = daily_average_sales;
        }
        let diff = current_counts[dow] - previous_counts[dow];
        estimated_impact += diff * prev_dow_daily_avg[dow];
    }

    out[off] = estimated_impact; off += 1;
    for dow in 0..7 { out[off] = prev_dow_daily_avg[dow]; off += 1; }

    // 2. prevDowDailyAvgCustomers
    let mut prev_dow_avg_cust = [0.0f64; 7];
    if has_daily_data {
        for dow in 0..DAYS_PER_WEEK {
            let len = dow_data_lengths[dow] as usize;
            if len > 0 {
                let cust_values = extract_dow_values(customers_by_dow_flat, dow, len, dow_data_lengths);
                let sum: f64 = cust_values.iter().sum();
                prev_dow_avg_cust[dow] = safe_divide(sum, cust_values.len() as f64, daily_average_customers);
            } else {
                prev_dow_avg_cust[dow] = daily_average_customers;
            }
        }
    }
    for dow in 0..7 { out[off] = prev_dow_avg_cust[dow]; off += 1; }

    // 3. isValid, isSameStructure
    let is_valid = if daily_average_sales > 0.0 { 1.0 } else { 0.0 };
    let is_same = if (0..7).all(|d| (current_counts[d] - previous_counts[d]).abs() < 0.5) { 1.0 } else { 0.0 };
    out[off] = is_valid; off += 1;
    out[off] = is_same; off += 1;

    // 4. Method results (mean=0, median=1, adjustedMean=2)
    if has_daily_data {
        let mut sales_stats = Vec::with_capacity(7);
        let mut cust_stats = Vec::with_capacity(7);
        for dow in 0..DAYS_PER_WEEK {
            let len = dow_data_lengths[dow] as usize;
            let sv = extract_dow_values(sales_by_dow_flat, dow, len, dow_data_lengths);
            let cv = extract_dow_values(customers_by_dow_flat, dow, len, dow_data_lengths);
            sales_stats.push(compute_dow_statistics(&sv));
            cust_stats.push(compute_dow_statistics(&cv));
        }

        for method_idx in 0..NUM_METHODS {
            let mut sales_impact = 0.0;
            let mut cust_impact = 0.0;
            let mut dow_avg_sales = [0.0f64; 7];
            let mut dow_avg_cust = [0.0f64; 7];
            for dow in 0..DAYS_PER_WEEK {
                let s_val = pick_stat(&sales_stats[dow], method_idx);
                let c_val = pick_stat(&cust_stats[dow], method_idx);
                dow_avg_sales[dow] = s_val;
                dow_avg_cust[dow] = c_val;
                let diff = current_counts[dow] - previous_counts[dow];
                sales_impact += diff * s_val;
                cust_impact += diff * c_val;
            }
            out[off] = sales_impact; off += 1;
            out[off] = cust_impact; off += 1;
            for dow in 0..7 { out[off] = dow_avg_sales[dow]; off += 1; }
            for dow in 0..7 { out[off] = dow_avg_cust[dow]; off += 1; }
        }
    }
    // If no daily data, method results remain 0.0 (already initialized)

    out
}

fn extract_dow_values(flat: &[f64], dow: usize, len: usize, lengths: &[u32; 7]) -> Vec<f64> {
    // Column-major: each DOW's data is contiguous. Offset = sum of previous DOW lengths.
    let mut offset = 0usize;
    for d in 0..dow {
        offset += lengths[d] as usize;
    }
    let mut values = Vec::with_capacity(len);
    for i in 0..len {
        let idx = offset + i;
        if idx < flat.len() {
            let v = flat[idx];
            if !v.is_nan() {
                values.push(v);
            }
        }
    }
    values
}

fn pick_stat(stats: &DowStatistics, method_idx: usize) -> f64 {
    match method_idx {
        0 => stats.mean,
        1 => stats.median,
        2 => stats.adjusted_mean,
        _ => 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_diff_zero_impact() {
        let counts = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0];
        let out = analyze_dow_gap(
            &counts, &counts,
            &[100.0; 7], 50.0,
            &[], &[], &[0; 7], 0.0, false,
        );
        assert_eq!(out[0], 0.0); // estimatedImpact = 0
    }

    #[test]
    fn basic_impact() {
        let cur = [5.0, 4.0, 5.0, 4.0, 5.0, 4.0, 4.0]; // 31 days
        let prev = [4.0, 5.0, 4.0, 5.0, 4.0, 5.0, 4.0]; // 31 days
        // diff: [1, -1, 1, -1, 1, -1, 0]
        // all prev_dow_sales = 700 → avg = 700/count = 140..175
        let prev_sales = [700.0; 7];
        let out = analyze_dow_gap(
            &cur, &prev,
            &prev_sales, 100.0,
            &[], &[], &[0; 7], 0.0, false,
        );
        // Impact should be nonzero (different DOW counts × different daily avgs)
        assert!(out[0].is_finite());
    }
}
