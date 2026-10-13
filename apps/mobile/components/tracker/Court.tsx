import type { ShotDot } from '@basket-log/core';
import { colors, court } from '@basket-log/ui';
import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

const { width: W, height: H, basket, threePointRadius: R, cornerX, paint, lineWidth } = court;

// y where the 3PT arc meets the corner lines (x = 30 / 470)
const arcY = basket.y + Math.sqrt(R * R - (basket.x - cornerX.left) ** 2);
const FT_CIRCLE_R = 60;
const RESTRICTED_R = 40;
const PLANKS = [0, 1, 2, 3, 4, 5, 6, 7];

export interface CourtProps {
  shots: ShotDot[];
  /** Team colour per side, used for the shot dots. */
  sideColors: Record<'home' | 'away', string>;
  pending?: { x: number; y: number } | null;
  /** Tap in court units (500 x 470). */
  onTap?: (x: number, y: number) => void;
  disabled?: boolean;
  /** Only draw shots of this side (the shot chart of the selected team). */
  onlySide?: 'home' | 'away' | null;
}

export function Court({ shots, sideColors, pending, onTap, disabled, onlySide }: CourtProps) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: W, h: H });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <Pressable
      accessibilityLabel="Court. Tap where the shot was taken."
      accessibilityRole="button"
      disabled={disabled || !onTap}
      onLayout={onLayout}
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        onTap?.((locationX / size.w) * W, (locationY / size.h) * H);
      }}
      style={{ width: '100%', aspectRatio: W / H, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.wood }}>
      <View pointerEvents="none" style={{ flex: 1 }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          <Rect x={0} y={0} width={W} height={H} fill={colors.wood} />
          {PLANKS.map((i) => (
            <Rect key={i} x={(W / PLANKS.length) * i} y={0} width={W / PLANKS.length} height={H} fill={colors.woodShadow} opacity={i % 2 ? 0.18 : 0} />
          ))}
          <Rect x={paint.x} y={paint.y} width={paint.width} height={paint.height} fill={colors.green} />
          <G stroke={colors.card} strokeWidth={lineWidth} fill="none">
            <Rect x={1} y={1} width={W - 2} height={H - 2} />
            <Rect x={paint.x} y={paint.y} width={paint.width} height={paint.height} />
            <Circle cx={basket.x} cy={paint.height} r={FT_CIRCLE_R} />
            <Path d={`M ${basket.x - RESTRICTED_R} ${basket.y} A ${RESTRICTED_R} ${RESTRICTED_R} 0 0 0 ${basket.x + RESTRICTED_R} ${basket.y}`} />
            <Line x1={basket.x - 30} y1={40} x2={basket.x + 30} y2={40} />
            <Circle cx={basket.x} cy={basket.y} r={7.5} stroke={colors.card} />
            <Line x1={cornerX.left} y1={0} x2={cornerX.left} y2={arcY} />
            <Line x1={cornerX.right} y1={0} x2={cornerX.right} y2={arcY} />
            <Path d={`M ${cornerX.left} ${arcY} A ${R} ${R} 0 0 0 ${cornerX.right} ${arcY}`} />
            <Path d={`M ${basket.x - FT_CIRCLE_R} ${H} A ${FT_CIRCLE_R} ${FT_CIRCLE_R} 0 0 1 ${basket.x + FT_CIRCLE_R} ${H}`} />
          </G>
          {shots
            .filter((s) => !onlySide || s.side === onlySide)
            .map((s, i) => (
              <Circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.made ? 9 : 8}
                fill={s.made ? sideColors[s.side] : 'none'}
                stroke={s.made ? colors.card : sideColors[s.side]}
                strokeWidth={s.made ? 2.5 : 3}
              />
            ))}
          {pending ? (
            <G>
              <Circle cx={pending.x} cy={pending.y} r={21} fill={colors.card} opacity={0.5} />
              <Circle cx={pending.x} cy={pending.y} r={15} fill={colors.card} stroke={colors.ink} strokeWidth={3} />
            </G>
          ) : null}
        </Svg>
      </View>
    </Pressable>
  );
}
