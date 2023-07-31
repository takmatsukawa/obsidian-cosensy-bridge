import React from "react";
import { FileEntity } from "../model/FileEntity";
import LinkView from "./LinkView";
import { App, setIcon } from "obsidian";

interface ConnectedLinksViewProps {
  fileEntities: FileEntity[];
  displayedBoxCount: number;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  onLoadMore: () => void;
  title: string;
  className: string;
  app: App;
}

export default class ConnectedLinksView extends React.Component<ConnectedLinksViewProps> {
  private loadMoreRef: React.RefObject<HTMLDivElement>;

  constructor(props: ConnectedLinksViewProps) {
    super(props);
    this.loadMoreRef = React.createRef();
  }

  componentDidMount() {
    if (this.loadMoreRef.current) {
      setIcon(this.loadMoreRef.current, "more-horizontal");
    }
  }

  shouldComponentUpdate(nextProps: ConnectedLinksViewProps) {
    return (
      nextProps.fileEntities !== this.props.fileEntities ||
      nextProps.displayedBoxCount !== this.props.displayedBoxCount ||
      nextProps.title !== this.props.title ||
      nextProps.className !== this.props.className ||
      nextProps.app !== this.props.app
    );
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
          {this.props.fileEntities
            .slice(0, this.props.displayedBoxCount)
            .map((it) => {
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
          {this.props.fileEntities.length > this.props.displayedBoxCount && (
            <div
              ref={this.loadMoreRef}
              onClick={this.props.onLoadMore}
              className="load-more-button twohop-links-box"
            ></div>
          )}
        </div>
      );
    } else {
      return <div />;
    }
  }
}
