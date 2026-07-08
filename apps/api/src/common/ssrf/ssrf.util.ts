import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * SSRF guard for outbound webhook targets (spec section 15).
 * Blocks URLs whose hostname resolves into private/reserved IP ranges unless a
 * matching CIDR is present in the allow-list (WEBHOOK_ALLOWED_PRIVATE_CIDRS).
 */

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw ?? '32');
  if (isIP(range) !== 4) return false;
  if (bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

const PRIVATE_V4_RANGES = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
];

function isPrivateV4(ip: string): boolean {
  return PRIVATE_V4_RANGES.some((cidr) => ipv4InCidr(ip, cidr));
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
  // IPv4-mapped ::ffff:a.b.c.d
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return false;
}

function isAllowed(ip: string, allowedCidrs: string[]): boolean {
  return allowedCidrs.some((cidr) => {
    if (isIP(cidr.split('/')[0]) === 4 && isIP(ip) === 4) {
      return ipv4InCidr(ip, cidr);
    }
    // Exact match fallback for IPv6 / bare IPs in the allow-list.
    return cidr === ip || cidr.split('/')[0] === ip;
  });
}

export async function assertSafeWebhookUrl(
  rawUrl: string,
  allowedCidrs: string[] = [],
): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid webhook URL: ${rawUrl}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Blocked webhook protocol: ${url.protocol}`);
  }

  const host = url.hostname;

  // Collect candidate IPs (literal host or DNS resolution).
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    const resolved = await lookup(host, { all: true });
    addresses = resolved.map((r) => r.address);
    if (addresses.length === 0) {
      throw new Error(`Webhook host did not resolve: ${host}`);
    }
  }

  for (const ip of addresses) {
    const isV4 = isIP(ip) === 4;
    const isPrivate = isV4 ? isPrivateV4(ip) : isPrivateV6(ip);
    if (isPrivate && !isAllowed(ip, allowedCidrs)) {
      throw new Error(
        `Webhook target ${host} resolves to blocked private/reserved IP ${ip}`,
      );
    }
  }
}
