// Sample data for running the UI without a backend (`?mock`). Same people and playlists as the
// mockup. Requests progress on a clock: queued → searching → comparing → downloading → owned/failed.
import type {
  ActiveDownload,
  AppConfig,
  BadgeCounts,
  CollectionKind,
  CollectionResponse,
  CollectionTrack,
  DownloadRequestOptions,
  ExtensionPreview,
  JudgingCandidate,
  JudgingDetail,
  Library,
  LibraryItem,
  Me,
  PipelineState,
  Queue,
  QueueItem,
  Requester,
  ResolvedResource,
  SearchResults,
  TrackStatus,
  UserAccount,
  DownloadedCollection,
  DownloadedSong,
  DownloadedSort,
} from "@/lib/api-client";
import { fallbackJudge, fallbackTuning } from "@/lib/api-client";
import type { DownloadedFile, Judgement, JudgementFeedItem, JudgementsPage, LogEntry, StartRequest, WorkerInfo } from "@/types";
import type { DataSource } from "./index";

const ROLE_KEY = "ci-mock-role";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => Date.now() / 1000;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const PEOPLE: Record<string, Requester & { email: string; role: "admin" | "member" }> = {
  gonik: { id: 1, name: "Gonik", email: "gonik@example.com", role: "admin", avatarUrl: null },
  lu: { id: 2, name: "Lu", email: "lu@example.com", role: "member", avatarUrl: null },
  martin: { id: 3, name: "Martín", email: "martin@example.com", role: "member", avatarUrl: null },
};

function currentPerson() {
  try {
    return localStorage.getItem(ROLE_KEY) === "member" ? PEOPLE.lu : PEOPLE.gonik;
  } catch {
    return PEOPLE.gonik;
  }
}

/** Mock only: flip between Gonik (admin) and Lu (member) to see both UIs. */
export function toggleMockRole() {
  try {
    localStorage.setItem(ROLE_KEY, currentPerson().role === "admin" ? "member" : "admin");
  } catch {
    /* ignore */
  }
  window.location.reload();
}

// ------------------------------------------------------------------------------- catalogue

type Song = [title: string, artist: string, album: string, seconds: number];

const SONGS: Song[] = [
  ["Nightcall", "Kavinsky", "OutRun", 258],
  ["Midnight City", "M83", "Hurry Up, We're Dreaming", 243],
  ["Instant Crush", "Daft Punk", "Random Access Memories", 337],
  ["Breathe Deeper", "Tame Impala", "The Slow Rush", 372],
  ["The Less I Know the Better", "Tame Impala", "Currents", 216],
  ["Redbone", "Childish Gambino", "Awaken, My Love!", 327],
  ["Let It Happen", "Tame Impala", "Currents", 467],
  ["Dreams", "Fleetwood Mac", "Rumours", 254],
  ["Teardrop", "Massive Attack", "Mezzanine", 330],
  ["Genesis", "Grimes", "Visions", 255],
  ["Feel It Still", "Portugal. The Man", "Woodstock", 163],
  ["Do I Wanna Know?", "Arctic Monkeys", "AM", 272],
  ["Lost in the Fire", "Gesaffelstein", "Hyperion", 202],
  ["Space Song", "Beach House", "Depression Cherry", 320],
  ["Electric Feel", "MGMT", "Oracular Spectacular", 229],
  ["Pumped Up Kicks", "Foster the People", "Torches", 239],
  ["Ojitos lindos", "Bad Bunny", "Un Verano Sin Ti", 258],
  ["Mil horas", "Los Abuelos de la Nada", "Himno de mi corazón", 199],
  ["Persiana americana", "Soda Stereo", "Signos", 286],
  ["Adiós", "Gustavo Cerati", "Fuerza natural", 199],
  ["Crimen", "Gustavo Cerati", "Ahí vamos", 233],
  ["Seminare", "Serú Girán", "Serú Girán", 245],
  ["Lamento boliviano", "Enanitos Verdes", "Big Bang", 223],
  ["Tren al sur", "Los Prisioneros", "Corazones", 337],
  ["De música ligera", "Soda Stereo", "Canción animal", 211],
  ["Rezo por vos", "Charly García", "Parte de la religión", 268],
  ["Everything In Its Right Place", "Radiohead", "Kid A", 251],
  ["Kid A", "Radiohead", "Kid A", 284],
  ["The National Anthem", "Radiohead", "Kid A", 351],
  ["How to Disappear Completely", "Radiohead", "Kid A", 356],
  ["Treefingers", "Radiohead", "Kid A", 222],
  ["Optimistic", "Radiohead", "Kid A", 315],
  ["In Limbo", "Radiohead", "Kid A", 211],
  ["Idioteque", "Radiohead", "Kid A", 309],
  ["Morning Bell", "Radiohead", "Kid A", 275],
  ["Motion Picture Soundtrack", "Radiohead", "Kid A", 420],
  ["Blinding Lights", "The Weeknd", "After Hours", 200],
  ["Levitating", "Dua Lipa", "Future Nostalgia", 203],
  ["Physical", "Dua Lipa", "Future Nostalgia", 193],
  ["Stronger", "Kanye West", "Graduation", 311],
  ["Till I Collapse", "Eminem", "The Eminem Show", 297],
  ["Can't Hold Us", "Macklemore & Ryan Lewis", "The Heist", 258],
  ["Titanium", "David Guetta", "Nothing but the Beat", 245],
  ["Power", "Kanye West", "My Beautiful Dark Twisted Fantasy", 292],
];

