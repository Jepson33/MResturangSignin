require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const cron = require('node-cron');
const { OpenAI } = require('openai');
const twilio = require('twilio');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ---- Hjälpfunktion: Gör om nummer till internationellt format ----
function formatPhoneNumber(num) {
  if (!num) return "";
  let n = String(num).replace(/\s+/g, '').replace(/-/g, '');
  if (n.startsWith("+")) return n;
  if (n.startsWith("00")) return "+" + n.slice(2);
  if (n.startsWith("07")) return "+46" + n.slice(1);
  return null; // Felaktigt format
}

// ----------- SMS: Skicka till FLERA mottagare! -----------
app.post('/api/send-sms', async (req, res) => {
  const { recipients, message } = req.body;
  if (!message || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "Mottagare och meddelande krävs." });
  }

  // Formatera och filtrera nummer
  const formattedRecipients = recipients
    .map(formatPhoneNumber)
    .filter(Boolean);

  if (formattedRecipients.length === 0) {
    return res.status(400).json({ error: "Inga giltiga mobilnummer i rätt format." });
  }

  try {
    const results = await Promise.all(
      formattedRecipients.map(to =>
        twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: to,
        })
      )
    );
    res.json({ success: true, results });
  } catch (err) {
    console.error("Twilio error:", err);
    res.status(500).json({ error: "Kunde inte skicka sms.", details: err.message });
  }
});
// ----------- SLUT SMS -----------

// ---- Nodemailer för E-post ----
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) console.error('❌ SMTP-fel:', error);
  else console.log('📧 SMTP ansluten.');
});

const isValidDate = (dateString) => /^\d{4}-\d{2}-\d{2}$/.test(dateString);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ----------- CHATBOT ENDPOINT -----------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message sent" });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // eller gpt-4o
      messages: [
        { role: "system", content: "Du är en trevlig svensk AI-assistent för restaurang/hotell-admin. Svara tydligt och kortfattat." },
        { role: "user", content: message }
      ],
      max_tokens: 300,
    });

    const reply = completion.choices?.[0]?.message?.content || "Inget svar.";
    res.json({ reply });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ reply: "Ett fel uppstod, försök igen senare!" });
  }
});
// ----------- SLUT CHATBOT ENDPOINT -----------

app.post('/api/signup', async (req, res) => {
  const { name, phone, birthday, email, receive_birthday_emails = false } = req.body;
  if (!name || !phone || !birthday || !email) {
    return res.status(400).json({ message: 'Alla fält krävs' });
  }
  if (!isValidDate(birthday)) {
    return res.status(400).json({ message: 'Ogiltigt datumformat (YYYY-MM-DD krävs)' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Ogiltig e-postadress' });
  }
  try {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ message: 'E-postadressen finns redan' });
    }
    const { error: insertError } = await supabase
      .from('customers')
      .insert([{ name, phone, birthday, email, receive_birthday_emails }]);
    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      throw insertError;
    }
    await transporter.sendMail({
      from: `"Din Restaurang" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Tack för din registrering!',
      html: `<h2>Tack ${name}!</h2><p>Vi hör av oss snart.</p>`,
    });
    res.status(201).json({ message: 'Registrering klar och mejl skickat' });
  } catch (err) {
    console.error('❌ Fel i /api/signup:', err);
    res.status(500).json({ message: 'Serverfel vid registrering', error: err.message });
  }
});

app.post('/send-campaign', async (req, res) => {
  const { subject, message, recipients } = req.body;
  if (!subject || !message || !Array.isArray(recipients)) {
    return res.status(400).json({ message: 'Fält saknas: subject, message eller recipients' });
  }
  try {
    await Promise.all(
      recipients.map(email =>
        transporter.sendMail({
          from: `"Din Restaurang" <${process.env.SMTP_USER}>`,
          to: email,
          subject,
          html: `<div style="font-family:sans-serif">${message}</div>`,
        })
      )
    );
    res.status(200).json({ message: 'Kampanjmail skickat!' });
  } catch (err) {
    console.error('❌ Fel vid e-postutskick:', err);
    res.status(500).json({ message: 'Misslyckades att skicka e-post', error: err.message });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Fel vid hämtning av kunder' });
  }
});

app.post('/api/google-login', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Saknar credential' });
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;
    const { data: user } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (!user) {
      await supabase.from('customers').insert([{ name, email }]);
      await transporter.sendMail({
        from: `"Din Restaurang" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Välkommen!',
        text: `Hej ${name}, tack för att du loggade in med Google.`,
      });
    }
    res.status(200).json({ message: 'Inloggning OK', user: { name, email } });
  } catch (err) {
    console.error('❌ Google-login error:', err);
    res.status(401).json({ message: 'Google-verifiering misslyckades', error: err.message });
  }
});

async function sendBirthdayEmails() {
  const today = new Date().toISOString().slice(5, 10); // MM-DD
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('receive_birthday_emails', true);
  if (customerError) {
    console.error('❌ Kunde inte hämta kunder:', customerError);
    return;
  }
  const { data: templates, error: templateError } = await supabase
    .from('birthday_templates')
    .select('*')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (templateError || !templates) {
    console.warn('⚠️ Ingen aktiv födelsedagsmall hittades.');
    return;
  }
  const { subject, body } = templates;
  const birthdaysToday = customers.filter(c =>
    c.birthday?.slice(5, 10) === today
  );
  for (const customer of birthdaysToday) {
    try {
      const personalizedBody = body.replace('{name}', customer.name);
      await transporter.sendMail({
        from: `"Din Restaurang" <${process.env.SMTP_USER}>`,
        to: customer.email,
        subject,
        html: personalizedBody,
      });
      console.log(`🎂 Födelsedagsmejl skickat till ${customer.email}`);
    } catch (err) {
      console.error(`❌ Fel till ${customer.email}:`, err.message);
    }
  }
}

// Kör varje dag 08:00
cron.schedule('0 8 * * *', sendBirthdayEmails);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Servern körs: http://localhost:${PORT}`));
