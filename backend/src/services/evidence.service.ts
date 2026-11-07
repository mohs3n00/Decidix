/**
 * Batch 4 (final integration) — structured, version-scoped evidence for the chatbot.
 *
 * The assistant must answer from Decidix data, not from model memory. This service
 * turns the active dataset's persisted rows into citable evidence documents using
 * deterministic keyword routing:
 *  - national index / history
 *  - regions (named region, or comparison)
 *  - sectors and indicators
 *  - experimental forecasts
 *  - dataset provenance (always useful when asked about sources/official status)
 *
 * If nothing matches, it returns [] and the assistant refuses (OpenRouter is not
 * called with empty evidence).
 */
import { prisma } from '../database/prisma.js';
import { DatasetService } from './dataset.service.js';
import { toNumber } from '../utils/decimal.js';
import { formatCitation, RetrievedDocument } from '../repositories/rag.repository.js';
import { env } from '../config/env.js';

type Row = Record<string, unknown>;

const SECTOR_KEYWORDS: Record<string, string[]> = {
  education: ['education', 'school', 'literacy', 'teacher', 'تعليم', 'مدارس'],
  healthcare: ['health', 'hospital', 'clinic', 'doctor', 'mortality', 'صحة', 'صحي'],
  economy: ['economy', 'economic', 'unemployment', 'gdp', 'labour', 'labor', 'اقتصاد', 'بطالة'],
  infrastructure: ['infrastructure', 'road', 'water', 'broadband', 'sanitation', 'بنية', 'طرق'],
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function doc(input: {
  id: string;
  title: string;
  arabicTitle: string;
  content: string;
  arabicContent: string;
  period: string;
  source: string;
  category?: string;
  regionId?: string | null;
}): RetrievedDocument {
  return {
    id: input.id,
    title: input.title,
    arabicTitle: input.arabicTitle,
    content: input.content,
    arabicContent: input.arabicContent,
    source: input.source,
    sourceUrl: null,
    period: input.period,
    category: input.category ?? 'dataset_evidence',
    regionId: input.regionId ?? null,
    accessScope: 'public',
    similarityScore: 1,
    citation: formatCitation(input.title, input.period),
  };
}

export class EvidenceService {
  static async buildEvidence(message: string): Promise<RetrievedDocument[]> {
    // Hermetic unit suites stub RagRepository and must not touch PostgreSQL.
    if (env.NODE_ENV === 'test') return [];
    const active = await DatasetService.active();
    if (!active) return [];

    const query = message.toLowerCase();
    const synthetic = /synthetic|demo|test|illustrative/i.test(
      `${active.source} ${active.license} ${active.coverage}`
    );
    const provenanceLabel = synthetic ? 'synthetic_demo' : 'official_source';

    const [latestHistory, history, regions, indicators, forecasts] = await Promise.all([
      prisma.nationalIndexHistory.findFirst({
        where: { datasetVersionId: active.id },
        orderBy: { year: 'desc' },
      }),
      prisma.nationalIndexHistory.findMany({
        where: { datasetVersionId: active.id },
        orderBy: { year: 'asc' },
      }),
      prisma.region.findMany({ where: { datasetVersionId: active.id }, orderBy: { rank: 'asc' } }),
      prisma.indicator.findMany({ where: { datasetVersionId: active.id } }),
      prisma.mlForecast.findMany({
        where: { datasetVersionId: active.id, regionId: null, indicatorId: 'development_index' },
        orderBy: { forecastYear: 'asc' },
      }),
    ]);

    if (!latestHistory) return [];

    const docs: RetrievedDocument[] = [];
    const latestYear = latestHistory.year;
    const asksProvenance = /source|official|synthetic|provenance|licen|مصدر|رسمي|بيانات/.test(query);
    const asksForecast = /forecast|predict|projection|future|توقع|تنبؤ|مستقبل/.test(query);
    const asksIndex = /index|national|overall|score|مؤشر|وطني|درجة/.test(query);
    const asksHistory = /history|historical|trend|over time|تاريخ|اتجاه|سنوات/.test(query);
    const yearMatch = query.match(/\b(19|20)\d{2}\b/);
    const matchedSectors = Object.entries(SECTOR_KEYWORDS)
      .filter(([, words]) => words.some((word) => query.includes(word)))
      .map(([sector]) => sector);
    const matchedRegions = regions.filter(
      (region) =>
        query.includes(region.name.toLowerCase()) || query.includes(region.id.replace(/_/g, ' '))
    );
    const matchedIndicators = indicators.filter(
      (indicator) =>
        query.includes(indicator.key.toLowerCase()) ||
        query.includes(indicator.label.toLowerCase())
    );

    // Unsupported geography must refuse rather than answer with national data.
    const FOREIGN_PLACES =
      /\b(germany|france|spain|italy|united states|usa|uk|britain|china|india|japan|egypt|saudi|uae|qatar|kuwait|jordan|turkey|brazil|canada|australia)\b/i;
    if (FOREIGN_PLACES.test(query) && matchedRegions.length === 0) return [];

    // National index (latest observation) only for index/history/year questions.
    if (asksIndex || asksHistory || yearMatch) {
      docs.push(
        doc({
          id: `evidence:national:${active.id}:${latestHistory.period}`,
          title: `National development index ${latestHistory.period}`,
          arabicTitle: `مؤشر التنمية الوطني ${latestHistory.period}`,
          content:
            `Dataset ${active.version}. National development index for ${latestHistory.period}: ` +
            `${round(toNumber(latestHistory.score))}/100, change ${round(toNumber(latestHistory.change))} vs ${latestHistory.comparedWith}, ` +
            `band ${latestHistory.band}, ${latestHistory.regionsCount} regions, population ${latestHistory.population}, ` +
            `${latestHistory.atRiskCount} regions at risk.`,
          arabicContent:
            `مجموعة البيانات ${active.version}. مؤشر التنمية الوطني لعام ${latestHistory.period}: ${round(toNumber(latestHistory.score))}/100.`,
          period: latestHistory.period,
          source: active.source,
        })
      );
    }

    // Historical series (optionally for a mentioned year).
    if (asksHistory || yearMatch) {
      const seriesYears = yearMatch
        ? history.filter((row) => String(row.year) === yearMatch[0])
        : history;
      if (seriesYears.length > 0) {
        docs.push(
          doc({
            id: `evidence:history:${active.id}`,
            title: `National index history ${history[0]?.year}-${latestHistory.year}`,
            arabicTitle: `السلسلة التاريخية للمؤشر الوطني`,
            content: seriesYears
              .map((row) => `${row.year}: ${round(toNumber(row.score))}`)
              .join('; '),
            arabicContent: seriesYears.map((row) => `${row.year}: ${round(toNumber(row.score))}`).join('؛ '),
            period: yearMatch ? yearMatch[0] : `${history[0]?.year}-${latestHistory.year}`,
            source: active.source,
          })
        );
      }
    }

    // Named region(s) and their latest indicator values.
    for (const region of matchedRegions.slice(0, 3)) {
      const metrics = await prisma.regionalMetric.findMany({
        where: { datasetVersionId: active.id, regionId: region.id, year: latestYear },
        include: { indicator: true },
        orderBy: { indicatorKey: 'asc' },
        take: 10,
      });
      docs.push(
        doc({
          id: `evidence:region:${active.id}:${region.id}`,
          title: `Region ${region.name} ${latestYear}`,
          arabicTitle: `منطقة ${region.arabicName}`,
          content:
            `${region.name} (${region.id}): development index ${round(toNumber(region.score))}/100, ` +
            `rank ${region.rank}, priority ${region.priority}, change ${round(toNumber(region.change))}, population ${region.population}. ` +
            (metrics.length
              ? `Latest indicators: ${metrics
                  .map((metric) => `${metric.indicator.label} ${round(toNumber(metric.value))} ${metric.indicator.unit}`)
                  .join('; ')}.`
              : 'No indicator observations are stored for this region.'),
          arabicContent: `منطقة ${region.arabicName}: مؤشر التنمية ${round(toNumber(region.score))}/100.`,
          period: String(latestYear),
          source: active.source,
          regionId: region.id,
        })
      );
    }

    // Sector evidence (national means in source units, with units preserved).
    for (const sector of matchedSectors.slice(0, 2)) {
      const sectorIndicators = indicators.filter((indicator) => indicator.domain === sector);
      if (sectorIndicators.length === 0) continue;
      const metrics = await prisma.regionalMetric.findMany({
        where: {
          datasetVersionId: active.id,
          indicatorKey: { in: sectorIndicators.map((indicator) => indicator.key) },
          year: latestYear,
        },
      });
      const lines = sectorIndicators.map((indicator) => {
        const values = metrics
          .filter((metric) => metric.indicatorKey === indicator.key)
          .map((metric) => toNumber(metric.value));
        if (values.length === 0) return `${indicator.label}: unavailable`;
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        return `${indicator.label}: ${round(mean, 2)} ${indicator.unit}`;
      });
      docs.push(
        doc({
          id: `evidence:sector:${active.id}:${sector}:${latestYear}`,
          title: `${sector} indicators ${latestYear}`,
          arabicTitle: `مؤشرات قطاع ${sector} ${latestYear}`,
          content: `National means for ${sector} (${latestYear}): ${lines.join('; ')}. Units are preserved; these are not a composite score.`,
          arabicContent: `المتوسطات الوطنية لقطاع ${sector} لعام ${latestYear}: ${lines.join('؛ ')}.`,
          period: String(latestYear),
          source: active.source,
        })
      );
    }

    // Specific indicator evidence.
    for (const indicator of matchedIndicators.slice(0, 3)) {
      const metrics = await prisma.regionalMetric.findMany({
        where: { datasetVersionId: active.id, indicatorKey: indicator.key, year: latestYear },
        include: { region: true },
      });
      if (metrics.length === 0) continue;
      docs.push(
        doc({
          id: `evidence:indicator:${active.id}:${indicator.key}:${latestYear}`,
          title: `Indicator ${indicator.label} ${latestYear}`,
          arabicTitle: `مؤشر ${indicator.arabicLabel}`,
          content:
            `${indicator.label} (${indicator.key}, ${indicator.unit}) by region in ${latestYear}: ` +
            metrics
              .map((metric) => `${metric.region.name} ${round(toNumber(metric.value))}`)
              .join('; ') +
            '.',
          arabicContent: `قيم مؤشر ${indicator.arabicLabel} حسب المنطقة لعام ${latestYear}.`,
          period: String(latestYear),
          source: active.source,
        })
      );
    }

    // Experimental forecasts.
    if (asksForecast && forecasts.length > 0) {
      docs.push(
        doc({
          id: `evidence:forecast:${active.id}`,
          title: `Experimental forecast ${forecasts[0].forecastYear}-${forecasts[forecasts.length - 1].forecastYear}`,
          arabicTitle: `توقع تجريبي ${forecasts[0].forecastYear}-${forecasts[forecasts.length - 1].forecastYear}`,
          content:
            `Experimental ML forecast from dataset ${active.version} ` +
            `(model ${forecasts[0].modelName} ${forecasts[0].modelVersion}, status ${forecasts[0].validationStatus}, not calibrated): ` +
            forecasts
              .map(
                (forecast) =>
                  `${forecast.forecastYear}: ${round(toNumber(forecast.predictedValue))} (${round(
                    toNumber(forecast.lowerBound ?? forecast.predictedValue)
                  )}-${round(toNumber(forecast.upperBound ?? forecast.predictedValue))})`
              )
              .join('; ') +
            '. This is not an official projection and has no validated real-world accuracy.',
          arabicContent: `توقع تجريبي غير معاير من مجموعة البيانات ${active.version}؛ وليس توقعاً رسمياً.`,
          period: `${forecasts[0].forecastYear}-${forecasts[forecasts.length - 1].forecastYear}`,
          source: active.source,
        })
      );
    }

    // Provenance only when explicitly asked; otherwise unmatched questions refuse.
    if (asksProvenance) {
      docs.push(
        doc({
          id: `evidence:provenance:${active.id}`,
          title: `Dataset provenance ${active.version}`,
          arabicTitle: `مصدر مجموعة البيانات ${active.version}`,
          content:
            `Source classification: ${provenanceLabel}. Version ${active.id} (${active.version}). ` +
            `Source: ${active.source}. Licence: ${active.license}. Coverage: ${active.coverage}. ` +
            `Observations cover the persisted national and regional tables only.`,
          arabicContent: `تصنيف المصدر: ${provenanceLabel}. النسخة ${active.id}.`,
          period: `${history[0]?.year ?? latestYear}-${latestYear}`,
          source: active.source,
        })
      );
    }

    return docs;
  }
}