const COLORS = ["#7c5a3c", "#3c5a7c", "#5a3c7c", "#3c7c5a", "#7c3c4a", "#4a6a3c", "#6a4a2c", "#2c4a6a"];

function cover(seed: string): string {
  const color = COLORS[hash(seed) % COLORS.length];
  const letter = seed.trim().charAt(0).toUpperCase() || "♪";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${color}"/><text x="32" y="42" font-family="sans-serif" font-size="28" font-weight="600" text-anchor="middle" fill="rgba(255,255,255,.85)">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function songId(song: Song): string {
  return `mk${hash(song[0] + song[1]).toString(36)}`;
}

function toTrack(song: Song): Omit<CollectionTrack, keyof TrackStatus> {
  return {
    spotifyId: songId(song),
    title: song[0],
    artist: song[1],
    album: song[2],
    durationMs: song[3] * 1000,
    imageUrl: cover(song[2]),
  };
}

interface MockCollection {
  item: LibraryItem;
  songs: Song[];
  inLibrary: boolean;
}

const pick = (indexes: number[]) => indexes.map((i) => SONGS[i]);

const COLLECTIONS: MockCollection[] = [
  { item: { kind: "liked", id: "liked", name: "Liked Songs", owner: "Gonik", imageUrl: null, trackCount: 0 }, songs: pick([0, 1, 3, 4, 7, 8, 9, 13, 14, 18, 19, 25, 36, 37, 11, 2, 16, 21]), inLibrary: true },
  { item: { kind: "playlist", id: "mkLateNightDrive", name: "Late Night Drive", owner: "Gonik", imageUrl: null, trackCount: 0 }, songs: pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 36, 37, 38, 19]), inLibrary: true },
  { item: { kind: "album", id: "mkKidA", name: "Kid A", owner: "Radiohead", imageUrl: null, trackCount: 0 }, songs: pick([26, 27, 28, 29, 30, 31, 32, 33, 34, 35]), inLibrary: true },
  { item: { kind: "playlist", id: "mkAsado", name: "Asado del sábado", owner: "Lu", imageUrl: null, trackCount: 0 }, songs: pick([16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 7, 10]), inLibrary: true },
  { item: { kind: "playlist", id: "mkRockNacional", name: "Rock nacional", owner: "Gonik", imageUrl: null, trackCount: 0 }, songs: pick([17, 18, 19, 20, 21, 22, 24, 25]), inLibrary: true },
  { item: { kind: "playlist", id: "mkGym", name: "Gym", owner: "Martín", imageUrl: null, trackCount: 0 }, songs: pick([39, 40, 41, 42, 43, 36, 37, 38, 10, 15]), inLibrary: false },
];
for (const collection of COLLECTIONS) {
  collection.item.trackCount = collection.songs.length;
  collection.item.imageUrl = collection.item.kind === "liked" ? null : cover(collection.item.name);
}

