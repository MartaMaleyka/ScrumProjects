/**
 * Premium Module Loader (Frontend)
 *
 * Carga módulos premium desde el submódulo /premium usando import.meta.glob,
 * para que Vite resuelva las rutas en build y no falle en el navegador.
 */
import type { ComponentType } from 'react';

const PREMIUM_SRC = '../../premium/src';

// Glob de componentes (TSX), registerPremiumUI (TS) y servicios (TS).
const premiumComponentModules = import.meta.glob<{ default: ComponentType }>(
  '../../premium/src/components/**/*.tsx'
);
const premiumRegisterModule = import.meta.glob<{ registerPremiumUI: () => any; isPremiumAvailable: () => boolean }>(
  '../../premium/src/registerPremiumUI.ts'
);
const premiumServiceModules = import.meta.glob<{ default: any }>(
  '../../premium/src/services/**/*.ts'
);

function hasPremiumModule(): boolean {
  if (typeof window === 'undefined') {
    try {
      const g = globalThis as unknown as { require?: (id: string) => unknown; process?: { cwd: () => string } };
      const fs = g.require?.('fs') as { existsSync: (p: string) => boolean } | undefined;
      const path = g.require?.('path') as { join: (...a: string[]) => string } | undefined;
      if (fs && path && g.process) {
        return fs.existsSync(path.join(g.process.cwd(), 'premium', 'src', 'registerPremiumUI.ts'));
      }
    } catch {
      // ignore
    }
    return false;
  }
  return true;
}

export async function loadPremiumUI(): Promise<{ registerPremiumUI: () => any; isPremiumAvailable: () => boolean } | null> {
  if (!hasPremiumModule()) return null;
  const key = `${PREMIUM_SRC}/registerPremiumUI.ts`;
  const loader = premiumRegisterModule[key];
  if (!loader) return null;
  try {
    const mod = await loader();
    if (typeof mod?.registerPremiumUI !== 'function') return null;
    return mod;
  } catch (e: any) {
    console.warn('⚠️  Could not load premium UI module:', e?.message);
    return null;
  }
}

/**
 * @param componentPath - Ruta desde premium/src (ej: 'components/scrum/projects/ProjectGitHubSection')
 */
export async function loadPremiumComponent(componentPath: string): Promise<ComponentType | null> {
  if (!hasPremiumModule()) return null;

  const suffix = `${componentPath}.tsx`;
  const key = `${PREMIUM_SRC}/${suffix}`;
  type LoaderFn = () => Promise<{ default: ComponentType }>;
  let loader: LoaderFn | undefined = premiumComponentModules[key];
  if (!loader) {
    const altKey = Object.keys(premiumComponentModules).find((k) => k.endsWith(suffix));
    loader = altKey ? (premiumComponentModules[altKey] as LoaderFn) : undefined;
  }
  if (loader) {
    try {
      const mod = await loader();
      return (mod?.default ?? mod) as ComponentType;
    } catch (e: any) {
      console.warn(`⚠️  Could not load premium component ${componentPath}:`, e?.message);
      return null;
    }
  }

  try {
    const mod = await import(/* @vite-ignore */ `../../premium/src/${componentPath}.tsx`);
    return (mod?.default ?? mod) as ComponentType;
  } catch (e2: any) {
    console.warn(`⚠️  Could not load premium component ${componentPath}:`, e2?.message);
    return null;
  }
}

/**
 * @param servicePath - Ruta desde premium/src (ej: 'services/premium/budgetService')
 */
export async function loadPremiumService(servicePath: string): Promise<any | null> {
  if (!hasPremiumModule()) return null;
  const key = `${PREMIUM_SRC}/${servicePath}.ts`;
  const loader = premiumServiceModules[key];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod?.default ?? mod;
  } catch (e: any) {
    console.warn(`⚠️  Could not load premium service ${servicePath}:`, e?.message);
    return null;
  }
}

export { hasPremiumModule };
