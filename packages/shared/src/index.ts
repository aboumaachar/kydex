export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ScreenResponse = {
  queryId: string;
  riskLevel: RiskLevel;
  highestScore: number;
  requiresEscalation: boolean;
};
