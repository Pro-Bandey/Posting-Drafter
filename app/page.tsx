'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

type Draft = {
  id: number;
  title: string;
  caption: string;
  media_url: string;
};

export default function Page() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Fetch drafts
  const fetchDrafts = async () => {
    const { data } = await supabase.from('drafts').select('*').order('id', { ascending: false });
    setDrafts(data || []);
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  // Upload & save draft
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');

    // Upload file to storage
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(fileName, file);

    if (uploadError) return alert('Upload failed: ' + uploadError.message);

    // Get public URL
    const { publicUrl } = supabase.storage.from('post-media').getPublicUrl(fileName);

    // Save draft in table
    const { error: insertError } = await supabase.from('drafts').insert({
      title,
      caption,
      media_url: publicUrl,
    });

    if (insertError) return alert('Save failed: ' + insertError.message);

    setTitle('');
    setCaption('');
    setFile(null);
    fetchDrafts();
  };

  // Delete draft
  const handleDelete = async (id: number, media_url: string) => {
    // Remove from table
    await supabase.from('drafts').delete().eq('id', id);

    // Remove from storage
    const fileName = media_url.split('/').pop()!;
    await supabase.storage.from('post-media').remove([fileName]);

    fetchDrafts();
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Social Media Drafts</h1>

      <form onSubmit={handleSubmit} className="mb-6 space-y-2">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 w-full"
        />
        <textarea
          placeholder="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="border p-2 w-full"
        />
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 mt-2">
          Add Draft
        </button>
      </form>

      <div className="grid gap-4">
        {drafts.map((d) => (
          <div key={d.id} className="border p-2 rounded">
            <h2 className="font-bold">{d.title}</h2>
            <p>{d.caption}</p>
            {d.media_url.endsWith('.mp4') ? (
              <video src={d.media_url} controls className="max-w-xs" />
            ) : (
              <img src={d.media_url} className="max-w-xs" />
            )}
            <button
              onClick={() => handleDelete(d.id, d.media_url)}
              className="text-red-500 mt-2"
            >
              Delete Draft
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
