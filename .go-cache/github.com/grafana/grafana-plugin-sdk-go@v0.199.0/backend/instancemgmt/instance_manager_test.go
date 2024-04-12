package instancemgmt

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/require"
)

func TestInstanceManager(t *testing.T) {
	ctx := context.Background()
	pCtx := backend.PluginContext{
		OrgID: 1,
		AppInstanceSettings: &backend.AppInstanceSettings{
			Updated: time.Now(),
		},
	}

	tip := &testInstanceProvider{}
	im := New(tip)

	t.Run("When getting instance should create a new instance", func(t *testing.T) {
		instance, err := im.Get(ctx, pCtx)
		require.NoError(t, err)
		require.NotNil(t, instance)
		require.Equal(t, pCtx.OrgID, instance.(*testInstance).orgID)
		require.Equal(t, pCtx.AppInstanceSettings.Updated, instance.(*testInstance).updated)

		t.Run("When getting instance should return same instance", func(t *testing.T) {
			instance2, err := im.Get(ctx, pCtx)
			require.NoError(t, err)
			require.Same(t, instance, instance2)
		})

		t.Run("When updating plugin context and getting instance", func(t *testing.T) {
			pCtxUpdated := backend.PluginContext{
				OrgID: 1,
				AppInstanceSettings: &backend.AppInstanceSettings{
					Updated: time.Now(),
				},
			}
			origDisposeTTL := disposeTTL
			disposeTTL = time.Millisecond
			t.Cleanup(func() {
				disposeTTL = origDisposeTTL
			})
			newInstance, err := im.Get(ctx, pCtxUpdated)

			t.Run("New instance should be created", func(t *testing.T) {
				require.NoError(t, err)
				require.NotNil(t, newInstance)
				require.Equal(t, pCtxUpdated.OrgID, newInstance.(*testInstance).orgID)
				require.Equal(t, pCtxUpdated.AppInstanceSettings.Updated, newInstance.(*testInstance).updated)
			})

			t.Run("New instance should not be the same as old instance", func(t *testing.T) {
				require.NotSame(t, instance, newInstance)
			})

			t.Run("Old instance should be disposed", func(t *testing.T) {
				instance.(*testInstance).wg.Wait()
				require.True(t, instance.(*testInstance).disposed.Load())
				require.Equal(t, int64(1), instance.(*testInstance).disposedTimes.Load())
			})
		})
	})
}

