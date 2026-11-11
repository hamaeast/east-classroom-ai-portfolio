export default async function fetchAllEntityPages(entity, query = {}) {
  const items = [];
  let cursor;
  do {
    const page = await entity.filter(query, { limit: 500, cursor });
    items.push(...page.items);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return items;
}