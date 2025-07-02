require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestMail() {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    let info = await transporter.sendMail({
      from: `"Test från localhost" <${process.env.SMTP_USER}>`,
      to: 'rizzlerothekingofrizz@gmail.com',  // skicka till dig själv som test
      subject: "Testmail från Node.js localhost",
      text: "Hej! Detta är ett testmail från min Node.js-app på localhost.",
    });

    console.log('✅ Mail skickat:', info.messageId);
  } catch (err) {
    console.error('❌ Misslyckades att skicka mail:', err.message);
  }
}

sendTestMail();
