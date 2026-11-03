import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Express } from 'express';

describe('Decidix Backend API Contract Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = createApp();
    // Register test user
    const res = await request(app)
      .post('/v1/auth/register')
      .send({
        name: 'Integration Tester',
        email: `tester_${Date.now()}@decidix.gov`,
        password: 'Password123!',
        role: 'analyst',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    authToken = res.body.data.token;
  });

  describe('Health check', () => {
    it('GET /health returns 200 ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('decidix-backend');
    });

    it('GET /v1/health returns 200 ok with subsystem status', async () => {
      const res = await request(app).get('/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('decidix-backend');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.database).toBe('fallback_memory');
      expect(res.body.ml_engine).toBe('ready');
      expect(res.body.status).toBe('degraded'); // in test/dev mode without live postgres
      expect(res.body.zero_cost_policy.enforced).toBe(true);
      expect(res.body.zero_cost_policy.compliant).toBe(true);
      expect(res.body.zero_cost_policy.model).toBeDefined();
    });
  });

  describe('Overview Module', () => {
    it('GET /v1/overview returns national development dashboard', async () => {
      const res = await request(app).get('/v1/overview?range=7Y');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.index.score).toBe(68.4);
      expect(res.body.data.kpis).toHaveLength(4);
      expect(res.body.data.trend.points).toHaveLength(7);
      expect(res.body.data.needs_attention).toHaveLength(3);
    });

    it('GET /v1/regions/map-points returns geographic points', async () => {
      const res = await request(app).get('/v1/regions/map-points?sector=overall');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(12);
      expect(res.body.data[0]).toHaveProperty('latitude');
      expect(res.body.data[0]).toHaveProperty('longitude');
      expect(res.body.data[0]).toHaveProperty('score');
    });

    it('GET /v1/regions supports pagination and search', async () => {
      const res = await request(app).get('/v1/regions?page=1&per_page=5');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBe(12);
      expect(res.body.meta.page).toBe(1);
    });

    it('GET /v1/regions/:id returns region profile', async () => {
      const res = await request(app).get('/v1/regions/delta');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('delta');
      expect(res.body.data.name).toBe('Delta');
      expect(res.body.data.domains).toHaveLength(4);
      expect(res.body.data.history.region.length).toBeGreaterThan(0);
      expect(res.body.data.history.national.length).toBeGreaterThan(0);
    });

    it('GET /v1/regions/:id returns 404 for unknown region', async () => {
      const res = await request(app).get('/v1/regions/non_existent_region');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Insights Module', () => {
    it('GET /v1/insights/education returns sector deep-dive', async () => {
      const res = await request(app).get('/v1/insights/education');
      expect(res.status).toBe(200);
      expect(res.body.data.sector).toBe('education');
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.breakdown.bars.length).toBeGreaterThan(0);
      expect(res.body.data.ranking.top).toHaveLength(5);
      expect(res.body.data.ranking.bottom).toHaveLength(5);
    });

    it('GET /v1/insights/comparison returns regional comparison', async () => {
      const res = await request(app).get('/v1/insights/comparison?a=central_capital&b=steppe');
      expect(res.status).toBe(200);
      expect(res.body.data.a.id).toBe('central_capital');
      expect(res.body.data.b.id).toBe('steppe');
      expect(res.body.data.metrics.length).toBe(5);
      expect(res.body.data.gap_analysis).toBeDefined();
    });

    it('GET /v1/insights/priority returns prioritized queue', async () => {
      const res = await request(app).get('/v1/insights/priority?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data.queue.length).toBeLessThanOrEqual(5);
      expect(res.body.data.summary).toBeDefined();
    });

    it('GET /v1/insights/data-quality returns provenance report', async () => {
      const res = await request(app).get('/v1/insights/data-quality');
      expect(res.status).toBe(200);
      expect(res.body.data.score).toBeGreaterThan(80);
      expect(res.body.data.sources.length).toBeGreaterThan(0);
    });
  });

  describe('Intelligence Module', () => {
    it('GET /v1/intelligence/predictions returns ML forecasts and metrics', async () => {
      const res = await request(app).get('/v1/intelligence/predictions?target_year=2028');
      expect(res.status).toBe(200);
      expect(res.body.data.target_year).toBe(2028);
      expect(res.body.data.models.length).toBe(3);
      expect(res.body.data.series.length).toBeGreaterThan(5);
    });

    it('POST /v1/intelligence/assistant/chat returns grounded reply with citations', async () => {
      const res = await request(app)
        .post('/v1/intelligence/assistant/chat')
        .send({
          message: 'Which region needs help most?',
          language: 'en',
          conversation_id: null,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.reply.text).toBeDefined();
      expect(res.body.data.reply.sources.length).toBeGreaterThan(0);
      expect(res.body.data.conversation_id).toBeDefined();
    });

    it('GET /v1/intelligence/recommendations and accept/dismiss flow', async () => {
      const listRes = await request(app).get('/v1/intelligence/recommendations');
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      if (listRes.body.data.length > 0) {
        const firstId = listRes.body.data[0].id;
        const acceptRes = await request(app).post(`/v1/intelligence/recommendations/${firstId}/accept`);
        expect(acceptRes.status).toBe(200);
        expect(acceptRes.body.data.status).toBe('in_plan');

        // Subsequent list should no longer include the accepted recommendation
        const afterRes = await request(app).get('/v1/intelligence/recommendations');
        const exists = afterRes.body.data.some((r: { id: string }) => r.id === firstId);
        expect(exists).toBe(false);
      }
    });
  });

  describe('Decisions Module', () => {
    it('POST /v1/decisions/simulate calculates budget yields and gains', async () => {
      const res = await request(app)
        .post('/v1/decisions/simulate')
        .send({
          region_id: 'frontier',
          allocations: {
            education: 30000000,
            healthcare: 45000000,
            infrastructure: 20000000,
            economy: 25000000,
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.data.region_id).toBe('frontier');
      expect(res.body.data.gain).toBeGreaterThan(0);
      expect(res.body.data.levers).toHaveLength(4);
      expect(res.body.data.best_lever.domain).toBe('healthcare');
    });

    it('GET /v1/decisions/projects returns project list with summary', async () => {
      const res = await request(app).get('/v1/decisions/projects');
      expect(res.status).toBe(200);
      expect(res.body.data.summary.projects_count).toBeGreaterThan(0);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    it('GET /v1/decisions/citizen-reports and like toggle', async () => {
      const listRes = await request(app).get('/v1/decisions/citizen-reports');
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items.length).toBeGreaterThan(0);

      const targetReport = listRes.body.data.items[0];
      const initialLikes = targetReport.likes;

      // Like
      const likeRes = await request(app)
        .post(`/v1/decisions/citizen-reports/${targetReport.id}/like`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(likeRes.status).toBe(200);
      expect(likeRes.body.data.liked_by_me).toBe(true);
      expect(likeRes.body.data.likes).toBe(initialLikes + 1);

      // Unlike
      const unlikeRes = await request(app)
        .post(`/v1/decisions/citizen-reports/${targetReport.id}/like`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(unlikeRes.status).toBe(200);
      expect(unlikeRes.body.data.liked_by_me).toBe(false);
      expect(unlikeRes.body.data.likes).toBe(initialLikes);
    });
  });
});

