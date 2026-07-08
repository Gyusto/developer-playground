import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { WEBHOOK_ALLOWED_PRIVATE_CIDRS } from './config';

/** Private / reserved IPv4 ranges that must never be reached by a webhook. */
const BLOCKED_IPV4_CIDRS = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '0.0.0.0/8',
  '100.64.0.0/10',
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255 || !/^\d+$/.test(part)) return null;
    n = (n << 8) | octet;
  }
  return n >>> 0;
}

/** True when `ip` (IPv4 dotted string) falls inside the given `a.b.c.d/n` CIDR. */
function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = bitsStr === undefined ? 32 : Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** Expand any IPv6 form (incl. `::`, embedded IPv4) to 8 numeric hextets. */
function expandIpv6(input: string): number[] | null {
  let s = input.toLowerCase().split('%')[0];
  // Embedded IPv4 tail (e.g. ::ffff:192.168.0.1) -> convert to two hextets.
  if (s.includes('.')) {
    const idx = s.lastIndexOf(':');
    const v4 = s.slice(idx + 1);
    const v4int = ipv4ToInt(v4);
    if (v4int === null) return null;
    const hi = (v4int >>> 16) & 0xffff;
    const lo = v4int & 0xffff;
    s = `${s.slice(0, idx + 1)}${hi.toString(16)}:${lo.toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  let groups: string[];
  if (halves.length === 1) {
    groups = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array<string>(missing).fill('0'), ...tail];
  }
  if (groups.length !== 8) return null;
  const out = groups.map((g) => parseInt(g || '0', 16));
  if (out.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return out;
}

function mappedIpv4(groups: number[]): string | null {
  // ::ffff:a.b.c.d  ->  0:0:0:0:0:ffff:XXXX:XXXX
  if (
    groups[0] === 0 &&
    groups[1] === 0 &&
    groups[2] === 0 &&
    groups[3] === 0 &&
    groups[4] === 0 &&
    groups[5] === 0xffff
  ) {
    return `${(groups[6] >> 8) & 0xff}.${groups[6] & 0xff}.${(groups[7] >> 8) & 0xff}.${groups[7] & 0xff}`;
  }
  return null;
}

function isBlockedAddress(addr: string): boolean {
  const kind = isIP(addr);
  if (kind === 4) {
    return BLOCKED_IPV4_CIDRS.some((c) => ipv4InCidr(addr, c));
  }
  if (kind === 6) {
    const groups = expandIpv6(addr);
    if (!groups) return true; // unparseable -> block to be safe
    const v4 = mappedIpv4(groups);
    if (v4) return BLOCKED_IPV4_CIDRS.some((c) => ipv4InCidr(v4, c));
    // Unspecified ::
    if (groups.every((g) => g === 0)) return true;
    // Loopback ::1
    if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true;
    // Unique-local fc00::/7  (fc00..fdff)
    if (groups[0] >= 0xfc00 && groups[0] <= 0xfdff) return true;
    // Link-local fe80::/10  (fe80..febf)
    if (groups[0] >= 0xfe80 && groups[0] <= 0xfebf) return true;
    return false;
  }
  return true; // not a literal IP resolved value -> block
}

function isAllowedAddress(addr: string): boolean {
  const kind = isIP(addr);
  for (const cidr of WEBHOOK_ALLOWED_PRIVATE_CIDRS) {
    if (cidr.includes(':')) {
      // IPv6 allow-entry: best-effort exact match on the network address.
      const a = expandIpv6(addr);
      const b = expandIpv6(cidr.split('/')[0]);
      if (a && b && a.every((g, i) => g === b[i])) return true;
    } else {
      let v4 = addr;
      if (kind === 6) {
        const groups = expandIpv6(addr);
        const mapped = groups ? mappedIpv4(groups) : null;
        if (!mapped) continue;
        v4 = mapped;
      }
      if (ipv4InCidr(v4, cidr)) return true;
    }
  }
  return false;
}

/**
 * Reject webhook URLs that are non-http(s) or whose hostname resolves to any
 * private / reserved address (SSRF protection). Addresses inside an entry of
 * WEBHOOK_ALLOWED_PRIVATE_CIDRS are permitted. Throws on any violation.
 */
export async function assertSafeWebhookUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid webhook URL: ${url}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Blocked webhook URL protocol "${parsed.protocol}" (only http/https allowed)`);
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

  let addresses: string[];
  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    const records = await lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
    if (addresses.length === 0) {
      throw new Error(`Could not resolve webhook host "${hostname}"`);
    }
  }

  for (const addr of addresses) {
    if (isBlockedAddress(addr) && !isAllowedAddress(addr)) {
      throw new Error(
        `Webhook target "${hostname}" resolves to blocked private/reserved address ${addr}`,
      );
    }
  }
}
