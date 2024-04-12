package utils

import (
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCopyFile(t *testing.T) {
	src, err := os.CreateTemp("", "")
	require.NoError(t, err)
	defer os.RemoveAll(src.Name())
	err = os.WriteFile(src.Name(), []byte("Contents"), 0600)
	require.NoError(t, err)

	dst, err := os.CreateTemp("", "")
	require.NoError(t, err)
	defer os.RemoveAll(dst.Name())

	err = CopyFile(src.Name(), dst.Name())
	require.NoError(t, err)
}

// Test case where destination directory doesn't exist.
func TestCopyFile_NonExistentDestDir(t *testing.T) {
	src, err := os.CreateTemp("", "")
	require.NoError(t, err)
	defer os.RemoveAll(src.Name())

	err = CopyFile(src.Name(), "non-existent/dest")
	require.EqualError(t, err, "destination directory doesn't exist: \"non-existent\"")
}

func TestCopyRecursive_NonExistentDest(t *testing.T) {
	src := t.TempDir()

	err := os.MkdirAll(path.Join(src, "data"), 0755)
	require.NoError(t, err)
	err = os.WriteFile(path.Join(src, "data", "file.txt"), []byte("Test"), 0600)
	require.NoError(t, err)

	dstParent := t.TempDir()

	dst := path.Join(dstParent, "dest")

	err = CopyRecursive(src, dst)
	require.NoError(t, err)

	compareDirs(t, src, dst)
}

func TestCopyRecursive_ExistentDest(t *testing.T) {
	src := t.TempDir()

	err := os.MkdirAll(path.Join(src, "data"), 0755)
	require.NoError(t, err)
	err = os.WriteFile(path.Join(src, "data", "file.txt"), []byte("Test"), 0600)
	require.NoError(t, err)

	dst := t.TempDir()

	err = CopyRecursive(src, dst)
	require.NoError(t, err)

	compareDirs(t, src, dst)
}

func compareDirs(t *testing.T, src, dst string) {
	t.Helper()

	sfi, err := os.Stat(src)
	require.NoError(t, err)
	dfi, err := os.Stat(dst)
	require.NoError(t, err)

	require.Equal(t, sfi.Mode(), dfi.Mode())

	err = filepath.Walk(src, func(srcPath string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath := strings.TrimPrefix(srcPath, src)
		dstPath := path.Join(dst, relPath)
		sfi, err := os.Stat(srcPath)
		require.NoError(t, err)

		dfi, err := os.Stat(dstPath)
		require.NoError(t, err)
		require.Equal(t, sfi.Mode(), dfi.Mode())

		if sfi.IsDir() {
			return nil
		}

		srcData, err := os.ReadFile(srcPath)
		require.NoError(t, err)
		dstData, err := os.ReadFile(dstPath)
		require.NoError(t, err)

		require.Equal(t, srcData, dstData)

		return nil
	})
	require.NoError(t, err)
}
