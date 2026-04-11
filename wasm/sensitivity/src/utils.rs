#[inline]
pub fn safe_divide(numerator: f64, denominator: f64, fallback: f64) -> f64 {
    if denominator != 0.0 {
        numerator / denominator
    } else {
        fallback
    }
}
