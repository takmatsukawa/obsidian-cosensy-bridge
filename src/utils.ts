// is there a better way to get link text?
export function filePathToLinkText(path: string): string {
  return path.replace(/\.md$/, "").replace(/.*\//, "");
}

// Remove block reference. e.g. `[[somefile#^7e8e5f]]`
export function removeBlockReference(src: string): string {
  return src.replace(/#.*$/, "");
}

export function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((excludePath: string) => {
    if (excludePath.endsWith("/")) {
      return path.startsWith(excludePath);
    } else {
      return path === excludePath;
    }
  });
}
