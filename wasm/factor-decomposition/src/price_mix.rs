use std::collections::{HashMap, HashSet};

use crate::types::PriceMixResult;
use crate::utils::safe_divide;

/// Shapley decomposition of average unit price change into price effect and mix effect.
///
/// For vanishing categories (no cur data): p₁ = p₀ → pure mix change
/// For new categories (no prev data): p₀ = p₁ → pure mix change
///
/// Returns curTQ-scaled Shapley values. Returns None if either period has zero total quantity.
pub fn decompose_price_mix(
    cur_categories: &[(String, f64, f64)],  // (key, qty, amt)
    prev_categories: &[(String, f64, f64)], // (key, qty, amt)
) -> Option<PriceMixResult> {
    // Aggregate by key
    let cur_map = aggregate(cur_categories);
    let prev_map = aggregate(prev_categories);

    let prev_tq: f64 = prev_map.values().map(|(q, _)| q).sum();
    let cur_tq: f64 = cur_map.values().map(|(q, _)| q).sum();

    if prev_tq <= 0.0 || cur_tq <= 0.0 {
        return None;
    }

    let mut phi_price = 0.0;
    let mut phi_mix = 0.0;

    let all_keys: HashSet<&String> = cur_map.keys().chain(prev_map.keys()).collect();

    for key in all_keys {
        let (c_qty, c_amt) = cur_map.get(key).copied().unwrap_or((0.0, 0.0));
        let (p_qty, p_amt) = prev_map.get(key).copied().unwrap_or((0.0, 0.0));

        // Vanishing/new category: use other period's unit price
        let p0 = if p_qty > 0.0 {
            safe_divide(p_amt, p_qty, 0.0)
        } else {
            safe_divide(c_amt, c_qty, 0.0)
        };
        let p1 = if c_qty > 0.0 {
            safe_divide(c_amt, c_qty, 0.0)
        } else {
            safe_divide(p_amt, p_qty, 0.0)
        };
        let s0 = safe_divide(p_qty, prev_tq, 0.0);
        let s1 = safe_divide(c_qty, cur_tq, 0.0);

        // Shapley: average over prev/cur composition ratios
        phi_price += 0.5 * ((p1 - p0) * s0 + (p1 - p0) * s1);
        // Shapley: average over prev/cur unit prices
        phi_mix += 0.5 * (p0 * (s1 - s0) + p1 * (s1 - s0));
    }

    Some(PriceMixResult {
        price_effect: cur_tq * phi_price,
        mix_effect: cur_tq * phi_mix,
    })
}

