/**
 * Client-side service to trigger email notifications via Vercel Serverless Function.
 */

export interface EmailResult {
    success: boolean;
    message?: string;
}

export const sendEmailNotification = async (
    toEmail: string,
    toName: string,
    subject: string,
    content: string,
    link?: string
): Promise<EmailResult> => {
    // Prevent sending emails to dummy mock data if needed, or validate email format
    if (!toEmail || !toEmail.includes('@')) {
        console.warn("Invalid email address, skipping notification:", toEmail);
        return { success: false, message: "Invalid email format" };
    }
    
    // Log the attempt
    console.log(`[Email Service] Attempting to send email to ${toEmail}...`);

    try {
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #4F46E5; padding: 20px; color: white;">
                    <h2 style="margin: 0; font-size: 20px;">ResearchNexus Notification</h2>
                </div>
                <div style="padding: 24px;">
                    <p style="margin-top: 0; font-size: 16px;">Hi <strong>${toName}</strong>,</p>
                    <p style="font-size: 15px; line-height: 1.5; color: #4b5563;">${content}</p>
                    
                    ${link ? `
                    <div style="margin-top: 24px; text-align: center;">
                        <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Task in Workspace</a>
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
                        Or copy this link: <a href="${link}" style="color: #4F46E5;">${link}</a>
                    </p>
                    ` : ''}
                </div>
                <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">Sent via ResearchNexus Collaboration Platform</p>
                </div>
            </div>
        `;

        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: toEmail,
                subject: subject,
                html: html
            })
        });
        
        // Check if response is JSON (API) or HTML (404 Page)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
             const errorMsg = "API Route Missing. If running locally, use 'vercel dev' instead of 'npm run dev'.";
             console.error(`[Email Service] ${errorMsg}`);
             return { success: false, message: errorMsg };
        }

        if (!response.ok) {
            const errData = await response.json();
            const detailedError = errData.error || 'Unknown Server Error';
            console.error(`[Email Service] Server Error: ${detailedError}`);
            return { success: false, message: `SendGrid Error: ${detailedError}` };
        }

        console.log(`[Email Service] Email sent successfully to ${toEmail}`);
        return { success: true };
    } catch (error: any) {
        console.error("[Email Service] Failed to trigger email notification:", error);
        return { success: false, message: error.message || "Network/Fetch Error" };
    }
};