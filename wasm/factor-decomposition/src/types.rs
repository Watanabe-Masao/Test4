/// 2-factor decomposition result: customer effect + ticket effect
pub struct TwoFactorResult {
    pub cust_effect: f64,
    pub ticket_effect: f64,
}

/// 3-factor decomposition result: customer + quantity + price-per-item
pub struct ThreeFactorResult {
    pub cust_effect: f64,
    pub qty_effect: f64,
    pub price_per_item_effect: f64,
}

/// Price/mix decomposition result
pub struct PriceMixResult {
    pub price_effect: f64,
    pub mix_effect: f64,
}

/// 5-factor decomposition result: customer + quantity + price + mix
///
/// Composes decompose3 (customer + qty + price-per-item) with
/// decompose_price_mix (price + mix) to split the price-per-item effect.
///
/// None is returned when decompose_price_mix cannot be computed
/// (e.g. empty categories, zero total quantity in either period).
pub struct FiveFactorResult {
    pub cust_effect: f64,
    pub qty_effect: f64,
    pub price_effect: f64,
    pub mix_effect: f64,
}

// CategoryQtyAmt is represented as (String, f64, f64) tuples internally
// and as parallel arrays (keys, qtys, amts) at the FFI boundary.
