import type { ReactElement } from 'react';
import Svg, { Path } from 'react-native-svg';
import { categoryIconLibrary } from './category-icon-library';

const icons = {
  restaurant: ['Food', 'M3 11h18a9 9 0 0 1-18 0Zm5-4 1-3m4 3 1-3'],
  bus: ['Transport', 'M4 12h16M7.5 19v3m9-3v3M7.5 5h9A3.5 3.5 0 0 1 20 8.5v7a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 15.5v-7A3.5 3.5 0 0 1 7.5 5Z'],
  receipt: ['Receipt', 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6'],
  bag: ['Shopping', 'M5 8h14l-1 12H6L5 8Zm4 .25V6a3 3 0 0 1 6 0v2.25'],
  heart: ['Heart', 'M20.8 5.6a4.8 4.8 0 0 0-6.8 0l-2 2-2-2a4.8 4.8 0 0 0-6.8 6.8L12 21l8.8-8.6a4.8 4.8 0 0 0 0-6.8Z'],
  coffee: ['Coffee', 'M4 7h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V7Zm12 1h2a3 3 0 0 1 0 6h-2M3 21h17M8 3h.01M12 3h.01'],
  home: ['Home', 'M3 10.5 12 3l9 7.5M5 9v12h14V9M9 21v-7h6v7'],
  gift: ['Gift', 'M4 10h16v11H4V10ZM3 6h18v4H3V6Zm9 0v15m0-15c-6 0-7-4-4-4 2 0 4 4 4 4Zm0 0c6 0 7-4 4-4-2 0-4 4-4 4Z'],
  plane: ['Travel', 'M21 3 3 10l7 3 3 8 8-18ZM10 13l11-10'],
  book: ['Book', 'M6 3h13v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm-3 15a3 3 0 0 1 3-3h13M8 7h7'],
  paw: ['Pet', 'M12 11c-2 0-3 3-5 4-4 3-2 7 2 5 2-1 4-1 6 0 4 2 6-2 2-5-2-1-3-4-5-4ZM4 10h.01M8 5h.01M16 5h.01M20 10h.01'],
  'ellipsis-horizontal': ['Other', 'M5 12h.01M12 12h.01M19 12h.01'],
} as const;

type IconName = keyof typeof icons;
export const defaultCategoryIcon = 'ellipsis-horizontal';
const libraryIcons = categoryIconLibrary.flatMap(({ group, icons }) =>
  [...icons].map(([name, label, Icon]) => ({ group, name, label, Icon })),
);
const libraryByName = new Map<string, (size: number, color: string) => ReactElement>(
  libraryIcons.map(({ name, Icon }) => [
    name,
    (size, color) => <Icon size={size} color={color} strokeWidth={1.8} />,
  ]),
);

export const categoryIconGroups = ['Popular', ...categoryIconLibrary.map(({ group }) => group)];
export const categoryIcons = [
  ...(Object.keys(icons) as IconName[]).map(name => ({ name, label: icons[name][0], group: 'Popular' })),
  ...libraryIcons,
];

export function CategoryIcon({ name, color, size = 19 }: { name: string; color: string; size?: number }) {
  const renderIcon = libraryByName.get(name);
  if (renderIcon) return renderIcon(size, color);
  const icon = Object.hasOwn(icons, name) ? icons[name as IconName] : icons[defaultCategoryIcon];
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={icon[1]} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
