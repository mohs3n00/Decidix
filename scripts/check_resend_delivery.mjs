// scripts/check_resend_delivery.mjs
// Sanitized Resend delivery inspector - Never prints secret keys

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('Error: RESEND_API_KEY environment variable is missing.');
  process.exit(1);
}

const command = process.argv[2];
const param = process.argv[3];

async function main() {
  if (command === 'domains') {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`Resend API returned ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    console.log(JSON.stringify(data.data ? data.data.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      created_at: d.created_at,
      region: d.region,
    })) : data, null, 2));
  } else if (command === 'email' && param) {
    const cleanId = param.replace(/[<>]/g, '').trim();
    const res = await fetch(`https://api.resend.com/emails/${cleanId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`Resend API returned ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    console.log(JSON.stringify({
      id: data.id,
      from: data.from,
      to: data.to,
      subject: data.subject,
      created_at: data.created_at,
      last_event: data.last_event,
    }, null, 2));
  } else {
    // List recent emails
    const res = await fetch('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`Resend API returned ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    const emails = (data.data || []).map(e => ({
      id: e.id,
      from: e.from,
      to: e.to,
      subject: e.subject,
      created_at: e.created_at,
      last_event: e.last_event,
    }));
    console.log(JSON.stringify(emails, null, 2));
  }
}

main().catch(err => {
  console.error('Fetch error:', err.message);
  process.exit(1);
});
