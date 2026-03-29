/// Aggregation utilities — sum with null handling.

pub fn sum_nullable(values: &[f64]) -> f64 {
    values.iter().filter(|v| v.is_finite()).sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sum_normal() {
        assert!((sum_nullable(&[10.0, 20.0, 30.0]) - 60.0).abs() < 1e-10);
    }

    #[test]
    fn sum_with_nan() {
        assert!((sum_nullable(&[10.0, f64::NAN, 30.0]) - 40.0).abs() < 1e-10);
    }

    #[test]
    fn sum_empty() {
        assert_eq!(sum_nullable(&[]), 0.0);
    }

    #[test]
    fn sum_all_nan() {
        assert_eq!(sum_nullable(&[f64::NAN, f64::NAN]), 0.0);
    }
}
