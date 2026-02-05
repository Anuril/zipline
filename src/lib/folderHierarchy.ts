import { Folder } from './db/models/folder';

export interface FolderHierarchyItem {
  id: string;
  name: string;
  path: string;
  depth: number;
}

/**
 * Builds a hierarchical, sorted list of folders with depth and path information.
 *
 * @param folders - Array of all folders
 * @param excludeIds - Optional set of folder IDs to exclude from the hierarchy
 * @returns Array of folder items with hierarchy information (id, name, path, depth)
 */
export function buildFolderHierarchy(folders: Folder[], excludeIds?: Set<string>): FolderHierarchyItem[] {
  // Group children by parent
  const childrenMap = new Map<string | null, Folder[]>();

  for (const folder of folders) {
    // Skip excluded folders
    if (excludeIds?.has(folder.id)) continue;

    const parentId = folder.parentId ?? null;
    const siblings = childrenMap.get(parentId) || [];
    siblings.push(folder);
    childrenMap.set(parentId, siblings);
  }

  // Sort children alphabetically within each level
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Depth-first traversal to build ordered list
  const result: FolderHierarchyItem[] = [];

  const traverse = (folder: Folder, depth: number, pathParts: string[]) => {
    const currentPath = [...pathParts, folder.name];
    result.push({
      id: folder.id,
      name: folder.name,
      path: currentPath.join(' / '),
      depth,
    });

    const children = childrenMap.get(folder.id) || [];
    for (const child of children) {
      traverse(child, depth + 1, currentPath);
    }
  };

  const rootFolders = childrenMap.get(null) || [];
  for (const root of rootFolders) {
    traverse(root, 0, []);
  }

  return result;
}
