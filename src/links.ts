import { CachedMetadata, TFile } from "obsidian";
import { FileEntity } from "./model/FileEntity";
import {
  filePathToLinkText,
  removeBlockReference,
  shouldExcludePath,
} from "./utils";
import { TwohopLink } from "./model/TwohopLink";
import {
  getSortFunction,
  getTagHierarchySortFunction,
  getTwoHopSortFunction,
} from "./sort";
import { TagLinks } from "./model/TagLinks";

export async function getForwardLinks(
  settings: any,
  activeFile: TFile,
  activeFileCache: CachedMetadata
): Promise<{ resolved: FileEntity[]; new: FileEntity[] }> {
  const resolvedLinks: FileEntity[] = [];
  const newLinks: FileEntity[] = [];

  if (
    activeFileCache != null &&
    (activeFileCache.links != null || activeFileCache.embeds != null)
  ) {
    const seen = new Set<string>();
    const linkEntities = [
      ...(activeFileCache.links || []),
      ...(activeFileCache.embeds || []),
    ];

    for (const it of linkEntities) {
      const key = removeBlockReference(it.link);
      if (!seen.has(key)) {
        seen.add(key);
        const targetFile = app.metadataCache.getFirstLinkpathDest(
          key,
          activeFile.path
        );

        if (
          targetFile &&
          shouldExcludePath(targetFile.path, settings.excludePaths)
        ) {
          continue;
        }

        if (targetFile) {
          resolvedLinks.push(new FileEntity(targetFile.path, key));
        } else {
          const backlinksCount = await getBacklinksCount(
            key,
            activeFile.path
          );
          if (1 <= backlinksCount && settings.createFilesForMultiLinked) {
            await app.vault.create(
              `${app.workspace.getActiveFile().parent.path}/${key}.md`,
              ""
            );
            resolvedLinks.push(new FileEntity(activeFile.path, key));
          } else {
            newLinks.push(new FileEntity(activeFile.path, key));
          }
        }
      }
    }
  } else if (activeFile.extension === "canvas") {
    const canvasContent = await app.vault.read(activeFile);
    let canvasData;
    try {
      canvasData = JSON.parse(canvasContent);
      if (!Array.isArray(canvasData.nodes)) {
        console.error("Invalid structure in canvas: nodes is not an array");
        canvasData = { nodes: [] };
      }
    } catch (error) {
      console.error("Invalid JSON in canvas:", error);
      canvasData = { nodes: [] };
    }

    const seen = new Set<string>();
    for (const node of canvasData.nodes) {
      if (node.type === "file") {
        const key = node.file;
        if (!seen.has(key)) {
          seen.add(key);
          const targetFile = app.vault.getAbstractFileByPath(key);
          if (
            targetFile &&
            !shouldExcludePath(targetFile.path, settings.excludePaths)
          ) {
            resolvedLinks.push(new FileEntity(targetFile.path, key));
          } else {
            newLinks.push(new FileEntity(activeFile.path, key));
          }
        }
      }
    }
  }

  const sortedResolvedLinks = await getSortedFileEntities(
    resolvedLinks,
    (entity) => entity.sourcePath,
    settings.sortOrder
  );
  return {
    resolved: sortedResolvedLinks,
    new: newLinks,
  };
}

export async function getBacklinksCount(
  file: string,
  excludeFile?: string
): Promise<number> {
  const unresolvedLinks: Record<string, Record<string, number>> = app
    .metadataCache.unresolvedLinks;
  let backlinkCount = 0;

  for (const src of Object.keys(unresolvedLinks)) {
    if (excludeFile && src === excludeFile) {
      continue;
    }
    for (let dest of Object.keys(unresolvedLinks[src])) {
      dest = removeBlockReference(dest);
      if (dest === file) {
        backlinkCount++;
      }
    }
  }
  return backlinkCount;
}

export async function getBackLinks(
  settings: any,
  activeFile: TFile,
  forwardLinkSet: Set<string>
): Promise<FileEntity[]> {
  const name = activeFile.path;
  const resolvedLinks: Record<string, Record<string, number>> = app
    .metadataCache.resolvedLinks;
  const backLinkEntities: FileEntity[] = [];
  for (const src of Object.keys(resolvedLinks)) {
    if (shouldExcludePath(src, settings.excludePaths)) {
      continue;
    }
    for (const dest of Object.keys(resolvedLinks[src])) {
      if (dest == name) {
        const linkText = filePathToLinkText(src);
        if (settings.enableDuplicateRemoval && forwardLinkSet.has(linkText)) {
          continue;
        }
        backLinkEntities.push(new FileEntity(src, linkText));
      }
    }
  }

  const allFiles: TFile[] = app.vault.getFiles();
  const canvasFiles: TFile[] = allFiles.filter(
    (file) => file.extension === "canvas"
  );

  for (const canvasFile of canvasFiles) {
    const canvasContent = await app.vault.read(canvasFile);
    let canvasData;
    try {
      canvasData = JSON.parse(canvasContent);
      if (!Array.isArray(canvasData.nodes)) {
        console.error("Invalid structure in canvas: nodes is not an array");
        canvasData = { nodes: [] };
      }
    } catch (error) {
      console.error("Invalid JSON in canvas:", error);
      canvasData = { nodes: [] };
    }

    for (const node of canvasData.nodes) {
      if (node.type === "file" && node.file === activeFile.path) {
        const linkText = filePathToLinkText(canvasFile.path);
        if (!forwardLinkSet.has(linkText)) {
          backLinkEntities.push(new FileEntity(canvasFile.path, linkText));
        }
      }
    }
  }

  return await getSortedFileEntities(
    backLinkEntities,
    (entity) => entity.sourcePath,
    settings.sortOrder
  );
}

