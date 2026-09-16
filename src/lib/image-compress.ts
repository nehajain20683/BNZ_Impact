// src/lib/image-compress.ts
// Compresses/resizes a photo in the browser before it's sent anywhere.
// Tree photos now upload to Supabase Storage (see supabase-storage.ts)
// rather than base64-in-column, but this still matters: a smaller upload
// is still a smaller Storage upload and a faster one on a field
// officer's mobile connection. Other models (farmer photos, land photos,
// campaign galleries) still use base64-in-column pending their own
// migration, where this compression remains the only defense against an
// uncompressed 3-8MB phone photo bloating the database directly.
// Targets roughly 1MB or less while keeping enough detail for verification.
export function compressImage(file: File, maxDimension = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the photo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not process the photo'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) { height = Math.round(height * (maxDimension / width)); width = maxDimension; }
          else { width = Math.round(width * (maxDimension / height)); height = maxDimension; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
