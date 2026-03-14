use crate::utils::safe_divide;

/// Calculate discount loss cost (売変ロス原価).
///
/// Formula: (1 - markupRate) × coreSales × safeDivide(discountRate, 1 - discountRate, discountRate)
///
/// When discountRate == 1.0 (100% discount), the safeDivide fallback is discountRate itself.
pub fn calculate_discount_impact(core_sales: f64, markup_rate: f64, discount_rate: f64) -> f64 {
    (1.0 - markup_rate)
        * core_sales
        * safe_divide(discount_rate, 1.0 - discount_rate, discount_rate)
}
