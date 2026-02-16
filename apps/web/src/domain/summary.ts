export interface ProfitSummary {
  cogs: number;
  grossProfit: number;
  marginRate: number;
}

export function calculateProfitSummary(params: {
  invStart: number;
  totalCost: number;
  invEnd: number;
  sales: number;
}): ProfitSummary {
  const cogs = params.invStart + params.totalCost - params.invEnd;
  const grossProfit = params.sales - cogs;
  const marginRate = params.sales > 0 ? grossProfit / params.sales : 0;

  return { cogs, grossProfit, marginRate };
}