func TestInstanceManagerConcurrency(t *testing.T) {
	t.Run("Check possible race condition issues when initially creating instance", func(t *testing.T) {
		ctx := context.Background()
		tip := &testInstanceProvider{}
		im := New(tip)
		pCtx := backend.PluginContext{
			OrgID: 1,
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: time.Now(),
			},
		}
		var wg sync.WaitGroup
		wg.Add(10)

		var createdInstances []*testInstance
		mutex := new(sync.Mutex)
		// Creating new instances because of updated context
		for i := 0; i < 10; i++ {
			go func() {
				instance, _ := im.Get(ctx, pCtx)
				mutex.Lock()
				defer mutex.Unlock()
				// Collect all instances created
				createdInstances = append(createdInstances, instance.(*testInstance))
				wg.Done()
			}()
		}
		wg.Wait()

		t.Run("All created instances should be either disposed or exist in cache for later disposing", func(t *testing.T) {
			cachedInstance, _ := im.Get(ctx, pCtx)
			for _, instance := range createdInstances {
				if cachedInstance.(*testInstance) != instance && instance.disposedTimes.Load() < 1 {
					require.FailNow(t, "Found lost reference to un-disposed instance")
				}
			}
		})
	})

	t.Run("Check possible race condition issues when re-creating instance on settings update", func(t *testing.T) {
		origDisposeTTL := disposeTTL
		disposeTTL = time.Millisecond
		t.Cleanup(func() {
			disposeTTL = origDisposeTTL
		})

		ctx := context.Background()
		initialPCtx := backend.PluginContext{
			OrgID: 1,
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: time.Now(),
			},
		}
		tip := &testInstanceProvider{}
		im := New(tip)
		// Creating initial instance with old contexts
		instanceToDispose, _ := im.Get(ctx, initialPCtx)

		updatedPCtx := backend.PluginContext{
			OrgID: 1,
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: time.Now(),
			},
		}

		var wg sync.WaitGroup
		wg.Add(10)

		var createdInstances []*testInstance
		mutex := new(sync.Mutex)
		// Creating new instances because of updated context
		for i := 0; i < 10; i++ {
			go func() {
				instance, _ := im.Get(ctx, updatedPCtx)
				mutex.Lock()
				defer mutex.Unlock()
				// Collect all instances created during concurrent update
				createdInstances = append(createdInstances, instance.(*testInstance))
				wg.Done()
			}()
		}
		wg.Wait()

		t.Run("Initial instance should be disposed only once", func(t *testing.T) {
			instanceToDispose.(*testInstance).wg.Wait()
			require.Equal(t, int64(1), instanceToDispose.(*testInstance).disposedTimes.Load(), "Instance should be disposed only once")
		})
		t.Run("All created instances should be either disposed or exist in cache for later disposing", func(t *testing.T) {
			cachedInstance, _ := im.Get(ctx, updatedPCtx)
			for _, instance := range createdInstances {
				if cachedInstance.(*testInstance) != instance && instance.disposedTimes.Load() < 1 {
					require.FailNow(t, "Found lost reference to un-disposed instance")
				}
			}
		})
	})

	t.Run("Long recreation of instance should not affect datasources with different ID", func(t *testing.T) {
		const delay = time.Millisecond * 50
		ctx := context.Background()
		pCtx := backend.PluginContext{
			OrgID: 1,
			AppInstanceSettings: &backend.AppInstanceSettings{
				Updated: time.Now(),
			},
		}
		if testing.Short() {
			t.Skip("Tests with Sleep")
		}

		tip := &testInstanceProvider{delay: delay}
		im := New(tip)
		// Creating instance with id#1 in cache
		_, err := im.Get(ctx, pCtx)
		require.NoError(t, err)
		var wg1, wg2 sync.WaitGroup
		wg1.Add(1)
		wg2.Add(1)
		go func() {
			// Creating instance with id#2 in cache
			wg1.Done()
			_, err := im.Get(ctx, backend.PluginContext{
				OrgID: 2,
				AppInstanceSettings: &backend.AppInstanceSettings{
					Updated: time.Now(),
				},
			})
			require.NoError(t, err)
			wg2.Done()
		}()
		// Waiting before thread 2 starts to get the instance, so thread 2 could qcquire the lock before thread 1
		wg1.Wait()
		// Getting existing instance with id#1 from cache
		start := time.Now()
		_, err = im.Get(ctx, pCtx)
		elapsed := time.Since(start)
		require.NoError(t, err)
		// Waiting before thread 2 finished to get the instance
		wg2.Wait()
		if elapsed > delay {
			require.Fail(t, "Instance should be retrieved from cache without delay")
		}
	})
}

type testInstance struct {
	orgID         int64
	updated       time.Time
	disposed      atomic.Bool
	disposedTimes atomic.Int64
	wg            sync.WaitGroup
}

func (ti *testInstance) Dispose() {
	ti.disposed.Store(true)
	ti.disposedTimes.Add(1)
	ti.wg.Done()
}

type testInstanceProvider struct {
	delay time.Duration
}

func (tip *testInstanceProvider) GetKey(_ context.Context, pluginContext backend.PluginContext) (interface{}, error) {
	return pluginContext.OrgID, nil
}

func (tip *testInstanceProvider) NeedsUpdate(_ context.Context, pluginContext backend.PluginContext, cachedInstance CachedInstance) bool {
	curUpdated := pluginContext.AppInstanceSettings.Updated
	cachedUpdated := cachedInstance.PluginContext.AppInstanceSettings.Updated
	return !curUpdated.Equal(cachedUpdated)
}

func (tip *testInstanceProvider) NewInstance(_ context.Context, pluginContext backend.PluginContext) (Instance, error) {
	if tip.delay > 0 {
		time.Sleep(tip.delay)
	}

	ti := &testInstance{
		orgID:   pluginContext.OrgID,
		updated: pluginContext.AppInstanceSettings.Updated,
	}
	ti.wg.Add(1)

	return ti, nil
}
