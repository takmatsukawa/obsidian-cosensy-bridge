import React from "react";
import { FileEntity } from "../model/FileEntity";
import LinkView from "./LinkView";
import { App } from "obsidian";

interface ConnectedLinksViewProps {
  fileEntities: FileEntity[];
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  title: string;
  className: string;
  app: App;
}

export default class ConnectedLinksView extends React.Component<ConnectedLinksViewProps> {
  constructor(props: ConnectedLinksViewProps) {
    super(props);
  }

  render(): JSX.Element {
    if (this.props.fileEntities.length > 0) {
      return (
        <div className={"twohop-links-section " + this.props.className}>
          <div
            className={"twohop-links-box twohop-links-connected-links-header"}
          >
            {this.props.title}
          </div>
          {this.props.fileEntities.map((it) => {
            return (
              <LinkView
                fileEntity={it}
                key={it.key()}
                onClick={this.props.onClick}
                getPreview={this.props.getPreview}
                app={this.props.app}
              />
            );
          })}
        </div>
      );
    } else {
      return <div />;
    }
  }
}
