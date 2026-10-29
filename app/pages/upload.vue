<script setup lang="ts">
import type { MappingField, Mapping } from '../../server/utils/dataset'
const file = ref<File | null>(null)
const preview = ref<{ headers: string[], suggested: Mapping, count: number, preview: Record<string, string>[] } | null>(null)
const mapping = reactive<Mapping>({})
const industry = ref('Fintech')
const currency = ref<'GBP'|'USD'|'EUR'>('GBP')
const state = ref<'idle'|'validating'|'ready'|'generating'|'saving'|'failed'>('idle')
const message = ref('')
const fields: Array<{ key: MappingField, label: string, required: boolean }> = [
  { key: 'name', label: 'Company name', required: true }, { key: 'fundraising', label: 'Fundraising amount', required: true },
  { key: 'website', label: 'Website', required: false }, { key: 'location', label: 'Location', required: false },
  { key: 'description', label: 'Description', required: false }, { key: 'stage', label: 'Funding stage', required: false }, { key: 'employees', label: 'Employees', required: false }, { key: 'industries', label: 'Industries', required: false }, { key: 'originalRank', label: 'Source rank', required: false }
]
function failure(e: unknown) { const err = e as { data?: { message?: string }, message?: string }; message.value = err?.data?.message || err?.message || 'An unexpected error occurred.'; state.value = 'failed' }
async function choose(event: Event) {
  const target = event.target as HTMLInputElement
  const chosen = target.files?.[0]
  if (!chosen) return
  file.value = chosen; preview.value = null; message.value = ''; state.value = 'validating'
  if (!chosen.name.toLowerCase().endsWith('.csv') || chosen.size > 2 * 1024 * 1024) { message.value = 'Choose a .csv file smaller than 2 MB.'; state.value = 'failed'; return }
  const form = new FormData(); form.append('file', chosen)
  try {
    const response = await $fetch<typeof preview.value>('/api/inspect', { method: 'POST', body: form })
    if (!response) throw new Error('No inspection data returned.')
    preview.value = response
    for (const key of fields) mapping[key.key] = response.suggested[key.key] || ''
    state.value = 'ready'
  } catch (error) { failure(error) }
}
async function generate() {
  if (!file.value || !preview.value || !mapping.name || !mapping.fundraising || !industry.value.trim()) return
  message.value = ''; state.value = 'generating'
  const form = new FormData()
  form.append('file', file.value)
  form.append('options', JSON.stringify({ industry: industry.value.trim(), currency: currency.value, mapping: { ...mapping } }))
  try {
    const response = await $fetch<{ url: string }>('/api/generate', { method: 'POST', body: form })
    state.value = 'saving'
    await navigateTo(response.url)
  } catch (error) { failure(error) }
}
useSeoMeta({ title: 'Create an industry report | Data stories', description: 'Upload a company dataset and generate a server-rendered, SEO-ready industry ranking with trustworthy data analysis.' })
</script>
<template>
  <div class="container upload-page"><NuxtLink to="/" class="backlink">← Back to articles</NuxtLink><div class="eyebrow dark">THE CONTENT STUDIO</div><h1>Bring your data<br><em>to life.</em></h1><p class="page-intro">One dataset. A fully formed story. Upload your company CSV and we'll build a beautiful, SEO-friendly report grounded in the numbers.</p>
    <div class="upload-layout"><div class="panel"><div class="panel-heading"><span class="step-label">01 / YOUR DATA</span><h2>Upload a dataset</h2><p>Choose a CSV with company names and fundraising values.</p></div><label class="dropzone" for="csv"><span class="upload-symbol">↥</span><strong>{{ file?.name || 'Choose your CSV file' }}</strong><span>CSV format · Maximum 2 MB · Up to 2,000 companies</span><input id="csv" type="file" accept=".csv,text/csv" :disabled="state === 'generating'" @change="choose"></label><div v-if="state === 'validating'" class="notice" role="status">Validating CSV and inspecting columns…</div><div v-if="preview" class="dataset-summary"><div><span class="mini-label">ROWS DISCOVERED</span><strong>{{ preview.count.toLocaleString() }}</strong></div><div><span class="mini-label">COLUMNS</span><strong>{{ preview.headers.length }}</strong></div><div><span class="mini-label">VALIDATION</span><strong class="success">Parsed ✓</strong></div></div><div v-if="preview" class="mapping"><h3>Match your columns</h3><p>Review the suggested mapping. Only the first two fields are required.</p><div v-for="field in fields" :key="field.key" class="form-field"><label :for="field.key">{{ field.label }} <span v-if="field.required">*</span></label><select :id="field.key" v-model="mapping[field.key]"><option value="">{{ field.required ? 'Select a column' : 'Not included' }}</option><option v-for="header in preview.headers" :key="header" :value="header">{{ header }}</option></select></div><div class="preview-table"><span class="mini-label">FIRST 5 RECORDS / SOURCE PREVIEW</span><div class="table-scroll"><table><thead><tr><th v-for="h in preview.headers" :key="h">{{ h }}</th></tr></thead><tbody><tr v-for="(row, index) in preview.preview" :key="index"><td v-for="h in preview.headers" :key="h">{{ row[h] }}</td></tr></tbody></table></div></div></div></div>
      <div class="panel config"><div class="panel-heading"><span class="step-label">02 / YOUR STORY</span><h2>Set the context</h2><p>A few details to make your article relevant and accurate.</p></div><div class="form-field"><label for="industry">Industry / subject *</label><input id="industry" v-model="industry" maxlength="80" placeholder="e.g. Fintech, Healthtech, Cleantech"></div><div class="form-field"><label for="currency">Currency in CSV values *</label><select id="currency" v-model="currency"><option value="GBP">GBP — British pounds</option><option value="USD">USD — US dollars</option><option value="EUR">EUR — Euros</option></select><small>All fundraising amounts must use the same currency. No conversions are performed.</small></div><div class="generation-info"><div class="info-star">✳</div><div><strong>What we'll create</strong><p>Verified fundraising statistics, a complete company ranking, and AI-written article content with dynamic SEO metadata.</p></div></div><p v-if="state === 'failed'" class="error" role="alert">{{ message }}</p><button class="button dark-btn full" :disabled="state === 'generating' || state === 'saving' || !preview || !mapping.name || !mapping.fundraising || !industry.trim()" @click="generate">{{ state === 'saving' ? 'Opening the new article…' : state === 'generating' ? 'Processing dataset and generating AI content…' : 'Generate article →' }}</button><p class="fineprint">Generation requires a configured Gemini or Ollama provider. Your source figures are calculated locally on the server.</p></div></div>
  </div>
</template>
