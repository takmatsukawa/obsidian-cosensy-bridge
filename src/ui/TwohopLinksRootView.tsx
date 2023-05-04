import { TwohopLink } from "../model/TwohopLink";

import React from "react";
import { FileEntity } from "../model/FileEntity";
import TwohopLinksView from "./TwohopLinksView";
import ConnectedLinksView from "./ConnectedLinksView";
import NewLinksView from "./NewLinksView";
import { TagLinks } from "../model/TagLinks";
import TagLinksListView from "./TagLinksListView";
import { App } from "obsidian";

interface TwohopLinksRootViewProps {
  forwardConnectedLinks: FileEntity[];
  newLinks: FileEntity[];
  backwardConnectedLinks: FileEntity[];
  resolvedTwoHopLinks: TwohopLink[];
  unresolvedTwoHopLinks: TwohopLink[];
  tagLinksList: TagLinks[];
  onClick: (fileEntity: FileEntity) => Promise<void>;
  getPreview: (fileEntity: FileEntity) => Promise<string>;
  app: App;
}

export default class TwohopLinksRootView extends React.Component<TwohopLinksRootViewProps> {
  constructor(props: TwohopLinksRootViewProps) {
    super(props);
  }

  render(): JSX.Element {
    return (
      <div>
        <ConnectedLinksView
          fileEntities={this.props.forwardConnectedLinks}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          title={"Links"}
          className={"twohop-links-forward-links"}
          app={this.props.app}
        />
        <ConnectedLinksView
          fileEntities={this.props.backwardConnectedLinks}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          title={"Back Links"}
          className={"twohop-links-back-links"}
          app={this.props.app}
        />
        <TwohopLinksView
          twoHopLinks={this.props.unresolvedTwoHopLinks}
          resolved={false}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
        />
        <TwohopLinksView
          twoHopLinks={this.props.resolvedTwoHopLinks}
          resolved={true}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
        />
        <NewLinksView
          fileEntities={this.props.newLinks}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
        />
        <TagLinksListView
          tagLinksList={this.props.tagLinksList}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
        />
      </div>
    );
  }
}
