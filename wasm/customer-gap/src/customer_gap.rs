/// Customer Gap calculation module.
///
/// Calculates YoY ratios and gap metrics for customer count, quantity, and sales.
/// Gap = specific YoY ratio - customer YoY ratio (per-capita behavior change).
///
/// Returns None if any prior period value <= 0 (invalid comparison base).
///
/// @contractId BIZ-013
/// @semanticClass business
/// @methodFamily behavioral

use crate::utils::safe_divide;

pub struct CustomerGapResult {
    pub customer_yoy: f64,
    pub quantity_yoy: f64,
    pub sales_yoy: f64,
    pub quantity_customer_gap: f64,
    pub amount_customer_gap: f64,
}

/// Calculate customer gap metrics.
/// Returns None if any prev value <= 0.
pub fn calculate_customer_gap(
    cur_customers: f64,
    prev_customers: f64,
    cur_quantity: f64,
    prev_quantity: f64,
    cur_sales: f64,
    prev_sales: f64,
) -> Option<CustomerGapResult> {
    if prev_customers <= 0.0 || prev_quantity <= 0.0 || prev_sales <= 0.0 {
        return None;
    }

    let customer_yoy = safe_divide(cur_customers, prev_customers, 0.0);
    let quantity_yoy = safe_divide(cur_quantity, prev_quantity, 0.0);
    let sales_yoy = safe_divide(cur_sales, prev_sales, 0.0);

    Some(CustomerGapResult {
        customer_yoy,
        quantity_yoy,
        sales_yoy,
        quantity_customer_gap: quantity_yoy - customer_yoy,
        amount_customer_gap: sales_yoy - customer_yoy,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_gap() {
        let r = calculate_customer_gap(220.0, 200.0, 550.0, 500.0, 110_000.0, 100_000.0).unwrap();
        assert_eq!(r.customer_yoy, 1.1);
        assert_eq!(r.quantity_yoy, 1.1);
        assert_eq!(r.sales_yoy, 1.1);
        assert_eq!(r.quantity_customer_gap, 0.0);
        assert_eq!(r.amount_customer_gap, 0.0);
    }

    #[test]
    fn gap_with_difference() {
        let r = calculate_customer_gap(200.0, 200.0, 600.0, 500.0, 130_000.0, 100_000.0).unwrap();
        assert_eq!(r.customer_yoy, 1.0);
        assert_eq!(r.quantity_yoy, 1.2);
        assert!((r.quantity_customer_gap - 0.2).abs() < 1e-10);
        assert!((r.amount_customer_gap - 0.3).abs() < 1e-10);
    }

    #[test]
    fn null_on_zero_prev_customers() {
        assert!(calculate_customer_gap(100.0, 0.0, 100.0, 100.0, 100.0, 100.0).is_none());
    }

    #[test]
    fn null_on_negative_prev() {
        assert!(calculate_customer_gap(100.0, -1.0, 100.0, 100.0, 100.0, 100.0).is_none());
    }

    #[test]
    fn zero_current_values() {
        let r = calculate_customer_gap(0.0, 100.0, 0.0, 100.0, 0.0, 100.0).unwrap();
        assert_eq!(r.customer_yoy, 0.0);
        assert_eq!(r.quantity_yoy, 0.0);
        assert_eq!(r.sales_yoy, 0.0);
    }
}
