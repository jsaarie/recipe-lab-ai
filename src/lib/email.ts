import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing environment variable: RESEND_API_KEY");
    _resend = new Resend(key);
  }
  return _resend;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const from = process.env.RESEND_FROM_EMAIL ?? "Recipe Lab AI <onboarding@resend.dev>";

  const { error } = await getResend().emails.send({
    from,
    to: email,
    subject: "Reset your password — Recipe Lab AI",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="color: #404040; font-size: 20px; margin-bottom: 16px;">Reset your password</h2>
        <p style="color: #525252; font-size: 14px; line-height: 1.6;">
          We received a request to reset the password for your Recipe Lab AI account.
          Click the button below to choose a new password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background-color: #7C9070; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
            Reset password
          </a>
        </div>
        <p style="color: #737373; font-size: 12px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #a3a3a3; font-size: 11px;">Recipe Lab AI</p>
      </div>
    `,
  });

  if (error) {
    console.error("[email] Failed to send password reset:", error);
    throw new Error("Failed to send email");
  }
}
