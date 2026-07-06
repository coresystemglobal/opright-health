export type TriageSessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type TriageRiskLevel = 'low' | 'moderate' | 'urgent' | 'emergency';
export type TriageQuestionType = 'single' | 'multi' | 'boolean' | 'number';
export type TriageRuleSeverity = 'low' | 'moderate' | 'high' | 'critical';
export type TriageOperator = 'eq' | 'gt' | 'lt';

export interface TriageConditionClause {
  fact: string;
  operator: TriageOperator;
  value: string | number | boolean | null;
}

export interface TriageCondition {
  all: TriageConditionClause[];
}

export interface TriageStartRequest {
  primary_symptom: string;
}

export interface TriageAnswerRequest {
  session_id: string;
  question_id: string;
  answer_value: unknown;
}

export interface TriageQuestionPayload {
  id: string;
  code: string;
  text: string;
  type: TriageQuestionType;
  symptom_group: string;
  order: number;
  options?: unknown[] | null;
}

export interface TriageRecommendationDetails {
  primaryAction: string;
  contextualSuggestions: string[];
  safetyNet: string;
  confidenceDisclaimer: string;
}

export interface TriageResultExplanation {
  matchedRuleCodes: string[];
  matchedRules: Array<{
    rule_code: string;
    severity: TriageRuleSeverity;
    weight: number;
    action_override?: string | null;
  }>;
  facts: Record<string, unknown>;
  scoreBreakdown: Array<{ rule_code: string; weight: number }>;
  recommendationDetails: TriageRecommendationDetails;
  emergencyTriggeredBy?: string | null;
}

export interface TriageRuleDefinition {
  rule_code: string;
  condition: TriageCondition;
  weight: number;
  severity: TriageRuleSeverity;
  action_override?: string | null;
}

export interface TriageProcessResponse {
  statusCode: number;
  status: 'success' | 'fail' | 'error';
  message: string;
  data: {
    sessionId: string;
    status: TriageSessionStatus;
    nextQuestion?: TriageQuestionPayload | null;
    result?: {
      score: number;
      riskLevel: TriageRiskLevel;
      recommendation: string;
      recommendationDetails: TriageRecommendationDetails;
      explanation: TriageResultExplanation;
    } | null;
  } | null;
}
