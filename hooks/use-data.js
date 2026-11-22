'use client';

import * as data from '@/lib/data';
import useSWR, { mutate } from 'swr';

const options = { revalidateOnFocus: false };

function useDb(key, fetcher) {
  return useSWR(key ? ['db', ...key] : null, () => fetcher(), options);
}

/** Revalidates every query backed by the browser database after a write. */
export function refreshDb() {
  return mutate((key) => Array.isArray(key) && key[0] === 'db');
}

export const useSessionUser = () => useDb(['session'], data.getSessionUser);

export const useProperties = (page, pageSize) =>
  useDb(['properties', page, pageSize], () => data.getProperties({ page, pageSize }));

export const useRecentProperties = () => useDb(['recent'], () => data.getRecentProperties(3));

export const useFeaturedProperties = () => useDb(['featured'], data.getFeaturedProperties);

export const useProperty = (id) => useDb(id && ['property', id], () => data.getPropertyById(id));

export const useSearchResults = (location, propertyType) =>
  useDb(['search', location, propertyType], () => data.searchProperties({ location, propertyType }));

export const useOwnerProperties = (userId) =>
  useDb(userId && ['owner', userId], () => data.getPropertiesByOwner(userId));

export const useBookmarks = (userId) =>
  useDb(userId && ['bookmarks', userId], () => data.getBookmarkedProperties(userId));

export const useBookmarkStatus = (userId, propertyId) =>
  useDb(userId && ['bookmark', userId, propertyId], () => data.isBookmarked(userId, propertyId));

export const useMessages = (userId) => useDb(userId && ['messages', userId], () => data.getMessages(userId));

export const useUnreadCount = (userId) =>
  useDb(userId && ['unread', userId], () => data.getUnreadMessageCount(userId));
