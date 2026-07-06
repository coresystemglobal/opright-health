import sequelize from '@core/database';
import { TriageSession } from '@modules/triage/triage-session.model';

import { TriageRule } from '@modules/triage/triage-rule.model';

import { TriageQuestion } from '@modules/triage/triage-question.model';

import triageRepository from '@modules/triage/triage.repository';

import {
  buildRecommendation,
  buildRecommendationDetails,
  calculateScore,
  evaluateCondition,
  getMatchedRules,
  mapRisk
} from './triage.rules';
import {
  TriageAnswerRequest,
  TriageCondition,
  TriageProcessResponse,
  TriageQuestionPayload,
  TriageRecommendationDetails,
  TriageResultExplanation,
  TriageRiskLevel,
  TriageStartRequest
} from '@appTypes/triage.types';

function normalizeAnswerValue(value: unknown, question?: TriageQuestion | null): unknown {
  let v = value;
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
    v = (v as Record<string, unknown>).value;
  }
  if (question?.type === 'number' && typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  }
  if (question?.type === 'boolean' && typeof v === 'string') {
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
  }
  return v;
}

function buildFacts(answers: Array<{ answer_value: unknown; question?: TriageQuestion | null }>, session: TriageSession): Record<string, unknown> {
  return answers.reduce<Record<string, unknown>>(
    (facts, answer) => {
      if (answer.question?.code) {
        facts[answer.question.code] = normalizeAnswerValue(answer.answer_value, answer.question);
      }
      return facts;
    },
    {
      primary_symptom: session.primary_symptom,
      fever: session.primary_symptom === 'fever',
      chest_pain: session.primary_symptom === 'chest_pain'
    }
  );
}

function toQuestionPayload(q: TriageQuestion): TriageQuestionPayload {
  return { id: q.id, code: q.code, text: q.text, type: q.type, symptom_group: q.symptom_group, order: q.order, options: q.options || null };
}

function buildExplanation(
  facts: Record<string, unknown>,
  matchedRules: TriageRule[],
  recommendationDetails: TriageRecommendationDetails,
  emergencyTriggeredBy?: string | null
): TriageResultExplanation {
  return {
    matchedRuleCodes: matchedRules.map((r) => r.rule_code),
    matchedRules: matchedRules.map((r) => ({ rule_code: r.rule_code, severity: r.severity, weight: r.weight, action_override: r.action_override || null })),
    facts,
    scoreBreakdown: matchedRules.filter((r) => r.severity !== 'critical').map((r) => ({ rule_code: r.rule_code, weight: r.weight })),
    recommendationDetails,
    emergencyTriggeredBy: emergencyTriggeredBy || null
  };
}

async function recordAudit(sessionId: string, eventType: string, payload: Record<string, unknown>) {
  await triageRepository.createAuditLog({ session_id: sessionId, event_type: eventType, payload });
}

