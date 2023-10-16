import { FileEntity } from "./model/FileEntity";
import { removeBlockReference } from "./utils";

export async function getTitle(fileEntity: FileEntity) {
  const linkText = removeBlockReference(fileEntity.linkText);

  if (!this.settings.frontmatterPropertyKeyAsTitle) return linkText;
  const file = this.app.metadataCache.getFirstLinkpathDest(
    linkText,
    fileEntity.sourcePath
  );

  if (file == null) return linkText;
  if (!file.extension?.match(/^(md|markdown)$/)) return linkText;

  const metadata = this.app.metadataCache.getFileCache(file);

  if (
    !metadata.frontmatter ||
    !metadata.frontmatter[this.settings.frontmatterPropertyKeyAsTitle]
  )
    return linkText;

  const title =
    metadata.frontmatter[this.settings.frontmatterPropertyKeyAsTitle];
  return title;
}
