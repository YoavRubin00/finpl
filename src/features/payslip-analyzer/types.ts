export type PayslipPhase =
  | "idle"
  | "file_chosen"
  | "analyzing"
  | "success"
  | "error";

export interface ChosenFile {
  uri: string;
  mimeType: string;
  byteSize: number;
  previewUri: string;
  displayName: string;
}

export type PayslipDeductionKind =
  | "income_tax"
  | "bituach_leumi"
  | "mas_briut"
  | "pension_employee"
  | "keren_hishtalmut"
  | "other";

export interface PayslipDeduction {
  kind: PayslipDeductionKind;
  label: string;
  amount: number;
}

export type PayslipMetricKind =
  | "pension_employer"
  | "severance"
  | "vacation_days"
  | "sick_days"
  | "credit_points"
  | "employer_cost"
  | "hourly_rate"
  | "overtime_hours";

export type PayslipMetricUnit = "ILS" | "days" | "points" | "hours" | "count";

export interface PayslipMetric {
  kind: PayslipMetricKind;
  label: string;
  value: number;
  unit: PayslipMetricUnit;
}

export type PayslipAnomalySeverity = "info" | "warn" | "critical";

export interface PayslipAnomaly {
  severity: PayslipAnomalySeverity;
  code: string;
  title: string;
  description: string;
  suggestion: string;
}

export interface PayslipResult {
  confidence: number;
  payPeriod: string;
  brutto: number;
  netto: number;
  totalDeductions: number;
  deductions: PayslipDeduction[];
  metrics: PayslipMetric[];
  anomalies: PayslipAnomaly[];
  sharkSummary: string;
  actionItems: string[];
}

export interface PayslipAnalyzeRequest {
  fileBase64: string;
  mimeType: string;
  byteSize: number;
  name?: string;
  financialGoal?: string;
}

export type PayslipErrorCode =
  | "unreadable"
  | "not_a_payslip"
  | "parse_failed"
  | "invalid_mime"
  | "file_too_large"
  | "rate_limited"
  | "service_unavailable"
  | "timeout"
  | "network"
  | "unknown"
  | "picker_cancelled"
  | "password_pdf";

export interface PayslipAnalyzeError {
  ok: false;
  code: PayslipErrorCode;
  error: string;
}

export interface PayslipAnalyzeSuccess {
  ok: true;
  confidence: number;
  result: PayslipResult;
}

export type PayslipAnalyzeResponse = PayslipAnalyzeSuccess | PayslipAnalyzeError;
