import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const { OAuth2 } = google.auth;

const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject('Failed to create access token :(');
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      accessToken,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  });

  return transporter;
};

export const sendVerificationEmail = async (to, token) => {
  try {
    const transporter = await createTransporter();
    const verificationUrl = `${process.env.VITE_APP_API_BASE_URL}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject: 'ยืนยันอีเมลของคุณ - FindFriend',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">ยินดีต้อนรับสู่ FindFriend!</h2>
          <p style="font-size: 16px; color: #555;">กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณและเริ่มใช้งานฟีเจอร์ทั้งหมด:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">ยืนยันอีเมล</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa; text-align: center;">นี่เป็นข้อความอัตโนมัติ กรุณาอย่าตอบกลับ</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.info('✅ Verification email sent successfully to:', to);
    return result;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error;
  }
};
