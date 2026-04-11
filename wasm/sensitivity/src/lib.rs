// lib.rs — wasm_bindgen FFI adapter only.
// @contractId ANA-003
// @semanticClass analytic
// @authorityKind candidate-authoritative
//
// FFI:
//   calculate_sensitivity: 14 scalars in → Float64Array[10] out
//   calculate_elasticity: 10 scalars in → Float64Array[4] out

pub mod sensitivity;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Calculate sensitivity analysis.
///
/// Input: 10 base fields + 4 delta fields (all scalars).
/// Returns Float64Array[10]: [baseGP, baseGPR, simGP, simGPR, gpDelta,
///   simSales, salesDelta, simProjected, projDelta, budgetAchDelta]
#[wasm_bindgen]
pub fn calculate_sensitivity(
    total_sales: f64,
    total_cost: f64,
    total_discount: f64,
    gross_sales: f64,
    total_customers: f64,
    total_cost_inclusion: f64,
    average_markup_rate: f64,
    budget: f64,
    elapsed_days: f64,
    sales_days: f64,
    discount_rate_delta: f64,
    customers_delta: f64,
    transaction_value_delta: f64,
    cost_rate_delta: f64,
) -> js_sys::Float64Array {
    let base = sensitivity::SensitivityBase {
        total_sales,
        total_cost,
        total_discount,
        gross_sales,
        total_customers,
        total_cost_inclusion,
        average_markup_rate,
        budget,
        elapsed_days,
        sales_days,
    };
    let deltas = sensitivity::SensitivityDeltas {
        discount_rate_delta,
        customers_delta,
        transaction_value_delta,
        cost_rate_delta,
    };
    let r = sensitivity::calculate_sensitivity(&base, &deltas);

    let arr = js_sys::Float64Array::new_with_length(
        sensitivity::SENSITIVITY_RESULT_FIELDS as u32,
    );
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

/// Calculate elasticity (1pt change per parameter).
///
/// Input: 10 base fields (all scalars).
/// Returns Float64Array[4]: [discountElasticity, customersElasticity,
///   txValueElasticity, costElasticity]
#[wasm_bindgen]
pub fn calculate_elasticity(
    total_sales: f64,
    total_cost: f64,
    total_discount: f64,
    gross_sales: f64,
    total_customers: f64,
    total_cost_inclusion: f64,
    average_markup_rate: f64,
    budget: f64,
    elapsed_days: f64,
    sales_days: f64,
) -> js_sys::Float64Array {
    let base = sensitivity::SensitivityBase {
        total_sales,
        total_cost,
        total_discount,
        gross_sales,
        total_customers,
        total_cost_inclusion,
        average_markup_rate,
        budget,
        elapsed_days,
        sales_days,
    };
    let r = sensitivity::calculate_elasticity(&base);

    let arr = js_sys::Float64Array::new_with_length(
        sensitivity::ELASTICITY_RESULT_FIELDS as u32,
    );
    arr.set_index(0, r.discount_rate_elasticity);
    arr.set_index(1, r.customers_elasticity);
    arr.set_index(2, r.transaction_value_elasticity);
    arr.set_index(3, r.cost_rate_elasticity);
    arr
}
