import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../../lib/apiClient.js";

/**
 * A row of thumbnails plus an "Add image" button. Each selected file
 * uploads to Cloudinary through our own backend immediately, and the
 * returned URL is added to the `images` array the parent form holds.
 * This component never sees the form's other fields, it only manages
 * one array of URL strings, passed in and reported back out.
 */
export default function ImageUploader({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      // Not apiFetch here: that helper always sends JSON, but an image
      // upload needs multipart form data instead, so this one request
      // talks to fetch directly. The base URL comes from apiClient so a
      // deployed build does not keep pointing at localhost.
      const res = await fetch(`${API_BASE_URL}/products/upload-image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const body = await res.json();
      if (!body.success)
        throw new Error(body.error?.message || "Upload failed");

      onChange([...images, body.data.url]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = ""; // lets the same file be selected again if needed
    }
  }

  function removeImage(url) {
    onChange(images.filter((img) => img !== url));
  }

  return (
    <div>
      <div className='flex flex-wrap gap-3'>
        {images.map((url) => (
          <div key={url} className='relative w-20 h-20'>
            <img
              src={url}
              alt=''
              className='w-full h-full object-cover rounded-card'
            />
            <button
              type='button'
              onClick={() => removeImage(url)}
              aria-label='Remove image'
              className='absolute -top-2 -right-2 bg-white border border-neutral-300 rounded-full p-0.5 hover:bg-neutral-100'>
              <X className='w-3 h-3 text-brand-dark' />
            </button>
          </div>
        ))}

        <label className='w-20 h-20 flex items-center justify-center border-2 border-dashed border-neutral-300 rounded-card cursor-pointer hover:border-brand-dark'>
          {uploading ? (
            <Loader2 className='w-5 h-5 text-neutral-400 animate-spin' />
          ) : (
            <Upload className='w-5 h-5 text-neutral-400' />
          )}
          <input
            type='file'
            accept='image/*'
            onChange={handleFileSelect}
            className='hidden'
          />
        </label>
      </div>
      {error && <p className='text-sm text-danger mt-2'>{error}</p>}
    </div>
  );
}
