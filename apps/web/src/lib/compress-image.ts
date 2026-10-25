/**
 * Shrink an image in the browser before uploading it (MOB-7's web counterpart).
 *
 * A caretaker photographs a cracked basin on a phone and the file is several
 * megabytes. Uploading it whole on a Nigerian mobile connection is slow enough
 * that the upload is abandoned, and an abandoned upload is a repair with no
 * evidence. The PRD asks for low-data operation and compression before upload
 * (MOB-7, §12).
 *
 * The decisions are separated from the canvas work so they can be tested
 * without a DOM: `compressionPlan` says what to do, `compressImage` does it.
 */

export interface CompressionPlan {
  /** Whether to re-encode at all. */
  readonly shouldCompress: boolean;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly quality: number;
  readonly reason: string;
}

/** Long edge, in pixels. Enough to read a meter or see a crack. */
export const MAX_EDGE = 2048;
/** Files below this are left alone: re-encoding would cost quality for nothing. */
export const MIN_BYTES_TO_COMPRESS = 300 * 1024;

export const compressionPlan = (
  width: number,
  height: number,
  bytes: number,
  mimeType: string,
): CompressionPlan => {
  const keep = (reason: string): CompressionPlan => ({
    shouldCompress: false,
    targetWidth: width,
    targetHeight: height,
    quality: 1,
    reason,
  });

  if (!mimeType.startsWith('image/')) return keep('not an image');
  // A PDF or a scanned document is not re-encodable without losing text, and
  // SVG has no raster size to reduce.
  if (mimeType === 'image/svg+xml') return keep('vector image');
  if (bytes < MIN_BYTES_TO_COMPRESS && width <= MAX_EDGE && height <= MAX_EDGE) {
    return keep('already small enough');
  }

  const longest = Math.max(width, height);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;

  return {
    shouldCompress: true,
    // Rounded down so a scaled dimension never exceeds the cap.
    targetWidth: Math.floor(width * scale),
    targetHeight: Math.floor(height * scale),
    // 0.82 keeps a crack or a meter reading legible while removing most of
    // the file. Higher gains little; lower starts to blur fine detail.
    quality: 0.82,
    reason: scale < 1 ? 'larger than the maximum edge' : 'above the size threshold',
  };
};

/**
 * Re-encode an image file according to its plan.
 *
 * Returns the original file when no compression is warranted, or when the
 * re-encoded result is not actually smaller — which happens with images that
 * are already well compressed, and re-encoding those would only lose quality.
 */
export const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap === null) return file;

  const plan = compressionPlan(bitmap.width, bitmap.height, file.size, file.type);
  if (!plan.shouldCompress) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = plan.targetWidth;
  canvas.height = plan.targetHeight;

  const context = canvas.getContext('2d');
  if (context === null) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, plan.targetWidth, plan.targetHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', plan.quality);
  });

  if (blob === null || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
};
