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
  autoLoadTwoHopLinks: boolean;
  initialBoxCount: number;
  initialSectionCount: number;
}

type Category = "forwardConnectedLinks" | "backwardConnectedLinks" | "unresolvedTwoHopLinks" | "resolvedTwoHopLinks" | "newLinks" | "tagLinksList";

interface TwohopLinksRootViewState {
  displayedBoxCount: Record<Category, number>;
  displayedSectionCount: Record<Category, number>;
  prevProps: TwohopLinksRootViewProps | null;
  isLoaded: boolean;
}

export default class TwohopLinksRootView extends React.Component<TwohopLinksRootViewProps, TwohopLinksRootViewState> {
  constructor(props: TwohopLinksRootViewProps) {
    super(props);
    this.state = {
      displayedBoxCount: {
        forwardConnectedLinks: props.initialBoxCount,
        newLinks: props.initialBoxCount,
        backwardConnectedLinks: props.initialBoxCount,
        resolvedTwoHopLinks: props.initialBoxCount,
        unresolvedTwoHopLinks: props.initialBoxCount,
        tagLinksList: props.initialBoxCount,
      },
      displayedSectionCount: {
        forwardConnectedLinks: props.initialSectionCount,
        newLinks: props.initialSectionCount,
        backwardConnectedLinks: props.initialSectionCount,
        resolvedTwoHopLinks: props.initialSectionCount,
        unresolvedTwoHopLinks: props.initialSectionCount,
        tagLinksList: props.initialSectionCount,
      },
      prevProps: null,
      isLoaded: props.autoLoadTwoHopLinks,
    };
  }

  loadMoreBox = (category: Category) => {
    this.setState(prevState => ({
      displayedBoxCount: {
        ...prevState.displayedBoxCount,
        [category]: prevState.displayedBoxCount[category] + this.props.initialBoxCount
      },
      prevProps: this.props
    }));
  }

  loadMoreSections = (category: Category) => {
    this.setState(prevState => ({
      displayedSectionCount: {
        ...prevState.displayedSectionCount,
        [category]: prevState.displayedSectionCount[category] + this.props.initialSectionCount
      },
      prevProps: this.props
    }));
  }

  componentDidUpdate(prevProps: TwohopLinksRootViewProps) {
    if (this.props !== prevProps) {
      this.setState({
        displayedBoxCount: {
          forwardConnectedLinks: this.props.initialBoxCount,
          backwardConnectedLinks: this.props.initialBoxCount,
          unresolvedTwoHopLinks: this.props.initialBoxCount,
          resolvedTwoHopLinks: this.props.initialBoxCount,
          newLinks: this.props.initialBoxCount,
          tagLinksList: this.props.initialBoxCount,
        },
        displayedSectionCount: {
          forwardConnectedLinks: this.props.initialSectionCount,
          newLinks: this.props.initialSectionCount,
          backwardConnectedLinks: this.props.initialSectionCount,
          resolvedTwoHopLinks: this.props.initialSectionCount,
          unresolvedTwoHopLinks: this.props.initialSectionCount,
          tagLinksList: this.props.initialSectionCount,
        },
        prevProps: this.props,
        isLoaded: this.props.autoLoadTwoHopLinks,
      });
    }
  }

  render(): JSX.Element {
    const { showForwardConnectedLinks, showBackwardConnectedLinks, autoLoadTwoHopLinks } = this.props;
    const { isLoaded } = this.state;

    if (!autoLoadTwoHopLinks && !isLoaded) {
      return (
        <button className="load-more-button" onClick={() => this.setState({ isLoaded: true })}>Show 2hop links</button>
      );
    }

    return (
      <div>
        {showForwardConnectedLinks && (
          <ConnectedLinksView
            fileEntities={this.props.forwardConnectedLinks}
            displayedBoxCount={this.state.displayedBoxCount.forwardConnectedLinks}
            onClick={this.props.onClick}
            getPreview={this.props.getPreview}
            onLoadMore={() => this.loadMoreBox('forwardConnectedLinks')}
            title={"Links"}
            className={"twohop-links-forward-links"}
            app={this.props.app}
          />
        )}
        {showBackwardConnectedLinks && (
          <ConnectedLinksView
            fileEntities={this.props.backwardConnectedLinks}
            displayedBoxCount={this.state.displayedBoxCount.backwardConnectedLinks}
            onClick={this.props.onClick}
            getPreview={this.props.getPreview}
            onLoadMore={() => this.loadMoreBox('backwardConnectedLinks')}
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
          displayedSectionCount={this.state.displayedSectionCount.unresolvedTwoHopLinks}
          initialDisplayedEntitiesCount={this.props.initialBoxCount}
          resetDisplayedEntitiesCount={this.props !== this.state.prevProps}
        />
        {this.state.displayedSectionCount.unresolvedTwoHopLinks < this.props.unresolvedTwoHopLinks.length &&
          <button className="load-more-button" onClick={() => this.loadMoreSections('unresolvedTwoHopLinks')}>Load more</button>
        }
        <TwohopLinksView
          twoHopLinks={this.props.resolvedTwoHopLinks}
          resolved={true}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
          displayedSectionCount={this.state.displayedSectionCount.resolvedTwoHopLinks}
          initialDisplayedEntitiesCount={this.props.initialBoxCount}
          resetDisplayedEntitiesCount={this.props !== this.state.prevProps}
        />
        {this.state.displayedSectionCount.resolvedTwoHopLinks < this.props.resolvedTwoHopLinks.length &&
          <button className="load-more-button" onClick={() => this.loadMoreSections('resolvedTwoHopLinks')}>Load more</button>
        }
        <NewLinksView
          fileEntities={this.props.newLinks}
          displayedBoxCount={this.state.displayedBoxCount.newLinks}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          onLoadMore={() => this.loadMoreBox('newLinks')}
          app={this.props.app}
        />
        <TagLinksListView
          tagLinksList={this.props.tagLinksList}
          onClick={this.props.onClick}
          getPreview={this.props.getPreview}
          app={this.props.app}
          displayedSectionCount={this.state.displayedSectionCount.tagLinksList}
          initialDisplayedEntitiesCount={this.props.initialBoxCount}
          resetDisplayedEntitiesCount={this.props !== this.state.prevProps}
        />
        {this.state.displayedSectionCount.tagLinksList < this.props.tagLinksList.length &&
          <button className="load-more-button" onClick={() => this.loadMoreSections('tagLinksList')}>Load more</button>
        }
      </div>
    );
  }
}