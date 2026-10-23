import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_SIDE = 1280;

/**
 * Shrinks a photo to at most 1280 px on the long side and re-encodes it as JPEG 0.8, so uploads stay
 * small on mandi mobile data (the models work at 224-512 px anyway).
 */
export async function compressPhoto({ uri, width, height }) {
  const context = ImageManipulator.manipulate(uri);
  if (width && height && Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: result.uri, width: result.width, height: result.height };
}
