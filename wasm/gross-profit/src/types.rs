/// Transfer totals result: combined price and cost across all transfer directions
pub struct TransferTotalsResult {
    pub transfer_price: f64,
    pub transfer_cost: f64,
}

/// Core sales result with over-delivery detection
pub struct CoreSalesResult {
    pub core_sales: f64,
    pub is_over_delivery: bool,
    pub over_delivery_amount: f64,
}

/// Markup rate result: average (all sources) and core (excluding delivery)
pub struct MarkupRateResult {
    pub average_markup_rate: f64,
    pub core_markup_rate: f64,
}

/// Inventory method result with null propagation
///
/// When either opening or closing inventory is null (NaN sentinel),
/// the entire result is null (is_null = true).
pub struct InvMethodResult {
    pub is_null: bool,
    pub cogs: f64,
    pub gross_profit: f64,
    pub gross_profit_rate: f64,
}

/// Estimation method result with conditional null for closing inventory
///
/// closing_inventory is null when opening_inventory is null (NaN sentinel).
pub struct EstMethodResult {
    pub closing_inventory_is_null: bool,
    pub gross_sales: f64,
    pub cogs: f64,
    pub margin: f64,
    pub margin_rate: f64,
    pub closing_inventory: f64,
}
