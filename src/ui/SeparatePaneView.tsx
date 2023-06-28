import { TFile, WorkspaceLeaf, ItemView } from "obsidian";
import React from "react";
import ReactDOM from "react-dom";
import TwohopLinksPlugin from "../main";

export class SeparatePaneView extends ItemView {
  private plugin: TwohopLinksPlugin;
  private lastActiveLeaf: WorkspaceLeaf | undefined;
  private previousLinks: string[] = [];

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
      await this.update();

      this.registerActiveFileUpdateEvent();

      this.registerEvent(this.app.vault.on('modify', async (file: TFile) => {
        if (file === this.app.workspace.getActiveFile()) {
          setTimeout(async () => {
            await this.update();
          }, 500);
        }
      }));
    } catch (error) {
      console.error('Error updating TwoHopLinksView', error);
    }
  }

  registerActiveFileUpdateEvent() {
    let lastActiveFilePath: string | null = null;

    this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf: WorkspaceLeaf) => {
      if (leaf.view === this) {
        return;
      }

      const newActiveFile = (leaf.view as any).file as TFile;
      const newActiveFilePath = newActiveFile ? newActiveFile.path : null;

      if (lastActiveFilePath !== newActiveFilePath) {
        this.lastActiveLeaf = leaf;
        lastActiveFilePath = newActiveFilePath;
        await this.update();
      }
    }));
  }

  private getActiveFileLinks(file: TFile): string[] {
    const cache = this.app.metadataCache.getFileCache(file);
    return cache && cache.links ? cache.links.map(link => link.link) : [];
  }

  async update(): Promise<void> {
    try {
      const activeFile = this.app.workspace.getActiveFile();
      const currentLinks = this.getActiveFileLinks(activeFile);

      if (this.previousLinks.sort().join(',') !== currentLinks.sort().join(',')) {
        const {
          forwardLinks, newLinks, backwardLinks, unresolvedTwoHopLinks, resolvedTwoHopLinks, tagLinksList
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
      }
    } catch (error) {
      console.error('Error rendering two hop links', error);
      ReactDOM.unmountComponentAtNode(this.containerEl);
      ReactDOM.render(<div>Error: Could not render two hop links</div>, this.containerEl);
    }
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
