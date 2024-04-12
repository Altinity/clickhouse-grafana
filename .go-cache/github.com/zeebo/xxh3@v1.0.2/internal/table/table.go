package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
)

func main() {
	sizes := map[string]struct{}{}
	sizesKeys := []string{}
	values := map[string]string{}
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Scan() // skip first line
	for scanner.Scan() {
		if scanner.Text() == "" {
			break
		}
		fields := strings.Fields(scanner.Text())
		if !strings.HasPrefix(fields[0], "Fixed") {
			continue
		}
		values[fields[0]] = fields[7]
		size := strings.Split(fields[0], "/")[1]
		if _, ok := sizes[size]; !ok {
			sizes[size] = struct{}{}
			sizesKeys = append(sizesKeys, size)
		}
	}

	sort.Slice(sizesKeys, func(i, j int) bool {
		vi, _ := strconv.Atoi(strings.Split(sizesKeys[i], "-")[0])
		vj, _ := strconv.Atoi(strings.Split(sizesKeys[j], "-")[0])
		if vi == vj {
			return sizesKeys[i] < sizesKeys[j]
		}
		return vi < vj
	})

	fmt.Println("size|64|64 seed|128|128 seed")
	fmt.Println("----|--|-------|---|--------")

	for _, size := range sizesKeys {
		fmt.Printf("%s|%s|%s|%s|%s\n",
			size,
			values[fmt.Sprintf("Fixed64/%s/default", size)],
			values[fmt.Sprintf("Fixed64/%s/seed", size)],
			values[fmt.Sprintf("Fixed128/%s/default", size)],
			values[fmt.Sprintf("Fixed128/%s/seed", size)],
		)
	}
}
