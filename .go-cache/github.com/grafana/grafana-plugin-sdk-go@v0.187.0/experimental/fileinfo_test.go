package experimental

import (
	"path"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFolderInfoFrame(t *testing.T) {
	frame, err := GetDirectoryFrame(".", false)
	require.NoError(t, err)

	err = CheckGoldenFrame(path.Join("testdata", "folder.golden.txt"), frame, true)
	require.NoError(t, err)
}
