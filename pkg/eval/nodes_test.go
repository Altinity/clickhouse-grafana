// pkg/eval/nodes_test.go
package eval

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestQueryNodeClauses(t *testing.T) {
	q := newQueryNode()
	require.False(t, q.hasClause("select"))
	c1 := q.setClause("select")
	require.NotNil(t, c1)
	require.True(t, q.hasClause("select"))
	require.Same(t, c1, q.findClause("select"))

	// creation order is preserved
	q.setClause("from")
	require.Equal(t, "select", q.clauses[0].name)
	require.Equal(t, "from", q.clauses[1].name)

	// setClause RESETS an existing clause (legacy SetRoot overwrites, and the
	// macro branch overwrites "select" unconditionally — facts 14, 15)
	c1.items = append(c1.items, newItemNode())
	c2 := q.setClause("select")
	require.NotSame(t, c1, c2)
	require.Empty(t, c2.items)
	require.Len(t, q.clauses, 2)
	require.Same(t, c2, q.clauses[0], "reset keeps the clause position")
}

func TestNodeConstructors(t *testing.T) {
	it := newItemNode()
	require.Empty(t, it.parts)
	it.add(rawPart{","})
	it.add(spacedPart{"IN"})
	require.Len(t, it.parts, 2)

	j := newJoinNode("INNER JOIN")
	require.Equal(t, "INNER JOIN", j.typeRaw)
	require.Nil(t, j.source)
	require.Empty(t, j.aliases)

	// itemPart is sealed: all four implementations satisfy it
	parts := []itemPart{
		tokenPart{logicalToken{kind: logToken, text: "x"}},
		spacedPart{"IN"},
		rawPart{"(raw)"},
		subqueryPart{q: newQueryNode(), concat: true},
	}
	require.Len(t, parts, 4)
}