const triageService = {
  async startSession(userId: string, tenantId: string, payload: TriageStartRequest): Promise<TriageProcessResponse> {
    const primarySymptom = payload.primary_symptom.trim().toLowerCase();
    const transaction = await sequelize.transaction();

    try {
      const session = await triageRepository.createSession(
        { user_id: userId, tenant_id: tenantId, status: 'in_progress', primary_symptom: primarySymptom, started_at: new Date() },
        transaction
      );

      await triageRepository.createAuditLog(
        { session_id: session.id, event_type: 'session_started', payload: { primary_symptom: primarySymptom, user_id: userId } },
        transaction
      );

      const questions = await triageRepository.getQuestionsForGroups([primarySymptom, 'general']);
      const nextQuestion = questions.find((q) => !q.condition);

      await transaction.commit();

      return {
        statusCode: 201, status: 'success', message: 'Triage session started',
        data: { sessionId: session.id, status: session.status, nextQuestion: nextQuestion ? toQuestionPayload(nextQuestion) : null, result: null }
      };
    } catch (error) {
      await transaction.rollback();
      const msg = error instanceof Error ? error.message : 'Failed to start session';
      return { statusCode: 500, status: 'error', message: msg, data: null };
    }
  },

  async submitAnswer(userId: string, payload: TriageAnswerRequest): Promise<TriageProcessResponse> {
    const session = await triageRepository.findSessionByIdForUser(payload.session_id, userId);

    if (!session) return { statusCode: 404, status: 'fail', message: 'Triage session not found', data: null };

    if (session.status !== 'in_progress') {
      const existingResult = await triageRepository.getResultForSession(session.id);
      return {
        statusCode: 200, status: 'success', message: 'Triage already completed',
        data: {
          sessionId: session.id, status: session.status, nextQuestion: null,
          result: existingResult ? {
            score: existingResult.score, riskLevel: existingResult.risk_level,
            recommendation: existingResult.recommendation,
            recommendationDetails: existingResult.explanation.recommendationDetails,
            explanation: existingResult.explanation
          } : null
        }
      };
    }

    const question = await triageRepository.getQuestionById(payload.question_id);
    if (!question) return { statusCode: 404, status: 'fail', message: 'Question not found', data: null };

    const validGroup = [session.primary_symptom, 'general'].includes(question.symptom_group);
    if (!validGroup) return { statusCode: 400, status: 'fail', message: 'Question does not belong to this triage flow', data: null };

    const transaction = await sequelize.transaction();
    try {
      await triageRepository.saveAnswer(
        { session_id: session.id, question_id: question.id, answer_value: payload.answer_value },
        transaction
      );
      await triageRepository.createAuditLog(
        { session_id: session.id, event_type: 'answer_submitted', payload: { question_id: question.id, question_code: question.code, answer_value: payload.answer_value as Record<string, unknown> } },
        transaction
      );
      await transaction.commit();
      return this.processSession(userId, session.id);
    } catch (error) {
      await transaction.rollback();
      const msg = error instanceof Error ? error.message : 'Failed to submit answer';
      return { statusCode: 500, status: 'error', message: msg, data: null };
    }
  },

  async processSession(userId: string, sessionId: string): Promise<TriageProcessResponse> {
    const session = await triageRepository.findSessionByIdForUser(sessionId, userId);
    if (!session) return { statusCode: 404, status: 'fail', message: 'Triage session not found', data: null };

    const [answers, rules, questions] = await Promise.all([
      triageRepository.getSessionAnswers(sessionId),
      triageRepository.getRulesForGroups([session.primary_symptom, 'general']),
      triageRepository.getQuestionsForGroups([session.primary_symptom, 'general'])
    ]);

    const facts = buildFacts(answers, session);
    const answeredIds = new Set(answers.map((a) => a.question_id));
    const nextQuestion = questions.find((q) => !answeredIds.has(q.id) && evaluateCondition(q.condition as TriageCondition | undefined, facts));
    const matchedRules = getMatchedRules(rules, facts);
    const criticalRule = matchedRules.find((r) => r.severity === 'critical');

    if (criticalRule) {
      return this.completeSession(session, matchedRules, facts, 'emergency', criticalRule.action_override || null, criticalRule.rule_code);
    }

    if (nextQuestion) {
      await recordAudit(session.id, 'question_requested', { next_question_id: nextQuestion.id, next_question_code: nextQuestion.code });
      return { statusCode: 200, status: 'success', message: 'Next question ready', data: { sessionId: session.id, status: session.status, nextQuestion: toQuestionPayload(nextQuestion), result: null } };
    }

    const score = calculateScore(matchedRules);
    const riskLevel = mapRisk(score);
    return this.completeSession(session, matchedRules, facts, riskLevel, null, null, score);
  },

  async completeSession(
    session: TriageSession,
    matchedRules: TriageRule[],
    facts: Record<string, unknown>,
    riskLevel: TriageRiskLevel,
    actionOverride?: string | null,
    emergencyTriggeredBy?: string | null,
    providedScore?: number
  ): Promise<TriageProcessResponse> {
    const score = typeof providedScore === 'number' ? providedScore : 0;
    const recommendationDetails = buildRecommendationDetails(riskLevel, facts, matchedRules, actionOverride);
    const recommendation = buildRecommendation(riskLevel, facts, matchedRules, actionOverride);
    const explanation = buildExplanation(facts, matchedRules, recommendationDetails, emergencyTriggeredBy);

    const transaction = await sequelize.transaction();
    let committed = false;
    try {
      await triageRepository.updateSession(session, { status: 'completed', risk_level: riskLevel, recommended_action: recommendation, score, completed_at: new Date() }, transaction);
      await triageRepository.saveResult({ session_id: session.id, score, risk_level: riskLevel, recommendation, explanation }, transaction);
      await triageRepository.createAuditLog(
        { session_id: session.id, event_type: 'session_completed', payload: { risk_level: riskLevel, score, matched_rule_codes: matchedRules.map((r) => r.rule_code), emergency_triggered_by: emergencyTriggeredBy } },
        transaction
      );
      await transaction.commit();
      committed = true;

      return {
        statusCode: 200, status: 'success', message: 'Triage completed',
        data: { sessionId: session.id, status: 'completed', nextQuestion: null, result: { score, riskLevel, recommendation, recommendationDetails, explanation } }
      };
    } catch (error) {
      if (!committed) await transaction.rollback();
      const msg = error instanceof Error ? error.message : 'Failed to complete session';
      return { statusCode: 500, status: 'error', message: msg, data: null };
    }
  },

  async getResult(userId: string, sessionId: string) {
    const session = await triageRepository.findSessionByIdForUser(sessionId, userId);
    if (!session) return { statusCode: 404, status: 'fail', message: 'Triage session not found', data: null };

    const [result, answers, auditLogs] = await Promise.all([
      triageRepository.getResultForSession(sessionId),
      triageRepository.getSessionAnswers(sessionId),
      triageRepository.getAuditLogs(sessionId)
    ]);

    if (!result) return { statusCode: 409, status: 'fail', message: 'Triage session still in progress', data: { sessionId: session.id, status: session.status } };

    return {
      statusCode: 200, status: 'success', message: 'Triage result fetched',
      data: {
        session: { id: session.id, primary_symptom: session.primary_symptom, status: session.status, risk_level: session.risk_level, recommended_action: session.recommended_action, score: session.score, started_at: session.started_at, completed_at: session.completed_at },
        answers: answers.map((a) => ({ question_id: a.question_id, question_code: (a as any).question?.code, question_text: (a as any).question?.text, answer_value: a.answer_value, created_at: a.created_at })),
        result: { score: result.score, risk_level: result.risk_level, recommendation: result.recommendation, recommendation_details: result.explanation.recommendationDetails, explanation: result.explanation, created_at: result.created_at },
        audit_logs: auditLogs.map((l) => ({ event_type: l.event_type, payload: l.payload, created_at: l.created_at }))
      }
    };
  }
};

export default triageService;