function findCollection(kind: CollectionKind, id: string): MockCollection | undefined {
  if (kind === "track") {
    const song = SONGS.find((s) => songId(s) === id);
    return song
      ? { item: { kind: "playlist", id, name: song[0], owner: song[1], imageUrl: cover(song[2]), trackCount: 1 }, songs: [song], inLibrary: false }
      : undefined;
  }
  return COLLECTIONS.find((c) => c.item.kind === kind && c.item.id === id);
}

// ------------------------------------------------------------------------------- track states

const PEERS = ["tapes_ar", "flacdepot", "vinilos_ba", "mooncrate", "lofi_vault", "deepcuts"];

/** Songs that start out downloaded, failed, or accepted with doubts. */
const OWNED = new Set(
  [0, 1, 2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 18, 19, 21, 22, 25, 36].map((i) => songId(SONGS[i])),
);
const FAILED = new Set([5, 24].map((i) => songId(SONGS[i])));
const UNCERTAIN = new Set([17, 21, 13].map((i) => songId(SONGS[i])));
/** Songs that fail when downloaded through the simulation. */
const WILL_FAIL = new Set([40].map((i) => songId(SONGS[i])));

interface Job {
  start: number;
  requester: Requester;
  manual?: { candidateId: number; by: string };
}
const jobs = new Map<string, Job>();
let paused = false;

const STEP = { searching: 0, comparing: 3, downloading: 6, done: 14 };

function jobState(id: string, job: Job): TrackStatus {
  const t = now() - job.start;
  if (t < STEP.searching) return { state: "queued", requestedBy: job.requester };
  if (t < STEP.comparing) return { state: "searching", requestedBy: job.requester };
  if (t < STEP.downloading) return { state: "comparing", requestedBy: job.requester };
  if (t < STEP.done || paused) {
    const progress = Math.min(99, Math.round(((t - STEP.downloading) / (STEP.done - STEP.downloading)) * 100));
    return { state: "downloading", progress, requestedBy: job.requester };
  }
  jobs.delete(id);
  if (WILL_FAIL.has(id) && !job.manual) FAILED.add(id);
  else {
    OWNED.add(id);
    FAILED.delete(id);
  }
  if (job.manual) MANUAL.set(id, job.manual);
  return statusOf(id);
}

const MANUAL = new Map<string, { candidateId: number; by: string }>();

function summary(id: string): TrackStatus["judging"] {
  const h = hash(id);
  const uncertain = UNCERTAIN.has(id) || MANUAL.has(id);
  const song = SONGS.find((s) => songId(s) === id);
  if (OWNED.has(id)) {
    const flac = h % 3 !== 0;
    return {
      outcome: "chosen",
      label: MANUAL.has(id) ? "wrong_version" : uncertain ? "wrong_version" : "exact",
      score: uncertain ? 0.58 + (h % 12) / 100 : 0.82 + (h % 17) / 100,
      filename: `${song?.[1]} - ${song?.[0]}.${flac ? "flac" : "mp3"}`,
      username: PEERS[h % PEERS.length],
      size: flac ? 28_000_000 + (h % 20_000_000) : 8_000_000 + (h % 4_000_000),
      format: flac ? "flac" : "mp3",
      uncertain,
      candidatesChecked: 3 + (h % 5),
    };
  }
  if (FAILED.has(id)) {
    return { outcome: "rejected", label: "wrong_version", uncertain: false, candidatesChecked: 4 };
  }
  return undefined;
}

function statusOf(id: string): TrackStatus {
  const job = jobs.get(id);
  if (job) return jobState(id, job);
  if (OWNED.has(id)) return { state: "owned", judging: summary(id), trackDbId: hash(id) % 10000 };
  if (FAILED.has(id)) return { state: "failed", judging: summary(id), trackDbId: hash(id) % 10000 };
  return { state: "missing" };
}

