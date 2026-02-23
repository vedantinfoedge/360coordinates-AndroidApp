/**
 * Auth input field icons - matching design reference
 * Used in labels and inside input wrappers
 */
import React from 'react';
import Svg, {Path, Line, Rect, Circle, Polyline} from 'react-native-svg';

type IconName = 'envelope' | 'padlock' | 'person' | 'phone' | 'shield' | 'eye' | 'eye-off';

type Props = {
  name: IconName;
  color?: string;
  size?: number;
  opacity?: number;
};

const ICON_COLOR = 'rgba(255,255,255,0.5)';

export function AuthFieldIcon({name, color = ICON_COLOR, size = 15, opacity = 1}: Props) {
  const strokeWidth = size <= 11 ? 2 : 2;
  const fill = 'none';
  const stroke = color;
  const viewBox = '0 0 24 24';

  const common = {
    width: size,
    height: size,
    viewBox,
    fill,
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity,
  };

  switch (name) {
    case 'envelope':
      return (
        <Svg {...common}>
          <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <Polyline points="22,6 12,13 2,6" />
        </Svg>
      );
    case 'padlock':
      return (
        <Svg {...common}>
          <Rect x="3" y="11" width="18" height="11" rx="2" />
          <Path d="M7 11V7a5 5 0 0110 0v4" />
        </Svg>
      );
    case 'person':
      return (
        <Svg {...common}>
          <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      );
    case 'phone':
      return (
        <Svg {...common}>
          <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </Svg>
      );
    case 'shield':
      return (
        <Svg {...common}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      );
    case 'eye':
      return (
        <Svg {...common}>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <Circle cx="12" cy="12" r="3" />
        </Svg>
      );
    case 'eye-off':
      return (
        <Svg {...common}>
          <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
          <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
          <Line x1="1" y1="1" x2="23" y2="23" />
        </Svg>
      );
    default:
      return null;
  }
}
