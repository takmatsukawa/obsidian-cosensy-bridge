import { TwohopLink } from "../model/TwohopLink";

import React from "react";
import { FileEntity } from "../model/FileEntity";
import LinkView from "./LinkView";
import { App } from "obsidian";

interface TwohopLinksViewProps {
  twoHopLinks: TwohopLink[];
  resolved: boolean;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  app: App;
  displayedSectionCount: number;
  initialDisplayedEntitiesCount: number;
  resetDisplayedEntitiesCount: boolean;
}

interface LinkComponentProps {
  link: TwohopLink;
  resolved: boolean;
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  app: App;
  initialDisplayedEntitiesCount: number;
  resetDisplayedEntitiesCount: boolean;
}

interface LinkComponentState {
  displayedEntitiesCount: number;
}

class LinkComponent extends React.Component<LinkComponentProps, LinkComponentState> {
  constructor(props: LinkComponentProps) {
    super(props);
    this.state = {
      displayedEntitiesCount: props.initialDisplayedEntitiesCount,
    };
  }
  
  componentDidUpdate(prevProps: LinkComponentProps) {
    if (this.props.resetDisplayedEntitiesCount && this.props.resetDisplayedEntitiesCount !== prevProps.resetDisplayedEntitiesCount) {
      this.setState({ displayedEntitiesCount: this.props.initialDisplayedEntitiesCount });
    }
  }

  loadMoreEntities = () => {
    this.setState((prevState) => ({
      displayedEntitiesCount: prevState.displayedEntitiesCount + this.props.initialDisplayedEntitiesCount,
    }));
  };

  render(): JSX.Element {
    return (
      <div
        className={
          "twohop-links-section " +
          (this.props.resolved
            ? "twohop-links-resolved"
            : "twohop-links-unresolved")
        }
        key={this.props.link.link.linkText}
      >
        <div
          className={"twohop-links-twohop-header twohop-links-box"}
          onClick={async () => this.props.onClick(this.props.link.link)}
          onMouseDown={async (event) =>
            event.button == 0 && this.props.onClick(this.props.link.link)
          }
        >
          {this.props.link.link.linkText.replace(/\.md$/, "")}
        </div>
        {this.props.link.fileEntities.slice(0, this.state.displayedEntitiesCount).map((it) => (
          <LinkView
            fileEntity={it}
            key={this.props.link.link.linkText + it.key()}
            onClick={this.props.onClick}
            getPreview={this.props.getPreview}
            app={this.props.app}
          />
        ))}
        {this.props.link.fileEntities.length > this.state.displayedEntitiesCount && (
          <div onClick={this.loadMoreEntities} className="load-more-button twohop-links-box">
            Load more
          </div>
        )}
      </div>
    );
  }
}

export default class TwohopLinksView extends React.Component<TwohopLinksViewProps> {
  render(): JSX.Element {
    return (
      <div>
        {this.props.twoHopLinks.slice(0, this.props.displayedSectionCount).map((link, index) => (
          <LinkComponent
            key={index}
            link={link}
            resolved={this.props.resolved}
            onClick={this.props.onClick}
            getPreview={this.props.getPreview}
            app={this.props.app}
            initialDisplayedEntitiesCount={this.props.initialDisplayedEntitiesCount}
            resetDisplayedEntitiesCount={this.props.resetDisplayedEntitiesCount}
          />
        ))}
      </div>
    );
  }
}