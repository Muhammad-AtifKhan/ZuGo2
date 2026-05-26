import prisma from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000;
const DB_LOOKUP_TIMEOUT_MS = 3000;

const KNOWN_ROLES = ['passenger', 'transporter', 'driver', 'admin'] as const;
type KnownRole = (typeof KNOWN_ROLES)[number];

type AuthProfile = {
  id: string;
  email: string;
  isBlocked?: boolean;
  isApproved?: boolean;
  transporterId?: string;
};

type AuthCacheData = {
  uid: string;
  role: string;
  email: string;
  profile: AuthProfile | null;
  supabaseUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
};

type AuthCacheEntry = {
  data: AuthCacheData;
  expiry: number;
};

type RoleMatch = { role: string; profile: AuthProfile };

const authCache = new Map<string, AuthCacheEntry>();

const getCachedAuth = (token: string): AuthCacheData | null => {
  const entry = authCache.get(token);
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    authCache.delete(token);
    return null;
  }

  return entry.data;
};

const setCachedAuth = (token: string, data: AuthCacheData): void => {
  authCache.set(token, {
    data,
    expiry: Date.now() + AUTH_CACHE_TTL_MS,
  });
};

const clearCachedAuth = (token: string): void => {
  authCache.delete(token);
};

const normalizeMetadataRole = (role: unknown): KnownRole | null => {
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toLowerCase();
  return (KNOWN_ROLES as readonly string[]).includes(normalized)
    ? (normalized as KnownRole)
    : null;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<null>(resolve => {
    timer = setTimeout(() => {
      console.warn(`[AUTH] ${label} timed out after ${ms}ms`);
      resolve(null);
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/** Single findUnique for the role from JWT metadata — no table scanning. */
const fetchProfileByMetadataRole = async (
  role: KnownRole,
  userId: string,
  timingLabel: string,
): Promise<RoleMatch | null> => {
  console.time(timingLabel);

  try {
    switch (role) {
      case 'passenger': {
        const profile = await prisma.passenger.findUnique({
          where: { id: userId },
          select: { id: true, email: true, isBlocked: true },
        });
        return profile ? { role: 'passenger', profile } : null;
      }
      case 'transporter': {
        const profile = await prisma.transporter.findUnique({
          where: { id: userId },
          select: { id: true, email: true, isBlocked: true, isApproved: true },
        });
        return profile ? { role: 'transporter', profile } : null;
      }
      case 'driver': {
        const profile = await prisma.driver.findUnique({
          where: { id: userId },
          select: { id: true, email: true, isBlocked: true, transporterId: true },
        });
        return profile ? { role: 'driver', profile } : null;
      }
      case 'admin': {
        const profile = await prisma.admin.findUnique({
          where: { id: userId },
          select: { id: true, email: true },
        });
        return profile ? { role: 'admin', profile } : null;
      }
      default:
        return null;
    }
  } finally {
    console.timeEnd(timingLabel);
  }
};

const attachUser = (req: Request, auth: AuthCacheData): void => {
  const profile = auth.profile;
  (req as any).user = {
    uid: profile?.id || auth.uid,
    id: profile?.id || auth.uid,
    email: profile?.email || auth.email,
    role: auth.role,
    transporterId: profile?.transporterId,
    isApproved: profile?.isApproved,
    supabaseUser: auth.supabaseUser,
  };
};

/** Full table scan — only when JWT has no role metadata. */
const findUserRole = async (
  userId: string,
  email?: string | null,
): Promise<RoleMatch | null> => {
  const passenger = await prisma.passenger.findFirst({
    where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
    select: { id: true, email: true, isBlocked: true },
  });
  if (passenger) return { role: 'passenger', profile: passenger };

  const transporter = await prisma.transporter.findFirst({
    where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
    select: { id: true, email: true, isBlocked: true, isApproved: true },
  });
  if (transporter) return { role: 'transporter', profile: transporter };

  const driver = await prisma.driver.findFirst({
    where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
    select: { id: true, email: true, isBlocked: true, transporterId: true },
  });
  if (driver) return { role: 'driver', profile: driver };

  const admin = await prisma.admin.findFirst({
    where: { OR: [{ id: userId }, ...(email ? [{ email }] : [])] },
    select: { id: true, email: true },
  });
  if (admin) return { role: 'admin', profile: admin };

  return null;
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  const timingId = `requireAuth:${req.method}:${req.path}:${Date.now()}`;

  console.time(`${timingId}:total`);
  console.time(`${timingId}:cache-check`);
  const cached = getCachedAuth(token);
  console.timeEnd(`${timingId}:cache-check`);

  if (cached) {
    console.time(`${timingId}:cache-hit-path`);
    if (cached.profile?.isBlocked) {
      console.timeEnd(`${timingId}:cache-hit-path`);
      console.timeEnd(`${timingId}:total`);
      return res.status(403).json({ error: 'Your account has been suspended' });
    }
    attachUser(req, cached);
    console.timeEnd(`${timingId}:cache-hit-path`);
    console.timeEnd(`${timingId}:total`);
    console.log(`[AUTH TIMING] ${timingId} -> CACHE HIT`);
    return next();
  }

  try {
    console.time(`${timingId}:supabase-getUser`);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    console.timeEnd(`${timingId}:supabase-getUser`);

    if (error || !data.user) {
      clearCachedAuth(token);
      console.timeEnd(`${timingId}:total`);
      console.log(`[AUTH TIMING] ${timingId} -> getUser FAILED`);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const authUser = data.user;
    const metadataRole = normalizeMetadataRole(
      authUser.user_metadata?.role || authUser.app_metadata?.role,
    );

    let profileMatch: RoleMatch | null = null;

    if (metadataRole) {
      const dbTimingLabel = `${timingId}:metadata-db-${metadataRole}`;
      profileMatch = await withTimeout(
        fetchProfileByMetadataRole(metadataRole, authUser.id, dbTimingLabel),
        DB_LOOKUP_TIMEOUT_MS,
        dbTimingLabel,
      );
      console.log(
        `[AUTH TIMING] ${timingId} -> metadata path role=${metadataRole} profileFound=${!!profileMatch}`,
      );
    } else {
      console.time(`${timingId}:findUserRole-full-scan`);
      profileMatch = await findUserRole(authUser.id, authUser.email);
      console.timeEnd(`${timingId}:findUserRole-full-scan`);
    }

    if (!profileMatch && !metadataRole) {
      console.timeEnd(`${timingId}:total`);
      console.log(`[AUTH TIMING] ${timingId} -> profile not found`);
      return res.status(403).json({ error: 'User profile not found.' });
    }

    const profile = profileMatch?.profile;
    const role = profileMatch?.role || metadataRole!;

    if (profile?.isBlocked) {
      console.timeEnd(`${timingId}:total`);
      console.log(`[AUTH TIMING] ${timingId} -> blocked user`);
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    const cacheData: AuthCacheData = {
      uid: profile?.id || authUser.id,
      role,
      email: profile?.email || authUser.email || '',
      profile: profile || null,
      supabaseUser: {
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata,
        app_metadata: authUser.app_metadata,
      },
    };

    console.time(`${timingId}:cache-set`);
    setCachedAuth(token, cacheData);
    console.timeEnd(`${timingId}:cache-set`);
    attachUser(req, cacheData);

    console.timeEnd(`${timingId}:total`);
    console.log(
      `[AUTH TIMING] ${timingId} -> CACHE MISS (stored) role=${role} metadataRole=${metadataRole ?? 'none'}`,
    );
    return next();
  } catch (error) {
    clearCachedAuth(token);
    console.timeEnd(`${timingId}:total`);
    console.error('Error verifying Supabase token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireApprovedTransporter = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.uid;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: No authenticated user' });
  }

  try {
    const transporter = await prisma.transporter.findUnique({
      where: { id: userId },
    });

    if (!transporter) {
      return res.status(404).json({ error: 'Transporter not found in database' });
    }

    if (!transporter.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval.' });
    }

    return next();
  } catch (error) {
    console.error('Error in requireApprovedTransporter middleware:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
