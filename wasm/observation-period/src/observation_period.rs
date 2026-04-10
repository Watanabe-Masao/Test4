/// Observation period quality evaluation.
///
/// Evaluates data quality by examining daily sales to determine:
/// - Last recorded sales day
/// - Number of operating days (salesDays)
/// - Observation quality status (ok / partial / invalid / undefined)
/// - Warning flags (staleness, insufficient data, etc.)
///
/// @contractId BIZ-010
/// @semanticClass business
/// @methodFamily data_quality
///
/// Status determines whether inventory method (在庫法) or estimation method (推定法)
/// should be used for gross profit calculation.

/// Observation status encoded as integer for FFI.
/// ok=0, partial=1, invalid=2, undefined=3
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ObservationStatus {
    Ok = 0,
    Partial = 1,
    Invalid = 2,
    Undefined = 3,
}

/// Warning flags as bitmask for FFI.
pub const WARN_NO_SALES_DATA: u32 = 1;
pub const WARN_INSUFFICIENT_SALES_DAYS: u32 = 2;
pub const WARN_WINDOW_INCOMPLETE: u32 = 4;
pub const WARN_STALE_SALES_DATA: u32 = 8;

/// Observation thresholds (matching TS DEFAULT_OBSERVATION_THRESHOLDS).
pub struct ObservationThresholds {
    pub min_days_for_valid: u32,
    pub min_days_for_ok: u32,
    pub stale_days_threshold: u32,
    pub min_sales_days: u32,
}

impl Default for ObservationThresholds {
    fn default() -> Self {
        Self {
            min_days_for_valid: 5,
            min_days_for_ok: 10,
            stale_days_threshold: 7,
            min_sales_days: 3,
        }
    }
}

/// Result of observation period evaluation.
pub struct ObservationPeriodResult {
    pub last_recorded_sales_day: u32,
    pub elapsed_days: u32,
    pub sales_days: u32,
    pub days_in_month: u32,
    pub remaining_days: u32,
    pub status: ObservationStatus,
    pub warning_flags: u32,
}

/// Evaluate observation period from daily sales array.
///
/// `daily_sales`: column-oriented flat array, index i = day (i+1).
/// length === days_in_month. Values > 0 indicate operating days.
///
/// `current_elapsed_days`: calendar elapsed days from month start (not operating days).
/// Used for staleness detection.
pub fn evaluate_observation_period(
    daily_sales: &[f64],
    days_in_month: u32,
    current_elapsed_days: u32,
    thresholds: &ObservationThresholds,
) -> ObservationPeriodResult {
    // 1. Derive sales metrics from daily_sales
    let (last_recorded_sales_day, sales_days) = derive_sales_metrics(daily_sales, days_in_month);

    // 2. elapsedDays = lastRecordedSalesDay (spec compliance)
    let elapsed_days = last_recorded_sales_day;

    // 3. remainingDays = daysInMonth - elapsedDays
    let remaining_days = days_in_month.saturating_sub(elapsed_days);

    // 4. Determine status
    let status = determine_status(last_recorded_sales_day, elapsed_days, sales_days, thresholds);

    // 5. Collect warning flags
    let warning_flags = collect_warnings(
        status,
        last_recorded_sales_day,
        sales_days,
        current_elapsed_days,
        thresholds,
    );

    ObservationPeriodResult {
        last_recorded_sales_day,
        elapsed_days,
        sales_days,
        days_in_month,
        remaining_days,
        status,
        warning_flags,
    }
}

/// Derive lastRecordedSalesDay and salesDays from daily_sales array.
fn derive_sales_metrics(daily_sales: &[f64], days_in_month: u32) -> (u32, u32) {
    let mut last_recorded_sales_day: u32 = 0;
    let mut sales_days: u32 = 0;

    let len = (days_in_month as usize).min(daily_sales.len());
    for i in 0..len {
        if daily_sales[i] > 0.0 {
            let day = (i + 1) as u32; // 1-based day
            if day > last_recorded_sales_day {
                last_recorded_sales_day = day;
            }
            sales_days += 1;
        }
    }

    (last_recorded_sales_day, sales_days)
}

