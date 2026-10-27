export const fineTuningDataset: any[] = [];
export const TOTAL_BENCHMARK_PROMPTS_COUNT = 50;
export function downloadFineTuningDataset(_format?: string) {
  const blob = new Blob([JSON.stringify([])], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prompthub_benchmark_prompts.json';
  a.click();
}
export default fineTuningDataset;
