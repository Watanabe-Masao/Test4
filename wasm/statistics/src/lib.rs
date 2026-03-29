// lib.rs — wasm_bindgen FFI adapter for statistics functions.
// Pure authoritative logic lives in correlation.rs / sensitivity.rs.
// This file handles only: FFI boundary, Float64Array conversion.

pub mod correlation;
pub mod sensitivity;

use correlation::{
    pearson_correlation as pearson_inner,
    cosine_similarity as cosine_inner,
    normalize_min_max as normalize_inner,
    calculate_z_scores as z_scores_inner,
};
use sensitivity::{
    calculate_sensitivity as sensitivity_inner,
    SensitivityBase, SensitivityDeltas,
};
use wasm_bindgen::prelude::*;

/// Pearson correlation coefficient.
/// Input: two Float64Arrays (xs, ys).
/// Returns Float64Array [r, n].
#[wasm_bindgen]
pub fn pearson_correlation(xs: &js_sys::Float64Array, ys: &js_sys::Float64Array) -> js_sys::Float64Array {
    let xs_vec = xs.to_vec();
    let ys_vec = ys.to_vec();
    let (r, n) = pearson_inner(&xs_vec, &ys_vec);
    let arr = js_sys::Float64Array::new_with_length(2);
    arr.set_index(0, r);
    arr.set_index(1, n as f64);
    arr
}

/// Cosine similarity.
/// Input: two Float64Arrays.
/// Returns f64.
#[wasm_bindgen]
pub fn cosine_similarity(a: &js_sys::Float64Array, b: &js_sys::Float64Array) -> f64 {
    cosine_inner(&a.to_vec(), &b.to_vec())
}

/// Min-Max normalization to [0, 100] scale.
/// Input: Float64Array.
/// Returns Float64Array.
#[wasm_bindgen]
pub fn normalize_min_max(values: &js_sys::Float64Array) -> js_sys::Float64Array {
    let result = normalize_inner(&values.to_vec());
    let arr = js_sys::Float64Array::new_with_length(result.len() as u32);
    for (i, v) in result.iter().enumerate() {
        arr.set_index(i as u32, *v);
    }
    arr
}

/// Z-score calculation.
/// Input: Float64Array.
/// Returns Float64Array.
#[wasm_bindgen]
pub fn calculate_z_scores(values: &js_sys::Float64Array) -> js_sys::Float64Array {
    let result = z_scores_inner(&values.to_vec());
    let arr = js_sys::Float64Array::new_with_length(result.len() as u32);
    for (i, v) in result.iter().enumerate() {
        arr.set_index(i as u32, *v);
    }
    arr
}

/// Sensitivity analysis.
/// Input: 9 base params + 4 delta params = 13 f64 values as Float64Array.
/// Returns Float64Array [baseGP, baseGPRate, simGP, simGPRate, gpDelta,
///                        simSales, salesDelta, simProjected, projDelta, budgetDelta]
#[wasm_bindgen]
pub fn calculate_sensitivity(params: &js_sys::Float64Array) -> js_sys::Float64Array {
    let p = params.to_vec();
    // params layout: [totalSales, totalCost, totalDiscount, grossSales, totalCustomers,
    //                 totalCostInclusion, budget, elapsedDays, salesDays,
    //                 discountRateDelta, customersDelta, txValueDelta, costRateDelta]
    let base = SensitivityBase {
        total_sales: p[0],
        total_cost: p[1],
        total_discount: p[2],
        gross_sales: p[3],
        total_customers: p[4],
        total_cost_inclusion: p[5],
        budget: p[6],
        elapsed_days: p[7],
        sales_days: p[8],
    };
    let deltas = SensitivityDeltas {
        discount_rate_delta: p[9],
        customers_delta: p[10],
        transaction_value_delta: p[11],
        cost_rate_delta: p[12],
    };
    let r = sensitivity_inner(&base, &deltas);
    let arr = js_sys::Float64Array::new_with_length(10);
    arr.set_index(0, r.base_gross_profit);
    arr.set_index(1, r.base_gross_profit_rate);
    arr.set_index(2, r.simulated_gross_profit);
    arr.set_index(3, r.simulated_gross_profit_rate);
    arr.set_index(4, r.gross_profit_delta);
    arr.set_index(5, r.simulated_sales);
    arr.set_index(6, r.sales_delta);
    arr.set_index(7, r.simulated_projected_sales);
    arr.set_index(8, r.projected_sales_delta);
    arr.set_index(9, r.budget_achievement_delta);
    arr
}
