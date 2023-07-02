import { TFile, WorkspaceLeaf, ItemView } from "obsidian";
import React from "react";
import ReactDOM from "react-dom";
import TwohopLinksPlugin from "../main";

export class SeparatePaneView extends ItemView {
  private plugin: TwohopLinksPlugin;
  private lastActiveLeaf: WorkspaceLeaf | undefined;
  private previousLinks: string[] = [];
  private previousTags: string[] = [];

  constructor(leaf: WorkspaceLeaf, plugin: TwohopLinksPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.containerEl.addClass("TwoHopLinks");
  }

  getViewType(): string {
    return "TwoHopLinksView";
  }

  getDisplayText(): string {
    return "2Hop Links";
  }

  getIcon(): string {
    return 'network';
  }

  async onOpen(): Promise<void> {
    try {
      this.lastActiveLeaf = this.app.workspace.getLeaf();
      await this.updateOrForceUpdate(true);

      this.registerActiveFileUpdateEvent();

      this.registerEvent(this.app.metadataCache.on('changed', async (file: TFile) => {
        if (file === this.app.workspace.getActiveFile()) {
          await this.updateOrForceUpdate(false);
        }
      }));
    } catch (error) {
      this.handleError('Error updating TwoHopLinksView', error);
    }
  }

  async updateOrForceUpdate(isForceUpdate: boolean): Promise<void> {
    try {
      const activeFile = this.app.workspace.getActiveFile();
      const currentLinks = this.getActiveFileLinks(activeFile);
      const currentTags = this.getActiveFileTags(activeFile);

      if (
        isForceUpdate ||
        this.previousLinks.sort().join(',') !== currentLinks.sort().join(',') ||
        this.previousTags.sort().join(',') !== currentTags.sort().join(',') ||
        activeFile === null
      ) {
        const {
          forwardLinks,
          newLinks,
          backwardLinks,
          unresolvedTwoHopLinks,
          resolvedTwoHopLinks,
          tagLinksList,
        } = await this.plugin.gatherTwoHopLinks(activeFile);

        ReactDOM.unmountComponentAtNode(this.containerEl);
        await this.plugin.injectTwohopLinks(
          forwardLinks,
          newLinks,
          backwardLinks,
          unresolvedTwoHopLinks,
          resolvedTwoHopLinks,
          tagLinksList,
          this.containerEl
        );

        this.addLinkEventListeners();

        this.previousLinks = currentLinks;
        this.previousTags = currentTags;
      }
    } catch (error) {
      this.handleError('Error rendering two hop links', error);
    }
  }

  handleError(message: string, error: any): void {
    console.error(message, error);
    ReactDOM.unmountComponentAtNode(this.containerEl);
    ReactDOM.render(
      <div>Error: Could not render two hop links</div>,
      this.containerEl
    );
  }

  registerActiveFileUpdateEvent() {
    let lastActiveFilePath: string | null = null;

    this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf: WorkspaceLeaf) => {
      if (leaf.view === this) {
        return;
      }

      const newActiveFile = (leaf.view as any).file as TFile;
      const newActiveFilePath = newActiveFile ? newActiveFile.path : null;

      if (lastActiveFilePath !== newActiveFilePath || newActiveFilePath === null) {
        this.lastActiveLeaf = leaf;
        lastActiveFilePath = newActiveFilePath;
        await this.updateOrForceUpdate(true);
      }
    }));
  }

  private getActiveFileLinks(file: TFile | null): string[] {
    if (!file) {
      return [];
    }

    const cache = this.app.metadataCache.getFileCache(file);
    return cache && cache.links ? cache.links.map(link => link.link) : [];
  }

  private getActiveFileTags(file: TFile | null): string[] {
    if (!file) {
      return [];
    }

    const cache = this.app.metadataCache.getFileCache(file);

    let tags = cache && cache.tags ? cache.tags.map(tag => tag.tag) : [];

    if (cache && cache.frontmatter && cache.frontmatter.tags) {
      if (typeof cache.frontmatter.tags === 'string') {
        tags.push(cache.frontmatter.tags);
      } else if (Array.isArray(cache.frontmatter.tags)) {
        tags = tags.concat(cache.frontmatter.tags);
      }
    }

    return tags;
  }

  addLinkEventListeners(): void {
    const links = this.containerEl.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();

        const filePath = link.getAttribute('href');
        if (!filePath) {
          console.error('Link does not have href attribute', link);
          return;
        }

        const fileOrFolder = this.app.vault.getAbstractFileByPath(filePath);
        if (!fileOrFolder || !(fileOrFolder instanceof TFile)) {
          console.error('No file found for path', filePath);
          return;
        }
        const file = fileOrFolder as TFile;

        if (!this.lastActiveLeaf) {
          console.error('No last active leaf');
          return;
        }

        await this.lastActiveLeaf.openFile(file);
      });
    });
  }
}
