/**
 * How often the star is what the user picked: counts over the journal's
 * entries, with the interval that says whether the count is enough to
 * conclude anything. Pure: `scripts/agreement.ts` reads the store and prints.
 */
import type { Entry } from "./journal.ts";

/** Fewest measured polls before any verdict but "too few". */
export const MIN_MEASURED = 30;
/** Fewest sessions the measured polls must come from. */
export const MIN_SESSIONS = 5;
/** The agreement the star has to clear, the calibration's baseline. */
const TARGET = 0.8;
const Z = 1.96;
const Z2 = Z * Z;
const TWO = 2;
const FOUR = 4;
const PERCENT = 100;

/** Hits out of a total. */
export interface Share {
  readonly hits: number;
  readonly total: number;
}

/** What the count allows to say. */
type Verdict = "few" | "enough" | "below" | "open";

/** The measure over one set of entries. */
export interface Report {
  /** Polls the autopilot looked at. */
  readonly polls: number;
  /** Of those, the rule had a star for. */
  readonly starred: number;
  /** Starred polls the user answered themselves, answer read. */
  readonly measured: Share;
  /** Measured polls by how many options they had. */
  readonly byOptions: Readonly<Record<string, Share>>;
  /** Measured polls by where the star stood: first or later. */
  readonly byPlace: Readonly<Record<string, Share>>;
  /** Measured polls by the entry's reason: `recommended` or a limit. */
  readonly byReason: Readonly<Record<string, Share>>;
  /** The measured polls where the user chose another, to read one by one. */
  readonly misses: readonly Entry[];
  /** The 95% Wilson interval of the agreement; null with nothing measured. */
  readonly interval: readonly [number, number] | null;
  readonly verdict: Verdict;
}

/**
 * The 95% Wilson interval of a share.
 * @param share hits out of a total
 * @param share.hits how many were hits
 * @param share.total how many there were
 * @returns the lower and the upper bound, 0..1; null when the total is 0
 */
export const wilson = ({
  hits,
  total,
}: Share): readonly [number, number] | null => {
  const p = hits / total;
  const scale = 1 + Z2 / total;
  const centre = (p + Z2 / (TWO * total)) / scale;
  const half =
    (Z * Math.sqrt((p * (1 - p)) / total + Z2 / (FOUR * total * total))) /
    scale;
  return total === 0 ? null : [centre - half, centre + half];
};

const verdictOf = (
  total: number,
  interval: readonly [number, number] | null,
): Verdict => {
  const [low, high] = interval ?? [0, 1];
  const steps: readonly (readonly [boolean, Verdict])[] = [
    [interval === null || total < MIN_MEASURED, "few"],
    [low >= TARGET, "enough"],
    [high < TARGET, "below"],
  ];
  return steps.find(([isMet]) => isMet)?.[1] ?? "open";
};

const isHit = (entry: Entry): boolean =>
  entry.pick !== null && entry.chosen === entry.pick;

const shareOf = (entries: readonly Entry[]): Share => ({
  hits: entries.reduce((sum, entry) => sum + Number(isHit(entry)), 0),
  total: entries.length,
});

const grouped = (
  entries: readonly Entry[],
  keyOf: (entry: Entry) => string,
): Readonly<Record<string, Share>> =>
  Object.fromEntries(
    Object.entries(Object.groupBy(entries, keyOf)).map(([key, group]) => [
      key,
      shareOf(group ?? []),
    ]),
  );

const placeOf = (entry: Entry): string =>
  entry.pick === (entry.options[0] ?? null) ? "first" : "later";

const measuredOf = (entries: readonly Entry[]): readonly Entry[] =>
  entries.filter(
    (entry) =>
      entry.pick !== null && !entry.acted && entry.chosen !== undefined,
  );

/**
 * How many sessions gave at least one measured poll.
 * @param journals one journal (its entries) per session
 * @returns the count
 */
