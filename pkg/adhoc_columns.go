package main

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// columnTypeCache stores "<datasourceUID>|database.table" -> map[string]string column
// type mappings. Populated on first use; not invalidated at runtime (TTL note: the
// cache lives for the lifetime of the datasource instance process; a Grafana restart
// clears it).
//
// The datasource UID is included in the key because this cache is a package-level
// (process-wide) map shared by every ClickHouseDatasource instance in the plugin
// process. Without the UID prefix, two different ClickHouse datasources that happen
// to query a same-named database.table would incorrectly share (and leak) each
// other's column type schema.
var columnTypeCache sync.Map

// columnCacheKey builds the columnTypeCache key, scoping it to a specific
// datasource instance so schemas never leak across different datasources that
// happen to share a database.table name. uid may be empty (e.g. when
// PluginContext.DataSourceInstanceSettings is nil) — this still yields a safe,
// deterministic key.
func columnCacheKey(uid, database, table string) string {
	return uid + "|" + database + "." + table
}

// escSingleQuotes doubles single-quote characters to prevent SQL injection when
// embedding a string value inside single-quoted SQL literals.
func escSingleQuotes(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

// parseColumnTypes extracts a name→type map from a Response returned by
// "SELECT name, type FROM system.columns …".
// Returns an empty (non-nil) map on empty or malformed input.
func parseColumnTypes(resp *Response) map[string]string {
	result := make(map[string]string)
	if resp == nil {
		return result
	}
	for _, row := range resp.Data {
		nameVal, nameOk := row["name"]
		typeVal, typeOk := row["type"]
		if !nameOk || !typeOk {
			continue
		}
		name, nameIsStr := nameVal.(string)
		typ, typeIsStr := typeVal.(string)
		if !nameIsStr || !typeIsStr || name == "" {
			continue
		}
		result[name] = typ
	}
	return result
}

// fetchColumnTypes returns a name→ClickHouse-type map for every column in the
// given table, fetched from system.columns.
//
// Graceful-fallback contract: any failure (no client, query error, permission
// denied, empty result) causes the function to return nil.  Callers should
// treat nil identically to an absent map and fall back to the existing
// type-unaware code path.  The request is never blocked or failed due to a
// failed introspection.
func (ds *ClickHouseDatasource) fetchColumnTypes(
	ctx context.Context,
	pluginCtx backend.PluginContext,
	database, table string,
) (cols map[string]string) {
	// Defensive: recover from any unexpected panic so we never break adhoc filtering.
	defer func() {
		if r := recover(); r != nil {
			backend.Logger.Debug(fmt.Sprintf("fetchColumnTypes: recovered panic for %s.%s: %v", database, table, r))
			cols = nil
		}
	}()

	if database == "" || table == "" {
		return nil
	}

	var dsUID string
	if pluginCtx.DataSourceInstanceSettings != nil {
		dsUID = pluginCtx.DataSourceInstanceSettings.UID
	}
	cacheKey := columnCacheKey(dsUID, database, table)
	if cached, ok := columnTypeCache.Load(cacheKey); ok {
		if m, ok := cached.(map[string]string); ok {
			return m
		}
	}

	client, err := ds.getClient(ctx, pluginCtx)
	if err != nil {
		backend.Logger.Debug(fmt.Sprintf("fetchColumnTypes: getClient error for %s: %v", cacheKey, err))
		return nil
	}

	sql := fmt.Sprintf(
		"SELECT name, type FROM system.columns WHERE database = '%s' AND table = '%s' FORMAT JSON",
		escSingleQuotes(database),
		escSingleQuotes(table),
	)

	resp, err := client.Query(ctx, sql)
	if err != nil {
		backend.Logger.Debug(fmt.Sprintf("fetchColumnTypes: query error for %s: %v", cacheKey, err))
		return nil
	}
	if resp == nil {
		backend.Logger.Debug(fmt.Sprintf("fetchColumnTypes: nil response for %s", cacheKey))
		return nil
	}

	cols = parseColumnTypes(resp)
	// Store even an empty map so we don't re-query a table with no columns.
	// Transient errors (network, permission) return nil above and are NOT cached,
	// so a subsequent request will retry.
	columnTypeCache.Store(cacheKey, cols)
	return cols
}
