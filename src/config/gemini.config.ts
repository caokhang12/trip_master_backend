export default () => ({
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? null,
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  },
});
