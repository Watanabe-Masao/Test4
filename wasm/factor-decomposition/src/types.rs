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

// Note: decompose5 result is composed inline in lib.rs (wasm_bindgen layer)
// using ThreeFactorResult + PriceMixResult. No separate struct needed.
// CategoryQtyAmt is represented as (String, f64, f64) tuples internally
// and as parallel arrays (keys, qtys, amts) at the FFI boundary.
