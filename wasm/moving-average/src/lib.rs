// lib.rs — wasm_bindgen FFI adapter only.
// @contractId ANA-009
// @semanticClass analytic
// @authorityKind candidate-authoritative
//
// FFI Input: values (Float64Array, NaN=null), statuses (Uint8Array, 0=ok 1=missing),
//   windowSize (u32), policy (u32, 0=strict 1=partial)
// FFI Output: Float64Array [value0, status0, value1, status1, ...]
//   interleaved value+status pairs. status: 0.0=ok, 1.0=missing. value: NaN=null.

pub mod moving_average;

use wasm_bindgen::prelude::*;

/// Compute trailing moving average.
///
/// Returns Float64Array of interleaved [value, status] pairs.
/// Length = input length * 2.
#[wasm_bindgen]
pub fn compute_moving_average(
    values: &js_sys::Float64Array,
    statuses: &js_sys::Uint8Array,
    window_size: u32,
    policy: u32,
) -> js_sys::Float64Array {
    let vals = values.to_vec();
    let stats = statuses.to_vec();
    let result = moving_average::compute_moving_average(
        &vals,
        &stats,
        window_size as usize,
        policy as u8,
    );

    let arr = js_sys::Float64Array::new_with_length((result.len() * 2) as u32);
    for (i, p) in result.iter().enumerate() {
        arr.set_index((i * 2) as u32, p.value);
        arr.set_index((i * 2 + 1) as u32, p.status as f64);
    }
    arr
}
