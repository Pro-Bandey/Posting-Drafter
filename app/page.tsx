"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { supabase } from "../utils/supabase/client";
import clsx from "clsx";

type Draft = {
  id: number;
  title: string;
  caption: string;
  media_url: string;
};

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    const { data, error } = await supabase.from("drafts").select("*").order("id", { ascending: false });
    if (error) setError(error.message);
    else setDrafts(data as Draft[]);
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !caption || !file) {
      setError("All fields are required!");
      return;
    }

    const validTypes = ["image/", "video/"];
    if (!validTypes.some((type) => file.type.startsWith(type))) {
      setError("Only images or videos are allowed.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // Upload with progress simulation
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("post-media").getPublicUrl(fileName);
      const media_url = publicUrlData.publicUrl;

      const { error: insertError } = await supabase.from("drafts").insert({ title, caption, media_url });
      if (insertError) throw insertError;

      setTitle("");
      setCaption("");
      setFile(null);
      fetchDrafts();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (draft: Draft) => {
    const confirmDelete = confirm("Are you sure you want to delete this draft?");
    if (!confirmDelete) return;

    try {
      const fileName = draft.media_url.split("/").pop()!;
      const { error: storageError } = await supabase.storage.from("post-media").remove([fileName]);
      if (storageError) console.error(storageError);

      const { error: dbError } = await supabase.from("drafts").delete().eq("id", draft.id);
      if (dbError) console.error(dbError);
      else fetchDrafts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">Draft Manager</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="mb-8 p-4 border rounded shadow-sm bg-white dark:bg-gray-800 space-y-4"
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full"
        />
        {uploadProgress !== null && (
          <div className="w-full bg-gray-200 rounded h-2">
            <div className="bg-blue-600 h-2 rounded" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className={clsx(
            "w-full py-2 px-4 rounded text-white font-semibold",
            loading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {loading ? "Uploading..." : "Create Draft"}
        </button>
      </form>

      <h2 className="text-3xl font-bold mb-4">Drafts</h2>

      {drafts.length === 0 && <p>No drafts yet.</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="p-4 border rounded shadow-sm flex flex-col gap-2 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow"
          >
            <div className="h-48 w-full overflow-hidden rounded mb-2 flex items-center justify-center">
              {draft.media_url.endsWith(".mp4") ? (
                <video src={draft.media_url} className="h-full w-full object-cover" controls />
              ) : (
                <img src={draft.media_url} alt={draft.title} className="h-full w-full object-cover" />
              )}
            </div>
            <h3 className="font-semibold text-lg">{draft.title}</h3>
            <p className="text-gray-700 dark:text-gray-300">{draft.caption}</p>
            <button
              onClick={() => handleDelete(draft)}
              className="mt-auto bg-red-600 text-white py-1 rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
