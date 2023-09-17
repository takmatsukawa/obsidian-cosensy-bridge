import { FileEntity } from "./FileEntity";

export class PropertiesLinks {
  public property: string;
  public key: string;
  public fileEntities: FileEntity[];

  constructor(property: string, key: string, fileEntities: FileEntity[]) {
    this.property = property;
    this.key = key;
    this.fileEntities = fileEntities;
  }
}
