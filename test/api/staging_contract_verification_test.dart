import 'package:flutter_test/flutter_test.dart';
import 'package:decidix_app/api/models/insights.dart';

void main() {
  group('Staging Response Parsing Verification', () {
    test('HistoricalData parses staging response shape', () {
      final stagingJson = {
        'range': '7Y',
        'points': [
          {'year': 2019, 'value': 58.2},
          {'year': 2020, 'value': 59.1},
          {'year': 2021, 'value': 60.4},
          {'year': 2022, 'value': 62.2},
          {'year': 2023, 'value': 64.5},
          {'year': 2024, 'value': 66.1},
          {'year': 2025, 'value': 68.4},
        ],
        'annual_change': 1.8,
        'milestones': [
          {
            'year': 2021,
            'text': 'National Healthcare Access Directive enacted',
            'arabic_text': 'إقرار التوجيه الوطني للوصول إلى الرعاية الصحية'
          },
          {
            'year': 2023,
            'text': 'Rural Broadband Infrastructure reached 70% coverage',
            'arabic_text': 'وصول تغطية النطاق العريض الريفي إلى 70%'
          },
          {
            'year': 2025,
            'text': 'Launch of Clean Water Sanitation Initiative across Delta',
            'arabic_text': 'إطلاق مبادرة مياه الشرب النظيفة والصرف في الدلتا'
          }
        ]
      };

      final parsed = HistoricalData.fromJson(stagingJson);
      expect(parsed.sector, 'overall');
      expect(parsed.current, 68.4);
      expect(parsed.startYear, 2019);
      expect(parsed.changeSinceStart, 10.2);
      expect(parsed.trend, hasLength(7));
      expect(parsed.milestones, hasLength(3));
      expect(parsed.milestones.first.title.en, 'National Healthcare Access Directive enacted');
      expect(parsed.milestones.first.title.ar, 'إقرار التوجيه الوطني للوصول إلى الرعاية الصحية');
    });

    test('DataQuality parses staging response shape', () {
      final stagingJson = {
        'score': 96,
        'completeness': 98,
        'timeliness': 94,
        'accuracy': 96,
        'coverage': '12 / 12 regions',
        'sources': [
          {
            'name': 'Ministry of Health Registry',
            'arabic_name': 'سجل وزارة الصحة',
            'frequency': 'Quarterly',
            'status': 'synced',
            'age_days': 12
          },
          {
            'name': 'Ministry of Education EMIS',
            'arabic_name': 'نظام معلومات إدارة التعليم',
            'frequency': 'Bi-annual',
            'status': 'synced',
            'age_days': 18
          }
        ]
      };

      final parsed = DataQuality.fromJson(stagingJson);
      expect(parsed.score, 96.0);
      expect(parsed.band, QualityBand.excellent);
      expect(parsed.completeness, 98.0);
      expect(parsed.timeliness, 94.0);
      expect(parsed.accuracy, 96.0);
      expect(parsed.sources, hasLength(2));
      expect(parsed.sources.first.name.en, 'Ministry of Health Registry');
      expect(parsed.sources.first.status, SourceStatus.synced);
      expect(parsed.sources.first.ageDays, 12);
    });
  });
}