fn aggregate(categories: &[(String, f64, f64)]) -> HashMap<String, (f64, f64)> {
    let mut map: HashMap<String, (f64, f64)> = HashMap::new();
    for (key, qty, amt) in categories {
        let entry = map.entry(key.clone()).or_insert((0.0, 0.0));
        entry.0 += qty;
        entry.1 += amt;
    }
    map
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cat(key: &str, qty: f64, amt: f64) -> (String, f64, f64) {
        (key.to_string(), qty, amt)
    }

    #[test]
    fn empty_returns_none() {
        assert!(decompose_price_mix(&[], &[]).is_none());
    }

    #[test]
    fn zero_prev_qty_returns_none() {
        let cur = vec![cat("A", 10.0, 5000.0)];
        let prev = vec![cat("A", 0.0, 0.0)];
        assert!(decompose_price_mix(&cur, &prev).is_none());
    }

    #[test]
    fn zero_cur_qty_returns_none() {
        let prev = vec![cat("A", 10.0, 5000.0)];
        let cur = vec![cat("A", 0.0, 0.0)];
        assert!(decompose_price_mix(&cur, &prev).is_none());
    }

    #[test]
    fn price_only_change() {
        let prev = vec![cat("A", 100.0, 100_000.0), cat("B", 100.0, 50_000.0)];
        let cur = vec![cat("A", 100.0, 110_000.0), cat("B", 100.0, 50_000.0)];
        let r = decompose_price_mix(&cur, &prev).unwrap();
        assert!(r.mix_effect.abs() < 1.0);
        assert_eq!(r.price_effect.round(), 10_000.0);
    }

    #[test]
    fn mix_only_change() {
        let prev = vec![cat("A", 100.0, 100_000.0), cat("B", 100.0, 50_000.0)];
        let cur = vec![cat("A", 150.0, 150_000.0), cat("B", 50.0, 25_000.0)];
        let r = decompose_price_mix(&cur, &prev).unwrap();
        assert!(r.price_effect.abs() < 1.0);
        assert!(r.mix_effect > 0.0);
    }

    #[test]
    fn new_category_attributed_to_mix() {
        let prev = vec![cat("A", 200.0, 100_000.0)];
        let cur = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 100_000.0)];
        let r = decompose_price_mix(&cur, &prev).unwrap();
        assert!(r.price_effect.abs() < 1.0);
    }

    #[test]
    fn vanishing_category_attributed_to_mix() {
        let prev = vec![cat("A", 100.0, 50_000.0), cat("B", 100.0, 100_000.0)];
        let cur = vec![cat("A", 200.0, 100_000.0)];
        let r = decompose_price_mix(&cur, &prev).unwrap();
        assert!(r.price_effect.abs() < 1.0);
        assert!(r.mix_effect < 0.0); // Lost high-price category B
    }

    #[test]
    fn duplicate_keys_aggregated() {
        let prev = vec![cat("A", 50.0, 25_000.0), cat("A", 50.0, 25_000.0)];
        let cur = vec![cat("A", 60.0, 36_000.0), cat("A", 40.0, 24_000.0)];
        let r = decompose_price_mix(&cur, &prev).unwrap();
        assert_eq!(r.price_effect.round(), 10_000.0);
        assert!(r.mix_effect.abs() < 1.0);
    }

    #[test]
    fn three_categories() {
        let prev = vec![
            cat("A", 100.0, 100_000.0),
            cat("B", 100.0, 50_000.0),
            cat("C", 100.0, 30_000.0),
        ];
        let cur = vec![
            cat("A", 100.0, 110_000.0),
            cat("B", 100.0, 50_000.0),
            cat("C", 100.0, 30_000.0),
        ];
        let r = decompose_price_mix(&cur, &prev).unwrap();
        assert!(r.mix_effect.abs() < 1.0);
        let expected: f64 = 300.0 * ((1100.0 - 1000.0) * (1.0 / 3.0));
        assert_eq!(r.price_effect.round(), expected.round());
    }

    /// Order stability: shuffling input categories must not change results
    #[test]
    fn order_stability_shuffle() {
        let prev = vec![
            cat("A", 100.0, 100_000.0),
            cat("B", 80.0, 48_000.0),
            cat("C", 120.0, 36_000.0),
        ];
        let cur = vec![
            cat("A", 110.0, 121_000.0),
            cat("B", 90.0, 58_500.0),
            cat("C", 100.0, 35_000.0),
        ];
        let r1 = decompose_price_mix(&cur, &prev).unwrap();

        // Reversed order
        let prev_rev: Vec<_> = prev.iter().rev().cloned().collect();
        let cur_rev: Vec<_> = cur.iter().rev().cloned().collect();
        let r2 = decompose_price_mix(&cur_rev, &prev_rev).unwrap();

        // Different shuffle
        let prev_shuf = vec![prev[1].clone(), prev[2].clone(), prev[0].clone()];
        let cur_shuf = vec![cur[2].clone(), cur[0].clone(), cur[1].clone()];
        let r3 = decompose_price_mix(&cur_shuf, &prev_shuf).unwrap();

        let tol = 1e-10;
        assert!((r1.price_effect - r2.price_effect).abs() < tol);
        assert!((r1.mix_effect - r2.mix_effect).abs() < tol);
        assert!((r1.price_effect - r3.price_effect).abs() < tol);
        assert!((r1.mix_effect - r3.mix_effect).abs() < tol);
    }
}
