/**
 * Builds a clean context object for the AI, filtering and prioritizing data.
 */
export function buildAIContext(profile: any, summary: any, memories: any[]) {
  return {
    profile: {
      habit: profile.habit_type,
      style: profile.ai_tone,
      risk_level: profile.risk_level,
      risk_score: profile.risk_score,
      streak: profile.current_streak
    },
    summary: {
      emotional: summary?.emotional_profile,
      motivation: summary?.motivation_summary,
      patterns: summary?.relapse_pattern_summary
    },
    // Filter: Importance >= 3, Limit 5, Priority 4-5 are Identity Anchors
    memories: memories
      .filter(m => m.importance_score >= 3)
      .slice(0, 5)
      .map(m => ({
        content: m.content,
        priority: m.importance_score,
        isIdentityAnchor: m.importance_score >= 4
      }))
  };
}

/**
 * Generates a discreet, goal-focused notification based on risk and user goals.
 */
export function generateNotification(riskLevel: string, riskScore: number, topGoal: string) {
  if (riskLevel === 'critical' || riskScore >= 9) {
    return {
      type: "critical",
      message: "Take a moment. You’ve come too far to restart today."
    };
  }

  if (riskLevel === 'high' || riskScore >= 6) {
    return {
      type: "warning",
      message: "Pause for a moment. Breathe. This urge will pass."
    };
  }

  return {
    type: "motivation",
    message: topGoal 
      ? `Remember your goal: ${topGoal}. Stay consistent today.`
      : "Your future self will thank you for the discipline you show today."
  };
}