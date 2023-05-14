import React from "react";
import { FileEntity } from "../model/FileEntity";
import LinkView from "./LinkView";
import { App } from "obsidian";

interface ConnectedLinksViewProps {
  fileEntities: FileEntity[];
  displayedEntitiesCount: number;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  onLoadMore: () => void;
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
          {this.props.fileEntities.slice(0, this.props.displayedEntitiesCount).map((it) => {
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
          {this.props.fileEntities.length > this.props.displayedEntitiesCount && (
            <div onClick={this.props.onLoadMore} className="load-more-button twohop-links-box">
              Load more
            </div>
          )}
        </div>
      );
    } else {
      return <div />;
    }
  }
}