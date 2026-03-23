/// Core time result: the 3-consecutive-hour window with maximum cumulative sales.
pub struct CoreTimeResult {
    pub start_hour: f64,
    pub end_hour: f64,
    pub total: f64,
}

/// Find the 3-consecutive-hour window with maximum cumulative value.
/// Matches TS `findCoreTime` in timeSlotCalculations.ts exactly.
///
/// - `hours` and `amounts` are parallel arrays (same length).
/// - Returns None if input is empty.
/// - If fewer than 3 distinct hours, returns the full range.
pub fn find_core_time(hours: &[f64], amounts: &[f64]) -> Option<CoreTimeResult> {
    let n = hours.len();
    if n == 0 || amounts.len() != n {
        return None;
    }

    // Build sorted (hour, amount) pairs and aggregate duplicates
    let mut pairs: Vec<(i32, f64)> = hours
        .iter()
        .zip(amounts.iter())
        .map(|(&h, &a)| (h as i32, a))
        .collect();
    pairs.sort_by_key(|&(h, _)| h);

    // Aggregate duplicates (same hour)
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

    let min_hour = agg.first().unwrap().0;
    let max_hour = agg.last().unwrap().0;

    // If fewer than 3 distinct hours, return the full range
    if max_hour - min_hour < 2 {
        let total: f64 = agg.iter().map(|(_, a)| a).sum();
        return Some(CoreTimeResult {
            start_hour: min_hour as f64,
            end_hour: max_hour as f64,
            total,
        });
    }

    // Build a lookup for hour → amount (default 0)
    let lookup = |hour: i32| -> f64 {
        agg.iter()
            .find(|(h, _)| *h == hour)
            .map(|(_, a)| *a)
            .unwrap_or(0.0)
    };

    let mut best_start = min_hour;
    let mut best_total: f64 = 0.0;

    for start in min_hour..=(max_hour - 2) {
        let total = lookup(start) + lookup(start + 1) + lookup(start + 2);
        if total > best_total {
            best_total = total;
            best_start = start;
        }
    }

    Some(CoreTimeResult {
        start_hour: best_start as f64,
        end_hour: (best_start + 2) as f64,
        total: best_total,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_close(a: f64, b: f64, tol: f64) {
        assert!(
            (a - b).abs() < tol,
            "expected {} ≈ {} (diff: {})",
            a, b, (a - b).abs()
        );
    }

    #[test]
    fn empty_returns_none() {
        assert!(find_core_time(&[], &[]).is_none());
    }

    #[test]
    fn single_hour() {
        let r = find_core_time(&[10.0], &[500.0]).unwrap();
        assert_close(r.start_hour, 10.0, 0.01);
        assert_close(r.end_hour, 10.0, 0.01);
        assert_close(r.total, 500.0, 0.01);
    }

    #[test]
    fn two_hours() {
        let r = find_core_time(&[9.0, 10.0], &[300.0, 400.0]).unwrap();
        assert_close(r.start_hour, 9.0, 0.01);
        assert_close(r.end_hour, 10.0, 0.01);
        assert_close(r.total, 700.0, 0.01);
    }

    #[test]
    fn basic_three_hour_window() {
        // hours 9-14, peak at 11-13
        let hours = [9.0, 10.0, 11.0, 12.0, 13.0, 14.0];
        let amounts = [100.0, 200.0, 500.0, 600.0, 400.0, 150.0];
        let r = find_core_time(&hours, &amounts).unwrap();
        assert_close(r.start_hour, 11.0, 0.01);
        assert_close(r.end_hour, 13.0, 0.01);
        assert_close(r.total, 1500.0, 0.01); // 500+600+400
    }

    #[test]
    fn sparse_hours_with_gaps() {
        // hours 9, 12, 13, 14 — gap at 10,11
        let hours = [9.0, 12.0, 13.0, 14.0];
        let amounts = [100.0, 500.0, 600.0, 400.0];
        let r = find_core_time(&hours, &amounts).unwrap();
        assert_close(r.start_hour, 12.0, 0.01);
        assert_close(r.end_hour, 14.0, 0.01);
        assert_close(r.total, 1500.0, 0.01);
    }

    #[test]
    fn mismatched_lengths_returns_none() {
        assert!(find_core_time(&[1.0, 2.0], &[100.0]).is_none());
    }

    #[test]
    fn invariant_total_leq_grand_total() {
        let hours = [8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0];
        let amounts = [50.0, 100.0, 200.0, 300.0, 250.0, 150.0, 100.0, 50.0];
        let r = find_core_time(&hours, &amounts).unwrap();
        let grand_total: f64 = amounts.iter().sum();
        assert!(r.total <= grand_total);
    }
}
