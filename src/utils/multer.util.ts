export function hasMulterFileContent(
  file?: Express.Multer.File | null,
): file is Express.Multer.File {
  if (!file) return false;
  if (typeof file.size === 'number') return file.size > 0;
  if (file.buffer?.length) return true;
  return Boolean(file.path);
}
