package main

import (
	"syscall/js"
)

func getAstPropertyWasm(this js.Value, args []js.Value) interface{} {
	return map[string]interface{}{
		"properties": "321",
	}
}

func main() {
	c := make(chan struct{}, 0)
	js.Global().Set("getAstProperty", js.FuncOf(getAstPropertyWasm))
	<-c
}
