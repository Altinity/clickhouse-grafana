package main

import (
	"fmt"
	"syscall/js"
)

// getAstPropertyWasm is the WebAssembly-compatible function that processes AST property requests
func getAstPropertyWasm(this js.Value, args []js.Value) interface{} {
	// Validate input arguments
	if len(args) != 2 {
		return map[string]interface{}{
			"error": "Invalid number of arguments. Expected query and propertyName",
		}
	}

	// Extract query and propertyName from arguments
	query := args[0].String()
	propertyName := args[1].String()

	// Create scanner and parse AST
	scanner := newScanner(query)
	ast, err := scanner.toAST()
	if err != nil {
		return map[string]interface{}{
			"error": fmt.Sprintf("Failed to parse query: %v", err),
		}
	}

	// Extract properties from the AST

	// Return the result
	return map[string]interface{}{
		"properties":   printAST(ast, ""),
		"propertyName": propertyName,
	}
}

func main() {
	// Create a channel to keep the program running
	c := make(chan struct{}, 0)

	// Register the function in the JavaScript global scope
	js.Global().Set("getAstProperty", js.FuncOf(getAstPropertyWasm))

	// Wait indefinitely
	<-c
}