export async function getTwohopLinks(
  settings: any,
  activeFile: TFile,
  links: Record<string, Record<string, number>>,
  forwardLinkSet: Set<string>,
  twoHopLinkSet: Set<string>
): Promise<TwohopLink[]> {
  const twoHopLinks: Record<string, FileEntity[]> = {};
  const twohopLinkList = await aggregate2hopLinks(activeFile, links);

  if (twohopLinkList == null) {
    return [];
  }

  let seenLinks = new Set<string>();

  if (twohopLinkList) {
    for (const k of Object.keys(twohopLinkList)) {
      if (twohopLinkList[k].length > 0) {
        twoHopLinks[k] = twohopLinkList[k]
          .filter((it) => !shouldExcludePath(it, settings.excludePaths))
          .map((it) => {
            const linkText = filePathToLinkText(it);
            if (
              settings.enableDuplicateRemoval &&
              (forwardLinkSet.has(removeBlockReference(linkText)) ||
                seenLinks.has(linkText))
            ) {
              return null;
            }
            seenLinks.add(linkText);
            twoHopLinkSet.add(linkText);
            return new FileEntity(activeFile.path, linkText);
          })
          .filter((it) => it);
      }
    }
  }

  let linkKeys: string[] = [];
  if (activeFile.extension === "canvas") {
    const canvasContent = await app.vault.read(activeFile);
    let canvasData;
    try {
      canvasData = JSON.parse(canvasContent);
    } catch (error) {
      console.error("Invalid JSON in canvas:", error);
      canvasData = { nodes: [] };
    }

    if (Array.isArray(canvasData.nodes)) {
      linkKeys = canvasData.nodes
        .filter((node: any) => node.type === "file")
        .map((node: any) => node.file);
    } else {
      linkKeys = [];
    }
  } else if (links[activeFile.path]) {
    linkKeys = Object.keys(links[activeFile.path]);
  }

  const twoHopLinkEntities = (
    await Promise.all(
      linkKeys
        .filter((path) => !shouldExcludePath(path, settings.excludePaths))
        .map(async (path) => {
          if (twoHopLinks[path]) {
            const sortedFileEntities = await getSortedFileEntities(
              twoHopLinks[path],
              (entity) => {
                const file = app.metadataCache.getFirstLinkpathDest(
                  entity.linkText,
                  entity.sourcePath
                );
                return file ? file.path : null;
              },
              settings.sortOrder
            );

            return {
              link: new FileEntity(activeFile.path, path),
              fileEntities: sortedFileEntities,
            };
          }
          return null;
        })
    )
  ).filter((it) => it);

  const twoHopLinkStatsPromises = twoHopLinkEntities.map(
    async (twoHopLinkEntity) => {
      const stat = await app.vault.adapter.stat(twoHopLinkEntity.link.linkText);
      return { twoHopLinkEntity, stat };
    }
  );

  const twoHopLinkStats = (await Promise.all(twoHopLinkStatsPromises)).filter(
    (it) => it && it.twoHopLinkEntity && it.stat
  );

  const twoHopSortFunction = getTwoHopSortFunction(settings.sortOrder);
  twoHopLinkStats.sort(twoHopSortFunction);

  return twoHopLinkStats
    .map(
      (it) =>
        new TwohopLink(
          it!.twoHopLinkEntity.link,
          it!.twoHopLinkEntity.fileEntities
        )
    )
    .filter((it) => it.fileEntities.length > 0);
}

export async function getLinksListOfFilesWithTag(
  app: any,
  settings: any,
  activeFile: TFile,
  activeFileCache: CachedMetadata,
  forwardLinkSet: Set<string>,
  twoHopLinkSet: Set<string>
): Promise<TagLinks[]> {
  const activeFileTags = getTagsFromCache(
    activeFileCache,
    settings.excludeTags
  );
  if (activeFileTags.length === 0) return [];

  const activeFileTagSet = new Set(activeFileTags);
  const tagMap: Record<string, FileEntity[]> = {};
  const seen: Record<string, boolean> = {};

  const markdownFiles = app.vault
    .getMarkdownFiles()
    .filter(
      (markdownFile: TFile) =>
        markdownFile !== activeFile &&
        !shouldExcludePath(markdownFile.path, settings.excludePaths)
    );

  for (const markdownFile of markdownFiles) {
    const cachedMetadata = app.metadataCache.getFileCache(markdownFile);
    if (!cachedMetadata) continue;
    const fileTags = getTagsFromCache(
      cachedMetadata,
      settings.excludePaths
    ).sort((a: string | any[], b: string | any[]) => b.length - a.length);

    for (const tag of fileTags) {
      if (!activeFileTagSet.has(tag)) continue;

      tagMap[tag] = tagMap[tag] ?? [];
      if (
        settings.enableDuplicateRemoval &&
        (seen[markdownFile.path] ||
          forwardLinkSet.has(filePathToLinkText(markdownFile.path)) ||
          twoHopLinkSet.has(filePathToLinkText(markdownFile.path)))
      )
        continue;

      const linkText = filePathToLinkText(markdownFile.path);
      tagMap[tag].push(new FileEntity(activeFile.path, linkText));
      seen[markdownFile.path] = true;
    }
  }

  const tagLinksEntities = await createTagLinkEntities(app, settings, tagMap);

  const sortFunction = getTagHierarchySortFunction(settings.sortOrder);
  return tagLinksEntities.sort(sortFunction);
}

