import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { enqueue } from '@/lib/apiQueue';
import { normalizeUserRecord } from '@/lib/userDisplayName';

export { enqueue };

// Cached data is considered fresh for this long — navigating back to a tab within this
// window shows the previously loaded data instantly with no refetch.
const STALE_TIME = 5 * 60 * 1000;
const CACHE_TIME = 30 * 60 * 1000;

export function entityQueryKey(entityName, sort) {
  return ['entity', entityName, sort];
}

// Loads every record by following the cursor until the server has no more pages.
// list(sort) returns only a single capped page, so entities with many rows
// (e.g. AssignmentGrade) would silently truncate and grades would go missing.
export async function fetchEntityList(entityName, sort) {
  const entity = base44.entities[entityName];
  // Built-in profiles use the app-users endpoint, not entity cursor pagination.
  // Students need only their own profile and cannot list the school roster.
  if (entityName === 'User') {
    const me = await enqueue(() => base44.auth.me());
    if (me.role !== 'admin') return [me];
    const users = [];
    const limit = 100;
    let page;
    do {
      page = await enqueue(() => entity.list(sort, limit, users.length));
      users.push(...page);
    } while (page.length === limit);
    return users;
  }
  const items = [];
  let cursor, hasMore = true;
  while (hasMore) {
    const page = await enqueue(() => entity.list({ sort, limit: 500, cursor }));
    items.push(...page.items);
    cursor = page.next_cursor;
    hasMore = page.has_more;
  }
  return items;
}

// Warms the cache for an entity so that when its tab is visited, data is already there.
export function prefetchEntity(queryClient, entityName, sort = '-created_date') {
  return queryClient.prefetchQuery({
    queryKey: entityQueryKey(entityName, sort),
    queryFn: () => fetchEntityList(entityName, sort),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// entityName is the entity's string name (e.g. 'Project'), matching base44.entities.<entityName>.
// Backed by react-query so data is cached across navigation — switching tabs and back shows the
// same data instantly instead of reloading, and results stay shared/deduped across components.
export default function useEntityList(entityName, sort = '-created_date', { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const queryKey = entityQueryKey(entityName, sort);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchEntityList(entityName, sort),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    placeholderData: keepPreviousData,
    enabled,
  });

  // Live-update the cached list as records are created/updated/deleted elsewhere.
  useEffect(() => {
    if (!enabled) return undefined;
    const unsubscribe = base44.entities[entityName].subscribe((event) => {
      queryClient.setQueryData(queryKey, (prev = []) => {
        if (event.type === 'create') return prev.some(i => i.id === event.data.id) ? prev : [event.data, ...prev];
        if (event.type === 'update') return prev.map(i => i.id === event.data.id ? { ...i, ...event.data } : i);
        if (event.type === 'delete') return prev.filter(i => i.id !== event.data.id);
        return prev;
      });
    });
    return unsubscribe;
  }, [entityName, sort, enabled]);

  const items = entityName === 'User' ? (data || []).map(normalizeUserRecord) : (data || []);
  return { items, loading: isLoading, error: isError, reload: refetch };
}