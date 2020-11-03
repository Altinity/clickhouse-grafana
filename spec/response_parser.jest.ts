import ResponseParser from "../src/response_parser";

describe("Parse response:", () => {
    describe("When __value and __text macros are used", () => {
        const response = {
            "meta": [
                {
                    "name": "__value",
                    "type": "String",
                },
                {
                    "name": "__text",
                    "type": "String",
                },
            ],

            "data": [
                {
                    "__value": "actual value",
                    "__text": "Label",
                },
            ],
        };

        // @ts-ignore
        const responseParser = new ResponseParser(this.$q);
        const data = responseParser.parse("SELECT hostname AS __text, id AS __value FROM host", response);

        it('should return key-value pairs', function () {
            expect(data[0].text).toBe('Label');
            expect(data[0].value).toBe('actual value');
        });
    });
});

// try to check https://github.com/Vertamedia/clickhouse-grafana/issues/281
describe("When meta and data keys do not have the same index", () => {
    const response = {
        "meta": [
            {
                "name": "c",
                "type": "String",
            },
            {
                "name": "a",
                "type": "String",
            },
            {
                "name": "b",
                "type": "String",
            },
        ],

        "data": [
            {
                "b": "b_value",
                "c": "c_value",
                "a": "a_value",
            },
        ],
    };

    // @ts-ignore
    const responseParser = new ResponseParser(this.$q);
    const data = responseParser.parse("SELECT col1 AS foo, col2 AS bar FROM host", response);

    it('should return key-value pairs', function () {
        expect(data[0]).toStrictEqual({"a": "a_value", "b": "b_value", "c": "c_value"});
    });
});
