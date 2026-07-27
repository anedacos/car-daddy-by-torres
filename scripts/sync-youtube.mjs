import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const categories = [
  {
    id: 'automotive',
    title: 'Automotive Mechanics',
    titleEs: 'Mecánica automotriz',
    playlistId: 'PLUYsE3yUAE7A',
  },
  {
    id: 'marine',
    title: 'Boat & Marine Mechanics',
    titleEs: 'Mecánica de botes y marina',
    playlistId: 'PLAd23alVtHMs',
  },
  {
    id: 'powersports',
    title: 'Motorcycles, ATVs & Quads',
    titleEs: 'Motocicletas, ATVs y quads',
    playlistId: 'PLHLjLf2I-1I8',
  },
  {
    id: 'equipment',
    title: 'Small Engines & Equipment',
    titleEs: 'Motores pequeños y equipos',
    playlistId: 'PLJ_xgXUYc-0c',
  },
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'src/data/youtube-videos.json');

function parseInitialData(html) {
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('YouTube initial data was not found.');
  const jsonStart = start + marker.length;
  const jsonEnd = html.indexOf(';</script>', jsonStart);
  if (jsonEnd === -1) throw new Error('YouTube initial data was incomplete.');
  return JSON.parse(html.slice(jsonStart, jsonEnd));
}

function textValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.simpleText) return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map((run) => run.text || '').join('');
  if (value.content) return value.content;
  return '';
}

function durationToSeconds(duration) {
  return duration
    .split(':')
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

function collectByKey(value, targetKey, results = []) {
  if (!value || typeof value !== 'object') return results;
  for (const [key, child] of Object.entries(value)) {
    if (key === targetKey) results.push(child);
    collectByKey(child, targetKey, results);
  }
  return results;
}

function parseModernVideo(item) {
  const id = item.contentId
    || collectByKey(item, 'watchEndpoint').find((endpoint) => endpoint?.videoId)?.videoId;
  const metadata = item.metadata?.lockupMetadataViewModel;
  const duration = collectByKey(item.contentImage, 'thumbnailBadgeViewModel')
    .map((badge) => badge.text)
    .find((text) => /^\d+(?::\d+)+$/.test(text || '')) || '';
  return {
    id,
    title: textValue(metadata?.title),
    duration,
  };
}

function parseLegacyVideo(item) {
  return {
    id: item.videoId,
    title: textValue(item.title),
    duration: textValue(item.lengthText),
  };
}

async function fetchPlaylist(category) {
  const url = `https://www.youtube.com/playlist?list=${category.playlistId}`;
  const response = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 (compatible; CarDaddyVideoSync/1.0)',
    },
  });
  if (!response.ok) throw new Error(`${category.title}: YouTube returned ${response.status}.`);

  const data = parseInitialData(await response.text());
  const modern = collectByKey(data, 'lockupViewModel').map(parseModernVideo);
  const legacy = collectByKey(data, 'playlistVideoRenderer').map(parseLegacyVideo);
  const seen = new Set();
  const videos = [...modern, ...legacy]
    .filter((video) => video.id && video.title && !seen.has(video.id) && seen.add(video.id))
    .map((video) => ({
      ...video,
      category: category.id,
      playlistId: category.playlistId,
      thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}&list=${category.playlistId}`,
      isShort: Boolean(video.duration && durationToSeconds(video.duration) <= 60),
    }));

  if (!videos.length) console.warn(`${category.title}: no public videos are currently visible.`);
  return { ...category, videos };
}

const syncedCategories = [];
for (const category of categories) {
  syncedCategories.push(await fetchPlaylist(category));
}

const payload = {
  channelName: 'Anthony en Movimiento',
  channelUrl: 'https://www.youtube.com/@anedacos',
  syncedAt: new Date().toISOString(),
  categories: syncedCategories,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Synced ${syncedCategories.reduce((total, category) => total + category.videos.length, 0)} videos.`);
