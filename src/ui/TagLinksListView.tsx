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
}

export default class TagLinksListView extends React.Component<TagLinksListViewProps> {
  constructor(props: TagLinksListViewProps) {
    super(props);
  }

  render(): JSX.Element {
    return (
      <div>
        {this.props.tagLinksList.map((link) => (
          <div className="twohop-links-section" key={link.tag}>
            <div className={"twohop-links-tag-header twohop-links-box"}>
              {link.tag}
            </div>
            {link.fileEntities.map((it) => (
              <LinkView
                fileEntity={it}
                key={link.tag + it.key()}
                onClick={this.props.onClick}
                getPreview={this.props.getPreview}
                app={this.props.app}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
}