function countsOf(ids: string[]) {
  const counts = { total: ids.length, owned: 0, inFlight: 0, failed: 0, missing: 0, uncertain: 0 };
  for (const id of ids) {
    const status = statusOf(id);
    if (status.state === "owned") {
      counts.owned += 1;
      if (status.judging?.uncertain) counts.uncertain += 1;
    } else if (status.state === "failed") counts.failed += 1;
    else if (status.state === "missing") counts.missing += 1;
    else counts.inFlight += 1;
  }
  return counts;
}

function enqueue(ids: string[], requester: Requester): number {
  const busy = [...jobs.values()];
  const last = busy.length ? Math.max(...busy.map((j) => j.start)) : now() - 1;
  let start = Math.max(now(), last + 2);
  let queued = 0;
  for (const id of ids) {
    const state = statusOf(id).state;
    if (state !== "missing" && state !== "failed") continue;
    jobs.set(id, { start, requester });
    start += 2;
    queued += 1;
  }
  return queued;
}

const tones = new Map<string, string>();

/** A few seconds of a soft tone (pitch from the id), so the player has something to play. */
function toneUrl(seed: string): string {
  const cached = tones.get(seed);
  if (cached) return cached;
  const rate = 8000;
  const samples = rate * 8;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples * 2, true);
  const freq = 220 + (hash(seed) % 330);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 800, (samples - i) / 800);
    view.setInt16(44 + i * 2, Math.sin((2 * Math.PI * freq * i) / rate) * 6000 * fade, true);
  }
  const url = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  tones.set(seed, url);
  return url;
}

/** Everything owned right now, as the "Descargadas" view lists it. */
function downloadedSongs(): DownloadedSong[] {
  const seen = new Map<string, DownloadedSong>();
  for (const collection of COLLECTIONS) {
    for (const song of collection.songs) {
      const id = songId(song);
      if (seen.has(id) || statusOf(id).state !== "owned") continue;
      const s = summary(id);
      const requester = collection.item.owner === "Radiohead" ? "Gonik" : collection.item.owner;
      seen.set(id, {
        ...toTrack(song),
        size: s?.size ?? 8_000_000 + (hash(song[0]) % 30_000_000),
        addedAt: Math.round(now() - (hash(song[0]) % 2_592_000)),
        format: s?.format ?? "flac",
        available: true,
        requestedBy: { id: hash(requester) % 100, name: requester, avatarUrl: null },
      });
    }
  }
  return [...seen.values()];
}

function downloadedName(collection: MockCollection): string {
  return collection.item.kind === "liked" ? "Liked Songs - Gonik" : collection.item.name;
}

// Something is moving when the mock opens.
enqueue([5, 6, 10, 15, 38].map((i) => songId(SONGS[i])), PEOPLE.martin);

// ------------------------------------------------------------------------------- judging detail

function candidatesFor(id: string): JudgingCandidate[] {
  const song = SONGS.find((s) => songId(s) === id);
  if (!song) return [];
  const h = hash(id);
  const owned = OWNED.has(id);
  const base = summary(id);
  const variants: [string, string, number][] = [
    [`${song[1]} - ${song[0]} (Live).mp3`, "wrong_version", 0.41],
    [`${song[0]} (Extended Mix).flac`, "wrong_version", 0.52],
    [`${song[0]} - Tribute Band.mp3`, "wrong_artist", 0.33],
    [`${song[1]} - Greatest Hits - 07.mp3`, "different", 0.18],
  ];
  const count = 2 + (h % 3);
  const rows: JudgingCandidate[] = variants.slice(0, count).map(([filename, label, score], i) => ({
    id: (h % 100000) * 10 + i + 1,
    filename,
    username: PEERS[(h + i + 1) % PEERS.length],
    size: 6_000_000 + ((h >>> i) % 30_000_000),
    format: filename.endsWith(".flac") ? "flac" : "mp3",
    score,
    label,
    chosen: false,
    rejected: true,
    judgements: judgementsFor((h % 100000) * 10 + i + 1, label, score, false),
  }));
  if (owned && base?.filename) {
    const manual = MANUAL.get(id);
    rows.unshift({
      id: (h % 100000) * 10,
      filename: base.filename,
      username: base.username ?? "",
      size: base.size ?? 0,
      format: base.format,
      score: base.score,
      label: base.label,
      chosen: true,
      rejected: false,
      judgements: [
        ...judgementsFor((h % 100000) * 10, base.label ?? "exact", base.score ?? 0.9, true),
        ...(manual ? [manualJudgement(manual.by)] : []),
      ],
    });
  }
  return rows;
}

