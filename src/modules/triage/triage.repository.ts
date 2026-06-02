import { Op, Transaction } from 'sequelize';
import { TriageAnswer } from '@modules/triage/triage-answer.model';

import { TriageAuditLog } from '@modules/triage/triage-audit-log.model';

import { TriageQuestion } from '@modules/triage/triage-question.model';

import { TriageResult } from '@modules/triage/triage-result.model';

import { TriageRule } from '@modules/triage/triage-rule.model';

import { TriageSession } from '@modules/triage/triage-session.model';


const triageRepository = {
  async createSession(payload: Partial<TriageSession>, transaction?: Transaction) {
    return TriageSession.create(payload as any, { transaction });
  },

  async findSessionByIdForUser(sessionId: string, userId: string) {
    return TriageSession.findOne({ where: { id: sessionId, user_id: userId } });
  },

  async updateSession(session: TriageSession, payload: Partial<TriageSession>, transaction?: Transaction) {
    await session.update(payload, { transaction });
    return session;
  },

  async saveAnswer(payload: Partial<TriageAnswer>, transaction?: Transaction) {
    const existing = await TriageAnswer.findOne({
      where: { session_id: payload.session_id, question_id: payload.question_id },
      transaction
    });
    if (existing) {
      existing.answer_value = payload.answer_value;
      await existing.save({ transaction });
      return existing;
    }
    return TriageAnswer.create(payload as any, { transaction });
  },

  async getSessionAnswers(sessionId: string) {
    return TriageAnswer.findAll({
      where: { session_id: sessionId },
      include: [{ model: TriageQuestion }],
      order: [['created_at', 'ASC']]
    });
  },

  async getQuestionById(questionId: string) {
    return TriageQuestion.findByPk(questionId);
  },

  async getQuestionsForGroups(symptomGroups: string[]) {
    return TriageQuestion.findAll({
      where: { symptom_group: { [Op.in]: symptomGroups } },
      order: [['order', 'ASC']]
    });
  },

  async getRulesForGroups(symptomGroups: string[]) {
    return TriageRule.findAll({
      where: { symptom_group: { [Op.in]: symptomGroups }, is_active: true },
      order: [['severity', 'DESC'], ['weight', 'DESC']]
    });
  },

  async saveResult(payload: Partial<TriageResult>, transaction?: Transaction) {
    return TriageResult.create(payload as any, { transaction });
  },

  async getResultForSession(sessionId: string) {
    return TriageResult.findOne({
      where: { session_id: sessionId },
      order: [['created_at', 'DESC']]
    });
  },

  async createAuditLog(payload: Partial<TriageAuditLog>, transaction?: Transaction) {
    return TriageAuditLog.create(payload as any, { transaction });
  },

  async getAuditLogs(sessionId: string) {
    return TriageAuditLog.findAll({
      where: { session_id: sessionId },
      order: [['created_at', 'ASC']]
    });
  }
};

export default triageRepository;
