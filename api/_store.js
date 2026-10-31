const TTL = 6 * 60 * 60;

const CAS = `
local v = redis.call('HGET', KEYS[1], 'ver')
if (v == false and ARGV[1] == '0') or v == ARGV[1] then
  redis.call('HSET', KEYS[1], 'ver', ARGV[2], 'data', ARGV[3])
  redis.call('EXPIRE', KEYS[1], ARGV[4])
  return 1
end
return 0`;

function redisStore(url, token) {
  const cmd = async (args) => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error || 'redis ' + r.status);
    return j.result;
  };
  const key = (code) => `coup:room:${code}`;
  return {
    kind: 'redis',
    async get(code) {
      const res = await cmd(['HMGET', key(code), 'ver', 'data']);
      if (!res || res[1] == null) return null;
      return { ver: Number(res[0]), room: JSON.parse(res[1]) };
    },
    async cas(code, expectVer, room) {
      const ok = await cmd(['EVAL', CAS, '1', key(code), String(expectVer), String(expectVer + 1), JSON.stringify(room), String(TTL)]);
      return ok === 1;
    },
  };
}

const mem = globalThis.__coupRooms || (globalThis.__coupRooms = new Map());
function memoryStore() {
  return {
    kind: 'memory',
    async get(code) {
      const e = mem.get(code);
      if (!e) return null;
      if (Date.now() - e.at > TTL * 1000) { mem.delete(code); return null; }
      return { ver: e.ver, room: JSON.parse(e.data) };
    },
    async cas(code, expectVer, room) {
      const e = mem.get(code);
      if ((e ? e.ver : 0) !== expectVer) return false;
      mem.set(code, { ver: expectVer + 1, data: JSON.stringify(room), at: Date.now() });
      return true;
    },
  };
}

export function getStore() {
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisStore(url, token);
  if (env.VERCEL) return null;
  return memoryStore();
}
