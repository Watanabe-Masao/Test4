/// Find the hour at which cumulative value reaches 50% of the total.
/// Matches TS `findTurnaroundHour` in timeSlotCalculations.ts exactly.
///
/// - `hours` and `amounts` are parallel arrays (same length).
/// - Returns NaN if input is empty or total is zero.
pub fn find_turnaround_hour(hours: &[f64], amounts: &[f64]) -> f64 {
    let n = hours.len();
    if n == 0 || amounts.len() != n {
        return f64::NAN;
    }

    // Build sorted (hour, amount) pairs
    let mut pairs: Vec<(i32, f64)> = hours
        .iter()
        .zip(amounts.iter())
        .map(|(&h, &a)| (h as i32, a))
        .collect();
    pairs.sort_by_key(|&(h, _)| h);

    // Aggregate duplicates
    let mut agg: Vec<(i32, f64)> = Vec::new();
    for (h, a) in &pairs {
        if let Some(last) = agg.last_mut() {
            if last.0 == *h {
                last.1 += a;
                continue;
            }
        }
        agg.push((*h, *a));
    }

    let total: f64 = agg.iter().map(|(_, a)| a).sum();
    if total == 0.0 {
        return f64::NAN;
    }

    let threshold = total * 0.5;
    let mut cumulative = 0.0;
    for (hour, amount) in &agg {
        cumulative += amount;
        if cumulative >= threshold {
            return *hour as f64;
        }
    }

    f64::NAN
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_returns_nan() {
        assert!(find_turnaround_hour(&[], &[]).is_nan());
    }

    #[test]
    fn single_hour() {
        let r = find_turnaround_hour(&[10.0], &[500.0]);
        assert_eq!(r, 10.0);
    }

    #[test]
    fn all_zero_returns_nan() {
        let r = find_turnaround_hour(&[9.0, 10.0, 11.0], &[0.0, 0.0, 0.0]);
        assert!(r.is_nan());
    }

    #[test]
    fn basic_turnaround() {
        // hours 9-14: [100, 200, 300, 250, 100, 50] total=1000, 50%=500
        // cumulative: 100, 300, 600 → reaches 500 at hour 11
        let hours = [9.0, 10.0, 11.0, 12.0, 13.0, 14.0];
        let amounts = [100.0, 200.0, 300.0, 250.0, 100.0, 50.0];
        let r = find_turnaround_hour(&hours, &amounts);
        assert_eq!(r, 11.0);
    }

    #[test]
    fn even_distribution() {
        // 4 hours × 250 = 1000, 50% = 500
        // cumulative: 250, 500 → reaches 500 at hour 10
        let hours = [9.0, 10.0, 11.0, 12.0];
        let amounts = [250.0, 250.0, 250.0, 250.0];
        let r = find_turnaround_hour(&hours, &amounts);
        assert_eq!(r, 10.0);
    }

    #[test]
    fn invariant_result_within_hour_range() {
        let hours = [8.0, 9.0, 10.0, 11.0, 12.0];
        let amounts = [50.0, 100.0, 200.0, 300.0, 150.0];
        let r = find_turnaround_hour(&hours, &amounts);
        assert!(!r.is_nan());
        assert!(r >= 8.0 && r <= 12.0);
    }

    #[test]
    fn mismatched_lengths_returns_nan() {
        assert!(find_turnaround_hour(&[1.0, 2.0], &[100.0]).is_nan());
    }
}
