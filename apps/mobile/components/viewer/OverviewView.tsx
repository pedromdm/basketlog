import {
  biggestRuns,
  extraTeamStats,
  leadStats,
  lineScore,
  percentage,
  periodLabel,
  scoreFlow,
  shotZones,
  teamTotals,
  topPerformers,
  type PlayerLine,
  type Side,
} from '@basket-log/core';
import type { GameView } from '@basket-log/db';
import { colors, radius } from '@basket-log/ui';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { Court } from '@/components/tracker/Court';
import { TeamChip, font } from '@/components/wizard/kit';

import { clockText, feedRows } from './format';
import { Card } from './ui';

const SIDES = ['home', 'away'] as const;
const EMPTY: PlayerLine = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 };
const MUTED_BAR = '#D8D3CA';
const LOSING_INK = '#8A8478';

const Heading = ({ children }: { children: string }) => <Text style={styles.heading}>{children}</Text>;

/** Overview tab: score flow, line score, team comparison, top performers, runs, shot zones and the latest plays. */
export function OverviewView({ game, onOpenTab }: { game: GameView; onOpenTab: (tab: 'box' | 'plays' | 'shots') => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const { derived } = game;
  const started = game.status !== 'scheduled' && game.events.length > 0;

  const flow = useMemo(() => scoreFlow(derived.plays, game.rules), [derived.plays, game.rules]);
  const leads = useMemo(() => leadStats(derived.plays), [derived.plays]);
  const runs = useMemo(() => biggestRuns(derived.plays), [derived.plays]);
  const periods = useMemo(() => lineScore(derived.plays, game.rules.periods), [derived.plays, game.rules.periods]);
  const extra = useMemo(() => extraTeamStats(game.events), [game.events]);

  if (!started) {
    return (
      <Card>
        <Text style={styles.muted}>The game has not started. Stats, comparisons and the score flow appear once it does.</Text>
      </Card>
    );
  }

  const ids = (side: Side) => game.players.filter((p) => p.side === side).map((p) => p.id);
  const totals = Object.fromEntries(SIDES.map((s) => [s, teamTotals(ids(s).map((id) => derived.players[id] ?? EMPTY))])) as Record<Side, ReturnType<typeof teamTotals>>;
  const pct = (s: Side, made: keyof PlayerLine, att: keyof PlayerLine) => percentage(totals[s][made], totals[s][att]);

  // value per side, whether a bigger number is better, and how to print it
  const stat = (label: string, home: number | null, away: number | null, text: (v: number | null) => string, higherIsBetter = true) => ({
    label, home, away, text, higherIsBetter,
  });
  const percent = (v: number | null) => (v === null ? '–' : `${v.toFixed(1)}%`);
  const whole = (v: number | null) => String(v ?? 0);
  const rows = [
    stat('Field goals', pct('home', 'fgm', 'fga'), pct('away', 'fgm', 'fga'), percent),
    stat('3-pointers', pct('home', 'tpm', 'tpa'), pct('away', 'tpm', 'tpa'), percent),
    stat('Free throws', pct('home', 'ftm', 'fta'), pct('away', 'ftm', 'fta'), percent),
    stat('Rebounds', totals.home.reb, totals.away.reb, whole),
    stat('Assists', totals.home.ast, totals.away.ast, whole),
    stat('Steals', totals.home.stl, totals.away.stl, whole),
    stat('Blocks', totals.home.blk, totals.away.blk, whole),
    stat('Turnovers', totals.home.tov, totals.away.tov, whole, false),
    ...(extra.paint.home + extra.paint.away > 0 ? [stat('Points in the paint', extra.paint.home, extra.paint.away, whole)] : []),
    ...(extra.fastBreak.home + extra.fastBreak.away > 0 ? [stat('Fast-break points', extra.fastBreak.home, extra.fastBreak.away, whole)] : []),
    stat('Personal fouls', totals.home.pf, totals.away.pf, whole, false),
  ];

  const lead = derived.score.home === derived.score.away ? null : derived.score.home > derived.score.away ? 'home' : 'away';
  const biggest = leads.biggestLead.home >= leads.biggestLead.away ? 'home' : 'away';
  const last = derived.plays.at(-1);
  const recent = feedRows(derived.plays).slice(0, 5);
  const color = (s: Side) => game.teams[s].color;

  const comparison = (
    <Card>
      <Heading>Team comparison</Heading>
      <View style={styles.legend}>
        {SIDES.map((s) => (
          <View key={s} style={[styles.legendTeam, s === 'away' && { flexDirection: 'row-reverse' }]}>
            <TeamChip abbr={game.teams[s].abbr} color={color(s)} size={26} />
            <Text style={styles.legendName}>{game.teams[s].name}</Text>
          </View>
        ))}
      </View>
      {rows.map((r) => {
        const max = Math.max(r.home ?? 0, r.away ?? 0) || 1;
        const better: Side | null =
          r.home === r.away || r.home === null || r.away === null ? null : (r.higherIsBetter ? r.home > r.away : r.home < r.away) ? 'home' : 'away';
        const share = (v: number | null) => `${Math.round(((v ?? 0) / max) * 100)}%` as const;
        return (
          <View key={r.label} style={{ gap: 4 }}>
            <View style={styles.statRow}>
              <Text style={[styles.statValue, { color: better === 'home' ? colors.green : better === 'away' ? LOSING_INK : colors.ink }]}>{r.text(r.home)}</Text>
              <Text style={styles.statLabel}>{r.label}</Text>
              <Text style={[styles.statValue, { color: better === 'away' ? colors.ink : better === 'home' ? LOSING_INK : colors.ink }]}>{r.text(r.away)}</Text>
            </View>
            <View style={styles.bars}>
              <View style={[styles.track, { justifyContent: 'flex-end' }]}>
                <View style={{ width: share(r.home), height: '100%', borderRadius: 4, backgroundColor: better === 'home' ? colors.green : MUTED_BAR }} />
              </View>
              <View style={styles.track}>
                <View style={{ width: share(r.away), height: '100%', borderRadius: 4, backgroundColor: better === 'away' ? colors.ink : MUTED_BAR }} />
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );

  const flowCard = (
    <Card>
      <Heading>Score flow</Heading>
      <FlowChart flow={flow} labels={periods.map((p) => periodLabel(game.rules, p.period))} homeAbbr={game.teams.home.abbr} awayAbbr={game.teams.away.abbr} />
      <View style={styles.chips3}>
        <Kpi value={leads.biggestLead[biggest] > 0 ? `+${leads.biggestLead[biggest]}` : '0'} label={`${game.teams[biggest].abbr} largest lead`} />
        <Kpi value={String(leads.leadChanges)} label="Lead changes" />
        <Kpi value={String(leads.ties)} label="Times tied" />
      </View>
    </Card>
  );

  const lineCard = (
    <Card>
      <Heading>Line score</Heading>
      <View>
        <View style={styles.lineRow}>
          <Text style={[styles.lineTeam, { flex: 1.4 }]} />
          {periods.map((p) => (
            <Text key={p.period} style={styles.lineHead}>{periodLabel(game.rules, p.period)}</Text>
          ))}
          <Text style={styles.lineHead}>T</Text>
        </View>
        {SIDES.map((s) => (
          <View key={s} style={[styles.lineRow, styles.lineRule]}>
            <Text style={[styles.lineTeam, { flex: 1.4 }]}>{game.teams[s].abbr}</Text>
            {periods.map((p) => {
              const won = p[s] > p[s === 'home' ? 'away' : 'home'];
              return (
                <Text key={p.period} style={[styles.lineCell, won && styles.lineWon]}>{p[s]}</Text>
              );
            })}
            <Text style={[styles.lineTotal, lead && lead !== s && { color: colors.muted }]}>{derived.score[s]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>Green marks the period each team won.</Text>
    </Card>
  );

  const performersCard = (
    <Card>
      <Heading>Top performers</Heading>
      {SIDES.flatMap((s) =>
        topPerformers(derived.players, ids(s), 3).map(({ playerId, line }, i) => {
          const p = game.players.find((x) => x.id === playerId);
          return (
            <View key={playerId} style={[styles.perf, !(s === 'home' && i === 0) && styles.perfRule]}>
              <TeamChip abbr={String(p?.number ?? '')} color={color(s)} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.perfName} numberOfLines={1}>
                  {p?.displayName} <Text style={styles.perfTeam}>{game.teams[s].abbr}</Text>
                </Text>
                <Text style={styles.perfLine} numberOfLines={1}>{statLine(line)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.perfPts}>{line.pts}</Text>
                <Text style={styles.perfPtsLabel}>PTS</Text>
              </View>
            </View>
          );
        }),
      )}
      <Pressable accessibilityRole="button" onPress={() => onOpenTab('box')}>
        <Text style={styles.link}>Full box score ›</Text>
      </Pressable>
    </Card>
  );

  const runsCard = (
    <Card>
      <Heading>Runs and momentum</Heading>
      <View style={styles.chips3}>
        {SIDES.map((s) => (
          <View key={s} style={[styles.runBox, s === 'home' ? { backgroundColor: colors.greenTint } : { backgroundColor: colors.line2 }]}>
            <Text style={[styles.runValue, s === 'home' && { color: colors.greenDark }]}>{runs[s].points}–0</Text>
            <Text style={styles.runTitle}>{game.teams[s].abbr} best run</Text>
            {runs[s].points > 0 ? <Text style={styles.runWhen}>{periodLabel(game.rules, runs[s].period)} {clockText(runs[s].clockMs)}</Text> : null}
          </View>
        ))}
      </View>
      {last ? (
        <Text style={styles.note}>
          {lead
            ? `${game.teams[lead].abbr} leads ${derived.score[lead]}–${derived.score[lead === 'home' ? 'away' : 'home']}.`
            : `Tied at ${derived.score.home}.`}{' '}
          Biggest lead of the game: {game.teams[biggest].abbr} +{leads.biggestLead[biggest]}.
        </Text>
      ) : null}
    </Card>
  );

  const zones = shotZones(derived.shots.filter((s) => s.side === 'home'));
  const zoneRows = [
    { label: 'Paint', z: zones.paint },
    { label: 'Mid-range', z: zones.midRange },
    { label: 'Corner 3', z: zones.corner3 },
    { label: 'Above-break 3', z: zones.aboveBreak3 },
  ];
  const shotsCard = derived.shots.some((s) => s.side === 'home') ? (
    <Card>
      <Heading>{`Shot zones · ${game.teams.home.abbr}`}</Heading>
      <View style={styles.zoneRow}>
        <View style={{ width: 150 }}>
          <Court shots={derived.shots} sideColors={{ home: game.teams.home.color, away: game.teams.away.color }} onlySide="home" />
        </View>
        <View style={styles.zoneGrid}>
          {zoneRows.map(({ label, z }) => (
            <View key={label} style={styles.zoneBox}>
              <Text style={styles.zoneValue}>{z.attempts ? `${Math.round((z.made / z.attempts) * 100)}%` : '–'}</Text>
              <Text style={styles.zoneLabel}>{label} {z.made}/{z.attempts}</Text>
            </View>
          ))}
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => onOpenTab('shots')}>
        <Text style={styles.link}>Open shot chart ›</Text>
      </Pressable>
    </Card>
  ) : null;

  const playsCard = (
    <Card>
      <Heading>Latest plays</Heading>
      {recent.map((r) => (
        <View key={r.groupId} style={styles.play}>
          <View style={[styles.playBar, { backgroundColor: color(r.side) }]} />
          <Text style={styles.playClock}>{r.clock}</Text>
          <Text style={[styles.playText, r.points > 0 && { fontFamily: font.bodyBold }]}>{r.text}</Text>
          <Text style={styles.playScore}>{r.score}</Text>
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={() => onOpenTab('plays')}>
        <Text style={styles.link}>All plays ›</Text>
      </Pressable>
    </Card>
  );

  if (wide) {
    return (
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 14 }}>
          {comparison}
          {playsCard}
        </View>
        <View style={{ flex: 1, gap: 14 }}>
          {flowCard}
          {lineCard}
          {performersCard}
          {runsCard}
          {shotsCard}
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      {flowCard}
      {lineCard}
      {comparison}
      {performersCard}
      {runsCard}
      {shotsCard}
      {playsCard}
    </View>
  );
}

function statLine(l: PlayerLine): string {
  const parts = [`FG ${l.fgm}–${l.fga}`];
  if (l.tpa > 0) parts.push(`3P ${l.tpm}–${l.tpa}`);
  if (l.oreb + l.dreb > 0) parts.push(`${l.oreb + l.dreb} reb`);
  if (l.ast > 0) parts.push(`${l.ast} ast`);
  if (l.stl > 0) parts.push(`${l.stl} stl`);
  if (l.blk > 0) parts.push(`${l.blk} blk`);
  return parts.join(' · ');
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const W = 340;
const H = 150;

/** The score difference over the game: green while home leads, dark while away leads, one band per period. */
function FlowChart({ flow, labels, homeAbbr, awayAbbr }: { flow: ReturnType<typeof scoreFlow>; labels: string[]; homeAbbr: string; awayAbbr: string }) {
  // scale so the biggest lead fills most of the half height, never less than 6 points
  const scale = (H / 2 - 18) / Math.max(6, flow.maxLead);
  const pts = flow.points.map((p) => `${(p.x * W).toFixed(1)},${(H / 2 - p.diff * scale).toFixed(1)}`);
  const area = `${pts.join(' ')} ${W},${H / 2}`;
  const biggest = flow.points.reduce((best, p) => (Math.abs(p.diff) > Math.abs(best.diff) ? p : best), flow.points[0]!);
  const starts = [0, ...flow.periodEnds.slice(0, -1)];
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} accessibilityLabel={`Score flow, largest lead ${Math.abs(biggest.diff)}`}>
      <Defs>
        <ClipPath id="up"><Rect x={0} y={0} width={W} height={H / 2} /></ClipPath>
        <ClipPath id="down"><Rect x={0} y={H / 2} width={W} height={H / 2} /></ClipPath>
      </Defs>
      <G stroke={colors.line} strokeWidth={1}>
        {flow.periodEnds.slice(0, -1).map((x) => (
          <Line key={x} x1={x * W} y1={0} x2={x * W} y2={H} />
        ))}
      </G>
      <Polygon points={area} fill={colors.green} opacity={0.22} clipPath="url(#up)" />
      <Polygon points={area} fill={colors.ink} opacity={0.18} clipPath="url(#down)" />
      <Line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={colors.muted} strokeWidth={1} />
      <Polyline points={pts.join(' ')} fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinejoin="round" />
      {Math.abs(biggest.diff) > 0 ? (
        <Circle cx={biggest.x * W} cy={H / 2 - biggest.diff * scale} r={4.5} fill={biggest.diff > 0 ? colors.green : colors.ink} stroke={colors.card} strokeWidth={2} />
      ) : null}
      {starts.map((x0, i) => (
        <SvgText key={i} x={((x0 + (flow.periodEnds[i] ?? 1)) / 2) * W} y={H - 4} fontSize={10} fontWeight="700" fill={colors.muted} textAnchor="middle">
          {labels[i] ?? ''}
        </SvgText>
      ))}
      <SvgText x={4} y={12} fontSize={10} fontWeight="700" fill={colors.green}>{homeAbbr} ahead</SvgText>
      <SvgText x={4} y={H - 16} fontSize={10} fontWeight="700" fill={colors.ink}>{awayAbbr} ahead</SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1.4, color: colors.muted, textTransform: 'uppercase' },
  muted: { fontFamily: font.body, fontSize: 14, color: colors.muted },
  caption: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  note: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: colors.ink3 },
  link: { fontFamily: font.bodyBold, fontSize: 14, color: colors.green, minHeight: 32, paddingTop: 4 },
  chips3: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, backgroundColor: colors.paper, borderRadius: radius.small, paddingHorizontal: 10, paddingVertical: 8 },
  kpiValue: { fontFamily: font.display, fontSize: 22, color: colors.ink },
  kpiLabel: { fontFamily: font.bodyBold, fontSize: 11, color: colors.muted },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendTeam: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendName: { fontFamily: font.displayBold, fontSize: 16, color: colors.ink },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statValue: { fontFamily: font.display, fontSize: 18, minWidth: 56 },
  statLabel: { fontFamily: font.bodyBold, fontSize: 12, color: colors.muted },
  bars: { flexDirection: 'row', gap: 4, height: 8 },
  track: { flex: 1, flexDirection: 'row', backgroundColor: colors.line2, borderRadius: 4, overflow: 'hidden' },
  lineRow: { flexDirection: 'row', alignItems: 'center' },
  lineRule: { borderTopWidth: 1, borderTopColor: colors.line2 },
  lineHead: { flex: 1, textAlign: 'center', fontFamily: font.bodyBold, fontSize: 11, color: colors.muted, paddingVertical: 4 },
  lineTeam: { fontFamily: font.displayBold, fontSize: 17, color: colors.ink, paddingVertical: 10 },
  lineCell: { flex: 1, textAlign: 'center', fontFamily: font.body, fontSize: 14, color: colors.ink, paddingVertical: 10 },
  lineWon: { fontFamily: font.bodyBold, backgroundColor: colors.greenTint },
  lineTotal: { flex: 1, textAlign: 'center', fontFamily: font.display, fontSize: 20, color: colors.ink },
  perf: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perfRule: { borderTopWidth: 1, borderTopColor: colors.line2, paddingTop: 12 },
  perfName: { fontFamily: font.bodyBold, fontSize: 16, color: colors.ink },
  perfTeam: { fontFamily: font.bodyBold, fontSize: 12, color: colors.muted },
  perfLine: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  perfPts: { fontFamily: font.display, fontSize: 30, lineHeight: 30, color: colors.ink },
  perfPtsLabel: { fontFamily: font.bodyBold, fontSize: 10, letterSpacing: 1.2, color: colors.muted },
  runBox: { flex: 1, borderRadius: radius.small, padding: 12 },
  runValue: { fontFamily: font.display, fontSize: 28, lineHeight: 28, color: colors.ink },
  runTitle: { fontFamily: font.bodyBold, fontSize: 12, color: colors.ink },
  runWhen: { fontFamily: font.body, fontSize: 11, color: colors.muted },
  zoneRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  zoneGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneBox: { width: '47%', flexGrow: 1, backgroundColor: colors.paper, borderRadius: radius.small, paddingHorizontal: 10, paddingVertical: 8 },
  zoneValue: { fontFamily: font.display, fontSize: 20, color: colors.ink },
  zoneLabel: { fontFamily: font.bodyBold, fontSize: 11, color: colors.muted },
  play: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  playBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  playClock: { width: 38, fontFamily: font.bodyBold, fontSize: 12, color: colors.muted },
  playText: { flex: 1, fontFamily: font.body, fontSize: 14, lineHeight: 19, color: colors.ink },
  playScore: { fontFamily: font.displayBold, fontSize: 15, color: colors.ink },
});