function judgementsFor(seed: number, label: string, score: number, accepted: boolean): Judgement[] {
  const created = Math.round(now() - (seed % 7200));
  return [
    { id: seed * 2, judge: "levenshtein", score: Math.min(1, score + 0.08), accepted, latencyMs: 1, createdAt: created },
    {
      id: seed * 2 + 1,
      judge: "smol-judge",
      model: "smol-judge:0.3",
      label,
      score,
      accepted,
      latencyMs: 380 + (seed % 900),
      promptVersion: "v4",
      raw: `{"label": "${label}", "confidence": ${score.toFixed(2)}}`,
      createdAt: created,
    },
  ];
}

function manualJudgement(by: string): Judgement {
  return { id: 999999, judge: "manual", label: "exact", score: 1, accepted: true, latencyMs: 0, raw: `{"by": "${by}"}`, createdAt: Math.round(now()) };
}

// ------------------------------------------------------------------------------- the data source

async function getCollection(kind: CollectionKind, id: string, opts: { since?: string } = {}): Promise<CollectionResponse> {
  await sleep(opts.since ? 40 : 250);
  const collection = findCollection(kind, id);
  if (!collection) throw new Error("Could not read this collection from Spotify: not found");
  const meta = {
    kind,
    id,
    name: collection.item.kind === "liked" ? "Liked Songs" : collection.item.name,
    owner: collection.item.owner,
    imageUrl: collection.item.imageUrl,
    total: collection.songs.length,
    durationMs: collection.songs.reduce((sum, s) => sum + s[3] * 1000, 0),
  };
  const ids = collection.songs.map(songId);
  const counts = countsOf(ids);
  if (opts.since) {
    return { collection: meta, counts, changes: ids.map((spotifyId) => ({ spotifyId, ...statusOf(spotifyId) })), stateToken: "mock" };
  }
  return {
    collection: meta,
    counts,
    tracks: collection.songs.map((song) => ({ ...toTrack(song), ...statusOf(songId(song)) })),
    folder: meta.name,
    folderExists: counts.owned > 0,
    nextCursor: null,
    stateToken: "mock",
  };
}

function queueItem(id: string): QueueItem | null {
  const song = SONGS.find((s) => songId(s) === id);
  if (!song) return null;
  return { spotifyId: id, title: song[0], artist: song[1], album: song[2], ...statusOf(id) };
}

const USERS: UserAccount[] = Object.values(PEOPLE).map((p, i) => ({
  id: p.id,
  email: p.email,
  name: p.name,
  avatarUrl: null,
  role: p.role,
  status: "active",
  locale: null,
  lastSeenAt: Math.round(now() - i * 5400),
}));

const config: AppConfig = {
  judgeThreshold: 0.75,
  judge: { ...fallbackJudge, backend: "smol-judge", model: "smol-judge:0.3", isLlm: true, labels: ["exact", "wrong_version", "wrong_artist", "different"], url: "http://ollama:11434", envBackend: "smol-judge" },
  auth: { scheme: "session", header: "Cookie" },
  tuning: fallbackTuning,
};

