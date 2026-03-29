/// Moving average computation.
///
/// # Mathematical properties
/// - Output length == input length
/// - Window size 1 → identity (output == input)
/// - Constant series → all values equal to the constant
/// - Output min >= input min, output max <= input max (smoothing property)

pub fn compute_moving_average(values: &[f64], window: usize) -> Vec<f64> {
    if values.is_empty() || window == 0 {
        return vec![];
    }
    if window == 1 {
        return values.to_vec();
    }

    let n = values.len();
    let mut result = Vec::with_capacity(n);

    for i in 0..n {
        if i < window - 1 {
            // Partial window: use available data
            let sum: f64 = values[..=i].iter().sum();
            result.push(sum / (i + 1) as f64);
        } else {
            let sum: f64 = values[i + 1 - window..=i].iter().sum();
            result.push(sum / window as f64);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ma_basic() {
        let r = compute_moving_average(&[10.0, 20.0, 30.0, 40.0, 50.0], 3);
        assert_eq!(r.len(), 5);
        assert!((r[2] - 20.0).abs() < 1e-10); // (10+20+30)/3
        assert!((r[4] - 40.0).abs() < 1e-10); // (30+40+50)/3
    }

    #[test]
    fn ma_window_one_identity() {
        let vals = vec![1.0, 2.0, 3.0];
        assert_eq!(compute_moving_average(&vals, 1), vals);
    }

    #[test]
    fn ma_empty() {
        assert!(compute_moving_average(&[], 3).is_empty());
    }

    #[test]
    fn ma_constant_series() {
        let r = compute_moving_average(&[7.0, 7.0, 7.0, 7.0], 3);
        for v in &r {
            assert!((v - 7.0).abs() < 1e-10);
        }
    }

    #[test]
    fn invariant_output_length() {
        let vals = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert_eq!(compute_moving_average(&vals, 3).len(), vals.len());
        assert_eq!(compute_moving_average(&vals, 10).len(), vals.len());
    }
}
