// lib.rs — wasm_bindgen FFI adapter only.
// @contractId ANA-005
// @semanticClass analytic
// @authorityKind candidate-authoritative

pub mod correlation;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Pearson correlation. Returns Float64Array [r, n].
#[wasm_bindgen]
pub fn pearson_correlation(xs: &js_sys::Float64Array, ys: &js_sys::Float64Array) -> js_sys::Float64Array {
    let (r, n) = correlation::pearson_correlation(&xs.to_vec(), &ys.to_vec());
    let arr = js_sys::Float64Array::new_with_length(2);
    arr.set_index(0, r);
    arr.set_index(1, n as f64);
    arr
}

/// Cosine similarity. Returns scalar f64.
#[wasm_bindgen]
pub fn cosine_similarity(a: &js_sys::Float64Array, b: &js_sys::Float64Array) -> f64 {
    correlation::cosine_similarity(&a.to_vec(), &b.to_vec())
}

/// Min-Max normalization. Returns Float64Array [min, max, range, ...values].
#[wasm_bindgen]
pub fn normalize_min_max(values: &js_sys::Float64Array) -> js_sys::Float64Array {
    let (normalized, min, max, range) = correlation::normalize_min_max(&values.to_vec());
    let arr = js_sys::Float64Array::new_with_length((3 + normalized.len()) as u32);
    arr.set_index(0, min);
    arr.set_index(1, max);
    arr.set_index(2, range);
    for (i, v) in normalized.iter().enumerate() {
        arr.set_index((3 + i) as u32, *v);
    }
    arr
}

/// Detect divergence. Returns Float64Array, each point = 5 fields:
/// [index, seriesAValue, seriesBValue, divergence, isSignificant(0/1)]
#[wasm_bindgen]
pub fn detect_divergence(
    series_a: &js_sys::Float64Array,
    series_b: &js_sys::Float64Array,
    threshold: f64,
) -> js_sys::Float64Array {
    let result = correlation::detect_divergence(&series_a.to_vec(), &series_b.to_vec(), threshold);
    let arr = js_sys::Float64Array::new_with_length(result.len() as u32);
    for (i, v) in result.iter().enumerate() {
        arr.set_index(i as u32, *v);
    }
    arr
}

/// Moving average. Returns Float64Array.
#[wasm_bindgen]
pub fn moving_average(values: &js_sys::Float64Array, window: u32) -> js_sys::Float64Array {
    let result = correlation::moving_average(&values.to_vec(), window as usize);
    let arr = js_sys::Float64Array::new_with_length(result.len() as u32);
    for (i, v) in result.iter().enumerate() {
        arr.set_index(i as u32, *v);
    }
    arr
}

/// Z-scores. Returns Float64Array.
#[wasm_bindgen]
pub fn calculate_z_scores(values: &js_sys::Float64Array) -> js_sys::Float64Array {
    let result = correlation::calculate_z_scores(&values.to_vec());
    let arr = js_sys::Float64Array::new_with_length(result.len() as u32);
    for (i, v) in result.iter().enumerate() {
        arr.set_index(i as u32, *v);
    }
    arr
}
