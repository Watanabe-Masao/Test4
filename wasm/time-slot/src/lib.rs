// lib.rs — wasm_bindgen FFI adapter only.
// Pure time-slot analysis logic lives in core_time.rs / turnaround.rs.
// This file handles only: FFI boundary, Float64Array conversion, null sentinels.

pub mod core_time;
pub mod turnaround;

use wasm_bindgen::prelude::*;

/// Find the 3-consecutive-hour window with maximum cumulative sales.
/// Input: parallel arrays (hours, amounts).
/// Returns Float64Array [startHour, endHour, total].
/// All NaN if input is empty (null sentinel).
#[wasm_bindgen]
pub fn find_core_time(hours: &[f64], amounts: &[f64]) -> js_sys::Float64Array {
    let arr = js_sys::Float64Array::new_with_length(3);
    match core_time::find_core_time(hours, amounts) {
        Some(r) => {
            arr.set_index(0, r.start_hour);
            arr.set_index(1, r.end_hour);
            arr.set_index(2, r.total);
        }
        None => {
            arr.set_index(0, f64::NAN);
            arr.set_index(1, f64::NAN);
            arr.set_index(2, f64::NAN);
        }
    }
    arr
}

/// Find the hour at which cumulative sales reach 50% of total.
/// Input: parallel arrays (hours, amounts).
/// Returns f64 hour value, or NaN if null.
#[wasm_bindgen]
pub fn find_turnaround_hour(hours: &[f64], amounts: &[f64]) -> f64 {
    turnaround::find_turnaround_hour(hours, amounts)
}
