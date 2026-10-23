// Line-art illustrations (spec §1.4): round caps and joins, 2-2.5 stroke, no fills except eyes/nostrils.
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

// Cattle head: horns, ears, head, muzzle, eyes, nostrils. Used for the logo and list thumbnails.
export function CattleHeadIcon({ size = 64, color = colors.primary, strokeWidth = 3.2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M21 19 C15 17 12.5 12 14 7" />
        <Path d="M43 19 C49 17 51.5 12 50 7" />
        <Path d="M21 23 L10 25 L19 30" />
        <Path d="M43 23 L54 25 L45 30" />
        <Rect x={20} y={17} width={24} height={21} rx={7} />
        <Rect x={21.5} y={35} width={21} height={15} rx={7.5} />
      </G>
      <Circle cx={27} cy={27} r={2.3} fill={color} />
      <Circle cx={37} cy={27} r={2.3} fill={color} />
      <Circle cx={28} cy={43} r={2} fill={color} />
      <Circle cx={36} cy={43} r={2} fill={color} />
    </Svg>
  );
}

// Humped zebu (Sahiwal-type) side view with an optional ground line
export function CattleSide({ width = 160, color = colors.primary, ground = colors.accent, strokeWidth = 3 }) {
  return (
    <Svg width={width} height={width * 0.62} viewBox="0 0 160 100">
      <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* back, hump and rump */}
        <Path d="M36 40 Q40 31 52 30 Q55 22 62 22 Q68 22 70 29 L114 29 Q130 29 134 42 L134 58 Q134 66 126 66 L46 66 Q37 66 35 57" />
        {/* head and muzzle */}
        <Path d="M36 40 L22 41 Q13 43 14 52 Q15 57 22 57 L30 56 Q35 55 35 50" />
        <Path d="M25 41 L17 35" />
        <Path d="M27 40 L28 32" />
        <Circle cx={25} cy={47} r={1.2} />
        {/* dewlap */}
        <Path d="M33 55 Q34 64 44 66" />
        {/* legs */}
        <Path d="M46 66 L46 88" />
        <Path d="M56 66 L56 88" />
        <Path d="M114 66 L114 88" />
        <Path d="M124 66 L124 88" />
        {/* tail */}
        <Path d="M134 44 Q143 52 140 74" />
      </G>
      {ground ? <Line x1={8} y1={92} x2={152} y2={92} stroke={ground} strokeWidth={strokeWidth} strokeLinecap="round" /> : null}
    </Svg>
  );
}

// Phone with a camera viewfinder around a cow and an amber shutter (onboarding)
export function PhoneViewfinder({ size = 220 }) {
  return (
    <Svg width={size} height={size * 1.55} viewBox="0 0 140 217">
      <Rect x={10} y={4} width={120} height={209} rx={20} stroke={colors.primary} strokeWidth={5} fill={colors.surface} />
      <Line x1={56} y1={18} x2={84} y2={18} stroke={colors.iconInactive} strokeWidth={4} strokeLinecap="round" />
      <G stroke={colors.accent} strokeWidth={5} strokeLinecap="square" fill="none">
        <Path d="M28 44 L28 32 L40 32" />
        <Path d="M100 32 L112 32 L112 44" />
        <Path d="M28 128 L28 140 L40 140" />
        <Path d="M100 140 L112 140 L112 128" />
      </G>
      <G transform="translate(30 62) scale(0.5)">
        <CattleSideGroup />
      </G>
      <Circle cx={70} cy={178} r={18} stroke={colors.primary} strokeWidth={4} fill={colors.surface} />
      <Circle cx={70} cy={178} r={12} fill={colors.accent} />
    </Svg>
  );
}

// Same drawing as CattleSide without the outer Svg, for nesting
function CattleSideGroup({ color = colors.primary }) {
  return (
    <G stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path d="M36 40 Q40 31 52 30 Q55 22 62 22 Q68 22 70 29 L114 29 Q130 29 134 42 L134 58 Q134 66 126 66 L46 66 Q37 66 35 57" />
      <Path d="M36 40 L22 41 Q13 43 14 52 Q15 57 22 57 L30 56 Q35 55 35 50" />
      <Path d="M25 41 L17 35" />
      <Path d="M46 66 L46 88" />
      <Path d="M56 66 L56 88" />
      <Path d="M114 66 L114 88" />
      <Path d="M124 66 L124 88" />
      <Path d="M134 44 Q143 52 140 74" />
    </G>
  );
}

// Lower jaw with 8 incisors (cattle have no upper incisors); the central pair drawn larger
export function TeethIllustration({ width = 120, color = colors.primary }) {
  const teeth = [16, 26, 36, 47, 58, 69, 80, 90];
  return (
    <Svg width={width} height={width * 0.6} viewBox="0 0 120 72">
      <Path d="M8 22 Q60 -6 112 22 Q100 62 60 66 Q20 62 8 22 Z" stroke={color} strokeWidth={3} fill="#F6C9C4" strokeLinejoin="round" />
      {teeth.map((x, i) => {
        const central = i === 3 || i === 4;
        return <Rect key={x} x={x} y={18} width={central ? 12 : 9} height={central ? 22 : 17} rx={3} fill={colors.white} stroke={color} strokeWidth={2} />;
      })}
    </Svg>
  );
}

// Faint hills along the bottom of the splash screen
export function Hills({ width = 360, color = "rgba(255,255,255,0.25)" }) {
  return (
    <Svg width={width} height={40} viewBox="0 0 360 40">
      <Path d="M0 30 Q60 18 120 28 T240 24 T360 30" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M168 26 L168 16 M162 20 L168 14 L174 20" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M210 22 L210 10 M204 15 L210 9 L216 15" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
