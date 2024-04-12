package build

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFillBuildInfo(t *testing.T) {
	// Set this as a constant for testing
	now = func() time.Time { return time.Unix(1515151515, 0) }
	t.Cleanup(func() {
		now = time.Now
	})

	t.Run("drone", func(t *testing.T) {
		t.Setenv("DRONE_REPO_LINK", "https://github.com/octocat/hello-world")
		t.Setenv("DRONE_BRANCH", "main")
		t.Setenv("DRONE_COMMIT_SHA", "bcdd4bf0245c82c060407b3b24b9b87301d15ac1")
		t.Setenv("DRONE_BUILD_NUMBER", "22")
		t.Setenv("DRONE_PULL_REQUEST", "33")

		info := getBuildInfoFromEnvironment()
		require.NotNil(t, info)
		assert.Equal(t, "main", info.Branch)
		assert.Equal(t, "bcdd4bf0245c82c060407b3b24b9b87301d15ac1", info.Hash)
		assert.Equal(t, int64(22), info.Build)
		assert.Equal(t, int64(33), info.PR)
	})

	t.Run("circle", func(t *testing.T) {
		os.Clearenv() // Clear DRONE env vars in CI environment
		t.Setenv("CIRCLE_PROJECT_REPONAME", "https://github.com/octocat/hello-world")
		t.Setenv("CIRCLE_BRANCH", "main")
		t.Setenv("CIRCLE_SHA1", "bcdd4bf0245c82c060407b3b24b9b87301d15ac1")
		t.Setenv("CIRCLE_BUILD_NUM", "22")
		t.Setenv("CI_PULL_REQUEST", "33")

		info := getBuildInfoFromEnvironment()
		require.NotNil(t, info)
		assert.Equal(t, "main", info.Branch)
		assert.Equal(t, "bcdd4bf0245c82c060407b3b24b9b87301d15ac1", info.Hash)
		assert.Equal(t, int64(22), info.Build)
		assert.Equal(t, int64(33), info.PR)
	})

	// really testable since it delegates to functions, but helful in local dev
	t.Run("git commands", func(t *testing.T) {
		info := getBuildInfoFromEnvironment()
		fmt.Printf("BUILD: %#v\n", info)
		require.NotNil(t, info)
	})
}
