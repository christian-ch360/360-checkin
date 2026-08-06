export type CropArea = { x: number; y: number; width: number; height: number };

const OUTPUT_SIZE = 512; // square, matches the circular avatar preview everywhere it's displayed

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Crops `imageSrc` to `cropArea` (pixel coordinates from react-easy-crop's
 * onCropComplete), resizes to a fixed square, and compresses to WebP. One
 * canvas pass satisfies both "crop to square" and "compress and optimize."
 */
export async function getCroppedImageBlob(imageSrc: string, cropArea: CropArea): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image."))),
      "image/webp",
      0.85
    );
  });
}
