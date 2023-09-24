import {
  MarkdownView,
  Plugin,
  TFile,
  WorkspaceLeaf,
  parseFrontMatterTags,
} from "obsidian";
import React from "react";
import ReactDOM from "react-dom";
import { FileEntity } from "./model/FileEntity";
import { TwohopLink } from "./model/TwohopLink";
import TwohopLinksRootView from "./ui/TwohopLinksRootView";
import { PropertiesLinks } from "./model/PropertiesLinks";
import { removeBlockReference } from "./utils";
import {
  TwohopPluginSettings,
  TwohopSettingTab,
} from "./settings/TwohopSettingTab";
import { SeparatePaneView } from "./ui/SeparatePaneView";
import { readPreview } from "./preview";
import { loadSettings } from "./settings/index";
import { Links } from "./links";

const CONTAINER_CLASS = "twohop-links-container";
export const HOVER_LINK_ID = "2hop-links";

export default class TwohopLinksPlugin extends Plugin {
  settings: TwohopPluginSettings;
  showLinksInMarkdown: boolean;
  links: Links;

  private previousLinks: string[] = [];
  private previousTags: string[] = [];

  async onload(): Promise<void> {
    console.debug("------ loading obsidian-twohop-links plugin");

    this.settings = await loadSettings(this);
    this.showLinksInMarkdown = true;
    this.links = new Links(this.app, this.settings);

    this.initPlugin();
  }

