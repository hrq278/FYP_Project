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

// ------------------------------------------------------------------------------- camera overlays
// Dashed white silhouettes with a 20% fill (spec §4.8), drawn on a 200x200 grid and scaled to the viewfinder.
const OVERLAY = { stroke: "#FFFFFF", strokeWidth: 3, strokeDasharray: "9 7", strokeLinecap: "round", strokeLinejoin: "round", fill: "rgba(255,255,255,0.2)" };

const FRONT = [
  "M74 46 Q66 30 56 22 M126 46 Q134 30 144 22", // horns
  "M74 52 L52 60 L72 70 M126 52 L148 60 L128 70", // ears
  "M74 46 L126 46 L122 98 Q100 108 78 98 Z", // head
  "M66 104 Q56 120 58 150 L142 150 Q144 120 134 104 Q100 92 66 104 Z", // chest
  "M66 150 L66 186 M84 150 L84 186 M116 150 L116 186 M134 150 L134 186" // legs
];
const BACK = [
  "M60 52 Q100 36 140 52 L146 120 Q100 132 54 120 Z", // rump
  "M100 54 Q104 90 98 128", // tail
  "M62 120 L60 186 M82 124 L82 186 M118 124 L118 186 M138 120 L140 186" // hind legs
];
const SIDE = [
  "M46 80 Q50 66 66 64 Q70 52 80 52 Q88 52 90 62 L148 62 Q170 62 174 82 L174 112 Q174 122 164 122 L60 122 Q48 122 46 110",
  "M46 80 L28 82 Q16 86 18 98 Q20 106 30 106 L40 104 Q46 102 46 96",
  "M30 82 L22 72",
  "M60 122 L60 160 M74 122 L74 160 M150 122 L150 160 M164 122 L164 160",
  "M174 86 Q186 98 182 128"
];

export function CaptureOverlay({ view, size = 280 }) {
  const paths = view === "front" ? FRONT : view === "back" ? BACK : SIDE;
  // Right side is the left-side silhouette mirrored
  const mirror = view === "right" ? "translate(200 0) scale(-1 1)" : undefined;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" pointerEvents="none">
      <G transform={mirror}>
        {paths.map((d) => (
          <Path key={d} d={d} {...OVERLAY} fill={d.includes("Z") || d === SIDE[0] ? OVERLAY.fill : "none"} />
        ))}
      </G>
    </Svg>
  );
}

// Mouth outline for the teeth step: lips, gum line and 8 incisors
export function MouthOverlay({ width = 300 }) {
  const teeth = [52, 70, 88, 106, 124, 142];
  return (
    <Svg width={width} height={width * 0.48} viewBox="0 0 250 120" pointerEvents="none">
      <Path d="M10 60 Q125 -6 240 60 Q125 126 10 60 Z" {...OVERLAY} />
      <Path d="M40 56 Q125 30 210 56" {...OVERLAY} fill="none" />
      <Rect x={34} y={58} width={14} height={22} rx={4} {...OVERLAY} />
      {teeth.map((x) => (
        <Rect key={x} x={x} y={52} width={14} height={30} rx={4} {...OVERLAY} />
      ))}
      <Rect x={160} y={58} width={14} height={22} rx={4} {...OVERLAY} />
      <Rect x={178} y={60} width={14} height={18} rx={4} {...OVERLAY} />
    </Svg>
  );
}

// Amber corner brackets around the viewfinder
export function CornerBrackets({ width, height, color = colors.accentBright, length = 44, thickness = 6 }) {
  const t = thickness / 2;
  const d = [
    `M${t} ${length} L${t} ${t} L${length} ${t}`,
    `M${width - length} ${t} L${width - t} ${t} L${width - t} ${length}`,
    `M${t} ${height - length} L${t} ${height - t} L${length} ${height - t}`,
    `M${width - length} ${height - t} L${width - t} ${height - t} L${width - t} ${height - length}`
  ];
  return (
    <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
      {d.map((p) => (
        <Path key={p} d={p} stroke={color} strokeWidth={thickness} fill="none" strokeLinecap="square" />
      ))}
    </Svg>
  );
}
