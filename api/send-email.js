import sgMail from '@sendgrid/mail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;

  if (!process.env.SENDGRID_API_KEY) {
    return res.status(500).json({ error: 'Missing SendGrid API Key in Environment Variables' });
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // Fallback sender if env var is missing
  const from = process.env.SENDGRID_FROM_EMAIL || 'noreply@researchnexus.app';

  const msg = {
    to,
    from, 
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('SendGrid Error:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    res.status(500).json({ success: false, error: error.message });
  }
}