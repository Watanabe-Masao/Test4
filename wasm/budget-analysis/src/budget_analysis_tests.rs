/// budget_analysis — 予算分析テスト（数学的不変条件付き）
#[cfg(test)]
mod tests {
    use crate::budget_analysis::calculate_budget_analysis;

    const T: f64 = 1e-6;

    fn uniform_budget(daily: f64, days: usize) -> Vec<f64> {
        vec![daily; days]
    }

    // ── 正常ケース ──

    #[test]
    fn basic_50_percent_achieved() {
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(3000000.0, 6000000.0, &budget_daily, 15, 15.0, 30);
        assert!((r.budget_achievement_rate - 0.5).abs() < T);
    }

    #[test]
    fn basic_100_percent_achieved() {
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(6000000.0, 6000000.0, &budget_daily, 30, 30.0, 30);
        assert!((r.budget_achievement_rate - 1.0).abs() < T);
    }

    #[test]
    fn zero_budget() {
        let r = calculate_budget_analysis(3000000.0, 0.0, &[], 15, 15.0, 30);
        assert_eq!(r.budget_achievement_rate, 0.0);
    }

    #[test]
    fn zero_sales() {
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(0.0, 6000000.0, &budget_daily, 15, 0.0, 30);
        assert_eq!(r.budget_achievement_rate, 0.0);
        assert_eq!(r.average_daily_sales, 0.0);
    }

    #[test]
    fn elapsed_equals_total() {
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(5000000.0, 6000000.0, &budget_daily, 30, 30.0, 30);
        // 月末 → remaining = 0 → projected = actual
        assert!((r.projected_sales - 5000000.0).abs() < T);
    }

    // ── 数学的不変条件 ──

    #[test]
    fn invariant_achievement_rate_identity() {
        // achievement_rate × budget = total_sales
        let budget = 6000000.0;
        let sales = 3000000.0;
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(sales, budget, &budget_daily, 15, 15.0, 30);
        assert!(
            (r.budget_achievement_rate * budget - sales).abs() < T,
            "achievement_rate × budget must equal total_sales"
        );
    }

    #[test]
    fn invariant_remaining_budget_identity() {
        // remaining_budget = budget - total_sales
        let budget = 6000000.0;
        let sales = 4000000.0;
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(sales, budget, &budget_daily, 20, 20.0, 30);
        assert!(
            (r.remaining_budget - (budget - sales)).abs() < T,
            "remaining_budget must equal budget - sales"
        );
    }

    #[test]
    fn invariant_variance_identity() {
        // variance = total_sales - cumulative_budget
        let budget_daily = uniform_budget(200000.0, 30);
        let sales = 3500000.0;
        let r = calculate_budget_analysis(sales, 6000000.0, &budget_daily, 15, 15.0, 30);
        let cum_budget: f64 = budget_daily.iter().take(15).sum();
        assert!(
            (r.budget_variance - (sales - cum_budget)).abs() < T,
            "variance must equal sales - cumulative budget"
        );
    }

    #[test]
    fn invariant_progress_gap_identity() {
        // progress_gap = progress_rate - elapsed_rate
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(3500000.0, 6000000.0, &budget_daily, 15, 15.0, 30);
        assert!(
            (r.budget_progress_gap - (r.budget_progress_rate - r.budget_elapsed_rate)).abs() < T,
            "progress_gap must equal progress_rate - elapsed_rate"
        );
    }

    #[test]
    fn invariant_projected_sales_monotonic_with_daily_avg() {
        // Higher daily average → higher projected sales
        let budget_daily = uniform_budget(200000.0, 30);
        let r1 = calculate_budget_analysis(3000000.0, 6000000.0, &budget_daily, 15, 15.0, 30);
        let r2 = calculate_budget_analysis(4000000.0, 6000000.0, &budget_daily, 15, 15.0, 30);
        assert!(r2.projected_sales > r1.projected_sales,
            "Higher actual sales must produce higher projection");
    }

    #[test]
    fn invariant_projected_geq_actual() {
        // projected_sales ≥ total_sales (projection adds remaining × avg)
        let budget_daily = uniform_budget(200000.0, 30);
        let sales = 3000000.0;
        let r = calculate_budget_analysis(sales, 6000000.0, &budget_daily, 15, 15.0, 30);
        assert!(r.projected_sales >= sales - T,
            "Projected sales must be >= actual sales");
    }

    #[test]
    fn invariant_required_daily_feasible() {
        // If remaining > 0 and budget > sales:
        // required_daily × remaining_days = budget - sales
        let budget = 6000000.0;
        let sales = 3000000.0;
        let budget_daily = uniform_budget(200000.0, 30);
        let r = calculate_budget_analysis(sales, budget, &budget_daily, 15, 15.0, 30);
        let remaining_days = 15.0;
        assert!(
            (r.required_daily_sales * remaining_days - (budget - sales)).abs() < T,
            "required_daily × remaining must equal budget gap"
        );
    }
}
