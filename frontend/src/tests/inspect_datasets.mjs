const API_BASE = 'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1';

async function main() {
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Inspector',
      email: `inspect_${Date.now()}@decidixapp.tech`,
      password: 'Password123!',
      role: 'analyst',
    }),
  }).then((r) => r.json());

  const token = regRes.data?.token || regRes.data?.access_token;
  console.log('Registered token:', token?.slice(0, 20));

  const listRes = await fetch(`${API_BASE}/datasets`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  console.log('Datasets list:', JSON.stringify(listRes, null, 2));
}

main().catch(console.error);