export const sessionsOf = (journals: readonly (readonly Entry[])[]): number =>
  journals.filter((entries) => measuredOf(entries).length > 0).length;

/**
 * Measures the star against the user's own answers.
 * @param entries journal entries, any sessions, any modes but `off`
 * @returns the counts, the splits, the misses, the interval and the verdict
 */
export const reportOf = (entries: readonly Entry[]): Report => {
  const starred = entries.filter((entry) => entry.pick !== null);
  const measured = measuredOf(entries);
  const share = shareOf(measured);
  const interval = wilson(share);
  return {
    polls: entries.length,
    starred: starred.length,
    measured: share,
    byOptions: grouped(measured, (entry) => String(entry.options.length)),
    byPlace: grouped(measured, placeOf),
    byReason: grouped(measured, (entry) => entry.reason),
    misses: measured.filter((entry) => !isHit(entry)),
    interval,
    verdict: verdictOf(share.total, interval),
  };
};

const pct = (value: number): string => `${(value * PERCENT).toFixed(0)}%`;

const shareText = ({ hits, total }: Share): string =>
  total === 0 ? "-" : `${String(hits)}/${String(total)} ${pct(hits / total)}`;

const splitLines = (
  title: string,
  split: Readonly<Record<string, Share>>,
): readonly string[] => [
  `${title}:`,
  ...Object.entries(split)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([key, share]) => `  ${key}: ${shareText(share)}`),
];

const VERDICTS: Readonly<Record<Verdict, string>> = {
  few: `мало данных: меньше ${String(MIN_MEASURED)} измеренных ответов`,
  enough: `достаточно: нижняя граница выше ${pct(TARGET)}`,
  below: `ниже цели: верхняя граница ниже ${pct(TARGET)}`,
  open: `не решено: интервал накрывает ${pct(TARGET)}, набирать дальше`,
};

const coverageText = ({ polls, starred }: Report): string =>
  polls === 0 ? "-" : pct(starred / polls);

const intervalText = ({ interval }: Report): string =>
  interval === null ? "" : `, 95%: ${pct(interval[0])}..${pct(interval[1])}`;

/**
 * The report as lines for the terminal.
 * @param report what `reportOf` gave
 * @returns the totals, the splits, the verdict and each miss
 */
export const linesOfReport = (report: Report): readonly string[] => [
  `опросов: ${String(report.polls)}, со ★: ${String(report.starred)} (покрытие ${coverageText(report)})`,
  `измерено (ответил человек, есть ★): ${String(report.measured.total)}`,
  `совпало с ★: ${shareText(report.measured)}${intervalText(report)}`,
  ...splitLines("по числу вариантов", report.byOptions),
  ...splitLines("★ первый или нет", report.byPlace),
  ...splitLines("по причине", report.byReason),
  `вывод: ${VERDICTS[report.verdict]}`,
  `выбрано не ★: ${String(report.misses.length)}`,
  ...report.misses.map(
    (entry) =>
      `  «${entry.question}» ★ «${String(entry.pick)}» → «${String(entry.chosen)}»`,
  ),
];

const lineVerdictOf = (report: Report, sessions: number): string => {
  const steps: readonly (readonly [boolean, string])[] = [
    [report.verdict === "below", "держим hint"],
    [report.verdict === "enough" && sessions >= MIN_SESSIONS, "включаем auto"],
  ];
  return steps.find(([isMet]) => isMet)?.[1] ?? "мало данных";
};

/**
 * The measure in one line, for a daily note.
 * @param report what `reportOf` gave for the shadow polls
 * @param sessions how many sessions gave a measured poll
 * @returns the count, the sessions, the agreement, the interval, the call
 */
export const lineOfReport = (report: Report, sessions: number): string =>
  `замер 276.5: измерено ${String(report.measured.total)} из ${String(sessions)} сессий, совпало ${shareText(report.measured)}${intervalText(report)}, вывод: ${lineVerdictOf(report, sessions)}`;
