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
  showForwardConnectedLinks: boolean;
  showBackwardConnectedLinks: boolean;
}

type Category = "forwardConnectedLinks" | "backwardConnectedLinks" | "unresolvedTwoHopLinks" | "resolvedTwoHopLinks" | "newLinks" | "tagLinksList";

interface TwohopLinksRootViewState {
  displayedBoxCount: Record<Category, number>;
  prevProps: TwohopLinksRootViewProps | null;
}

const initialBoxCount = 5;

export default class TwohopLinksRootView extends React.Component<TwohopLinksRootViewProps, TwohopLinksRootViewState> {
  constructor(props: TwohopLinksRootViewProps) {
    super(props);
    this.state = {
      displayedBoxCount: {
        forwardConnectedLinks: initialBoxCount,
        newLinks: initialBoxCount,
        backwardConnectedLinks: initialBoxCount,
        resolvedTwoHopLinks: initialBoxCount,
        unresolvedTwoHopLinks: initialBoxCount,
        tagLinksList: initialBoxCount,
      },
      prevProps: null
    };
  }

  loadMore = (category: Category) => {
    this.setState(prevState => ({
      displayedBoxCount: {
        ...prevState.displayedBoxCount,
        [category]: prevState.displayedBoxCount[category] + initialBoxCount
      },
      prevProps: this.props
    }));
  }

  componentDidUpdate(prevProps: TwohopLinksRootViewProps) {
    if (this.props !== prevProps) {
      this.setState({
        displayedBoxCount: {
          forwardConnectedLinks: initialBoxCount,
          backwardConnectedLinks: initialBoxCount,
          unresolvedTwoHopLinks: initialBoxCount,
          resolvedTwoHopLinks: initialBoxCount,
          newLinks: initialBoxCount,
          tagLinksList: initialBoxCount,
        },
        prevProps: this.props
      });
    }
  }

  render(): JSX.Element {
    const { showForwardConnectedLinks, showBackwardConnectedLinks } = this.props;

    return (
      <div>
        {showForwardConnectedLinks && (
          <ConnectedLinksView
            fileEntities={this.props.forwardConnectedLinks}
            displayedEntitiesCount={this.state.displayedBoxCount.forwardConnectedLinks}
            onClick={this.props.onClick}
            getPreview={this.props.getPreview}
            onLoadMore={() => this.loadMore('forwardConnectedLinks')}
            title={"Links"}
            className={"twohop-links-forward-links"}
            app={this.props.app}
          />
        )}
        {showBackwardConnectedLinks && (
          <ConnectedLinksView
            fileEntities={this.props.backwardConnectedLinks}
            displayedEntitiesCount={this.state.displayedBoxCount.backwardConnectedLinks}
            onClick={this.props.onClick}
            getPreview={this.props.getPreview}
            onLoadMore={() => this.loadMore('backwardConnectedLinks')}
            title={"Back Links"}
            className={"twohop-links-back-links"}
            app={this.props.app}
          />
        )}
        <TwohopLinksView
          twoHopLinks={this.props.unresolvedTwoHopLinks}
          resolved={false}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
          displayedBoxCount={this.state.displayedBoxCount.unresolvedTwoHopLinks}
          initialDisplayedEntitiesCount={5}
          resetDisplayedEntitiesCount={this.props !== this.state.prevProps}
        />
        {this.state.displayedBoxCount.unresolvedTwoHopLinks < this.props.unresolvedTwoHopLinks.length &&
          <button className="load-more-button" onClick={() => this.loadMore('unresolvedTwoHopLinks')}>Load more</button>
        }
        <TwohopLinksView
          twoHopLinks={this.props.resolvedTwoHopLinks}
          resolved={true}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
          displayedBoxCount={this.state.displayedBoxCount.resolvedTwoHopLinks}
          initialDisplayedEntitiesCount={5}
          resetDisplayedEntitiesCount={this.props !== this.state.prevProps}
        />
        {this.state.displayedBoxCount.resolvedTwoHopLinks < this.props.resolvedTwoHopLinks.length &&
          <button className="load-more-button" onClick={() => this.loadMore('resolvedTwoHopLinks')}>Load more</button>
        }
        <NewLinksView
          fileEntities={this.props.newLinks}
          displayedEntitiesCount={this.state.displayedBoxCount.newLinks}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          onLoadMore={() => this.loadMore('newLinks')}
          app={this.props.app}
        />
        <TagLinksListView
          tagLinksList={this.props.tagLinksList}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
          displayedBoxCount={this.state.displayedBoxCount.tagLinksList}
          initialDisplayedEntitiesCount={5}
          resetDisplayedEntitiesCount={this.props !== this.state.prevProps}
        />
        {this.state.displayedBoxCount.tagLinksList < this.props.tagLinksList.length &&
          <button className="load-more-button" onClick={() => this.loadMore('tagLinksList')}>Load more</button>
        }
      </div>
    );
  }
}