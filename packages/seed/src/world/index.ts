import { garki } from './garki';
import { harbourview } from './harbourview';
import { nwosu } from './nwosu';
import type { OrgSpec } from './types';

export const ORGS: readonly OrgSpec[] = [harbourview, garki, nwosu];
export const orgByKey = (key: string): OrgSpec | undefined => ORGS.find((org) => org.key === key);
export type { OrgSpec } from './types';
