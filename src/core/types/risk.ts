export type MetricStatus = "green" | "yellow" | "red"

export type RiskMetricResult = {
  value: number | null
  status: MetricStatus | null
  label: string
  tooltip: string
  format: "ratio" | "percent" | "coefficient"
}

export type RiskMetrics = {
  sharpe: RiskMetricResult
  beta: RiskMetricResult
  var95: RiskMetricResult
  maxDrawdown: RiskMetricResult
  alpha: RiskMetricResult
  calculatedAt: string
  dataPoints: number
}

export type MetricName = "sharpe" | "beta" | "var95" | "maxDrawdown" | "alpha"
