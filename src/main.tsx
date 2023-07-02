import { CachedMetadata, MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import React from "react";
import ReactDOM from "react-dom";
import { FileEntity } from "./model/FileEntity";
import { TwohopLink } from "./model/TwohopLink";
import TwohopLinksRootView from "./ui/TwohopLinksRootView";
import { TagLinks } from "./model/TagLinks";
import { path2linkText, removeBlockReference } from "./utils";
import {
  DEFAULT_SETTINGS,
  TwohopPluginSettings,
  TwohopSettingTab,
} from "./Settings";
import { SeparatePaneView } from "./ui/SeparatePaneView";

const CONTAINER_CLASS = "twohop-links-container";
export const HOVER_LINK_ID = "2hop-links";

export default class TwohopLinksPlugin extends Plugin {
  settings: TwohopPluginSettings;
  showLinksInMarkdown: boolean;

  async onload(): Promise<void> {
    console.debug("------ loading obsidian-twohop-links plugin");

    await this.loadSettings();

    this.showLinksInMarkdown = true;

    this.app.workspace.on("file-open", async () => {
      if (this.showLinksInMarkdown) {
        await this.renderTwohopLinks();
      }
    });

    this.app.metadataCache.on("resolve", async (file) => {
      if (this.showLinksInMarkdown) {
        const activeFile: TFile = this.app.workspace.getActiveFile();
        if (activeFile != null) {
          if (file.path == activeFile.path) {
            await this.renderTwohopLinks();
          }
        }
      }
    });

    this.addSettingTab(new TwohopSettingTab(this.app, this));

    this.registerView("TwoHopLinksView", (leaf: WorkspaceLeaf) => new SeparatePaneView(leaf, this));

    this.updateTwoHopLinksView();
  }

  onunload(): void {
    this.disableLinksInMarkdown();
    this.closeTwoHopLinksView();
    console.log("unloading plugin");
  }

  private async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    return this.saveData(this.settings);
  }

  async updateTwoHopLinksView() {
    if (this.settings.showTwoHopLinksInSeparatePane) {
      if (!this.isTwoHopLinksViewOpen()) {
        this.openTwoHopLinksView();
      } else {
        this.updateOpenTwoHopLinksView();
      }
      this.disableLinksInMarkdown();
    } else {
      if (this.isTwoHopLinksViewOpen()) {
        this.closeTwoHopLinksView();
      }
      this.enableLinksInMarkdown();
    }
  }

  async updateOpenTwoHopLinksView() {
    for (let leaf of this.app.workspace.getLeavesOfType("TwoHopLinksView")) {
      let view = leaf.view;
      if (view instanceof SeparatePaneView) {
        await view.onOpen();
      }
    }
  }

  isTwoHopLinksViewOpen(): boolean {
    return this.app.workspace.getLeavesOfType("TwoHopLinksView").length > 0;
  }

  async openTwoHopLinksView() {
    const leaf = this.settings.panePositionIsRight
      ? this.app.workspace.getRightLeaf(false)
      : this.app.workspace.getLeftLeaf(false);
    leaf.setViewState({ type: "TwoHopLinksView" });
    this.app.workspace.revealLeaf(leaf);
  }

  closeTwoHopLinksView() {
    this.app.workspace.detachLeavesOfType("TwoHopLinksView");
  }

  removeTwohopLinks(): void {
    const markdownView: MarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (markdownView !== null) {
      for (const element of this.getContainerElements(markdownView)) {
        const container = element.querySelector("." + CONTAINER_CLASS);
        if (container) {
          container.remove();
        }
      }

      if (markdownView.previewMode !== null) {
        const previewElements = Array.from(markdownView.previewMode.containerEl.querySelectorAll("." + CONTAINER_CLASS));
        for (const element of previewElements) {
          element.remove();
        }
      }
    }
  }

  private getTopContainerElements(markdownView: MarkdownView): Element[] {
    const elements = markdownView.containerEl.querySelectorAll(
      ".markdown-source-view .CodeMirror-scroll, .markdown-preview-view, .markdown-source-view .cm-sizer"
    );

    const containers: Element[] = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements.item(i);
      const container: Element = ((): Element => {
        const e = el.querySelector("." + CONTAINER_CLASS);
        if (e) {
          return e;
        } else {
          const c = document.createElement("div");
          c.className = CONTAINER_CLASS;
          el.insertBefore(c, el.firstChild);
          return c;
        }
      })();
      containers.push(container);
    }

    return containers;
  }

  private getBottomContainerElements(markdownView: MarkdownView): Element[] {
    const elements = markdownView.containerEl.querySelectorAll(
      ".markdown-source-view .CodeMirror-lines, .markdown-preview-view, .markdown-source-view .cm-sizer"
    );

    const containers: Element[] = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements.item(i);
      const container =
        el.querySelector("." + CONTAINER_CLASS) ||
        el.createDiv({ cls: CONTAINER_CLASS });
      containers.push(container);
    }

    return containers;
  }

  private getContainerElements(markdownView: MarkdownView): Element[] {
    if (this.settings.putOnTop) {
      return this.getTopContainerElements(markdownView);
    } else {
      return this.getBottomContainerElements(markdownView);
    }
  }

  async injectTwohopLinks(
    forwardConnectedLinks: FileEntity[],
    newLinks: FileEntity[],
    backwardConnectedLinks: FileEntity[],
    unresolvedTwoHopLinks: TwohopLink[],
    resolvedTwoHopLinks: TwohopLink[],
    tagLinksList: TagLinks[],
    container: Element
  ) {
    const showForwardConnectedLinks = this.settings.showForwardConnectedLinks;
    const showBackwardConnectedLinks = this.settings.showBackwardConnectedLinks;
    ReactDOM.render(
      <TwohopLinksRootView
        forwardConnectedLinks={forwardConnectedLinks}
        newLinks={newLinks}
        backwardConnectedLinks={backwardConnectedLinks}
        unresolvedTwoHopLinks={unresolvedTwoHopLinks}
        resolvedTwoHopLinks={resolvedTwoHopLinks}
        tagLinksList={tagLinksList}
        onClick={this.openFile.bind(this)}
        getPreview={this.readPreview.bind(this)}
        app={this.app}
        showForwardConnectedLinks={showForwardConnectedLinks}
        showBackwardConnectedLinks={showBackwardConnectedLinks}
        autoLoadTwoHopLinks={this.settings.autoLoadTwoHopLinks}
        initialBoxCount={this.settings.initialBoxCount}
        initialSectionCount={this.settings.initialSectionCount}
      />,
      container
    );
  }

  private async openFile(fileEntity: FileEntity): Promise<void> {
    const linkText = removeBlockReference(fileEntity.linkText);

    console.debug(
      `Open file: linkText='${linkText}', sourcePath='${fileEntity.sourcePath}'`
    );
    const file = this.app.metadataCache.getFirstLinkpathDest(
      linkText,
      fileEntity.sourcePath
    );
    if (file == null) {
      if (!confirm(`Create new file: ${linkText}?`)) {
        console.log("Canceled!!");
        return;
      }
    }
    return this.app.workspace.openLinkText(
      fileEntity.linkText,
      fileEntity.sourcePath
    );
  }

  async renderTwohopLinks(): Promise<void> {
    if (this.settings.showTwoHopLinksInSeparatePane) {
      return;
    }
    const markdownView: MarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    const activeFile = markdownView?.file;
    if (activeFile == null) {
      console.error('No active file');
      return;
    }

    const {
      forwardLinks,
      newLinks,
      backwardLinks,
      unresolvedTwoHopLinks,
      resolvedTwoHopLinks,
      tagLinksList
    } = await this.gatherTwoHopLinks(activeFile);

    for (const container of this.getContainerElements(markdownView)) {
      await this.injectTwohopLinks(
        forwardLinks,
        newLinks,
        backwardLinks,
        unresolvedTwoHopLinks,
        resolvedTwoHopLinks,
        tagLinksList,
        container
      );
    }
  }

  enableLinksInMarkdown(): void {
    this.showLinksInMarkdown = true;
    this.renderTwohopLinks().then(() =>
      console.debug("Rendered two hop links")
    );
  }

  disableLinksInMarkdown(): void {
    this.showLinksInMarkdown = false;
    this.removeTwohopLinks();
    const container = this.app.workspace.containerEl.querySelector(
      ".twohop-links-container"
    );
    if (container) {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    }
    (this.app.workspace as any).unregisterHoverLinkSource(HOVER_LINK_ID);
  }

  private async getForwardLinks(
    activeFile: TFile,
    activeFileCache: CachedMetadata
  ): Promise<{ resolved: FileEntity[], new: FileEntity[] }> {
    const resolvedLinks: FileEntity[] = [];
    const newLinks: FileEntity[] = [];

    if (activeFileCache != null && (activeFileCache.links != null || activeFileCache.embeds != null)) {
      const seen = new Set<string>();
      const linkEntities = [...(activeFileCache.links || []), ...(activeFileCache.embeds || [])];

      for (const it of linkEntities) {
        const key = removeBlockReference(it.link);
        if (!seen.has(key)) {
          seen.add(key);
          const targetFile = this.app.metadataCache.getFirstLinkpathDest(key, activeFile.path);

          if (targetFile && this.shouldExcludePath(targetFile.path)) {
            continue;
          }

          if (targetFile) {
            resolvedLinks.push(new FileEntity(targetFile.path, it.link));
          } else {
            newLinks.push(new FileEntity(activeFile.path, it.link));
          }
        }
      }
    } else if (activeFile.extension === "canvas") {
      const canvasContent = await this.app.vault.read(activeFile);
      let canvasData;
      try {
        canvasData = JSON.parse(canvasContent);
      } catch (error) {
        console.error('Invalid JSON in canvas:', error);
        canvasData = { nodes: [] };
      }

      const seen = new Set<string>();
      for (const node of canvasData.nodes) {
        if (node.type === "file") {
          const key = node.file;
          if (!seen.has(key)) {
            seen.add(key);
            const targetFile = this.app.vault.getAbstractFileByPath(key);
            if (targetFile && !this.shouldExcludePath(targetFile.path)) {
              resolvedLinks.push(new FileEntity(targetFile.path, key));
            } else {
              newLinks.push(new FileEntity(activeFile.path, key));
            }
          }
        }
      }
    }

    const sortedResolvedLinks = await this.getSortedFileEntities(resolvedLinks, (entity) => entity.sourcePath);
    return {
      resolved: sortedResolvedLinks,
      new: newLinks
    };
  }

  private async getBackLinks(
    activeFile: TFile,
    forwardLinkSet: Set<string>
  ): Promise<FileEntity[]> {
    const name = activeFile.path;
    const resolvedLinks: Record<string, Record<string, number>> = this.app
      .metadataCache.resolvedLinks;
    const backLinkEntities: FileEntity[] = [];
    for (const src of Object.keys(resolvedLinks)) {
      if (this.shouldExcludePath(src)) {
        continue;
      }
      for (const dest of Object.keys(resolvedLinks[src])) {
        if (dest == name) {
          const linkText = path2linkText(src);
          if (this.settings.enableDuplicateRemoval && forwardLinkSet.has(linkText)) {
            continue;
          }
          backLinkEntities.push(new FileEntity(src, linkText));
        }
      }
    }

    const allFiles: TFile[] = this.app.vault.getFiles();
    const canvasFiles: TFile[] = allFiles.filter(file => file.extension === "canvas");

    for (const canvasFile of canvasFiles) {
      const canvasContent = await this.app.vault.read(canvasFile);
      let canvasData;
      try {
        canvasData = JSON.parse(canvasContent);
      } catch (error) {
        console.error('Invalid JSON in canvas:', error);
        canvasData = { nodes: [] };
      }

      for (const node of canvasData.nodes) {
        if (node.type === "file" && node.file === activeFile.path) {
          const linkText = path2linkText(canvasFile.path);
          if (!forwardLinkSet.has(linkText)) {
            backLinkEntities.push(new FileEntity(canvasFile.path, linkText));
          }
        }
      }
    }

    return await this.getSortedFileEntities(backLinkEntities, (entity) => entity.sourcePath);
  }

  private async getTwohopLinks(
    activeFile: TFile,
    links: Record<string, Record<string, number>>,
    forwardLinkSet: Set<string>,
    twoHopLinkSet: Set<string>
  ): Promise<TwohopLink[]> {
    const twoHopLinks: Record<string, FileEntity[]> = {};
    const twohopLinkList = await this.aggregate2hopLinks(activeFile, links);

    if (twohopLinkList == null) {
      return [];
    }

    let seenLinks = new Set<string>();

    if (twohopLinkList) {
      for (const k of Object.keys(twohopLinkList)) {
        if (twohopLinkList[k].length > 0) {
          twoHopLinks[k] = twohopLinkList[k]
            .filter((it) => !this.shouldExcludePath(it))
            .map((it) => {
              const linkText = path2linkText(it);
              if (
                this.settings.enableDuplicateRemoval &&
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
      const canvasContent = await this.app.vault.read(activeFile);
      let canvasData;
      try {
        canvasData = JSON.parse(canvasContent);
      } catch (error) {
        console.error('Invalid JSON in canvas:', error);
        canvasData = { nodes: [] };
      }

      if (Array.isArray(canvasData.nodes)) {
        linkKeys = canvasData.nodes.filter((node: any) => node.type === "file").map((node: any) => node.file);
      } else {
        linkKeys = [];
      }
    } else if (links[activeFile.path]) {
      linkKeys = Object.keys(links[activeFile.path]);
    }

    const twoHopLinkEntities = (await Promise.all(
      linkKeys
        .filter((path) => !this.shouldExcludePath(path))
        .map(async (path) => {
          if (twoHopLinks[path]) {
            const sortedFileEntities = await this.getSortedFileEntities(twoHopLinks[path], (entity) => {
              const file = this.app.metadataCache.getFirstLinkpathDest(entity.linkText, entity.sourcePath);
              return file ? file.path : null;
            });

            return { link: new FileEntity(activeFile.path, path), fileEntities: sortedFileEntities };
          }
          return null;
        })
    )).filter(it => it);

    const twoHopLinkStatsPromises = twoHopLinkEntities.map(async (twoHopLinkEntity) => {
      const stat = await this.app.vault.adapter.stat(twoHopLinkEntity.link.linkText);
      return { twoHopLinkEntity, stat };
    });

    const twoHopLinkStats = (await Promise.all(twoHopLinkStatsPromises)).filter((it) => it && it.twoHopLinkEntity && it.stat);

    const twoHopSortFunction = this.getTwoHopSortFunction(this.settings.sortOrder);
    twoHopLinkStats.sort(twoHopSortFunction);

    return twoHopLinkStats.map((it) => new TwohopLink(it!.twoHopLinkEntity.link, it!.twoHopLinkEntity.fileEntities)).filter((it) => it.fileEntities.length > 0);
  }

  getTagHierarchySortFunction(sortOrder: string) {
    const sortFunction = this.getSortFunction(sortOrder);
    return (a: TagLinks, b: TagLinks) => {
      const aTagHierarchy = a.tag.split('/');
      const bTagHierarchy = b.tag.split('/');
      for (let i = 0; i < Math.min(aTagHierarchy.length, bTagHierarchy.length); i++) {
        if (aTagHierarchy[i] !== bTagHierarchy[i]) {
          return sortFunction(aTagHierarchy[i], bTagHierarchy[i]);
        }
      }
      if (aTagHierarchy.length !== bTagHierarchy.length) {
        return aTagHierarchy.length > bTagHierarchy.length ? -1 : 1;
      }
      return sortFunction(a.tag, b.tag);
    };
  }

  private getTagsFromCache(cache: CachedMetadata | null | undefined): string[] {
    let tags: string[] = [];
    if (cache) {
      if (cache.tags) {
        cache.tags.forEach((it) => {
          const tagHierarchy = it.tag.replace('#', '').split('/');
          for (let i = 0; i < tagHierarchy.length; i++) {
            tags.push(tagHierarchy.slice(0, i + 1).join('/'));
          }
        });
      }

      if (cache.frontmatter?.tags) {
        if (Array.isArray(cache.frontmatter.tags)) {
          cache.frontmatter.tags.forEach((tag) => {
            if (typeof tag === 'string') {
              const tagHierarchy = tag.split('/');
              for (let i = 0; i < tagHierarchy.length; i++) {
                tags.push(tagHierarchy.slice(0, i + 1).join('/'));
              }
            }
          });
        } else if (typeof cache.frontmatter.tags === 'string') {
          cache.frontmatter.tags.split(',').map((tag) => tag.trim()).forEach((tag) => {
            const tagHierarchy = tag.split('/');
            for (let i = 0; i < tagHierarchy.length; i++) {
              tags.push(tagHierarchy.slice(0, i + 1).join('/'));
            }
          });
        }
      }
    }

    return tags.filter(tag => {
      for (const excludeTag of this.settings.excludeTags) {
        if (excludeTag.endsWith("/") && (tag === excludeTag.slice(0, -1) || tag.startsWith(excludeTag))) {
          return false;
        }
        if (!excludeTag.endsWith("/") && tag === excludeTag) {
          return false;
        }
      }
      return true;
    });
  }

  getTagLinksList = async (
    activeFile: TFile,
    activeFileCache: CachedMetadata,
    forwardLinkSet: Set<string>,
    twoHopLinkSet: Set<string>
  ): Promise<TagLinks[]> => {
    const activeFileTags = this.getTagsFromCache(activeFileCache);
    if (activeFileTags.length === 0) return [];

    const activeFileTagSet = new Set(activeFileTags);
    const tagMap: Record<string, FileEntity[]> = {};
    const seen: Record<string, boolean> = {};

    const markdownFiles = this.app.vault.getMarkdownFiles().filter((markdownFile) =>
      markdownFile !== activeFile && !this.shouldExcludePath(markdownFile.path));

    for (const markdownFile of markdownFiles) {
      const cachedMetadata = this.app.metadataCache.getFileCache(markdownFile);
      if (!cachedMetadata) continue;
      const fileTags = this.getTagsFromCache(cachedMetadata).sort((a, b) => b.length - a.length);

      for (const tag of fileTags) {
        if (!activeFileTagSet.has(tag)) continue;

        tagMap[tag] = tagMap[tag] ?? [];
        if (this.settings.enableDuplicateRemoval &&
          (seen[markdownFile.path] || forwardLinkSet.has(path2linkText(markdownFile.path)) ||
            twoHopLinkSet.has(path2linkText(markdownFile.path)))) continue;

        const linkText = path2linkText(markdownFile.path);
        tagMap[tag].push(new FileEntity(activeFile.path, linkText));
        seen[markdownFile.path] = true;
      }
    }

    const tagLinksEntities = await this.createTagLinkEntities(tagMap);

    const sortFunction = this.getTagHierarchySortFunction(this.settings.sortOrder);
    return tagLinksEntities.sort(sortFunction);
  }

  private async createTagLinkEntities(tagMap: Record<string, FileEntity[]>): Promise<TagLinks[]> {
    const tagLinksEntitiesPromises = Object.entries(tagMap).map(async ([tag, entities]) => {
      const sortedEntities = await this.getSortedFileEntities(entities, (entity) => entity.sourcePath);
      if (sortedEntities.length === 0) {
        return null;
      }
      return new TagLinks(tag, sortedEntities);
    });

    const tagLinksEntities = await Promise.all(tagLinksEntitiesPromises);

    return tagLinksEntities.filter(it => it != null);
  }

  private async readPreview(fileEntity: FileEntity) {
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
      const thumbnailUrl = this.getThumbnailUrlFromIframeUrl(iframeUrl);
      if (thumbnailUrl) {
        return thumbnailUrl;
      }
    }

    if (this.settings.showImage) {
      const youtubeEmbedMatch = content.match(/!\[[^\]]*\]\((https:\/\/www\.youtube\.com\/embed\/[^\)]+)\)/);
      if (youtubeEmbedMatch) {
        const youtubeEmbedUrl = youtubeEmbedMatch[1];
        const youtubeThumbnailUrl = this.getThumbnailUrlFromIframeUrl(youtubeEmbedUrl);
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
      .filter((it) => {
        return (
          it.match(/\S/) &&
          !it.match(/^#/) &&
          !it.match(/^https?:\/\//)
        );
      })
      .slice(0, 6)
      .join("\n");
  }

  private getThumbnailUrlFromIframeUrl(iframeUrl: string): string | null {
    const youtubeIdMatch = iframeUrl.match(
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?&]+)(?:\?[^?]+)?$/
    );
    if (youtubeIdMatch) {
      const youtubeId = youtubeIdMatch[1];
      return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }

    return null;
  }

  private getSortFunction(sortOrder: string) {
    switch (sortOrder) {
      case 'random':
        return () => Math.random() - 0.5;
      case 'filenameAsc':
        return (a: any, b: any) =>
          a.entity && b.entity ? a.entity.linkText.localeCompare(b.entity.linkText) : Math.random() - 0.5;
      case 'filenameDesc':
        return (a: any, b: any) =>
          a.entity && b.entity ? b.entity.linkText.localeCompare(a.entity.linkText) : Math.random() - 0.5;
      case 'modifiedDesc':
        return (a: any, b: any) =>
          a.stat && b.stat && a.stat.mtime && b.stat.mtime ? b.stat.mtime - a.stat.mtime : Math.random() - 0.5;
      case 'modifiedAsc':
        return (a: any, b: any) =>
          a.stat && b.stat && a.stat.mtime && b.stat.mtime ? a.stat.mtime - b.stat.mtime : Math.random() - 0.5;
      case 'createdDesc':
        return (a: any, b: any) =>
          a.stat && b.stat && a.stat.ctime && b.stat.ctime ? b.stat.ctime - a.stat.ctime : Math.random() - 0.5;
      case 'createdAsc':
        return (a: any, b: any) =>
          a.stat && b.stat && a.stat.ctime && b.stat.ctime ? a.stat.ctime - b.stat.ctime : Math.random() - 0.5;
    }
  }

  private getTwoHopSortFunction(sortOrder: string) {
    switch (sortOrder) {
      case 'random':
        return () => Math.random() - 0.5;
      case 'filenameAsc':
        return (a: any, b: any) =>
          a.twoHopLinkEntity && b.twoHopLinkEntity ? a.twoHopLinkEntity.link.linkText.localeCompare(b.twoHopLinkEntity.link.linkText) : Math.random() - 0.5;
      case 'filenameDesc':
        return (a: any, b: any) =>
          a.twoHopLinkEntity && b.twoHopLinkEntity ? b.twoHopLinkEntity.link.linkText.localeCompare(a.twoHopLinkEntity.link.linkText) : Math.random() - 0.5;
      case 'modifiedDesc':
        return (a: any, b: any) => b.stat.mtime - a.stat.mtime;
      case 'modifiedAsc':
        return (a: any, b: any) => a.stat.mtime - b.stat.mtime;
      case 'createdDesc':
        return (a: any, b: any) => b.stat.ctime - a.stat.ctime;
      case 'createdAsc':
        return (a: any, b: any) => a.stat.ctime - b.stat.ctime;
    }
  }

  private getSortFunctionForFile(sortOrder: string) {
    switch (sortOrder) {
      case 'random':
        return () => Math.random() - 0.5;
      case 'filenameAsc':
        return (file: TFile) => file.basename;
      case 'filenameDesc':
        return (file: TFile) => -file.basename;
      case 'modifiedDesc':
        return (file: TFile) => -file.stat.mtime;
      case 'modifiedAsc':
        return (file: TFile) => file.stat.mtime;
      case 'createdDesc':
        return (file: TFile) => -file.stat.ctime;
      case 'createdAsc':
        return (file: TFile) => file.stat.ctime;
    }
  }

  private async getSortedFiles(files: TFile[], sortFunction: (file: TFile) => string | number): Promise<TFile[]> {
    const fileEntities: { file: TFile, sortValue: string | number }[] = files.map(file => {
      return { file, sortValue: sortFunction(file) };
    });
    fileEntities.sort((a, b) => {
      const sortValueA = a.sortValue;
      const sortValueB = b.sortValue;
      if (typeof sortValueA === "string" && typeof sortValueB === "string") {
        return sortValueA.localeCompare(sortValueB);
      } else if (typeof sortValueA === "number" && typeof sortValueB === "number") {
        return sortValueA - sortValueB;
      } else {
        return 0;
      }
    });
    return fileEntities.map(entity => entity.file);
  }

  async gatherTwoHopLinks(activeFile: TFile | null): Promise<{
    forwardLinks: FileEntity[];
    newLinks: FileEntity[];
    backwardLinks: FileEntity[];
    unresolvedTwoHopLinks: TwohopLink[];
    resolvedTwoHopLinks: TwohopLink[];
    tagLinksList: TagLinks[];
  }> {
    let forwardLinks: FileEntity[] = [];
    let newLinks: FileEntity[] = [];
    let backwardLinks: FileEntity[] = [];
    let unresolvedTwoHopLinks: TwohopLink[] = [];
    let resolvedTwoHopLinks: TwohopLink[] = [];
    let tagLinksList: TagLinks[] = [];

    if (activeFile) {
      const activeFileCache: CachedMetadata = this.app.metadataCache.getFileCache(activeFile);
      ({ resolved: forwardLinks, new: newLinks } = await this.getForwardLinks(activeFile, activeFileCache));
      const forwardLinkSet = new Set<string>(forwardLinks.map((it) => it.key()));

      const twoHopLinkSet = new Set<string>();
      unresolvedTwoHopLinks = await this.getTwohopLinks(
        activeFile,
        this.app.metadataCache.unresolvedLinks,
        forwardLinkSet,
        twoHopLinkSet
      );
      resolvedTwoHopLinks = await this.getTwohopLinks(
        activeFile,
        this.app.metadataCache.resolvedLinks,
        forwardLinkSet,
        twoHopLinkSet
      );

      backwardLinks = await this.getBackLinks(activeFile, forwardLinkSet);
      tagLinksList = await this.getTagLinksList(activeFile, activeFileCache, forwardLinkSet, twoHopLinkSet);
    } else {
      const allMarkdownFiles = this.app.vault.getMarkdownFiles()
        .filter(file => !this.shouldExcludePath(file.path));

      const sortedFiles = await this.getSortedFiles(allMarkdownFiles, this.getSortFunctionForFile(this.settings.sortOrder));
      forwardLinks = sortedFiles.map(file => new FileEntity("", file.path));
    }

    return {
      forwardLinks,
      newLinks,
      backwardLinks,
      unresolvedTwoHopLinks,
      resolvedTwoHopLinks,
      tagLinksList
    };
  }

  private async aggregate2hopLinks(
    activeFile: TFile,
    links: Record<string, Record<string, number>>
  ): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    let activeFileLinks = new Set<string>();

    if (links && activeFile && activeFile.path && links[activeFile.path]) {
      activeFileLinks = new Set(Object.keys(links[activeFile.path]));
    }

    if (activeFile.extension === "canvas") {
      const canvasContent = await this.app.vault.read(activeFile);
      let canvasData;
      try {
        canvasData = JSON.parse(canvasContent);
      } catch (error) {
        console.error('Invalid JSON in canvas:', error);
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

  private async getSortedFileEntities(
    entities: FileEntity[],
    sourcePathFn: (entity: FileEntity) => string
  ): Promise<FileEntity[]> {
    const statsPromises = entities.map(async (entity) => {
      const stat = await this.app.vault.adapter.stat(sourcePathFn(entity));
      return { entity, stat };
    });

    const stats = (await Promise.all(statsPromises)).filter((it) => it);

    const sortFunction = this.getSortFunction(this.settings.sortOrder);
    stats.sort(sortFunction);

    return stats.map((it) => it!.entity);
  }

  private shouldExcludePath(path: string): boolean {
    const excludePaths = this.settings.excludePaths;
    return excludePaths.some((excludePath: string) => {
      if (excludePath.endsWith("/")) {
        return path.startsWith(excludePath);
      } else {
        return path === excludePath;
      }
    });
  }

}
