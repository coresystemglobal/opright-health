import { TriageQuestion } from '@modules/triage/triage-question.model';
import { TriageRule } from '@modules/triage/triage-rule.model';
import seedData from './triage-seed-data.json';

export async function seedTriageData() {
  try {
    const questionCount = await TriageQuestion.count();
    if (questionCount === 0) {
      await TriageQuestion.bulkCreate(seedData.questions as any[], { ignoreDuplicates: true });
      console.log(`Seeded ${seedData.questions.length} triage questions`);
    } else {
      console.log(`Triage questions already seeded (${questionCount} found), skipping`);
    }

    const ruleCount = await TriageRule.count();
    if (ruleCount === 0) {
      await TriageRule.bulkCreate(seedData.rules as any[], { ignoreDuplicates: true });
      console.log(`Seeded ${seedData.rules.length} triage rules`);
    } else {
      console.log(`Triage rules already seeded (${ruleCount} found), skipping`);
    }
  } catch (error) {
    console.error('Triage seed error:', error);
    throw error;
  }
}
