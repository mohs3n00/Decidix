async function testAssistantArabic() {
  console.log('Querying Heroku staging assistant API in Arabic...');
  const res = await fetch('https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1/intelligence/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'ما هي مؤشرات التنمية الوطنية لعام 2024 وما هي المناطق الأكثر احتياجاً؟',
      language: 'ar'
    })
  });

  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testAssistantArabic().catch(console.error);
