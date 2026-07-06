import {
  TriageCondition,
  TriageRecommendationDetails,
  TriageRiskLevel,
  TriageRuleDefinition,
} from '@appTypes/triage.types';

const SAFETY_NET = 'If symptoms worsen, seek immediate care.';
const CONFIDENCE_DISCLAIMER = 'This result is based on structured screening rules and does not provide a diagnosis.';

export function evaluateCondition(condition: TriageCondition | null | undefined, facts: Record<string, unknown>): boolean {
  if (!condition || !Array.isArray(condition.all) || condition.all.length === 0) return true;

  return condition.all.every((clause) => {
    const actual = facts[clause.fact];
    switch (clause.operator) {
      case 'eq': return actual === clause.value;
      case 'gt': return typeof actual === 'number' && typeof clause.value === 'number' && actual > clause.value;
      case 'lt': return typeof actual === 'number' && typeof clause.value === 'number' && actual < clause.value;
      default: return false;
    }
  });
}

export function calculateScore(matchedRules: Array<{ weight: number; severity: string }>): number {
  return matchedRules
    .filter((r) => r.severity !== 'critical')
    .reduce((total, r) => total + r.weight, 0);
}

export function getMatchedRules<T extends TriageRuleDefinition>(rules: T[], facts: Record<string, unknown>): T[] {
  return rules.filter((rule) => evaluateCondition(rule.condition, facts));
}

export function mapRisk(score: number): 'low' | 'moderate' | 'urgent' {
  if (score >= 12) return 'urgent';
  if (score >= 6) return 'moderate';
  return 'low';
}

export function getRecommendation(riskLevel: TriageRiskLevel): string {
  switch (riskLevel) {
    case 'emergency': return 'Seek emergency care immediately';
    case 'urgent': return 'Visit a clinic within 24 hours';
    case 'moderate': return 'Consult a clinician within 72 hours';
    default: return 'Home care with monitoring';
  }
}

function resolveAction(actionOverride: string | null | undefined, riskLevel: TriageRiskLevel): string {
  if (!actionOverride) return getRecommendation(riskLevel);
  if (['emergency', 'urgent', 'moderate', 'low'].includes(actionOverride)) {
    return getRecommendation(actionOverride as TriageRiskLevel);
  }
  return actionOverride;
}

function buildContextualSuggestions(facts: Record<string, unknown>, matchedRules: Array<{ rule_code: string }>): string[] {
  const codes = new Set(matchedRules.map((r) => r.rule_code));
  const suggestions: string[] = [];
  const malariaSignal = codes.has('MALARIA_REGION_FEVER') || codes.has('MALARIA_CHILLS') || codes.has('MALARIA_HEADACHE');
  if (facts.fever === true && malariaSignal) suggestions.push('Get a malaria test today.');
  return suggestions;
}

export function buildRecommendationDetails(
  riskLevel: TriageRiskLevel,
  facts: Record<string, unknown>,
  matchedRules: Array<{ rule_code: string }>,
  actionOverride?: string | null
): TriageRecommendationDetails {
  return {
    primaryAction: resolveAction(actionOverride, riskLevel),
    contextualSuggestions: buildContextualSuggestions(facts, matchedRules),
    safetyNet: SAFETY_NET,
    confidenceDisclaimer: CONFIDENCE_DISCLAIMER
  };
}

export function buildRecommendation(
  riskLevel: TriageRiskLevel,
  facts: Record<string, unknown>,
  matchedRules: Array<{ rule_code: string }>,
  actionOverride?: string | null
): string {
  const details = buildRecommendationDetails(riskLevel, facts, matchedRules, actionOverride);
  return [details.primaryAction, ...details.contextualSuggestions, details.safetyNet, details.confidenceDisclaimer].join(' ').trim();
}
