import { App, PluginSettingTab, Setting } from "obsidian";
import TwohopLinksPlugin from "./main";

export interface TwohopPluginSettings {
  autoLoadTwoHopLinks: boolean;
  showForwardConnectedLinks: boolean;
  showBackwardConnectedLinks: boolean;
  putOnTop: boolean;
  showImage: boolean;
  excludePaths: string[];
  initialBoxCount: number;
  initialSectionCount: number;
  enableDuplicateRemoval: boolean;
  sortOrder: string;
  showTwoHopLinksInSeparatePane: boolean;
}

export const DEFAULT_SETTINGS: TwohopPluginSettings = {
  autoLoadTwoHopLinks: true,
  showForwardConnectedLinks: true,
  showBackwardConnectedLinks: true,
  putOnTop: false,
  showImage: true,
  excludePaths: [],
  initialBoxCount: 10,
  initialSectionCount: 20,
  enableDuplicateRemoval: true,
  sortOrder: 'modifiedAsc',
  showTwoHopLinksInSeparatePane: false,
};

export class TwohopSettingTab extends PluginSettingTab {
  plugin: TwohopLinksPlugin;

  constructor(app: App, plugin: TwohopLinksPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const containerEl = this.containerEl;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Show 2hop links in separate pane")
      .setDesc("If true, the 2hop links is displayed in a separate pane.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showTwoHopLinksInSeparatePane)
          .onChange(async (value) => {
            this.plugin.settings.showTwoHopLinksInSeparatePane = value;
            await this.plugin.saveSettings();
            await this.plugin.updateTwoHopLinksView();
          });
      });

    new Setting(containerEl)
      .setName("Sort Order")
      .setDesc("Choose the sort order for the files")
      .addDropdown((dropdown) => {
        dropdown.addOption('filenameAsc', 'File name (A to Z)');
        dropdown.addOption('filenameDesc', 'File name (Z to A)');
        dropdown.addOption('modifiedDesc', 'Modified time (new to old)');
        dropdown.addOption('modifiedAsc', 'Modified time (old to new)');
        dropdown.addOption('createdDesc', 'Created time (new to old)');
        dropdown.addOption('createdAsc', 'Created time (old to new)');
        dropdown
          .setValue(this.plugin.settings.sortOrder)
          .onChange(async (value) => {
            this.plugin.settings.sortOrder = value;
            await this.plugin.saveSettings();
            await this.plugin.updateTwoHopLinksView();
          });
      });

    new Setting(containerEl)
      .setName("Auto load 2hop links")
      .setDesc("Automatically load 2hop links when opening a note")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.autoLoadTwoHopLinks)
          .onChange(async (value) => {
            this.plugin.settings.autoLoadTwoHopLinks = value;
            await this.plugin.saveSettings();
            await this.plugin.updateTwoHopLinksView();
          });
      });

    new Setting(containerEl).setName("Show links").addToggle((toggle) =>
      toggle
        .setValue(this.plugin.settings.showForwardConnectedLinks)
        .onChange(async (value) => {
          this.plugin.settings.showForwardConnectedLinks = value;
          await this.plugin.saveSettings();
          await this.plugin.updateTwoHopLinksView();
        })
    );

    new Setting(containerEl).setName("Show back links").addToggle((toggle) =>
      toggle
        .setValue(this.plugin.settings.showBackwardConnectedLinks)
        .onChange(async (value) => {
          this.plugin.settings.showBackwardConnectedLinks = value;
          await this.plugin.saveSettings();
          await this.plugin.updateTwoHopLinksView();
        })
    );

    new Setting(containerEl)
      .setName("Put 2hop links to top of the pane(Experimental).")
      .setDesc(
        "Known bugs: This configuration doesn't work with the 'Embedded Note Titles' plugin."
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.putOnTop)
          .onChange(async (value) => {
            this.plugin.settings.putOnTop = value;
            await this.plugin.saveSettings();
            await this.plugin.updateTwoHopLinksView();
          });
      });

    new Setting(containerEl)
      .setName("Show image in the 2hop links")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.showImage)
          .onChange(async (value) => {
            this.plugin.settings.showImage = value;
            await this.plugin.saveSettings();
            await this.plugin.updateTwoHopLinksView();
          });
      });

    new Setting(containerEl)
      .setName("Exclude paths")
      .setDesc("List of file or folder paths to exclude, one per line")
      .addTextArea((textArea) => {
        textArea
          .setPlaceholder("path/to/file.md\npath/to/folder/")
          .setValue(this.plugin.settings.excludePaths.join("\n"));
        textArea.inputEl.style.height = "150px";
        textArea.inputEl.addEventListener('blur', async (event) => {
          this.plugin.settings.excludePaths = (event.target as HTMLInputElement).value
            .split("\n")
            .map((path) => path.trim());
          await this.plugin.saveSettings();
          await this.plugin.updateTwoHopLinksView();
        });
      });

    new Setting(containerEl)
      .setName("Initial Box Count")
      .setDesc("Set the initial number of boxes to be displayed")
      .addText((text) => {
        text.setValue(this.plugin.settings.initialBoxCount.toString());
        text.inputEl.addEventListener('blur', async (event) => {
          this.plugin.settings.initialBoxCount = Number((event.target as HTMLInputElement).value);
          await this.plugin.saveSettings();
          await this.plugin.updateTwoHopLinksView();
        });
      });

    new Setting(containerEl)
      .setName("Initial Section Count")
      .setDesc("Set the initial number of sections to be displayed")
      .addText((text) => {
        text.setValue(this.plugin.settings.initialSectionCount.toString());
        text.inputEl.addEventListener('blur', async (event) => {
          this.plugin.settings.initialSectionCount = Number((event.target as HTMLInputElement).value);
          await this.plugin.saveSettings();
          await this.plugin.updateTwoHopLinksView();
        });
      });

    new Setting(containerEl)
      .setName("Enable Duplicate Removal")
      .setDesc("Enable the removal of duplicate links")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableDuplicateRemoval)
          .onChange(async (value) => {
            this.plugin.settings.enableDuplicateRemoval = value;
            await this.plugin.saveSettings();
            await this.plugin.updateTwoHopLinksView();
          });
      });
  }
}
