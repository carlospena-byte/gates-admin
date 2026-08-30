/**
 * Factory for the CRUD shape repeated across the flat entity tables
 * (unit_types, location_types, addon_types, locations, addons...):
 * list-by-parent, getById, create, update, delete, toggleActive.
 *
 * The Supabase query builder is typed against a literal table name, so
 * `selectClause` (a runtime string, not a literal) can't be narrowed by the
 * generated Database types — the `any` below is scoped to this one generic
 * helper so every concrete service built on top of it keeps its precise
 * T / CreateDto / UpdateDto types.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

type TableName = keyof Database["public"]["Tables"];

export interface CrudServiceOptions {
  /** Passed to .select(); can include joins, e.g. "*, addon_types(*)" */
  selectClause?: string;
  /** Column used to order list() results */
  orderBy?: string;
  /** Foreign key column that list() filters by */
  parentColumn?: string;
}

export function createCrudService<T, CreateDto = Partial<T>, UpdateDto = Partial<T>>(
  table: TableName,
  options: CrudServiceOptions = {},
) {
  const { selectClause = "*", orderBy = "name", parentColumn = "residential_id" } = options;
  const db = () => requireSupabase() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const list = (parentId: string): Promise<ApiResult<T[]>> =>
    wrapResult(`Failed to list ${table}`, async () => {
      const rows = await unwrap<T[]>(
        db().from(table).select(selectClause).eq(parentColumn, parentId).order(orderBy),
      );
      return rows ?? [];
    });

  const getById = (id: string): Promise<ApiResult<T>> =>
    wrapResult(`Failed to get ${table}`, () =>
      unwrap<T>(db().from(table).select(selectClause).eq("id", id).single()),
    );

  const create = (dto: CreateDto): Promise<ApiResult<T>> =>
    wrapResult(`Failed to create ${table}`, () =>
      unwrap<T>(db().from(table).insert([dto]).select(selectClause).single()),
    );

  const update = (id: string, dto: UpdateDto): Promise<ApiResult<T>> =>
    wrapResult(`Failed to update ${table}`, () =>
      unwrap<T>(db().from(table).update(dto).eq("id", id).select(selectClause).single()),
    );

  const remove = (id: string): Promise<ApiResult<void>> =>
    wrapResult(`Failed to delete ${table}`, async () => {
      await unwrap<void>(db().from(table).delete().eq("id", id));
    });

  const toggleActive = (id: string, currentStatus: boolean): Promise<ApiResult<T>> =>
    update(id, { is_active: !currentStatus } as UpdateDto);

  return { list, getById, create, update, delete: remove, toggleActive };
}