export async function createTagLinkEntities(
  app: any,
  settings: any,
  tagMap: Record<string, FileEntity[]>
): Promise<TagLinks[]> {
  const tagLinksEntitiesPromises = Object.entries(tagMap).map(
    async ([tag, entities]) => {
      const sortedEntities = await getSortedFileEntities(
        entities,
        (entity) => entity.sourcePath,
        settings.sortOrder
      );
      if (sortedEntities.length === 0) {
        return null;
      }
      return new TagLinks(tag, sortedEntities);
    }
  );

  const tagLinksEntities = await Promise.all(tagLinksEntitiesPromises);

  return tagLinksEntities.filter((it) => it != null);
}

export function getTagsFromCache(
  cache: CachedMetadata | null | undefined,
  excludeTags: string[]
): string[] {
  let tags: string[] = [];
  if (cache) {
    if (cache.tags) {
      cache.tags.forEach((it) => {
        const tagHierarchy = it.tag.replace("#", "").split("/");
        for (let i = 0; i < tagHierarchy.length; i++) {
          tags.push(tagHierarchy.slice(0, i + 1).join("/"));
        }
      });
    }

    if (cache.frontmatter?.tags) {
      if (Array.isArray(cache.frontmatter.tags)) {
        cache.frontmatter.tags.forEach((tag) => {
          if (typeof tag === "string") {
            const tagHierarchy = tag.split("/");
            for (let i = 0; i < tagHierarchy.length; i++) {
              tags.push(tagHierarchy.slice(0, i + 1).join("/"));
            }
          }
        });
      } else if (typeof cache.frontmatter.tags === "string") {
        cache.frontmatter.tags
          .split(",")
          .map((tag) => tag.trim())
          .forEach((tag) => {
            const tagHierarchy = tag.split("/");
            for (let i = 0; i < tagHierarchy.length; i++) {
              tags.push(tagHierarchy.slice(0, i + 1).join("/"));
            }
          });
      }
    }
  }

  return tags.filter((tag) => {
    for (const excludeTag of excludeTags) {
      if (
        excludeTag.endsWith("/") &&
        (tag === excludeTag.slice(0, -1) || tag.startsWith(excludeTag))
      ) {
        return false;
      }
      if (!excludeTag.endsWith("/") && tag === excludeTag) {
        return false;
      }
    }
    return true;
  });
}

export async function aggregate2hopLinks(
  activeFile: TFile,
  links: Record<string, Record<string, number>>
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};

  let activeFileLinks = new Set<string>();

  if (links && activeFile && activeFile.path && links[activeFile.path]) {
    activeFileLinks = new Set(Object.keys(links[activeFile.path]));
  }

  if (activeFile.extension === "canvas") {
    const canvasContent = await app.vault.read(activeFile);
    let canvasData;
    try {
      canvasData = JSON.parse(canvasContent);
      if (!Array.isArray(canvasData.nodes)) {
        console.error("Invalid structure in canvas: nodes is not an array");
        canvasData = { nodes: [] };
      }
    } catch (error) {
      console.error("Invalid JSON in canvas:", error);
      canvasData = { nodes: [] };
    }

    for (const node of canvasData.nodes) {
      if (node.type === "file") {
        activeFileLinks.add(node.file);
      }
    }
  }

  if (links) {
    for (const src of Object.keys(links)) {
      if (src == activeFile.path) {
        continue;
      }
      const link = links[src];
      if (link) {
        for (const dest of Object.keys(link)) {
          if (activeFileLinks.has(dest)) {
            if (!result[dest]) {
              result[dest] = [];
            }
            result[dest].push(src);
          }
        }
      }
    }
  }
  return result;
}

export async function getSortedFileEntities(
  entities: FileEntity[],
  sourcePathFn: (entity: FileEntity) => string,
  sortOrder: string
): Promise<FileEntity[]> {
  const statsPromises = entities.map(async (entity) => {
    const stat = await app.vault.adapter.stat(sourcePathFn(entity));
    return { entity, stat };
  });

  const stats = (await Promise.all(statsPromises)).filter((it) => it);

  const sortFunction = getSortFunction(sortOrder);
  stats.sort(sortFunction);

  return stats.map((it) => it!.entity);
}
