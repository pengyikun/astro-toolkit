export type NavMatchMode = 'exact' | 'segment';

export function isNavPathActive(
  itemPath: string,
  currentPath: string,
  matchMode: NavMatchMode = 'segment',
): boolean {
  if (itemPath === '/') {
    return currentPath === '/';
  }

  if (matchMode === 'exact') {
    return currentPath === itemPath;
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}
