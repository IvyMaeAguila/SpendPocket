import Svg, { Circle, Path } from 'react-native-svg';

export function EmptyPouch({ size = 96 }: { size?: number }) {
  return <Svg width={size} height={size * 203 / 217} viewBox="0 0 217 203">
    <Circle cx={113} cy={29} r={28} fill="#c8f17c" />
    <Path d="M0 59H216V142C216 175 189 202 156 202H60C27 202 0 175 0 142Z" fill="#d4eee0" />
    <Path d="M0 81H216" fill="none" stroke="#3b966b" strokeWidth={4} strokeDasharray={[11, 11]} />
    <Path d="M69 146Q108 172 147 146" fill="none" stroke="#3b966b" strokeWidth={7} strokeLinecap="round" />
  </Svg>;
}
