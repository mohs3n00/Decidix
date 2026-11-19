async function test() {
  const res = await fetch('https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: 'invalid_dummy_token_for_verification' })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

test();
