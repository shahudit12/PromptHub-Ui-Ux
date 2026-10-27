// Multi-model token estimator & cost tracking utility

export interface TokenEstimation {
  estimatedTokens: number;
  costEstimatesUsd: {
    gpt4o: number;
    claude35Sonnet: number;
    gemini15Flash: number;
  };
}

export const estimateTokens = (text: string): TokenEstimation => {
  if (!text) {
    return {
      estimatedTokens: 0,
      costEstimatesUsd: { gpt4o: 0, claude35Sonnet: 0, gemini15Flash: 0 },
    };
  }

  // Standard heuristic: ~4 characters per token
  const estimatedTokens = Math.max(1, Math.ceil(text.length / 4));

  return {
    estimatedTokens,
    costEstimatesUsd: {
      gpt4o: Number(((estimatedTokens / 1000) * 0.005).toFixed(6)),
      claude35Sonnet: Number(((estimatedTokens / 1000) * 0.003).toFixed(6)),
      gemini15Flash: Number(((estimatedTokens / 1000) * 0.00035).toFixed(6)),
    },
  };
};
