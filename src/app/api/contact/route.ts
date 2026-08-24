export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { resolveTenantFromRequest } from '@/lib/tenant';

const schema = z.object({
  name:    z.string().min(2),
  mobile:  z.string().min(10),
  email:   z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(5),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());

    // Save to audit log as a contact inquiry (reusing audit log table)
    await prisma.auditLog.create({
      data: {
        actorRole: 'VISITOR',
        action:    'CONTACT_INQUIRY',
        details: {
          name:    data.name,
          mobile:  data.mobile,
          email:   data.email,
          subject: data.subject,
          message: data.message,
        },
      },
    });

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const org = await resolveTenantFromRequest(req);
      const orgEmail = org.email || process.env.CONTACT_FALLBACK_EMAIL;

      if (orgEmail) {
        await resend.emails.send({
          from:    `${org.name} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
          to:      [orgEmail],
          replyTo: data.email,
          subject: `[${org.name} Inquiry] ${data.subject} — ${data.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
              <div style="background:#1a2e12;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center">
                <h2 style="margin:0;font-size:22px">New Contact Inquiry</h2>
                <p style="margin:8px 0 0;opacity:.7;font-size:13px">${org.name}</p>
              </div>
              <div style="background:white;border:1px solid #e0e8d8;border-top:none;padding:28px;border-radius:0 0 12px 12px">
                <table style="width:100%;border-collapse:collapse">
                  ${[
                    ['Name',    data.name],
                    ['Mobile',  data.mobile],
                    ['Email',   data.email],
                    ['Subject', data.subject],
                  ].map(([k,v])=>`
                    <tr>
                      <td style="padding:8px 0;color:#448039;font-weight:600;width:100px;font-size:13px">${k}</td>
                      <td style="padding:8px 0;color:#1a2e12;font-size:13px">${v}</td>
                    </tr>
                  `).join('')}
                </table>
                <div style="background:#f6f9f4;border-radius:8px;padding:16px;margin-top:16px">
                  <div style="color:#448039;font-weight:600;font-size:12px;margin-bottom:8px">MESSAGE</div>
                  <p style="color:#1a2e12;font-size:14px;line-height:1.6;margin:0">${data.message.replace(/\n/g,'<br>')}</p>
                </div>
                <p style="color:#888;font-size:11px;margin-top:16px;text-align:center">
                  Reply to this email to respond directly to ${data.name}.
                </p>
              </div>
            </div>
          `,
        }).catch(e => console.error('Contact email error:', e));
      } else {
        console.error(`Contact inquiry received for org "${org.name}" but it has no email configured — not sent.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Contact API error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  // Admin: list all contact inquiries
  const logs = await prisma.auditLog.findMany({
    where:   { action: 'CONTACT_INQUIRY' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ inquiries: logs });
}
