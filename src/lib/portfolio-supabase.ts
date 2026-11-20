import { mergePortfolio, editableSections, type PortfolioData } from '@/lib/portfolio-defaults';

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !url.startsWith('https://')) return null;
  return { url, key };
}

export async function supabaseRequest(path: string, init: RequestInit = {}, accessToken?: string): Promise<Response> {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase environment variables are not configured');
  const headers = new Headers(init.headers);
  headers.set('apikey', config.key);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(`${config.url}${path}`, { ...init, headers, cache: 'no-store' });
}

export async function getPublicPortfolio(): Promise<PortfolioData> {
  if (!getSupabaseConfig()) return mergePortfolio({});
  try {
    const r = await supabaseRequest('/rest/v1/portfolio_sections?select=section_key,content&published=eq.true');
    if (!r.ok) return mergePortfolio({});
    const rows = (await r.json()) as { section_key: string; content: unknown }[];
    const overrides: Record<string, unknown> = {};
    for (const row of rows) {
      if (editableSections.some(k => k === row.section_key) && row.content && typeof row.content === 'object' && !Array.isArray(row.content)) {
        overrides[row.section_key] = row.content;
      }
    }
    return mergePortfolio(overrides as Partial<PortfolioData>);
  } catch {
    return mergePortfolio({});
  }
}

export async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data as Record<string, unknown>;
}
