async function testAllApis() {
  const endpoints = [
    '/regions/map-points?sector=overall',
    '/regions',
    '/regions/cairo',
    '/insights/sector-summary',
    '/insights/comparison?region_a=cairo&region_b=alexandria',
    '/insights/historical?region=cairo',
    '/insights/priority-queue',
    '/insights/data-quality',
    '/intelligence/predictions?target_year=2028&validation_status=experimental',
    '/intelligence/recommendations',
    '/decisions/simulator/scenarios',
    '/decisions/projects',
    '/decisions/citizen-reports',
    '/datasets',
    '/datasets/stats'
  ];

  console.log('--- AUDITING LIVE BACKEND API ENDPOINTS ---');
  for (const ep of endpoints) {
    try {
      const res = await fetch(`https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1${ep}`);
      const json = await res.json();
      console.log(`Endpoint: ${ep}`);
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        const payload = json.data || json;
        const keys = Array.isArray(payload) ? `Array[${payload.length}]` : Object.keys(payload);
        console.log('Shape:', keys);
      } else {
        console.log('Error:', json.error?.code || json.message);
      }
      console.log('---');
    } catch (e) {
      console.error(`Error on ${ep}:`, e.message);
    }
  }
}

testAllApis().catch(console.error);
