import React from "react";
import { FileEntity } from "../model/FileEntity";
import LinkView from "./LinkView";
import { App } from "obsidian";

interface NewLinksViewProps {
  fileEntities: FileEntity[];
  displayedEntitiesCount: number;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  onLoadMore: () => void;
  app: App;
}

export default class NewLinksView extends React.Component<NewLinksViewProps> {
  constructor(props: NewLinksViewProps) {
    super(props);
  }

  render(): JSX.Element {
    if (this.props.fileEntities.length > 0) {
      return (
        <div className="twohop-links-section">
          <div className={"twohop-links-box twohop-links-new-links-header"}>
            New links
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
          {this.props.displayedEntitiesCount < this.props.fileEntities.length &&
            <div onClick={this.props.onLoadMore} className="load-more-button twohop-links-box">
              Load more
            </div>
          }
        </div>
      );
    } else {
      return <div />;
    }
  }
}
