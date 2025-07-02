
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function BirthdayTemplates() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ subject: '', body: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    const { data, error } = await supabase.from('birthday_templates').select('*').order('created_at', { ascending: false });
    if (!error) setTemplates(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject || !form.body) return;

    if (editId) {
      await supabase.from('birthday_templates').update(form).eq('id', editId);
    } else {
      await supabase.from('birthday_templates').insert([{ ...form, active: false }]);
    }

    setForm({ subject: '', body: '' });
    setEditId(null);
    fetchTemplates();
  }

  function handleEdit(t) {
    setEditId(t.id);
    setForm({ subject: t.subject, body: t.body });
  }

  async function handleDelete(id) {
    if (confirm('Radera denna mall?')) {
      await supabase.from('birthday_templates').delete().eq('id', id);
      fetchTemplates();
    }
  }

  async function handleActivate(id) {
    await supabase.from('birthday_templates').update({ active: false }).neq('id', id);
    await supabase.from('birthday_templates').update({ active: true }).eq('id', id);
    fetchTemplates();
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">🎉 Födelsedagsmejl-mallar</h2>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded shadow space-y-4 mb-6">
        <h3 className="text-lg font-medium">{editId ? 'Redigera mall' : 'Ny mall'}</h3>
        <input
          type="text"
          placeholder="Ämne"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full border p-2 rounded bg-white dark:bg-gray-700"
          required
        />
        <textarea
          placeholder="Meddelande... använd {name} för att infoga kundens namn"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={6}
          className="w-full border p-2 rounded bg-white dark:bg-gray-700"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {editId ? 'Spara ändringar' : 'Skapa mall'}
        </button>
      </form>

      <div className="space-y-4">
        {loading && <p>Laddar mallar...</p>}
        {templates.map((t) => (
          <div key={t.id} className="border p-4 rounded bg-gray-50 dark:bg-gray-800">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">{t.subject}</h4>
              {t.active && <span className="text-green-600 font-medium">✅ Aktiv</span>}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t.body.slice(0, 100)}...</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleEdit(t)} className="text-blue-600 hover:underline">Redigera</button>
              <button onClick={() => handleActivate(t.id)} className="text-green-600 hover:underline">Aktivera</button>
              <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:underline">Ta bort</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
