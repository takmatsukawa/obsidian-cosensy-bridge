import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import React from "react";
import ReactDOM from "react-dom";
import { FileEntity } from "./model/FileEntity";
import { TwohopLink } from "./model/TwohopLink";
import TwohopLinksRootView from "./ui/TwohopLinksRootView";
import { TagLinks } from "./model/TagLinks";
import { removeBlockReference } from "./utils";
import { TwohopPluginSettings, TwohopSettingTab } from "./settings/TwohopSettingTab";
import { SeparatePaneView } from "./ui/SeparatePaneView";
import { readPreview } from "./preview";
import { loadSettings } from "./settings/index";
import { gatherTwoHopLinks } from "./linkLogic";

const CONTAINER_CLASS = "twohop-links-container";
export const HOVER_LINK_ID = "2hop-links";

export default class TwohopLinksPlugin extends Plugin {
  settings: TwohopPluginSettings;
  showLinksInMarkdown: boolean;

  async onload(): Promise<void> {
    console.debug("------ loading obsidian-twohop-links plugin");

    this.settings = await loadSettings(this);
    this.showLinksInMarkdown = true;

    this.initPlugin();
  }

  async initPlugin() {
    this.registerEventHandlers();
    this.addSettingTab(new TwohopSettingTab(this.app, this));
    this.registerView("TwoHopLinksView", (leaf: WorkspaceLeaf) => new SeparatePaneView(leaf, this));

    this.updateTwoHopLinksView();
  }

  onunload(): void {
    this.cleanupPlugin();
    console.log("unloading plugin");
  }

  cleanupPlugin() {
    this.disableLinksInMarkdown();
    this.closeTwoHopLinksView();
  }

  private registerEventHandlers(): void {
    this.app.workspace.on("file-open", this.refreshTwohopLinks.bind(this));
    this.app.metadataCache.on("resolve", this.refreshTwohopLinksIfActive.bind(this));
  }

  async refreshTwohopLinks() {
    if (this.showLinksInMarkdown) {
      await this.renderTwohopLinks();
    }
  }

  async refreshTwohopLinksIfActive(file: TFile) {
    if (this.showLinksInMarkdown) {
      const activeFile: TFile = this.app.workspace.getActiveFile();
      if (activeFile != null) {
        if (file.path == activeFile.path) {
          await this.renderTwohopLinks();
        }
      }
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
      this.closeTwoHopLinksView();
    }
    if (this.settings.showTwoHopLinksInSeparatePane) {
      this.openTwoHopLinksView();
      this.disableLinksInMarkdown();
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

  closeTwoHopLinksView() {
    this.app.workspace.detachLeavesOfType("TwoHopLinksView");
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
      twoHopLinks,
      tagLinksList
    } = await gatherTwoHopLinks(this.settings, activeFile);

    for (const container of this.getContainerElements(markdownView)) {
      await this.injectTwohopLinks(
        forwardLinks,
        newLinks,
        backwardLinks,
        twoHopLinks,
        tagLinksList,
        container
      );
    }
  }

  async injectTwohopLinks(
    forwardConnectedLinks: FileEntity[],
    newLinks: FileEntity[],
    backwardConnectedLinks: FileEntity[],
    twoHopLinks: TwohopLink[],
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
        twoHopLinks={twoHopLinks}
        tagLinksList={tagLinksList}
        onClick={this.openFile.bind(this)}
        getPreview={readPreview.bind(this)}
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
}
