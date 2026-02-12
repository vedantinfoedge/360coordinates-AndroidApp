import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SIZE = 24;

export type TabIconName =
  | 'home'
  | 'search'
  | 'plus'
  | 'chats'
  | 'profile'
  | 'list'
  // New icons
  | 'camera'
  | 'image'
  | 'logout'
  | 'support'
  | 'subscription'
  | 'eye'
  | 'building'
  | 'inquiries'
  | 'chevron-right'
  | 'leads';

type Props = { name: TabIconName; color: string; size?: number };

export function TabIcon({ name, color, size = SIZE }: Props) {
  const s = size;
  switch (name) {
    case 'list':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </Svg>
      );
    case 'home':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <Path d="M9 22V12h6v10" />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M11 19a8 8 0 100-16 8 8 0 000 16z" />
          <Path d="M21 21l-4.35-4.35" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      );
    case 'chats':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <Path d="M12 11a4 4 0 100-8 4 4 0 000 8z" />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <Path d="M12 13a4 4 0 100-8 4 4 0 000 8z" />
        </Svg>
      );
    case 'image':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
          <Path d="M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          <Path d="M21 15l-5-5L5 21" />
        </Svg>
      );
    case 'logout':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <Path d="M16 17l5-5-5-5" />
          <Path d="M21 12H9" />
        </Svg>
      );
    case 'support':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      );
    case 'subscription':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </Svg>
      );
    case 'eye':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <Path d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
        </Svg>
      );
    case 'building':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 21h18" />
          <Path d="M5 21V7l8-4 8 4v14" />
          <Path d="M13 21V11" />
        </Svg>
      );
    case 'inquiries':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 18l6-6-6-6" />
        </Svg>
      );
    case 'leads':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <Path d="M9 7a4 4 0 100-8 4 4 0 000 8z" />
          <Path d="M23 21v-2a4 4 0 00-3-3.87" />
          <Path d="M16 3.13a4 4 0 010 7.75" />
        </Svg>
      );
    default:
      return null;
  }
}
