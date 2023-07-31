import { CachedMetadata, TFile } from "obsidian";
import {
  getForwardLinks,
  getTwohopLinks,
  getBackLinks,
  getLinksListOfFilesWithTag,
} from "./links";
import { FileEntity } from "./model/FileEntity";
import { TagLinks } from "./model/TagLinks";
import { TwohopLink } from "./model/TwohopLink";
import { getSortedFiles, getSortFunctionForFile } from "./sort";
import { shouldExcludePath } from "./utils";

export async function gatherTwoHopLinks(
  settings: any,
  activeFile: TFile | null
): Promise<{
  forwardLinks: FileEntity[];
  newLinks: FileEntity[];
  backwardLinks: FileEntity[];
  twoHopLinks: TwohopLink[];
  tagLinksList: TagLinks[];
}> {
  let forwardLinks: FileEntity[] = [];
  let newLinks: FileEntity[] = [];
  let backwardLinks: FileEntity[] = [];
  let twoHopLinks: TwohopLink[] = [];
  let tagLinksList: TagLinks[] = [];

  if (activeFile) {
    const activeFileCache: CachedMetadata =
      app.metadataCache.getFileCache(activeFile);
    ({ resolved: forwardLinks, new: newLinks } = await getForwardLinks(
      settings,
      activeFile,
      activeFileCache
    ));
    const seenLinkSet = new Set<string>(forwardLinks.map((it) => it.key()));
    backwardLinks = await getBackLinks(settings, activeFile, seenLinkSet);
    backwardLinks.forEach((link) => seenLinkSet.add(link.key()));
    const twoHopLinkSet = new Set<string>();
    twoHopLinks = await getTwohopLinks(
      settings,
      activeFile,
      app.metadataCache.resolvedLinks,
      seenLinkSet,
      twoHopLinkSet
    );
    tagLinksList = await getLinksListOfFilesWithTag(
      app,
      settings,
      activeFile,
      activeFileCache,
      seenLinkSet,
      twoHopLinkSet
    );
  } else {
    const allMarkdownFiles = app.vault
      .getMarkdownFiles()
      .filter(
        (file: { path: string }) =>
          !shouldExcludePath(file.path, settings.excludePaths)
      );

    const sortedFiles = await getSortedFiles(
      allMarkdownFiles,
      getSortFunctionForFile(settings.sortOrder)
    );
    forwardLinks = sortedFiles.map((file) => new FileEntity("", file.path));
  }

  return {
    forwardLinks,
    newLinks,
    backwardLinks,
    twoHopLinks,
    tagLinksList,
  };
}
