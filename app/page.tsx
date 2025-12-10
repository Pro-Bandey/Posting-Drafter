"use client";

import { useEffect, useState } from "react";
import { uploadPost, deletePost } from "./actions";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function loadDrafts() {
    const { data } = await supabase.from("drafts").select("*").order("id", { ascending: false });
    setDrafts(data || []);
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData(e.target);
    const res = await uploadPost(formData);

    setIsUploading(false);

    if (res?.error) alert(res.error);
    else {
      e.target.reset();
      loadDrafts();
    }
  }

  async function handleDelete(id: number, url: string) {
    await deletePost(id, url);
    loadDrafts();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      
      <h1 className="text-2xl font-bold mb-4">Create Post</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="title" className="border p-2 w-full" placeholder="Title" required />

        <textarea name="caption" className="border p-2 w-full" placeholder="Caption" required />

        <input name="file" type="file" className="border p-2 w-full" required />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Create Post"}
        </button>
      </form>

      <hr className="my-6" />

      <h2 className="text-xl font-semibold mb-4">Your Posts</h2>

      <div className="grid gap-4">
        {drafts.map((post) => (
          <div key={post.id} className="border rounded p-3">
            <h3 className="font-bold">{post.title}</h3>
            <p>{post.caption}</p>

            {/* Show image or video */}
            {post.media_url.match(/\.(mp4|mov|webm)$/i) ? (
              <video src={post.media_url} controls className="mt-2 w-full rounded" />
            ) : (
              <img src={post.media_url} className="mt-2 w-full rounded" />
            )}

            <button
              onClick={() => handleDelete(post.id, post.media_url)}
              className="text-red-600 mt-3"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
