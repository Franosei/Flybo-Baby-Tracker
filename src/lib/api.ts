import type { ActivityRecord, ActivityType, BabyProfile, FeedDetails } from '../types';

interface BootstrapResponse {
  profile: BabyProfile;
  activities: ActivityRecord[];
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
};

const shareCodeHeaders = (shareCode?: string | null) => (
  shareCode ? { 'X-Flybo-Share-Code': shareCode } : {}
);

export const fetchBootstrap = (shareCode?: string | null) =>
  request<BootstrapResponse>('/api/bootstrap', {
    headers: shareCodeHeaders(shareCode),
  });

export const joinProfileApi = (shareCode: string) =>
  request<BootstrapResponse>(`/api/babies/${encodeURIComponent(shareCode)}`);

export const saveProfileApi = (profile: BabyProfile) =>
  request<{ profile: BabyProfile }>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });

export const createActivityApi = (type: ActivityType, details: FeedDetails | null, shareCode?: string | null) =>
  request<{ record: ActivityRecord }>('/api/activities', {
    method: 'POST',
    headers: shareCodeHeaders(shareCode),
    body: JSON.stringify({ type, details }),
  });

export const updateActivityTimeApi = (record: ActivityRecord, timestamp: string, shareCode?: string | null) =>
  request<{ record: ActivityRecord }>(`/api/activities/${record.id}?type=${record.type}`, {
    method: 'PATCH',
    headers: shareCodeHeaders(shareCode),
    body: JSON.stringify({ timestamp }),
  });

export const deleteActivityApi = (record: ActivityRecord, shareCode?: string | null) =>
  request<{ ok: true }>(`/api/activities/${record.id}?type=${record.type}`, {
    method: 'DELETE',
    headers: shareCodeHeaders(shareCode),
  });
