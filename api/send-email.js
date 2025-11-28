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

  // CRITICAL: This email must be verified in SendGrid (Settings > Sender Authentication)
  // If SENDGRID_FROM_EMAIL is not set, it defaults to a placeholder which WILL FAIL if not verified.
  const from = process.env.SENDGRID_FROM_EMAIL || 'noreply@researchnexus.app';

  const msg = {
    to,
    from, 
    subject,
    html,
  };

  try {
    console.log(`Attempting to send email from: ${from} to: ${to}`);
    await sgMail.send(msg);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('SendGrid Error:', error);
    
    // Extract detailed error message from SendGrid response body if available
    let detailedError = error.message;
    if (error.response && error.response.body && error.response.body.errors && error.response.body.errors.length > 0) {
        detailedError = error.response.body.errors[0].message;
    }

    res.status(500).json({ 
        success: false, 
        error: detailedError,
        tip: "Check if 'SENDGRID_FROM_EMAIL' in Vercel matches a verified Single Sender in SendGrid." 
    });
  }
}