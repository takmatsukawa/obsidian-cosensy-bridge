import React from "react";
import { FileEntity } from "../model/FileEntity";
import { removeBlockReference } from "../utils";

interface LinkViewProps {
  fileEntity: FileEntity;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity, signal: AbortSignal) => Promise<string>;
  boxWidth: string;
  boxHeight: string;
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

  render(): JSX.Element {
    return (
      <div
        className={"twohop-links-box"}
        onClick={async () => this.props.onClick(this.props.fileEntity)}
        // To overwrite CodeMirror's handler
        onMouseDown={async (event) =>
          event.button == 0 && this.props.onClick(this.props.fileEntity)
        }
      >
        <div className="twohop-links-box-title">
          {removeBlockReference(this.props.fileEntity.linkText)}
        </div>
        <div className={"twohop-links-box-preview"}>
          {this.state.preview &&
          this.state.preview.match(/^(app|https?):\/\//) ? (
            <img
              src={this.state.preview}
              alt={"preview image"}
            />
          ) : (
            <div>{this.state.preview}</div>
          )}
        </div>
      </div>
    );
  }
}
