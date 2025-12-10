"use server";

import { supabaseServer } from "../lib/supabaseServer";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateFilename(original: string) {
  const ext = original.split(".").pop();
  const random = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${random}.${ext}`;
}

export async function uploadPost(formData: FormData) {
  const title = formData.get("title") as string;
  const caption = formData.get("caption") as string;
  const file = formData.get("file") as File;

  if (!file) return { error: "No file selected." };

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = generateFilename(file.name);

  // Upload to bucket
  const { error: uploadErr } = await supabaseServer.storage
    .from("post-media")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) return { error: uploadErr.message };

  // Get public URL
  const { data: urlData } = supabaseServer.storage
    .from("post-media")
    .getPublicUrl(fileName);

  const media_url = urlData.publicUrl;

  // Insert database row
  const { error: insertErr } = await supabaseServer.from("drafts").insert({
    title,
    caption,
    media_url,
  });

  if (insertErr) return { error: insertErr.message };

  revalidatePath("/");
  return { success: true };
}

export async function deletePost(id: number, media_url: string) {
  const fileName = media_url.split("/").pop()!.split("?")[0];

  await supabaseServer.storage.from("post-media").remove([fileName]);

  await supabaseServer.from("drafts").delete().eq("id", id);

  revalidatePath("/");
}
