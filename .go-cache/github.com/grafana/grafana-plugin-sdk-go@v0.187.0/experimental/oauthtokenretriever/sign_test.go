package oauthtokenretriever

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

const (
	testRSAKey = `-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQC35vznv35Kaby20gu+RQBDj/kHhPd64b6p9TKKxqiAs8kukNFj
Q8keR6MOO41Md0Jh4b/ZSo1O3C3K3K587NORJDWz0H2wVyTWDvSMI36nI/EnGDhh
4fImv5E/9jIvhOxCJ3Dej57//tMt8TEG1ZETrAKzUvB7EfCfsnazGraMQwIDAQAB
AoGAfbFh4B+w+LlGY4oyvow4vvTTV4FZCOLsRwuwzMs09iprcelHQ9pbxtddqeeo
DsBgXbhHQQPEi0bQAZxNolLX0m4nQ8n9H6by42qOJlwywYZIl7Di3aWYiOiT56v7
PfqCsShSqsvWH8Ok4Jy6/Vcc4QcO4mGi8y8EZdSqfytGvkkCQQDhO+1Y4x36ETAh
NOQx1E/psPuSH8H6YeDoWYeap5z1KXzN4eTo01p8ckPSD93uXIig7LmfIWPMqlGV
yOBSyqD/AkEA0QXBLeDksi8hX8B2XOMfY9hWOBwBRXrlKX6TVF/9Kw+ulJpe3sU5
lc53oytpk1VwXAfJrjNRqyIIIRnFyTJQvQJAMBgFxFcqzXziFBUhLOqy7amW7krN
ttMznSmQ5RspTsg/GA9GO9j1l2EmzjIJJ56mpgYmVK5iiw9LQHqWO9d8rQJASUDz
CtkeTTQnRh91W+hdP+i5jsCB0Y/YcEpj59YcK9M7I+lWBkyoec/6Lb0xKuluj1JL
ZDmoDYnHv5IAtxpjIQJASxC/V51AHfuQ+rWvbZ6jzoHW6owbFpC2RbZPtFanOlda
ozjy/YI5hvWLr/bre/wZ3N81pLA9lPgEpJiOPYem3Q==
-----END RSA PRIVATE KEY-----
`
	testECDSAKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgYH3q1su2TRDIr4RB
2okegCNvfhn/Q9CycAXtPnfYsZehRANCAARSs6LcDI314KqKqGHbv2FLGoMXjm6B
p6/mP7VLRqyPpiGmhCEKXD5R/695X5JYQRBF34hn2XZpMCW2z2Lr+d6s
-----END PRIVATE KEY-----
`
)

func Test_Sign(t *testing.T) {
	for _, test := range []struct {
		name   string
		key    string
		length int
	}{
		{"RSA", testRSAKey, 196},
		{"ECDSA", testECDSAKey, 111},
	} {
		t.Run(test.name, func(t *testing.T) {
			signer, err := parsePrivateKey([]byte(test.key))
			assert.NoError(t, err)
			signed, err := signer.sign(map[string]interface{}{})
			assert.NoError(t, err)
			assert.Equal(t, test.length, len(signed))
		})
	}
}
