import {
  callWithRetry,
  getAi,
  delay,
  GeminiQuotaError,
  GeminiImageUnavailableError,
  MODEL_FALLBACK_CHAIN,
  getApiErrorText,
  parseApiErrorPayload,
  getRetryDelaySeconds,
  isQuotaError,
  isImagePlanError,
} from "./gemini-client.ts";
import { extractJson } from "./extract-json.ts";
import {
  DANGEROUS_KEYWORDS,
  type SafetyCheck,
  detectLanguage,
  checkContentSafety,
} from "./safety.ts";
import {
  evaluateRealismLocally,
  rebalancePlanLocally,
} from "./rebalance-local.ts";
import { rebalancePlan } from "./rebalance.ts";
import {
  generateDailyFocus,
  DAILY_FOCUS_ANGLES,
  hashSeed,
  pickDailyFocusAngle,
} from "./evaluators/daily-focus.ts";
import {
  evaluateDailyLog,
  convertMainTasksToRows,
} from "./evaluators/daily-log.ts";
import {
  evaluateMultiGoalDailyLog,
  type MultiGoalItemContext,
  type MultiGoalEvaluatedItem,
  type MultiGoalEvaluationResult,
} from "./evaluators/multi-goal.ts";
import { evaluateMilestone } from "./evaluators/milestone.ts";
import {
  generateWeeklyReview,
  type WeeklyReviewPattern,
  type WeeklyReviewResult,
} from "./evaluators/weekly-review.ts";
import {
  editGoalWithAI,
  sanitizeGoalEdit,
} from "./evaluators/edit-goal.ts";
import {
  generateMiniVersion,
  generateCompletionCriteria,
} from "./evaluators/task-helpers.ts";

export class GeminiService {
  static callWithRetry = callWithRetry;
  static detectLanguage = detectLanguage;
  static checkContentSafety = checkContentSafety;
  static generateDailyFocus = generateDailyFocus;
  static evaluateDailyLog = evaluateDailyLog;
  static evaluateMultiGoalDailyLog = evaluateMultiGoalDailyLog;
  static evaluateMilestone = evaluateMilestone;
  static editGoalWithAI = editGoalWithAI;
  static sanitizeGoalEdit = sanitizeGoalEdit;
  static rebalancePlan = rebalancePlan;
  static evaluateRealismLocally = evaluateRealismLocally;
  static rebalancePlanLocally = rebalancePlanLocally;
  static generateMiniVersion = generateMiniVersion;
  static generateCompletionCriteria = generateCompletionCriteria;
  static generateWeeklyReview = generateWeeklyReview;
}

export {
  // Client & Errors
  getAi,
  delay,
  GeminiQuotaError,
  GeminiImageUnavailableError,
  MODEL_FALLBACK_CHAIN,
  getApiErrorText,
  parseApiErrorPayload,
  getRetryDelaySeconds,
  isQuotaError,
  isImagePlanError,
  callWithRetry,

  // Parser
  extractJson,

  // Safety
  DANGEROUS_KEYWORDS,
  type SafetyCheck,
  detectLanguage,
  checkContentSafety,

  // Rebalance
  evaluateRealismLocally,
  rebalancePlanLocally,
  rebalancePlan,

  // Evaluators
  generateDailyFocus,
  DAILY_FOCUS_ANGLES,
  hashSeed,
  pickDailyFocusAngle,
  evaluateDailyLog,
  convertMainTasksToRows,
  evaluateMultiGoalDailyLog,
  type MultiGoalItemContext,
  type MultiGoalEvaluatedItem,
  type MultiGoalEvaluationResult,
  evaluateMilestone,
  generateWeeklyReview,
  type WeeklyReviewPattern,
  type WeeklyReviewResult,
  editGoalWithAI,
  sanitizeGoalEdit,
  generateMiniVersion,
  generateCompletionCriteria,
};
