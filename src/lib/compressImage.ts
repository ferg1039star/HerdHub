export const MAX_PHOTO_BYTES = 400 * 1024;
export const MAX_LONG_EDGE = 1200;
export const JPEG_QUALITY = 0.7;

export class PhotoTooLargeError extends Error {
  constructor() {
    super("Photo is still too large after compression (max 400KB). Try a simpler image.");
    this.name = "PhotoTooLargeError";
  }
}

export function scaledDimensions(
  width: number,
  height: number,
  maxLongEdge: number = MAX_LONG_EDGE
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxLongEdge) return { width, height };
  const scale = maxLongEdge / long;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image. Try another photo."));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress photo."))),
      "image/jpeg",
      quality
    );
  });
}

/** Resize in-browser and encode as JPEG for Storage upload. */
export async function compressImageFile(file: File): Promise<File> {
  const img = await loadImageFromFile(file);
  const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not compress photo.");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToJpegBlob(canvas, JPEG_QUALITY);
  if (blob.size > MAX_PHOTO_BYTES) throw new PhotoTooLargeError();
  return new File([blob], "photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
}

/** Path segment after the bucket name in a Supabase public object URL. */
export function storagePathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/animal-photos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length).split("?")[0] ?? "");
}

export function animalPhotoStoragePath(ranchId: string, animalId: string): string {
  return `${ranchId}/${animalId}.jpg`;
}
