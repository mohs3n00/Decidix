async function testOverviewApi() {
  console.log('Querying Heroku staging /v1/overview API...');
  const res = await fetch('https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1/overview?range=7Y');
  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Response Keys:', Object.keys(data.data || {}));
  console.log('Overview Full Data:\n', JSON.stringify(data, null, 2));
}

testOverviewApi().catch(console.error);
