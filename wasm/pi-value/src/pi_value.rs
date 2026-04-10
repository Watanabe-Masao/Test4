/// PI value (Purchase Incidence) calculation module.
///
/// PI values are standardized KPIs for comparing purchase behavior
/// across stores and categories, expressed per 1,000 customers.
///
/// - Quantity PI = (total quantity / customers) * 1,000
/// - Amount PI = (total sales / customers) * 1,000
///
/// Invariant: customer spending = (quantity PI / 1,000) * price per item
///
/// @contractId BIZ-012
/// @semanticClass business
/// @methodFamily retail_kpi

use crate::utils::safe_divide;

/// PI multiplier: per 1,000 customers (matches TS PI_MULTIPLIER constant)
const PI_MULTIPLIER: f64 = 1_000.0;

/// Calculate quantity PI value.
///
/// Quantity PI = (total_quantity / customers) * 1,000
/// Returns 0 when customers = 0.
#[inline]
pub fn calculate_quantity_pi(total_quantity: f64, customers: f64) -> f64 {
    safe_divide(total_quantity, customers, 0.0) * PI_MULTIPLIER
}

/// Calculate amount PI value.
///
/// Amount PI = (total_sales / customers) * 1,000
/// Returns 0 when customers = 0.
#[inline]
pub fn calculate_amount_pi(total_sales: f64, customers: f64) -> f64 {
    safe_divide(total_sales, customers, 0.0) * PI_MULTIPLIER
}

/// Calculate both PI values at once.
///
/// Returns (quantity_pi, amount_pi).
pub fn calculate_pi_values(total_quantity: f64, total_sales: f64, customers: f64) -> (f64, f64) {
    (
        calculate_quantity_pi(total_quantity, customers),
        calculate_amount_pi(total_sales, customers),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_pi_values() {
        // 100 items sold to 200 customers → quantity PI = 500
        assert_eq!(calculate_quantity_pi(100.0, 200.0), 500.0);
        // 50,000 yen sold to 200 customers → amount PI = 250,000
        assert_eq!(calculate_amount_pi(50_000.0, 200.0), 250_000.0);
    }

    #[test]
    fn zero_customers_returns_zero() {
        assert_eq!(calculate_quantity_pi(100.0, 0.0), 0.0);
        assert_eq!(calculate_amount_pi(50_000.0, 0.0), 0.0);
    }

    #[test]
    fn zero_values_with_customers() {
        assert_eq!(calculate_quantity_pi(0.0, 100.0), 0.0);
        assert_eq!(calculate_amount_pi(0.0, 100.0), 0.0);
    }

    #[test]
    fn pi_values_combined() {
        let (qty, amt) = calculate_pi_values(150.0, 300_000.0, 500.0);
        assert_eq!(qty, 300.0); // 150/500 * 1000
        assert_eq!(amt, 600_000.0); // 300000/500 * 1000
    }

    #[test]
    fn fractional_results() {
        // 1 item sold to 3 customers → 333.333...
        let result = calculate_quantity_pi(1.0, 3.0);
        assert!((result - 333.33333333333337).abs() < 1e-10);
    }

    #[test]
    fn large_values() {
        // Realistic retail: 10,000 items to 5,000 customers
        assert_eq!(calculate_quantity_pi(10_000.0, 5_000.0), 2_000.0);
        assert_eq!(calculate_amount_pi(15_000_000.0, 5_000.0), 3_000_000.0);
    }
}