  async initPlugin() {
    this.addSettingTab(new TwohopSettingTab(this.app, this));
    this.registerView(
      "TwoHopLinksView",
      (leaf: WorkspaceLeaf) => new SeparatePaneView(leaf, this, this.links)
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", async (file: TFile) => {
        if (file === this.app.workspace.getActiveFile()) {
          await this.renderTwohopLinks(false);
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on(
        "active-leaf-change",
        this.refreshTwohopLinks.bind(this)
      )
    );
    this.app.workspace.trigger("parse-style-settings");

    await this.renderTwohopLinks(true);
  }

  onunload(): void {
    this.disableLinksInMarkdown();
    console.log("unloading plugin");
  }

  async refreshTwohopLinks() {
    if (this.showLinksInMarkdown) {
      await this.renderTwohopLinks(true);
    }
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

  async updateTwoHopLinksView() {
    if (this.isTwoHopLinksViewOpen()) {
      this.app.workspace.detachLeavesOfType("TwoHopLinksView");
    }
    if (this.settings.showTwoHopLinksInSeparatePane) {
      this.openTwoHopLinksView();
      this.disableLinksInMarkdown();
      this.removePaddingBottom();
    } else {
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

  private getContainerElements(markdownView: MarkdownView): Element[] {
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

  private getActiveFileLinks(file: TFile | null): string[] {
    if (!file) {
      return [];
    }

    const cache = this.app.metadataCache.getFileCache(file);
    return cache && cache.links ? cache.links.map((link) => link.link) : [];
  }

  private getActiveFileTags(file: TFile | null): string[] {
    if (!file) {
      return [];
    }

    const cache = this.app.metadataCache.getFileCache(file);

    let tags = cache && cache.tags ? cache.tags.map((tag) => tag.tag) : [];

    if (cache && cache.frontmatter && cache.frontmatter.tags) {
      const frontMatterTags = parseFrontMatterTags(cache.frontmatter);
      if (frontMatterTags) {
        tags = tags.concat(frontMatterTags);
      }
    }

    return tags;
  }

  async renderTwohopLinks(isForceUpdate: boolean): Promise<void> {
    if (this.settings.showTwoHopLinksInSeparatePane) {
      return;
    }
    this.addPaddingBottom();
    const markdownView: MarkdownView =
      this.app.workspace.getActiveViewOfType(MarkdownView);
    const activeFile = markdownView?.file;
    if (!activeFile) {
      return;
    }

    const currentLinks = this.getActiveFileLinks(activeFile);
    const currentTags = this.getActiveFileTags(activeFile);

    if (
      isForceUpdate ||
      this.previousLinks.sort().join(",") !== currentLinks.sort().join(",") ||
      this.previousTags.sort().join(",") !== currentTags.sort().join(",")
    ) {
      const {
        forwardLinks,
        newLinks,
        backwardLinks,
        twoHopLinks,
        tagLinksList,
        frontmatterKeyLinksList,
      } = await this.links.gatherTwoHopLinks(activeFile);

      for (const container of this.getContainerElements(markdownView)) {
        await this.injectTwohopLinks(
          forwardLinks,
          newLinks,
          backwardLinks,
          twoHopLinks,
          tagLinksList,
          frontmatterKeyLinksList,
          container
        );
      }

      this.previousLinks = currentLinks;
      this.previousTags = currentTags;
    }
  }

  async injectTwohopLinks(
    forwardConnectedLinks: FileEntity[],
    newLinks: FileEntity[],
    backwardConnectedLinks: FileEntity[],
    twoHopLinks: TwohopLink[],
    tagLinksList: PropertiesLinks[],
    frontmatterKeyLinksList: PropertiesLinks[],
    container: Element
  ) {
    const showForwardConnectedLinks = this.settings.showForwardConnectedLinks;
    const showBackwardConnectedLinks = this.settings.showBackwardConnectedLinks;
    const showTwohopLinks = this.settings.showTwohopLinks;
    const showNewLinks = this.settings.showNewLinks;
    const showTagsLinks = this.settings.showTagsLinks;
    const showPropertiesLinks = this.settings.showPropertiesLinks;
    ReactDOM.render(
      <TwohopLinksRootView
        forwardConnectedLinks={forwardConnectedLinks}
        newLinks={newLinks}
        backwardConnectedLinks={backwardConnectedLinks}
        twoHopLinks={twoHopLinks}
        tagLinksList={tagLinksList}
        frontmatterKeyLinksList={frontmatterKeyLinksList}
        onClick={this.openFile.bind(this)}
        getPreview={readPreview.bind(this)}
        app={this.app}
        showForwardConnectedLinks={showForwardConnectedLinks}
        showBackwardConnectedLinks={showBackwardConnectedLinks}
        showTwohopLinks={showTwohopLinks}
        showNewLinks={showNewLinks}
        showTagsLinks={showTagsLinks}
        showPropertiesLinks={showPropertiesLinks}
        autoLoadTwoHopLinks={this.settings.autoLoadTwoHopLinks}
        initialBoxCount={this.settings.initialBoxCount}
        initialSectionCount={this.settings.initialSectionCount}
      />,
      container
    );
  }

  enableLinksInMarkdown(): void {
    this.showLinksInMarkdown = true;
    this.renderTwohopLinks(true).then(() =>
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

  removeTwohopLinks(): void {
    const markdownView: MarkdownView =
      this.app.workspace.getActiveViewOfType(MarkdownView);

    if (markdownView !== null) {
      for (const element of this.getContainerElements(markdownView)) {
        const container = element.querySelector("." + CONTAINER_CLASS);
        if (container) {
          container.remove();
        }
      }

      if (markdownView.previewMode !== null) {
        const previewElements = Array.from(
          markdownView.previewMode.containerEl.querySelectorAll(
            "." + CONTAINER_CLASS
          )
        );
        for (const element of previewElements) {
          element.remove();
        }
      }
    }
  }

  addPaddingBottom(): void {
    if (!document.getElementById("twohop-custom-padding")) {
      const styleEl = document.createElement("style");
      styleEl.id = "twohop-custom-padding";
      styleEl.innerText = `
      .markdown-preview-section,
      .cm-content {
        padding-bottom: 20px !important;
      }
    `;
      document.head.appendChild(styleEl);
    }
  }

  removePaddingBottom(): void {
    const existingStyleEl = document.getElementById("twohop-custom-padding");
    if (existingStyleEl) {
      existingStyleEl.parentNode.removeChild(existingStyleEl);
    }
  }
}