/// Determine observation status.
///
/// Priority order (matching TS):
/// 1. salesDays === 0 → Undefined
/// 2. elapsedDays < minDaysForValid → Invalid
/// 3. salesDays < minSalesDays → Invalid
/// 4. elapsedDays < minDaysForOk → Partial
/// 5. otherwise → Ok
fn determine_status(
    last_recorded_sales_day: u32,
    elapsed_days: u32,
    sales_days: u32,
    thresholds: &ObservationThresholds,
) -> ObservationStatus {
    if last_recorded_sales_day == 0 || sales_days == 0 {
        return ObservationStatus::Undefined;
    }
    if elapsed_days < thresholds.min_days_for_valid {
        return ObservationStatus::Invalid;
    }
    if sales_days < thresholds.min_sales_days {
        return ObservationStatus::Invalid;
    }
    if elapsed_days < thresholds.min_days_for_ok {
        return ObservationStatus::Partial;
    }
    ObservationStatus::Ok
}

/// Collect warning flags as bitmask.
fn collect_warnings(
    status: ObservationStatus,
    last_recorded_sales_day: u32,
    sales_days: u32,
    current_elapsed_days: u32,
    thresholds: &ObservationThresholds,
) -> u32 {
    let mut flags: u32 = 0;

    match status {
        ObservationStatus::Undefined => {
            flags |= WARN_NO_SALES_DATA;
        }
        ObservationStatus::Invalid => {
            if sales_days > 0 && sales_days < thresholds.min_sales_days {
                flags |= WARN_INSUFFICIENT_SALES_DAYS;
            }
            flags |= WARN_WINDOW_INCOMPLETE;
        }
        ObservationStatus::Partial => {
            flags |= WARN_WINDOW_INCOMPLETE;
        }
        ObservationStatus::Ok => {}
    }

    // Staleness detection
    if last_recorded_sales_day > 0
        && current_elapsed_days >= last_recorded_sales_day + thresholds.stale_days_threshold
    {
        flags |= WARN_STALE_SALES_DATA;
    }

    flags
}

/// Compare two statuses, return the worse one.
pub fn worse_observation_status(a: ObservationStatus, b: ObservationStatus) -> ObservationStatus {
    if (a as u8) >= (b as u8) { a } else { b }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_ok() {
        let sales = vec![100.0; 15]; // 15 days of sales
        let mut padded = sales;
        padded.resize(30, 0.0);
        let r = evaluate_observation_period(&padded, 30, 15, &Default::default());
        assert_eq!(r.status, ObservationStatus::Ok);
        assert_eq!(r.last_recorded_sales_day, 15);
        assert_eq!(r.sales_days, 15);
        assert_eq!(r.remaining_days, 15);
        assert_eq!(r.warning_flags, 0);
    }

    #[test]
    fn no_sales_undefined() {
        let sales = vec![0.0; 30];
        let r = evaluate_observation_period(&sales, 30, 10, &Default::default());
        assert_eq!(r.status, ObservationStatus::Undefined);
        assert_eq!(r.warning_flags & WARN_NO_SALES_DATA, WARN_NO_SALES_DATA);
    }

    #[test]
    fn few_days_invalid() {
        let mut sales = vec![0.0; 30];
        sales[0] = 100.0; // day 1 only
        sales[1] = 100.0; // day 2
        let r = evaluate_observation_period(&sales, 30, 3, &Default::default());
        assert_eq!(r.status, ObservationStatus::Invalid);
        assert_eq!(r.sales_days, 2);
    }

    #[test]
    fn partial_status() {
        let mut sales = vec![0.0; 30];
        for i in 0..8 { sales[i] = 100.0; } // 8 days (>5 valid, >3 sales, but <10 ok)
        let r = evaluate_observation_period(&sales, 30, 8, &Default::default());
        assert_eq!(r.status, ObservationStatus::Partial);
    }

    #[test]
    fn stale_warning() {
        let mut sales = vec![0.0; 30];
        for i in 0..10 { sales[i] = 100.0; } // last sale day 10
        // currentElapsedDays = 20, gap = 20-10 = 10 >= 7 → stale
        let r = evaluate_observation_period(&sales, 30, 20, &Default::default());
        assert_eq!(r.status, ObservationStatus::Ok);
        assert_eq!(r.warning_flags & WARN_STALE_SALES_DATA, WARN_STALE_SALES_DATA);
    }

    #[test]
    fn worse_status_comparison() {
        assert_eq!(worse_observation_status(ObservationStatus::Ok, ObservationStatus::Partial), ObservationStatus::Partial);
        assert_eq!(worse_observation_status(ObservationStatus::Invalid, ObservationStatus::Partial), ObservationStatus::Invalid);
        assert_eq!(worse_observation_status(ObservationStatus::Undefined, ObservationStatus::Invalid), ObservationStatus::Undefined);
    }
}
