export default () => ({
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? null,
    model: process.env.OPENROUTER_MODEL ?? 'mistralai/mixtral-8x7b',
  },
});
