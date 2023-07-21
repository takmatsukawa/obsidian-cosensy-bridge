import { FileEntity } from "./model/FileEntity";
import { removeBlockReference } from "./utils";

export async function readPreview(fileEntity: FileEntity) {
    if (
        fileEntity.linkText.match(/\.[a-z0-9_-]+$/i) &&
        !fileEntity.linkText.match(/\.(?:md|markdown|txt|text)$/i)
    ) {
        console.debug(`${fileEntity.linkText} is not a plain text file`);
        return "";
    }

    const linkText = removeBlockReference(fileEntity.linkText);
    console.debug(
        `readPreview: getFirstLinkpathDest: ${linkText}, fileEntity.linkText=${fileEntity.linkText}
      sourcePath=${fileEntity.sourcePath}`
    );

    const file = this.app.metadataCache.getFirstLinkpathDest(
        linkText,
        fileEntity.sourcePath
    );
    if (file == null) {
        return "";
    }
    if (file.stat.size > 1000 * 1000) {
        // Ignore large file
        console.debug(
            `File too large(${fileEntity.linkText}): ${file.stat.size}`
        );
        return "";
    }
    const content = await this.app.vault.read(file);

    const iframeMatch = content.match(/<iframe[^>]*src="([^"]+)"[^>]*>/i);
    if (iframeMatch) {
        const iframeUrl = iframeMatch[1];
        const thumbnailUrl = getThumbnailUrlFromIframeUrl(iframeUrl);
        if (thumbnailUrl) {
            return thumbnailUrl;
        }
    }

    if (this.settings.showImage) {
        const youtubeEmbedMatch = content.match(/!\[[^\]]*\]\((https:\/\/www\.youtube\.com\/embed\/[^\)]+)\)/);
        if (youtubeEmbedMatch) {
            const youtubeEmbedUrl = youtubeEmbedMatch[1];
            const youtubeThumbnailUrl = getThumbnailUrlFromIframeUrl(youtubeEmbedUrl);
            if (youtubeThumbnailUrl) {
                return youtubeThumbnailUrl;
            }
        }

        const m =
            content.match(
                /!\[(?:[^\]]*?)\]\(((?!https?:\/\/twitter\.com\/)[^\)]+?(?:png|bmp|jpg))\)/
            ) || content.match(/!\[\[([^\]]+.(?:png|bmp|jpg))\]\]/);
        if (m) {
            const img = m[1];
            console.debug(`Found image: ${img}`);

            if (img.match(/^https?:\/\//)) {
                return img;
            } else {
                const file = this.app.metadataCache.getFirstLinkpathDest(
                    img,
                    fileEntity.sourcePath
                );
                console.debug(`Found image: ${img} = file=${file}`);
                if (file) {
                    const resourcePath = this.app.vault.getResourcePath(file);
                    console.debug(`Found image: ${img} resourcePath=${resourcePath}`);
                    return resourcePath;
                }
            }
        }
    }

    const updatedContent = content.replace(/^(.*\n)?---[\s\S]*?---\n?/m, "");
    const lines = updatedContent.split(/\n/);
    return lines
        .filter((it: string) => {
            return (
                it.match(/\S/) &&
                !it.match(/^#/) &&
                !it.match(/^https?:\/\//)
            );
        })
        .slice(0, 6)
        .join("\n");
}

export function getThumbnailUrlFromIframeUrl(iframeUrl: string): string | null {
    const youtubeIdMatch = iframeUrl.match(
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?&]+)(?:\?[^?]+)?$/
    );
    if (youtubeIdMatch) {
        const youtubeId = youtubeIdMatch[1];
        return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }

    return null;
}