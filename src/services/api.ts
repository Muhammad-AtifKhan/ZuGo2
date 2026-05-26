import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Replace LAN IP with your PC address (ipconfig ? IPv4) when testing on a physical device.
const LAN_API_URL = 'http://192.168.100.63:5000/api';
const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:5000/api';
const ANDROID_ADB_REVERSE_API_URL = 'http://127.0.0.1:5000/api';
const IOS_SIMULATOR_API_URL = 'http://localhost:5000/api';

export const API_URL_CANDIDATES =
  Platform.OS === 'android'
    ? [LAN_API_URL, ANDROID_EMULATOR_API_URL, ANDROID_ADB_REVERSE_API_URL]
    : Platform.OS === 'ios'
    ? [IOS_SIMULATOR_API_URL, LAN_API_URL]
    : [LAN_API_URL];

const API_BASE_URL_STORAGE_KEY = 'zugo_api_base_url';
const HEALTH_PATH = '/health';
const PROBE_TIMEOUT_MS = 1500;

export let API_URL = API_URL_CANDIDATES[0];

let readyPromise: Promise<string> | null = null;
let hasLoggedCandidates = false;

const healthUrl = (baseURL: string) =>
  `${baseURL.replace(/\/api\/?$/, '')}/api${HEALTH_PATH}`;

const probeBaseUrl = async (baseURL: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const response = await fetch(healthUrl(baseURL), {
      method: 'GET',
      signal: controller.signal as any,
    });
    clearTimeout(timer);
    console.log(
      `[API] Probe ${healthUrl(baseURL)} -> ${response.status} ${
        response.ok ? 'OK' : 'FAILED'
      }`,
    );
    return response.ok;
  } catch (error: any) {
    console.log(
      `[API] Probe ${healthUrl(baseURL)} -> ${
        error?.message || 'Network Error'
      }`,
    );
    return false;
  }
};

export const resetReadyPromise = () => {
  readyPromise = null;
};

/** Pick a reachable backend URL (cached). Call before the first API request. */
export const ensureApiReady = async (): Promise<string> => {
  if (readyPromise) {
    return readyPromise;
  }

  readyPromise = (async () => {
    if (!hasLoggedCandidates) {
      console.log('[API] Candidate URLs:', API_URL_CANDIDATES.join(', '));
      hasLoggedCandidates = true;
    }

    const cached = await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY);
    const ordered = cached
      ? [cached, ...API_URL_CANDIDATES.filter(url => url !== cached)]
      : API_URL_CANDIDATES;

    const probePromises = ordered.map(async (baseURL) => {
      const ok = await probeBaseUrl(baseURL);
      if (ok) return baseURL;
      throw new Error('Unreachable');
    });

    try {
      const firstSuccessfulUrl = await new Promise<string>((resolve, reject) => {
        let completedCount = 0;
        let resolved = false;

        probePromises.forEach(p => {
          p.then(url => {
            if (!resolved) {
              resolved = true;
              resolve(url);
            }
          }).catch(() => {
            completedCount++;
            if (completedCount === ordered.length && !resolved) {
              reject(new Error('All candidates unreachable'));
            }
          });
        });
      });

      api.defaults.baseURL = firstSuccessfulUrl;
      API_URL = firstSuccessfulUrl;
      await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, firstSuccessfulUrl);
      console.log('[API] Using backend:', firstSuccessfulUrl);
      return firstSuccessfulUrl;
    } catch (e) {
      api.defaults.baseURL = API_URL_CANDIDATES[0];
      API_URL = API_URL_CANDIDATES[0];
      console.log(
        '[API] No backend candidate reachable. Falling back to:',
        API_URL,
      );
      return API_URL_CANDIDATES[0];
    }
  })();

  try {
    return await readyPromise;
  } catch (error) {
    readyPromise = null;
    throw error;
  }
};

export const resetApiBaseUrl = async () => {
  resetReadyPromise();
  await AsyncStorage.removeItem(API_BASE_URL_STORAGE_KEY);
};

const retryRequestOnAllBases = async (
  originalRequest: AxiosRequestConfig,
): Promise<any> => {
  resetReadyPromise();
  const workingBaseUrl = await ensureApiReady();

  try {
    const response = await axios.request({
      method: originalRequest.method,
      url: originalRequest.url,
      params: originalRequest.params,
      data: originalRequest.data,
      headers: originalRequest.headers,
      baseURL: workingBaseUrl,
      timeout: originalRequest.timeout ?? 10000,
    });
    api.defaults.baseURL = workingBaseUrl;
    API_URL = workingBaseUrl;
    return response;
  } catch (error: any) {
    console.log(
      `[API] Request retry failed on ${workingBaseUrl}: ${
        error?.message || 'Unknown error'
      }`,
    );
    throw error;
  }
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(async config => {
  if (!readyPromise) {
    await ensureApiReady();
  } else {
    await readyPromise;
  }
  config.baseURL = api.defaults.baseURL;
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const isNetworkError = error.message === 'Network Error' && !error.response;

    if (
      !isNetworkError ||
      !originalRequest ||
      originalRequest._allBasesRetried
    ) {
      return Promise.reject(error);
    }

    originalRequest._allBasesRetried = true;
    resetReadyPromise();

    try {
      return await retryRequestOnAllBases(originalRequest);
    } catch (retryError) {
      return Promise.reject(retryError);
    }
  },
);

export default api;
