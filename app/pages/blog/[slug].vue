
<script setup lang="ts">
import type { Blog } from '../../../shared/domain'

const route = useRoute()
const cfg = useRuntimeConfig()

const { data: article, error } = await useFetch<Blog>(
  () => `/api/blogs/${route.params.slug}`,
  {
    key: `blog-${String(route.params.slug)}`
  }
)

if (error.value || !article.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Article not found',
    fatal: true
  })
}

const blog = computed(() => article.value!)

const canonical = computed(
  () => `${String(cfg.public.siteUrl).replace(/\/$/, '')}/blog/${blog.value.slug}`
)

useSeoMeta({
  title: () => blog.value.content.title,
  description: () => blog.value.content.metaDescription,
  ogTitle: () => blog.value.content.title,
  ogDescription: () => blog.value.content.metaDescription,
  ogType: 'article',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
  twitterTitle: () => blog.value.content.title,
  twitterDescription: () => blog.value.content.metaDescription,
  articlePublishedTime: () => blog.value.createdAt
})

useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: canonical.value
    }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: blog.value.content.title,
        description: blog.value.content.metaDescription,
        datePublished: blog.value.createdAt,
        mainEntityOfPage: canonical.value
      }).replace(/</g, '\\u003c')
    }
  ]
}))

const format = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: blog.value.currency,
    maximumFractionDigits: value < 1 ? 2 : 0
  }).format(value)

const safeCompanyUrl = (url?: string) => {
  if (!url) return null

  try {
    const parsed = new URL(url)

    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

const search = ref('')

const filtered = computed(() =>
  blog.value.companies.filter(company =>
    company.name.toLowerCase().includes(search.value.toLowerCase())
  )
)
</script>

<template>
  <article class="blog-page">
    <div class="article-hero">
      <div class="container">
        <NuxtLink to="/" class="article-back">
          ← All data stories
        </NuxtLink>

        <div class="eyebrow">
          <span class="pulse" />
          INDUSTRY INTELLIGENCE
          <span class="eyebrow-line">/</span>
          {{ blog.industry.toUpperCase() }}
        </div>

        <h1>{{ blog.content.title }}</h1>

        <p class="article-lead">
          {{ blog.content.introduction }}
        </p>

        <div class="byline">
          <span class="byline-emblem">B</span>

          <div>
            <strong>Dataset analysis · AI-assisted editorial</strong>
            <span>
              {{
                new Date(blog.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })
              }}
              · Dataset analysis
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="container article-body">
      <div class="eyebrow dark">
        AT A GLANCE / THE NUMBERS
      </div>

      <h2>
        Behind the ranking<span class="accent">.</span>
      </h2>

      <div class="stat-grid">
        <div class="stat">
          <span>COMPANIES ANALYSED</span>
          <strong>
            {{ blog.stats.count.toLocaleString('en-GB') }}
          </strong>
          <small>In this dataset</small>
        </div>

        <div class="stat">
          <span>TOTAL FUNDRAISING</span>
          <strong>{{ format(blog.stats.total) }}</strong>
          <small>Combined amount</small>
        </div>

        <div class="stat">
          <span>AVERAGE RAISED</span>
          <strong>{{ format(blog.stats.average) }}</strong>
          <small>Per company</small>
        </div>

        <div class="stat">
          <span>MEDIAN FUNDRAISING</span>
          <strong>{{ format(blog.stats.median) }}</strong>
          <small>Middle of the distribution</small>
        </div>
      </div>

      <div class="article-columns">
        <div class="prose">
          <section
            v-for="(section, index) in blog.content.sections"
            :key="index"
          >
            <span class="section-no">
              0{{ index + 1 }} / INSIGHT
            </span>

            <h2>{{ section.heading }}</h2>

            <p
              v-for="(paragraph, index2) in section.paragraphs"
              :key="index2"
            >
              {{ paragraph }}
            </p>
          </section>
        </div>

        <aside class="aside-note">
          <span class="step-label">DATA NOTE</span>

          <h3>Clarity over conjecture.</h3>

          <p>
            All figures are calculated from the uploaded CSV.
            Rankings are ordered by fundraising value.
            These figures describe this dataset,
            not necessarily the entire industry.
          </p>

          <div class="aside-divider" />

          <span class="step-label">
            LARGEST FUNDRAISE
          </span>

          <strong>{{ blog.stats.topCompany }}</strong>

          <p>
            {{ format(blog.stats.highest) }}
            reported in the dataset.
          </p>
        </aside>
      </div>

      <section id="ranking" class="ranking">
        <div class="eyebrow dark">
          THE COMPLETE PICTURE / DATA TABLE
        </div>

        <div class="ranking-title">
          <div>
            <h2>
              Company rankings<span class="accent">.</span>
            </h2>

            <p>
              Every company included in this analysis,
              ordered by fundraising.
            </p>
          </div>

          <div class="search-wrap">
            <label class="sr-only" for="company-search">
              Search companies
            </label>

            <input
              id="company-search"
              v-model="search"
              type="search"
              placeholder="Search companies…"
            >
          </div>
        </div>

        <div class="table-scroll ranking-table">
          <table>
            <caption class="sr-only">
              {{ blog.industry }} companies ranked
              by total fundraising
            </caption>

            <thead>
              <tr>
                <th scope="col">RANK</th>
                <th scope="col">COMPANY</th>
                <th scope="col">LOCATION</th>
                <th scope="col">STAGE</th>
                <th scope="col">EMPLOYEES</th>

                <th scope="col" class="align-right">
                  TOTAL FUNDRAISING
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="company in filtered"
                :key="company.rank"
              >
                <td class="rank-num">
                  {{ String(company.rank).padStart(2, '0') }}
                </td>

                <td class="company-name">
                  <a
                    v-if="safeCompanyUrl(company.website)"
                    :href="safeCompanyUrl(company.website) || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    :aria-label="`Visit ${company.name} website (opens in a new tab)`"
                  >
                    {{ company.name }}
                    <span aria-hidden="true">↗</span>
                  </a>

                  <span v-else>
                    {{ company.name }}
                  </span>
                </td>

                <td>{{ company.location || '—' }}</td>
                <td>{{ company.stage || '—' }}</td>
                <td>{{ company.employees || '—' }}</td>

                <td class="amount">
                  {{ format(company.fundraising) }}
                </td>
              </tr>

              <tr v-if="!filtered.length">
                <td colspan="6">
                  No matching companies found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-foot">
          SHOWING {{ filtered.length }}
          OF {{ blog.companies.length }} COMPANIES

          <span>
            VALUES SHOWN IN {{ blog.currency }}
          </span>
        </div>
      </section>

      <div class="closing">
        <span class="section-no">
          FINAL THOUGHTS
        </span>

        <h2>
          The bigger picture<span class="accent">.</span>
        </h2>

        <p>{{ blog.content.conclusion }}</p>
      </div>

      <div class="end-cta">
        <div>
          <span class="eyebrow">
            HAVE YOUR OWN DATA?
          </span>

          <h2>Every dataset has a story.</h2>

          <p>
            Turn yours into a professionally presented
            industry report.
          </p>
        </div>

        <NuxtLink to="/upload" class="button light">
          Create an article ↗
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