export const mock: DataSource = {
  async getMe(): Promise<Me> {
    await sleep(120);
    const person = currentPerson();
    return { id: person.id, email: person.email, name: person.name, avatarUrl: null, role: person.role, status: "active", locale: null };
  },
  async logout() {},
  async updateMe(patch) {
    const me = await mock.getMe();
    return { ...me, locale: patch.locale };
  },
  async getConfig() {
    return config;
  },
  async getLibrary(): Promise<Library> {
    await sleep(200);
    return { items: COLLECTIONS.filter((c) => c.inLibrary).map((c) => c.item), stale: false };
  },
  async getCollectionsStatus(items): Promise<Record<string, BadgeCounts>> {
    const out: Record<string, BadgeCounts> = {};
    for (const { kind, id } of items) {
      const collection = findCollection(kind as CollectionKind, id);
      if (!collection) continue;
      const { total, owned, inFlight, failed } = countsOf(collection.songs.map(songId));
      if (owned + inFlight + failed > 0) out[`${kind}:${id}`] = { total, owned, inFlight, failed };
    }
    return out;
  },
  getCollection,
  async requestDownload(source, opts: { trackIds?: string[]; options?: DownloadRequestOptions } = {}) {
    await sleep(300);
    const collection = findCollection(source.kind, source.id);
    let ids = (collection?.songs ?? []).map(songId);
    if (opts.trackIds) ids = ids.filter((id) => opts.trackIds!.includes(id));
    const extra = opts.options?.extendCount ? SONGS.slice(0, opts.options.extendCount).map(songId) : [];
    const queued = enqueue([...ids, ...extra], currentPerson());
    return { requestId: queued ? Math.round(now()) : null, queued };
  },
  async getQueue(): Promise<Queue> {
    const queue: Queue = { downloading: [], comparing: [], searching: [], queued: [] };
    for (const id of [...jobs.keys()]) {
      const item = queueItem(id);
      if (!item) continue;
      if (item.state === "downloading") queue.downloading.push(item);
      else if (item.state === "comparing") queue.comparing.push(item);
      else if (item.state === "searching") queue.searching.push(item);
      else if (item.state === "queued") queue.queued.push(item);
    }
    return queue;
  },
  async getJudging(spotifyId): Promise<JudgingDetail> {
    await sleep(150);
    const song = SONGS.find((s) => songId(s) === spotifyId);
    const status = statusOf(spotifyId);
    if (!song || status.state === "missing" || status.state === "queued") return { attempted: false, status };
    const candidates = status.state === "searching" ? [] : candidatesFor(spotifyId);
    // While comparing, verdicts arrive one by one.
    const job = jobs.get(spotifyId);
    if (status.state === "comparing" && job) {
      const shown = Math.floor(now() - job.start - STEP.comparing) + 1;
      candidates.forEach((candidate, i) => {
        if (i >= shown) {
          candidate.judgements = [];
          candidate.label = null;
          candidate.score = null;
        }
      });
    }
    return {
      attempted: true,
      status,
      trackDbId: hash(spotifyId) % 10000,
      title: song[0],
      artist: song[1],
      album: song[2],
      query: `${song[0]} - ${song[1]}`,
      relaxedQuery: song[0],
      candidates,
      rejections: status.state === "failed" ? ["No candidate passed the judge (best: wrong_version, 0.52)"] : [],
      uncertainBelow: 0.75,
    };
  },
  async acceptCandidate(spotifyId, candidateId) {
    await sleep(200);
    FAILED.delete(spotifyId);
    jobs.set(spotifyId, { start: now() - STEP.downloading, requester: currentPerson(), manual: { candidateId, by: currentPerson().name } });
    return { requestId: 1 };
  },
  async search(q): Promise<SearchResults> {
    await sleep(250);
    const needle = q.trim().toLowerCase();
    const match = (text: string) => text.toLowerCase().includes(needle);
    const tracks = SONGS.filter((s) => match(s[0]) || match(s[1]) || match(s[2]))
      .slice(0, 10)
      .map((song) => ({ ...toTrack(song), ...statusOf(songId(song)) }));
    const all = COLLECTIONS.filter((c) => c.item.kind !== "liked");
    return {
      tracks,
      albums: all.filter((c) => c.item.kind === "album" && (match(c.item.name) || match(c.item.owner))).map((c) => c.item),
      playlists: all.filter((c) => c.item.kind === "playlist" && (match(c.item.name) || match(c.item.owner))).map((c) => c.item),
    };
  },
  async getJudgements(opts = {}): Promise<JudgementsPage> {
    await sleep(200);
    const items: JudgementFeedItem[] = [];
    for (const id of OWNED) {
      const song = SONGS.find((s) => songId(s) === id);
      if (!song) continue;
      for (const candidate of candidatesFor(id)) {
        const judgement = candidate.judgements.find((j) => j.label) ?? candidate.judgements[0];
        if (!judgement) continue;
        items.push({
          ...judgement,
          submissionId: candidate.id,
          trackDbId: hash(id) % 10000,
          spotifyId: id,
          title: song[0],
          artist: song[1],
          album: song[2],
          filename: candidate.filename,
          username: candidate.username,
        });
      }
    }
    items.sort((a, b) => b.createdAt - a.createdAt);
    const filtered = items.filter((item) => (!opts.label || item.label === opts.label) && (!opts.judge || item.judge === opts.judge));
    const labels = ["exact", "wrong_version", "wrong_artist", "different"].map((label) => ({ label, count: items.filter((i) => i.label === label).length }));
    return {
      summary: {
        total: filtered.length,
        accepted: filtered.filter((i) => i.accepted).length,
        errors: 0,
        avgLatencyMs: 640,
        p95LatencyMs: 1180,
        labels,
        judges: [{ judge: "smol-judge", model: "smol-judge:0.3", count: items.length, accepted: items.filter((i) => i.accepted).length, errors: 0, avgLatencyMs: 640 }],
      },
      items: filtered.slice(0, opts.limit ?? 60),
    };
  },
  async getPipeline(): Promise<PipelineState> {
    return { downloadsPaused: paused };
  },
  async setDownloadsPaused(next) {
    paused = next;
    return { downloadsPaused: paused };
  },
  async resolveResource(id, kind): Promise<ResolvedResource> {
    await sleep(350);
    const known = findCollection(kind, id);
    if (known) return { kind, id, name: known.item.name, subtitle: known.item.owner, image: known.item.imageUrl ?? undefined, trackCount: known.songs.length };
    const gym = COLLECTIONS[5].item;
    return { kind: "playlist", id: gym.id, name: gym.name, subtitle: gym.owner, image: gym.imageUrl ?? undefined, trackCount: gym.trackCount };
  },
  async previewExtension(_id, _kind, count): Promise<ExtensionPreview> {
    await sleep(600);
    const tracks = SONGS.slice(36, 36 + count).map((s) => ({ id: songId(s), name: s[0], artist: s[1] }));
    return { name: "", seedCount: 20, seedsMatched: 14, coreSize: 9, tracks };
  },
  async getDownloads(): Promise<DownloadedFile[]> {
    await sleep(200);
    const files: DownloadedFile[] = [];
    for (const collection of COLLECTIONS) {
      for (const song of collection.songs) {
        const s = summary(songId(song));
        if (!OWNED.has(songId(song)) || !s?.filename) continue;
        files.push({ name: s.filename, size: s.size ?? 0, modified: Math.round(now() - (hash(song[0]) % 864000)), folder: collection.item.kind === "liked" ? "Liked Songs - Gonik" : collection.item.name });
      }
    }
    files.push({ name: "Unsorted - demo.mp3", size: 4_200_000, modified: Math.round(now() - 86400 * 20), folder: null });
    return files;
  },
  fileDownloadUrl: () => "#",
  folderZipUrl: () => "#",
  trackFileUrl: () => "#",
  trackStreamUrl: (spotifyId: string) => toneUrl(spotifyId),
  async getDownloadedSongs(opts: { q?: string; sort?: DownloadedSort; collection?: string; cursor?: number; limit?: number } = {}) {
    await sleep(200);
    const all = downloadedSongs();
    let songs = all;
    let collection = null;
    if (opts.collection) {
      const found = COLLECTIONS.find((c) => c.item.id === opts.collection);
      const ids = new Set((found?.songs ?? []).map(songId));
      songs = songs.filter((song) => ids.has(song.spotifyId));
      if (found) collection = { id: found.item.id, name: downloadedName(found), folder: downloadedName(found), folderExists: true };
    }
    const q = opts.q?.trim().toLowerCase();
    if (q) songs = songs.filter((song) => q.split(/\s+/).every((word) => `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(word)));
    const by = (key: (song: DownloadedSong) => string) => (a: DownloadedSong, b: DownloadedSong) => key(a).localeCompare(key(b));
    const sort = opts.sort ?? "recent";
    songs = [...songs].sort(
      sort === "artist" ? by((s) => s.artist + s.album) : sort === "album" ? by((s) => s.album + s.artist) : sort === "title" ? by((s) => s.title) : (a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0),
    );
    const start = opts.cursor ?? 0;
    const end = Math.min(songs.length, start + (opts.limit ?? 100));
    return {
      songs: songs.slice(start, end),
      total: songs.length,
      totalAll: all.length,
      totalBytes: all.reduce((sum, song) => sum + (song.size ?? 0), 0),
      nextCursor: end < songs.length ? end : null,
      collection,
    };
  },
  async getDownloadedCollections(): Promise<DownloadedCollection[]> {
    await sleep(200);
    const owned = new Map(downloadedSongs().map((song) => [song.spotifyId, song]));
    return COLLECTIONS.map((c) => {
      const songs = c.songs.map(songId).filter((id) => owned.has(id));
      const covers = [...new Set(songs.map((id) => owned.get(id)?.imageUrl).filter((url): url is string => !!url))].slice(0, 4);
      const updatedAt = Math.max(0, ...songs.map((id) => owned.get(id)?.addedAt ?? 0));
      return { id: c.item.id, name: downloadedName(c), songs: songs.length, covers, updatedAt, folder: downloadedName(c) };
    }).filter((c) => c.songs > 0);
  },
  async fillDownloadedFolder(id: string) {
    await sleep(200);
    const found = COLLECTIONS.find((c) => c.item.id === id);
    return { folder: found ? downloadedName(found) : id, folderExists: true, linked: 0 };
  },
  async fillFolder(kind: CollectionKind, id: string) {
    await sleep(200);
    const collection = findCollection(kind, id);
    return { folder: collection?.item.name ?? id, folderExists: true, linked: 0 };
  },
  async listUsers() {
    return USERS;
  },
  async inviteUser(email, role = "member") {
    const user: UserAccount = { id: USERS.length + 1, email, name: email, avatarUrl: null, role, status: "invited", locale: null, lastSeenAt: null };
    USERS.push(user);
    return user;
  },
  async updateUser(id, patch) {
    const user = USERS.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    Object.assign(user, patch);
    return user;
  },
  async getWorkers() {
    const workers: WorkerInfo[] = [
      { id: 4211, username: "worker-1", port: 41000, run_id: "req12-0", started_at_epoch_secs: Math.round(now() - 3720) },
      { id: 4212, username: "worker-2", port: 41001, run_id: "req13-0", started_at_epoch_secs: Math.round(now() - 600) },
    ];
    return { workers, queue_len: jobs.size, failed_count: FAILED.size };
  },
  async startWorkers(req: StartRequest) {
    return Array.from({ length: req.worker_count ?? 1 }, (_, i) => ({ id: 5000 + i, username: `worker-${i + 3}`, port: 41002 + i, run_id: "web-trigger-0", started_at_epoch_secs: Math.round(now()) }));
  },
  async stopWorkers(req) {
    return req.pids ?? [4211, 4212];
  },
  async getActiveDownloads(): Promise<ActiveDownload[]> {
    const queue = await mock.getQueue();
    return queue.downloading.map((item, i) => ({ judgeSubmissionId: 100 + i, filename: `${item.artist} - ${item.title}.flac`, username: PEERS[i % PEERS.length], progress: item.progress ?? 0, status: "InProgress" }));
  },
  async cancelDownload() {},
  async getLogs(): Promise<LogEntry[]> {
    return Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      timestamp: Date.now() - (12 - i) * 7000,
      level: i % 3 === 0 ? "debug" : "info",
      message: ["search: 'Redbone - Childish Gambino' → 6 results", "judge: smol-judge exact 0.94 (412 ms)", "download: tapes_ar 06 Breathe Deeper.flac 100%"][i % 3],
    }));
  },
  async setJudge(backend) {
    config.judge = { ...config.judge, backend: backend === "smol" ? "smol-judge" : backend, isLlm: backend === "smol", source: "override" };
    return config.judge;
  },
  async resetJudge() {
    config.judge = { ...config.judge, backend: "smol-judge", isLlm: true, source: "env" };
    return config.judge;
  },
};
