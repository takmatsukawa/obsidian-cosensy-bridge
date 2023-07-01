import React, { createRef } from "react";
import { FileEntity } from "../model/FileEntity";
import LinkView from "./LinkView";
import { App, setIcon } from "obsidian";

interface NewLinksViewProps {
  fileEntities: FileEntity[];
  displayedBoxCount: number;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  onLoadMore: () => void;
  app: App;
}

export default class NewLinksView extends React.Component<NewLinksViewProps> {
  loadMoreRef = createRef<HTMLDivElement>();

  constructor(props: NewLinksViewProps) {
    super(props);
  }

  componentDidMount() {
    if (this.loadMoreRef.current) {
      setIcon(this.loadMoreRef.current, "more-horizontal");
    }
  }

  componentDidUpdate() {
    if (this.loadMoreRef.current) {
      setIcon(this.loadMoreRef.current, "more-horizontal");
    }
  }

  render(): JSX.Element {
    if (this.props.fileEntities.length > 0) {
      return (
        <div className="twohop-links-section">
          <div className={"twohop-links-box twohop-links-new-links-header"}>
            New links
          </div>
          {this.props.fileEntities.slice(0, this.props.displayedBoxCount).map((it) => {
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
          {this.props.displayedBoxCount < this.props.fileEntities.length &&
            <div ref={this.loadMoreRef} onClick={this.props.onLoadMore} className="load-more-button twohop-links-box">
            </div>
          }
        </div>
      );
    } else {
      return <div />;
    }
  }
}
