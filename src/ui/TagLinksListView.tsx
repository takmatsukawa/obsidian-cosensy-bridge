import React from "react";
import { FileEntity } from "../model/FileEntity";
import LinkView from "./LinkView";
import { TagLinks } from "../model/TagLinks";
import { App } from "obsidian";

interface TagLinksListViewProps {
  tagLinksList: TagLinks[];
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  app: App;
  displayedSectionCount: number;
  initialDisplayedEntitiesCount: number;
  resetDisplayedEntitiesCount: boolean;
}

interface LinkComponentProps {
  tagLink: TagLinks;
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
      <div className="twohop-links-section" key={this.props.tagLink.tag}>
        <div className={"twohop-links-tag-header twohop-links-box"}>
          {this.props.tagLink.tag}
        </div>
        {this.props.tagLink.fileEntities.slice(0, this.state.displayedEntitiesCount).map((it) => (
          <LinkView
            fileEntity={it}
            key={this.props.tagLink.tag + it.key()}
            onClick={this.props.onClick}
            getPreview={this.props.getPreview}
            app={this.props.app}
          />
        ))}
        {this.props.tagLink.fileEntities.length > this.state.displayedEntitiesCount && (
          <div onClick={this.loadMoreEntities} className="load-more-button twohop-links-box">
            Load more
          </div>
        )}
      </div>
    );
  }
}

export default class TagLinksListView extends React.Component<TagLinksListViewProps> {
  render(): JSX.Element {
    return (
      <div>
        {this.props.tagLinksList.slice(0, this.props.displayedSectionCount).map((tagLink, index) => (
          <LinkComponent
            key={index}
            tagLink={tagLink}
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