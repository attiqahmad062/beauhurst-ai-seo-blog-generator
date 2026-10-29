export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/eslint'],
  typescript: { strict: true, typeCheck: false },
  runtimeConfig: {
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
    aiProvider: 'gemini',
    dataDir: './data',
    public: { siteUrl: 'http://localhost:3000' }
  },
  app: { head: { htmlAttrs: { lang: 'en-GB' }, meta: [{ name: 'theme-color', content: '#101f30' }] } }
})
