// jshint ignore: start
// jscs: disable

ace.define("ace/mode/clickhouse_highlight_rules", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text_highlight_rules"], function (require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;debugger
    var ClickhouseInfo = require("./clickhouse_info").ClickhouseInfo;

    var ClickHouseHighlightRules = function () {
        var keywords = ClickhouseInfo.KeywordsRe(),
            builtinConstants = ClickhouseInfo.ConstantsRe(),
            builtinFunctions = ClickhouseInfo.FunctionsRe(),
            dataTypes = ClickhouseInfo.DataTypesRe();

        var keywordMapper = this.createKeywordMapper({
            "support.function": builtinFunctions,
            "keyword": keywords,
            "constant.language": builtinConstants,
            "storage.type": dataTypes
        }, "identifier", true);

        this.$rules = {
            "start": [{
                token: "comment",
                regex: "--.*$"
            }, {
                token: "comment",
                start: "/\\*",
                end: "\\*/"
            }, {
                token: "string",           // ' string
                regex: "'.*?'"
            }, {
                token: "constant.numeric", // float
                regex: "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
            }, {
                token: keywordMapper,
                regex: "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
            }, {
                token: "keyword.operator",
                regex: "\\+|\\-|\\/|\\/\\/|%|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|="
            }, {
                token: "paren.lparen",
                regex: "[\\(]"
            }, {
                token: "paren.rparen",
                regex: "[\\)]"
            }, {
                token: "text",
                regex: "\\s+"
            }]
        };
        this.normalizeRules();
    };

    oop.inherits(ClickHouseHighlightRules, TextHighlightRules);

    exports.ClickHouseHighlightRules = ClickHouseHighlightRules;
});

ace.define("ace/mode/clickhouse_completions", ["require", "exports", "module", "ace/token_iterator", "ace/lib/lang"], function (require, exports, module) {
    "use strict";

    // var lang = require("../lib/lang");
    var ClickhouseInfo = require("./clickhouse_info").ClickhouseInfo;

    var keyWordsCompletions = ClickhouseInfo.Keywords.map(function (word) {
        return {
            caption: word,
            value: word,
            meta: "keyword",
            score: Number.MAX_VALUE
        }
    });

    var functionsCompletions = ClickhouseInfo.FunctionsCompletions().map(function (item) {
        return {
            caption: item.name,
            value: item.value,
            docHTML: item.docText,
            meta: "function",
            score: Number.MAX_VALUE
        };
    });

    var ClickhouseCompletions = function () {
    };

    (function () {
        this.getCompletions = function (state, session, pos, prefix, callback) {
            var token = session.getTokenAt(pos.row, pos.column);
            if (token.type === 'entity.name.tag' || token.type === 'string.quoted') {
                return callback(null, []);
            }

            var completions = keyWordsCompletions.concat(functionsCompletions);
            callback(null, completions);
        };

    }).call(ClickhouseCompletions.prototype);

    exports.ClickhouseCompletions = ClickhouseCompletions;
});


ace.define("ace/mode/clickhouse", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/mode/clickhouse_highlight_rules"], function (require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var ClickHouseHighlightRules = require("./clickhouse_highlight_rules").ClickHouseHighlightRules;
    var ClickhouseCompletions = require("./clickhouse_completions").ClickhouseCompletions;


    var Mode = function () {
        this.HighlightRules = ClickHouseHighlightRules;
        this.$completer = new ClickhouseCompletions();
        // replace keyWordCompleter
        this.completer = this.$completer;
    };

    oop.inherits(Mode, TextMode);

    (function () {
        this.$id = "ace/mode/clickhouse";
    }).call(Mode.prototype);

    exports.Mode = Mode;
});

