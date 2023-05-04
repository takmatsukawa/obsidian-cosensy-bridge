import React from "react";
import { FileEntity } from "../model/FileEntity";
import { removeBlockReference } from "../utils";
import { App, Menu } from "obsidian";

interface LinkViewProps {
  fileEntity: FileEntity;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity, signal: AbortSignal) => Promise<string>;
  app: App;
}

interface LinkViewState {
  preview: string;
}

export default class LinkView extends React.Component<
  LinkViewProps,
  LinkViewState
> {
  private abortController: AbortController;

  constructor(props: LinkViewProps) {
    super(props);
    this.state = { preview: null };
  }

  async componentDidMount(): Promise<void> {
    this.abortController = new AbortController();
    const preview = await this.props.getPreview(
      this.props.fileEntity,
      this.abortController.signal
    );
    if (!this.abortController.signal.aborted) {
      this.setState({ preview });
    }
  }

  componentWillUnmount() {
    this.abortController.abort();
  }

  handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();

    const { app, fileEntity } = this.props;

    const openFileWithOptions = async (
      options?: "tab" | "split-vertical" | "window"
    ) => {
      const file = app.metadataCache.getFirstLinkpathDest(
        removeBlockReference(fileEntity.linkText),
        fileEntity.sourcePath
      );
      if (options === "split-vertical") {
        await app.workspace.getLeaf("split", "vertical").openFile(file);
      } else {
        await app.workspace.getLeaf(options).openFile(file);
      }
    };

    const menu = new Menu();

    menu.addItem((item) =>
      item.setTitle("Open link").onClick(async () => {
        await openFileWithOptions();
      })
    );

    menu.addItem((item) =>
      item.setTitle("Open in new tab").onClick(async () => {
        await openFileWithOptions("tab");
      })
    );

    menu.addItem((item) =>
      item.setTitle("Open to the right").onClick(async () => {
        await openFileWithOptions("split-vertical");
      })
    );

    menu.addItem((item) =>
      item.setTitle("Open in new window").onClick(async () => {
        await openFileWithOptions("window");
      })
    );

    menu.showAtMouseEvent(event.nativeEvent);
  };

  render(): JSX.Element {
    return (
      <div
        className={"twohop-links-box"}
        onClick={async () => this.props.onClick(this.props.fileEntity)}
        // To overwrite CodeMirror's handler
        onMouseDown={async (event) =>
          event.button == 0 && this.props.onClick(this.props.fileEntity)
        }
        onContextMenu={this.handleContextMenu}
      >
        <div className="twohop-links-box-title">
          {removeBlockReference(this.props.fileEntity.linkText)}
        </div>
        <div className={"twohop-links-box-preview"}>
          {this.state.preview &&
          this.state.preview.match(/^(app|https?):\/\//) ? (
            <img src={this.state.preview} alt={"preview image"} />
          ) : (
            <div>{this.state.preview}</div>
          )}
        </div>
      </div>
    );
  }
}
