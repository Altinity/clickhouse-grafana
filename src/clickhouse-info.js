// jshint ignore: start
// jscs: disable

ace.define("ace/mode/clickhouse_info", ["require", "exports", "module"], function (require, exports, module) {
    "use strict";

    var p = {};
    p.Keywords = [
        "select",
        "from",
        "where",
        "prewhere",
        "having",
        "order",
        "group",
        "limit",
        "format",
        "union",
        "by",
        "all",
        "right",
        "left",
        "any",
        "global",
        "in",
        "not",
        "offset",
        "type",
        "inner",
        "outer",
        "desc",
        "asc",
        "between",
        "foreign",
        "default",
        "null",
        "show",
        "attach",
        "detach",
        "describe",
        "optimize",
        "using"
    ];
    p.DataTypes = [
        "int",
        "numeric",
        "decimal",
        "date",
        "varchar",
        "char",
        "bigint",
        "float",
        "double",
        "bit",
        "binary",
        "text",
        "set",
        "timestamp",
        "uint8",
        "uint16",
        "uint32",
        "uint64",
        "int8",
        "int16",
        "int32",
        "int64",
        "float32",
        "float64",
        "datetime",
        "enum8",
        "enum16",
        "array",
        "tuple",
        "string"
    ];
    p.Constants = [
        "true",
        "false",
    ];
    p.Funcs = [
        "IPv4NumToString", "IPv4NumToStringClassC", "IPv4StringToNum", "IPv6NumToString", "IPv6StringToNum",
        "MD5", "OSHierarchy", "OSIn", "OSToRoot", "SEHierarchy", "SEIn", "SEToRoot", "SHA1", "SHA224", "SHA256",
        "URLHash", "URLHierarchy", "URLPathHierarchy", "abs", "alphaTokens", "appendTrailingCharIfAbsent",
        "argMax", "argMin", "argMinIf", "arrayAll", "arrayCount", "arrayElement", "arrayEnumerate", "arrayEnumerateUniq",
        "arrayExists", "arrayFilter", "arrayFirst", "arrayJoin", "arrayMap", "arraySum", "avg", "avgIf",
        "bitAnd", "bitNot", "bitOr", "bitShiftLeft", "bitShiftRight", "bitXor", "bitmaskToArray", "bitmaskToList",
        "ceil", "cityHash64", "coalesce", "concat", "corr", "corrIf", "count", "countEqual", "countIf", "countIf",
        "covarPop", "covarPopIf", "covarSamp", "covarSampIf", "cutFragment", "cutQueryString", "cutQueryStringAndFragment",
        "cutToFirstSignificantSubdomain", "cutURLParameter", "cutWWW", "dictGetDate", "dictGetDateTime", "dictGetFloat32",
        "dictGetFloat64", "dictGetHierarchy", "dictGetInt16", "dictGetInt32", "dictGetInt64", "dictGetInt8", "dictGetString",
        "dictGetUInt16", "dictGetUInt32", "dictGetUInt64", "dictGetUInt8", "dictHas", "dictIsIn", "divide", "domainWithoutWWW",
        "empty", "extract", "extractAll", "extractURLParameter", "extractURLParameterNames", "extractURLParameters",
        "first", "firstSignificantSubdomain", "floor", "groupArray", "groupUniqArray", "halfMD5", "has", "hex", "ifnull",
        "indexOf", "intDiv", "intDivOrZero", "intHash32", "intHash64", "isnull", "last", "lcase", "length", "lengthUTF8",
        "like", "lower", "lowerUTF8", "match", "max", "median", "medianIf", "mid", "min", "minus", "modulo", "multiply",
        "negate", "notEmpty", "notLike", "now", "now", "nvl", "plus", "position", "positionUTF8", "quantile",
        "quantileDeterministic", "quantileExact", "quantileExactWeighted", "quantileTDigest", "quantileTiming",
        "quantileTimingWeighted", "quantiles", "quantilesIf", "quantilesTimingArrayIf", "quantilesTimingIf", "queryString",
        "queryStringAndFragment", "rand", "rand64", "range", "rank", "regionHierarchy", "regionIn", "regionToContinent",
        "regionToCountry", "regionToName", "regionToPopulation", "reinterpretAsDate", "reinterpretAsDateTime", "reinterpretAsFloat32",
        "reinterpretAsFloat64", "reinterpretAsInt16", "reinterpretAsInt32", "reinterpretAsInt64", "reinterpretAsInt8", "reinterpretAsString",
        "reinterpretAsUInt16", "reinterpretAsUInt32", "reinterpretAsUInt64", "reinterpretAsUInt8", "replaceAll", "replaceOne",
        "replaceRegexpOne", "reverse", "reverseUTF8", "round", "round", "roundAge", "roundDuration", "roundToExp2", "sequenceCount",
        "sequenceMatch", "sipHash128", "sipHash64", "splitByChar", "splitByString", "stddevPop", "stddevPopIf", "stddevSamp",
        "stddevSampIf", "substring", "substringUTF8", "sum", "sumArray", "sumArrayIf", "sumIf", "timeSlot", "toDate", "toDateTime",
        "toDayOfMonth", "toDayOfWeek", "toFixedString", "toFloat32", "toFloat64", "toHour", "toInt16", "toInt32", "toInt64", "toInt8",
        "toMinute", "toMonday", "toMonth", "toRelativeDayNum", "toRelativeHourNum", "toRelativeMinuteNum", "toRelativeMonthNum",
        "toRelativeSecondNum", "toRelativeWeekNum", "toRelativeYearNum", "toSecond", "toStartOfFiveMinute", "toStartOfHour",
        "toStartOfMinute", "toStartOfMonth", "toStartOfQuarter", "toStartOfYear", "toString", "toStringCutToZero", "toTime", "toUInt16",
        "toUInt32", "toUInt64", "toUInt8", "toYear", "today", "topLevelDomain", "ucase", "unhex", "uniq", "uniqArray", "uniqArrayIf",
        "uniqArrayIf", "uniqCombined", "uniqExact", "uniqExactIf", "uniqHLL12", "uniqUpTo", "upper", "upperUTF8", "varPop", "varPopIf",
        "varSamp", "varSampIf", "yesterday"
    ];
    p.KeywordsRe = function () {
        return this.re(p.Keywords)
    };
    p.ConstantsRe = function () {
        return this.re(p.Constants)
    };
    p.FunctionsRe = function () {
        return this.re(p.Funcs)
    };
    p.DataTypesRe = function () {
        return this.re(p.DataTypes);
    };
    p.FunctionsCompletions = function () {
        return [
            {
                "name": "corr",
                "def": "corr(x, y)",
                "docText": "Calculates the Pearson correlation coefficient: <span class=\"inline-example\">Σ((x - x̅)(y - y̅)) / sqrt(Σ((x - x̅)<sup>2</sup>) * Σ((y - y̅)<sup>2</sup>))</span>."
            },
            {
                "name": "stddevPop",
                "def": "stddevPop(x)",
                "docText": "The result is equal to the square root of &#39;varPop(x)&#39;."
            },
            {
                "name": "varPop",
                "def": "varPop(x, y)",
                "docText": "Calculates the value of %%Σ((x - x̅)(y - y̅)) / n%%."
            },
            {
                "name": "argMin",
                "def": "argMin(arg, val)",
                "docText": "Calculates the &#39;arg&#39; value for a minimal &#39;val&#39; value. If there are several different values of &#39;arg&#39; for minimal values of &#39;val&#39;, the first of these values encountered is output."
            },
            {
                "name": "quantileExactWeighted",
                "def": "quantileExactWeighted(level)(x, weight)",
                "docText": "Вычисляет квантиль уровня level точно."
            },
            {
                "name": "min",
                "def": "min(v)",
                "docText": "Minimal execution speed in rows per second. Checked on every data block when &#39;timeout_before_checking_execution_speed&#39; expires. If the execution speed is lower, an exception is thrown."
            },
            {
                "name": "varSamp",
                "def": "varSamp(x, y)",
                "docText": "Calculates the value of %%Σ((x - x̅)(y - y̅)) / (n - 1)%%. <br>  <br> Returns Float64. If n &lt;= 1, it returns +∞."
            },
            {
                "name": "anyLast",
                "def": "anyLast(x)",
                "docText": "Selects the last value encountered. <br> The result is just as indeterminate as for the &#39;any&#39; function."
            },
            {
                "name": "argMax",
                "def": "argMax(arg, val)",
                "docText": "Calculates the &#39;arg&#39; value for a maximum &#39;val&#39; value. If there are several different values of &#39;arg&#39; for maximum values of &#39;val&#39;, the first of these values encountered is output."
            },
            {
                "name": "count",
                "def": "count()",
                "docText": "Counts the number of rows. "
            },
            {
                "name": "any",
                "def": "any(x)",
                "docText": "Selects the last value encountered. <br> The result is just as indeterminate as for the &#39;any&#39; function."
            },
            {
                "name": "avg",
                "def": "avg(x)",
                "docText": "Calculates the average. <br> Only works for numbers. <br> The result is always Float64."
            },
            {
                "name": "sequenceMatch",
                "def": "sequenceMatch(pattern)(time, cond1, cond2, ...)",
                "docText": "Pattern matching for event chains. <br>  <br> &#39;pattern&#39; is a string containing a pattern to match."
            },
            {
                "name": "stddevSamp",
                "def": "stddevSamp(x)",
                "docText": "The result is equal to the square root of &#39;varSamp(x)&#39;."
            },
            {
                "name": "medianDeterministic",
                "def": "medianDeterministic(x, determinator)",
                "docText": "This function works similarly to the &#39;median&#39; function - it approximates the median."
            },
            {
                "name": "quantilesTimingWeighted",
                "def": "quantilesTimingWeighted(level1, level2, ...)(x, weight)",
                "docText": "Calculates the quantiles of all specified levels using the same algorithm as the &#39;medianTimingWeighted&#39; function."
            },
            {
                "name": "uniq",
                "def": "uniq(N)(x)",
                "docText": "Calculates the number of different argument values, if it is less than or equal to N. <br> If the number of different argument values is greater than N, it returns N + 1."
            },
            {
                "name": "covarSamp",
                "def": "covarSamp(x, y)",
                "docText": "Calculates the value of %%Σ((x - x̅)(y - y̅)) / (n - 1)%%. <br>  <br> Returns Float64. If n &lt;= 1, it returns +∞."
            },
            {
                "name": "max",
                "def": "max(v)",
                "docText": "Maximum number of bytes (uncompressed data) that can be passed to a remote server or saved in a temporary table when using GLOBAL IN."
            },
            {
                "name": "quantileTDigest",
                "def": "quantileTDigest(level)(x)",
                "docText": "t-digest"
            },
            {
                "name": "quantilesTiming",
                "def": "quantilesTiming(level1, level2, ...)(x, weight)",
                "docText": "Calculates the quantiles of all specified levels using the same algorithm as the &#39;medianTimingWeighted&#39; function."
            },
            {
                "name": "quantiles",
                "def": "quantiles(level1, level2, ...)(x, determinator)",
                "docText": "Calculates the quantiles of all specified levels using the same algorithm as the &#39;medianDeterministic&#39; function."
            },
            {
                "name": "quantile",
                "def": "quantile(level1, level2, ...)(x, determinator)",
                "docText": "Calculates the quantiles of all specified levels using the same algorithm as the &#39;medianDeterministic&#39; function."
            },
            {
                "name": "groupArray",
                "def": "groupArray(x)",
                "docText": "Creates an array of argument values. <br> Values can be added to the array in any (indeterminate) order. <br>  <br> In some cases, you can rely on the order of execution. This applies to cases when SELECT comes from a subquery that uses ORDER BY."
            },
            {
                "name": "sum",
                "def": "sum(x)",
                "docText": "Calculates the sum. <br> Only works for numbers."
            },
            {
                "name": "median",
                "def": "median(x, weight)",
                "docText": "Differs from the &#39;medianTiming&#39; function in that it has a second argument - &quot;weights&quot;. Weight is a non-negative integer. <br> The result is calculated as if the &#39;x&#39; value were passed &#39;weight&#39; number of times to the &#39;medianTiming&#39; function."
            },
            {
                "name": "quantileTiming",
                "def": "quantileTiming(level)(x, weight)",
                "docText": "Calculates the quantile of &#39;level&#39; using the same algorithm as the &#39;medianTimingWeighted&#39; function."
            },
            {
                "name": "quantileTimingWeighted",
                "def": "quantileTimingWeighted(level)(x, weight)",
                "docText": "Calculates the quantile of &#39;level&#39; using the same algorithm as the &#39;medianTimingWeighted&#39; function."
            },
            {
                "name": "groupUniqArray",
                "def": "groupUniqArray(x)",
                "docText": "Creates an array from different argument values. Memory consumption is the same as for the &#39;uniqExact&#39; function."
            },
            {
                "name": "uniqHLL12",
                "def": "uniqHLL12(x)",
                "docText": "Uses the HyperLogLog algorithm to approximate the number of different values of the argument. "
            },
            {
                "name": "covarPop",
                "def": "covarPop(x, y)",
                "docText": "Calculates the value of %%Σ((x - x̅)(y - y̅)) / n%%."
            },
            {
                "name": "sequenceCount",
                "def": "sequenceCount(pattern)(time, cond1, cond2, ...)",
                "docText": "sequenceMatch"
            },
            {
                "name": "quantileDeterministic",
                "def": "quantileDeterministic(level)(x, determinator)",
                "docText": "Calculates the quantile of &#39;level&#39; using the same algorithm as the &#39;medianDeterministic&#39; function."
            },
            {
                "name": "quantileExact",
                "def": "quantileExact(level)(x, weight)",
                "docText": ""
            },
            {
                "name": "quantilesDeterministic",
                "def": "quantilesDeterministic(level1, level2, ...)(x, determinator)",
                "docText": "Calculates the quantiles of all specified levels using the same algorithm as the &#39;medianDeterministic&#39; function."
            },
            {
                "name": "medianTiming",
                "def": "medianTiming(x, weight)",
                "docText": "Differs from the &#39;medianTiming&#39; function in that it has a second argument - &quot;weights&quot;."
            },
            {
                "name": "medianTimingWeighted",
                "def": "medianTimingWeighted(x, weight)",
                "docText": "Differs from the &#39;medianTiming&#39; function in that it has a second argument - &quot;weights&quot;."
            },
            {
                "name": "uniqExact",
                "def": "uniqExact(x)",
                "docText": "Calculates the number of different values of the argument, exactly. <br> There is no reason to fear approximations, so it&#39;s better to use the &#39;uniq&#39; function. <br> You should use the &#39;uniqExact&#39; function if you definitely need an exact result. "
            },
            {
                "name": "uniqCombined",
                "def": "uniqCombined(x)",
                "docText": ""
            },
            {
                "name": "uniqUpTo",
                "def": "uniqUpTo(N)(x)",
                "docText": "Calculates the number of different argument values, if it is less than or equal to N. <br> If the number of different argument values is greater than N, it returns N + 1."
            },
            {
                "name": "substring",
                "def": "substring(s, offset, length)",
                "docText": "The same as &#39;substring&#39;, but for Unicode code points. Works under the assumption that the string contains a set of bytes representing a UTF-8 encoded text. If this assumption is not met, it returns some result (it doesn&#39;t throw an exception)."
            },
            {
                "name": "notLike",
                "def": "notLike(haystack, pattern), haystack NOT LIKE pattern operator",
                "docText": "The same thing as &#39;like&#39;, but negative."
            },
            {
                "name": "hostName",
                "def": "hostName()",
                "docText": "Returns a string with the name of the host that this function was performed on. For distributed processing, this is the name of the remote server host, if the function is performed on a remote server."
            },
            {
                "name": "globalNotIn",
                "def": "globalNotIn(v)",
                "docText": "See the section &quot;IN operators&quot;."
            },
            {
                "name": "or",
                "def": "or(v)",
                "docText": "The same thing as &#39;max_temporary_columns&#39;, but without counting constant columns. <br> Note that constant columns are formed fairly often when running a query, but they require approximately zero computing resources."
            },
            {
                "name": "extractAll",
                "def": "extractAll(haystack, pattern)",
                "docText": "Extracts all the fragments of a string using a regular expression. If &#39;haystack&#39; doesn&#39;t match the &#39;pattern&#39; regex, an empty string is returned. Returns an array of strings consisting of all matches to the regex."
            },
            {
                "name": "arrayFirst",
                "def": "arrayFirst(func, arr1, ...)",
                "docText": "Returns the index of the first element in the &#39;arr1&#39; array for which &#39;func&#39; returns something other than 0."
            },
            {
                "name": "notEquals",
                "def": "notEquals(v)",
                "docText": ""
            },
            {
                "name": "arrayExists",
                "def": "arrayExists([func,] arr1, ...)",
                "docText": "Returns 1 if there is at least one element in &#39;arr&#39; for which &#39;func&#39; returns something other than 0. Otherwise, it returns 0."
            },
            {
                "name": "arrayCount",
                "def": "arrayCount([func,] arr1, ...)",
                "docText": "Returns the number of elements in &#39;arr&#39; for which &#39;func&#39; returns something other than 0. If &#39;func&#39; is not specified, it returns the number of non-zero items in the array."
            },
            {
                "name": "arrayMap",
                "def": "arrayMap(func, arr1, ...)",
                "docText": "Returns an array obtained from the original application of the &#39;func&#39; function to each element in the &#39;arr&#39; array."
            },
            {
                "name": "now",
                "def": "now(v)",
                "docText": "If the parameter is true, INSERT operation will skip columns with unknown names from input. <br> Otherwise, an exception will be generated, it is default behavior. <br> The parameter works only for JSONEachRow and TSKV input formats."
            },
            {
                "name": "intDiv",
                "def": "intDiv(a, b)",
                "docText": "Differs from &#39;intDiv&#39; in that it returns zero when dividing by zero or when dividing a minimal negative number by minus one."
            },
            {
                "name": "topLevelDomain",
                "def": "topLevelDomain(v)",
                "docText": "- Selects the top-level domain. Example: .ru."
            },
            {
                "name": "intHash32",
                "def": "intHash32(v)",
                "docText": "Calculates a 32-bit hash code from any type of integer. <br> This is a relatively fast non-cryptographic hash function of average quality for numbers."
            },
            {
                "name": "replaceOne",
                "def": "replaceOne(haystack, pattern, replacement)",
                "docText": "Replaces the first occurrence, if it exists, of the &#39;pattern&#39; substring in &#39;haystack&#39; with the &#39;replacement&#39; substring. <br> Hereafter, &#39;pattern&#39; and &#39;replacement&#39; must be constants."
            },
            {
                "name": "cityHash64",
                "def": "cityHash64(v)",
                "docText": "Calculates CityHash64 from a string or a similar hash function for any number of any type of arguments. <br> For String-type arguments, CityHash is used. This is a fast non-cryptographic hash function for strings with decent quality"
            },
            {
                "name": "OSToRoot",
                "def": "OSToRoot(v)",
                "docText": "Accepts a UInt8 number - the ID of the operating system from the Yandex.Metrica dictionary. If any OS matches the passed number, it returns a UInt8 number - the ID of the corresponding root OS (for example, it converts Windows Vista to Windows). Otherwise, returns 0."
            },
            {
                "name": "sipHash128",
                "def": "sipHash128(v)",
                "docText": "Calculates SipHash from a string. <br> Accepts a String-type argument. Returns FixedString(16). <br> Differs from sipHash64 in that the final xor-folding state is only done up to 128 bits."
            },
            {
                "name": "SHA1",
                "def": "SHA1(v)",
                "docText": "Calculates SHA-1, SHA-224, or SHA-256 from a string and returns the resulting set of bytes as FixedString(20), FixedString(28), or FixedString(32)."
            },
            {
                "name": "asin",
                "def": "asin(x)",
                "docText": "The arc sine."
            },
            {
                "name": "SHA256",
                "def": "SHA256(v)",
                "docText": "Calculates SHA-1, SHA-224, or SHA-256 from a string and returns the resulting set of bytes as FixedString(20), FixedString(28), or FixedString(32)."
            },
            {
                "name": "MD5",
                "def": "MD5(v)",
                "docText": "Calculates the MD5 from a string and returns the resulting set of bytes as FixedString(16)."
            },
            {
                "name": "bitmaskToList",
                "def": "bitmaskToList(num)",
                "docText": "Accepts an integer. Returns a string containing the list of powers of two that total the source number when summed. They are comma-separated without spaces in text format, in ascending order."
            },
            {
                "name": "array",
                "def": "array(v)",
                "docText": "The -%%Array%% suffix can be appended to any aggregate function. In this case, the aggregate function takes arguments of the &#39;Array(T)&#39; type (arrays) instead of &#39;T&#39; type arguments. If the aggregate function accepts multiple arguments, this must be arrays of equal lengths. "
            },
            {
                "name": "dictGetStringOrDefault",
                "def": "dictGetStringOrDefault(v)",
                "docText": ""
            },
            {
                "name": "greaterOrEquals",
                "def": "greaterOrEquals(v)",
                "docText": ""
            },
            {
                "name": "e",
                "def": "e(v)",
                "docText": "What to do when the amount of data exceeds one of the limits: &#39;throw&#39; or &#39;break&#39;. By default, throw."
            },
            {
                "name": "runningDifference",
                "def": "runningDifference(x)",
                "docText": "Calculates the difference between consecutive values in the data block. <br> Result of the function depends on the order of the data in the blocks. <br>  <br> It works only inside of the each processed block of data. Data splitting in the blocks is not explicitly controlled by the user. "
            },
            {
                "name": "not",
                "def": "not(v)",
                "docText": "See the section &quot;IN operators&quot;."
            },
            {
                "name": "intHash64",
                "def": "intHash64(v)",
                "docText": "Calculates a 64-bit hash code from any type of integer. <br> It works faster than intHash32. Average quality."
            },
            {
                "name": "acos",
                "def": "acos(x)",
                "docText": "The arc cosine."
            },
            {
                "name": "dictGetString",
                "def": "dictGetString(v)",
                "docText": ""
            },
            {
                "name": "and",
                "def": "and(x, determinator)",
                "docText": "This function works similarly to the &#39;median&#39; function - it approximates the median. However, in contrast to &#39;median&#39;, the result is deterministic and does not depend on the order of query execution. <br>  <br> To achieve this, the function takes a second argument - the &quot;determinator&quot;. "
            },
            {
                "name": "dictGetDate",
                "def": "dictGetDate(v)",
                "docText": ""
            },
            {
                "name": "dictGetFloat32",
                "def": "dictGetFloat32(v)",
                "docText": ""
            },
            {
                "name": "dictGetInt8",
                "def": "dictGetInt8(v)",
                "docText": ""
            },
            {
                "name": "dictGetUInt32",
                "def": "dictGetUInt32(v)",
                "docText": ""
            },
            {
                "name": "OSIn",
                "def": "OSIn(lhs, rhs)",
                "docText": "Checks whether the &#39;lhs&#39; operating system belongs to the &#39;rhs&#39; operating system."
            },
            {
                "name": "arrayFirstIndex",
                "def": "arrayFirstIndex(func, arr1, ...)",
                "docText": "Returns the index of the first element in the &#39;arr1&#39; array for which &#39;func&#39; returns something other than 0."
            },
            {
                "name": "ceil",
                "def": "ceil(x[, N])",
                "docText": "Returns the smallest round number that is greater than or equal to &#39;x&#39;. In every other way, it is the same as the &#39;floor&#39; function (see above)."
            },
            {
                "name": "fragment",
                "def": "fragment(v)",
                "docText": "Removes the query-string and fragment identifier. The question mark and number sign are also removed."
            },
            {
                "name": "dictGetUInt8",
                "def": "dictGetUInt8(v)",
                "docText": ""
            },
            {
                "name": "dictHas",
                "def": "dictHas(v)",
                "docText": ""
            },
            {
                "name": "arraySum",
                "def": "arraySum([func,] arr1, ...)",
                "docText": "Returns the sum of the &#39;func&#39; values. If the function is omitted, it just returns the sum of the array elements."
            },
            {
                "name": "emptyArrayDateTime",
                "def": "emptyArrayDateTime(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "intDivOrZero",
                "def": "intDivOrZero(a, b)",
                "docText": "Differs from &#39;intDiv&#39; in that it returns zero when dividing by zero or when dividing a minimal negative number by minus one."
            },
            {
                "name": "SEHierarchy",
                "def": "SEHierarchy(v)",
                "docText": "Accepts a UInt8 number - the ID of the search engine from the Yandex.Metrica dictionary. Returns an array with a hierarchy of search engines. Similar to the &#39;regionHierarchy&#39; function."
            },
            {
                "name": "regionToContinent",
                "def": "regionToContinent(id[, geobase])",
                "docText": "Converts a region to a continent. In every other way, this function is the same as &#39;regionToCity&#39;. <br> Example: %%regionToContinent(toUInt32(213)) = 10001%% converts Moscow (213) to Eurasia (10001)."
            },
            {
                "name": "dictGetInt32",
                "def": "dictGetInt32(v)",
                "docText": ""
            },
            {
                "name": "toInt8",
                "def": "toInt8(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "materialize",
                "def": "materialize(x)",
                "docText": "Turns a constant into a full column containing just one value. <br> In ClickHouse, full columns and constants are represented differently in memory. Functions work differently for constant arguments and normal arguments (different code is executed), although the result is almost always the same. This function is for debugging this behavior."
            },
            {
                "name": "regionToCountry",
                "def": "regionToCountry(id[, geobase])",
                "docText": "Converts a region to a country. In every other way, this function is the same as &#39;regionToCity&#39;. <br> Example: %%regionToCountry(toUInt32(213)) = 225%% converts Moscow (213) to Russia (225)."
            },
            {
                "name": "dictGetDateTime",
                "def": "dictGetDateTime(v)",
                "docText": ""
            },
            {
                "name": "xor",
                "def": "xor(v)",
                "docText": ""
            },
            {
                "name": "regionToCity",
                "def": "regionToCity(id[, geobase])",
                "docText": "Accepts a UInt32 number - the region ID from the Yandex geobase. If this region is a city or part of a city, it returns the region ID for the appropriate city. Otherwise, returns 0."
            },
            {
                "name": "dictGetFloat64",
                "def": "dictGetFloat64(v)",
                "docText": ""
            },
            {
                "name": "timeSlot",
                "def": "timeSlot(StartTime, Duration)",
                "docText": "For a time interval starting at &#39;StartTime&#39; and continuing for &#39;Duration&#39; seconds, it returns an array of moments in time, consisting of points from this interval rounded down to the half hour."
            },
            {
                "name": "toTime",
                "def": "toTime(v)",
                "docText": "Converts a date with time to the date of the start of the Unix Epoch, while preserving the time."
            },
            {
                "name": "log2",
                "def": "log2(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to the binary logarithm of the argument."
            },
            {
                "name": "toRelativeHourNum",
                "def": "toRelativeHourNum(v)",
                "docText": "Converts a date with time or date to the number of the hour, starting from a certain fixed point in the past."
            },
            {
                "name": "toRelativeDayNum",
                "def": "toRelativeDayNum(v)",
                "docText": "Converts a date with time or date to the number of the day, starting from a certain fixed point in the past."
            },
            {
                "name": "toRelativeWeekNum",
                "def": "toRelativeWeekNum(v)",
                "docText": "Converts a date with time or date to the number of the week, starting from a certain fixed point in the past."
            },
            {
                "name": "splitByString",
                "def": "splitByString(separator, s)",
                "docText": "The same as above, but it uses a string of multiple characters as the separator. The string must be non-empty."
            },
            {
                "name": "currentDatabase",
                "def": "currentDatabase()",
                "docText": "Returns the name of the current database. <br> You can use this function in table engine parameters in a CREATE TABLE query where you need to specify the database."
            },
            {
                "name": "toRelativeMonthNum",
                "def": "toRelativeMonthNum(v)",
                "docText": "Converts a date with time or date to the number of the month, starting from a certain fixed point in the past."
            },
            {
                "name": "visibleWidth",
                "def": "visibleWidth(x)",
                "docText": "Calculates the approximate width when outputting values to the console in text format (tab-separated). This function is used by the system for implementing Pretty formats."
            },
            {
                "name": "bitShiftRight",
                "def": "bitShiftRight(a, b)",
                "docText": ""
            },
            {
                "name": "toRelativeYearNum",
                "def": "toRelativeYearNum(v)",
                "docText": "Converts a date with time or date to the number of the year, starting from a certain fixed point in the past."
            },
            {
                "name": "toStartOfHour",
                "def": "toStartOfHour(v)",
                "docText": "Rounds down a date with time to the start of the hour."
            },
            {
                "name": "halfMD5",
                "def": "halfMD5(v)",
                "docText": "Calculates the MD5 from a string. Then it takes the first 8 bytes of the hash and interprets them as UInt64 in big endian."
            },
            {
                "name": "toStartOfFiveMinute",
                "def": "toStartOfFiveMinute(v)",
                "docText": ""
            },
            {
                "name": "toUInt16OrZero",
                "def": "toUInt16OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument."
            },
            {
                "name": "toMonday",
                "def": "toMonday(v)",
                "docText": "Rounds down a date or date with time to the nearest Monday. <br> Returns the date."
            },
            {
                "name": "IPv6NumToString",
                "def": "IPv6NumToString(x)",
                "docText": "Accepts a FixedString(16) value containing the IPv6 address in binary format. Returns a string containing this address in text format. "
            },
            {
                "name": "indexOf",
                "def": "indexOf(arr, x)",
                "docText": "Returns the index of the &#39;x&#39; element (starting from 1) if it is in the array, or 0 if it is not."
            },
            {
                "name": "today",
                "def": "today(v)",
                "docText": "Accepts zero arguments and returns the current date at one of the moments of request execution. <br> The same as &#39;toDate(now())&#39;."
            },
            {
                "name": "emptyArrayToSingle",
                "def": "emptyArrayToSingle(v)",
                "docText": "Accepts an empty array as argument and returns an array of one element equal to the default value."
            },
            {
                "name": "sleep",
                "def": "sleep(seconds)",
                "docText": "Sleeps &#39;seconds&#39; seconds on each data block. You can specify an integer or a floating-point number."
            },
            {
                "name": "extract",
                "def": "extract(params, name)",
                "docText": "Parses the string in double quotes. The value is unescaped. If unescaping failed, it returns an empty string. Examples: "
            },
            {
                "name": "emptyArrayInt8",
                "def": "emptyArrayInt8(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "regionToName",
                "def": "regionToName(id[, lang])",
                "docText": "Accepts a UInt32 number - the region ID from the Yandex geobase. A string with the name of the language can be passed as a second argument. Supported languages are: ru, en, ua, uk, by, kz, tr. If the second argument is omitted, the language &#39;ru&#39; is used. "
            },
            {
                "name": "concat",
                "def": "concat(arr[, separator])",
                "docText": "Concatenates strings from the array elements, using &#39;separator&#39; as the separator. <br> &#39;separator&#39; is a string constant, an optional parameter. By default it is an empty string. <br> Returns a string."
            },
            {
                "name": "convertCharset",
                "def": "convertCharset(s, from, to)",
                "docText": "Returns a string with the data %%s%% (encoded as %%from%% charset) that was converted to the %%to%% charset."
            },
            {
                "name": "toMonth",
                "def": "toMonth(v)",
                "docText": "Converts a date or date with time to a UInt8 number containing the month number (1-12)."
            },
            {
                "name": "IPv6StringToNum",
                "def": "IPv6StringToNum(s)",
                "docText": "The reverse function of IPv6NumToString. If the IPv6 address has an invalid format, it returns a string of null bytes. <br> HEX can be uppercase or lowercase."
            },
            {
                "name": "emptyArrayString",
                "def": "emptyArrayString(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "uptime",
                "def": "uptime()",
                "docText": "Returns server's uptime in seconds."
            },
            {
                "name": "blockSize",
                "def": "blockSize()",
                "docText": "Gets the size of the block. <br> In ClickHouse, queries are always run on blocks (sets of column parts). This function allows getting the size of the block that you called it for."
            },
            {
                "name": "toInt64OrZero",
                "def": "toInt64OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "pathFull",
                "def": "pathFull(v)",
                "docText": "- The same as above, but including query-string and fragment. Example: /top/news.html?page=2#comments"
            },
            {
                "name": "emptyArrayDate",
                "def": "emptyArrayDate(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "emptyArrayInt64",
                "def": "emptyArrayInt64(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "toInt32OrZero",
                "def": "toInt32OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "greater",
                "def": "greater(v)",
                "docText": ""
            },
            {
                "name": "emptyArrayInt32",
                "def": "emptyArrayInt32(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "toString",
                "def": "toString(str)",
                "docText": "Accepts a FixedString(16) value containing the UUID in the binary format. Returns a readable string containing the UUID in the text format."
            },
            {
                "name": "greatest",
                "def": "greatest(a, b)",
                "docText": "Returns the greatest element of a and b."
            },
            {
                "name": "emptyArrayUInt64",
                "def": "emptyArrayUInt64(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "emptyArrayUInt32",
                "def": "emptyArrayUInt32(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "formatReadableSize",
                "def": "formatReadableSize(x)",
                "docText": "Gets a size (number of bytes). Returns a string that contains rounded size with the suffix (KiB, MiB etc.). <br>  <br> Example: <br>  <br> %% "
            },
            {
                "name": "toInt16OrZero",
                "def": "toInt16OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "emptyArrayUInt8",
                "def": "emptyArrayUInt8(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "protocol",
                "def": "protocol(v)",
                "docText": "- Selects the protocol. Examples: http, ftp, mailto, magnet..."
            },
            {
                "name": "regionToPopulation",
                "def": "regionToPopulation(id[, geobase])",
                "docText": "Gets the population for a region. <br> The population can be recorded in files with the geobase. See the section &quot;External dictionaries&quot;. <br> If the population is not recorded for the region, it returns 0. <br> In the Yandex geobase, the population might be recorded for child regions, but not for parent regions."
            },
            {
                "name": "notIn",
                "def": "notIn(v)",
                "docText": "See the section &quot;IN operators&quot;."
            },
            {
                "name": "position",
                "def": "position(haystack, needle)",
                "docText": "The same as &#39;position&#39;, but the position is returned in Unicode code points. Works under the assumption that the string contains a set of bytes representing a UTF-8 encoded text. If this assumption is not met, it returns some result (it doesn&#39;t throw an exception). <br> There's also positionCaseInsensitiveUTF8 function."
            },
            {
                "name": "arrayElement",
                "def": "arrayElement(arr, n), arr[n] operator",
                "docText": "Get the element with the index &#39;n&#39; from the array &#39;arr&#39;. <br> &#39;n&#39; should be any integer type. <br> Indexes in an array begin from one. <br> Negative indexes are supported - in this case, it selects the corresponding element numbered from the end. "
            },
            {
                "name": "toStringCutToZero",
                "def": "toStringCutToZero(s)",
                "docText": "Accepts a String or FixedString argument. Returns a String that is cut to a first null byte occurrence."
            },
            {
                "name": "log",
                "def": "log(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to the decimal logarithm of the argument."
            },
            {
                "name": "SEIn",
                "def": "SEIn(lhs, rhs)",
                "docText": "Checks whether the &#39;lhs&#39; search engine belongs to the &#39;rhs&#39; search engine."
            },
            {
                "name": "replicate",
                "def": "replicate(v)",
                "docText": "Create a MergeTree table with a different name. Move all the data from the directory with the ReplicatedMergeTree table data to the new table&#39;s data directory."
            },
            {
                "name": "sipHash64",
                "def": "sipHash64(v)",
                "docText": "Calculates SipHash from a string. <br> Accepts a String-type argument. Returns UInt64. <br> SipHash is a cryptographic hash function. It works at least three times faster than MD5. For more information, see <a href=\"https://131002.net/siphash/\">https://131002.net/siphash/</a>"
            },
            {
                "name": "emptyArrayUInt16",
                "def": "emptyArrayUInt16(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "hex",
                "def": "hex(str)",
                "docText": "Accepts a string containing any number of hexadecimal digits, and returns a string containing the corresponding bytes. Supports both uppercase and lowercase letters A-F. The number of hexadecimal digits doesn&#39;t have to be even."
            },
            {
                "name": "regionToDistrict",
                "def": "regionToDistrict(id[, geobase])",
                "docText": "Converts a region to a federal district (type 4 in the geobase). In every other way, this function is the same as &#39;regionToCity&#39;. "
            },
            {
                "name": "arrayFilter",
                "def": "arrayFilter(func, arr1, ...)",
                "docText": "Returns an array containing only the elements in &#39;arr1&#39; for which &#39;func&#39; returns something other than 0. <br>  <br> Examples: <br>  <br> %% <br> SELECT arrayFilter(x -> x LIKE &#39;%World%&#39;, [&#39;Hello&#39;, &#39;abc World&#39;]) AS res "
            },
            {
                "name": "toStartOfQuarter",
                "def": "toStartOfQuarter(v)",
                "docText": "Rounds down a date or date with time to the first day of the quarter. <br> The first day of the quarter is either 1 January, 1 April, 1 July, or 1 October. Returns the date."
            },
            {
                "name": "divide",
                "def": "divide(a, b), a / b operator",
                "docText": "Calculates the quotient of the numbers. The result type is always a floating-point type. <br> It is not integer division. For integer division, use the &#39;intDiv&#39; function. <br> When dividing by zero you get &#39;inf&#39;, &#39;-inf&#39;, or &#39;nan&#39;."
            },
            {
                "name": "reverseUTF8",
                "def": "reverseUTF8(v)",
                "docText": "Reverses a sequence of Unicode code points, assuming that the string contains a set of bytes representing a UTF-8 text. Otherwise, it does something else (it doesn&#39;t throw an exception)."
            },
            {
                "name": "toDate",
                "def": "toDate(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "emptyArrayFloat64",
                "def": "emptyArrayFloat64(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "abs",
                "def": "abs(s, c)",
                "docText": "If the %%s%% string is non-empty and does not contain the %%c%% character at the end, it appends the %%c%% character to the end."
            },
            {
                "name": "yesterday",
                "def": "yesterday(v)",
                "docText": "Accepts zero arguments and returns yesterday&#39;s date at one of the moments of request execution. <br> The same as &#39;today() - 1&#39;."
            },
            {
                "name": "toMinute",
                "def": "toMinute(v)",
                "docText": "Converts a date with time to a UInt8 number containing the number of the minute of the hour (0-59)."
            },
            {
                "name": "bitXor",
                "def": "bitXor(a, b)",
                "docText": ""
            },
            {
                "name": "minus",
                "def": "minus(a, b), a - b operator",
                "docText": "Calculates the difference. The result is always signed. <br>  <br> You can also calculate whole numbers from a date or date with time. The idea is the same - see above for &#39;plus&#39;."
            },
            {
                "name": "toDateTime",
                "def": "toDateTime(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "modulo",
                "def": "modulo(a, b), a % b operator",
                "docText": "Calculates the remainder after division. <br> If arguments are floating-point numbers, they are pre-converted to integers by dropping the decimal portion. The remainder is taken in the same sense as in C++. Truncated division is used for negative numbers. <br> An exception is thrown when dividing by zero or when dividing a minimal negative number by minus one."
            },
            {
                "name": "bitmaskToArray",
                "def": "bitmaskToArray(num)",
                "docText": "Accepts an integer. Returns an array of UInt64 numbers containing the list of powers of two that total the source number when summed. Numbers in the array are in ascending order."
            },
            {
                "name": "negate",
                "def": "negate(a), -a operator",
                "docText": "Calculates a number with the reverse sign. The result is always signed."
            },
            {
                "name": "emptyArrayFloat32",
                "def": "emptyArrayFloat32(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "range",
                "def": "range(N)",
                "docText": "Returns an array of numbers from 0 to N-1. <br> Just in case, an exception is thrown if arrays with a total length of more than 100,000,000 elements are created in a data block."
            },
            {
                "name": "arrayAll",
                "def": "arrayAll([func,] arr1, ...)",
                "docText": "Returns 1 if &#39;func&#39; returns something other than 0 for all the elements in &#39;arr&#39;. Otherwise, it returns 0."
            },
            {
                "name": "toInt32",
                "def": "toInt32(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "unhex",
                "def": "unhex(str)",
                "docText": "Accepts a string containing any number of hexadecimal digits, and returns a string containing the corresponding bytes. Supports both uppercase and lowercase letters A-F. The number of hexadecimal digits doesn&#39;t have to be even. If it is odd, the last digit is interpreted as the younger half of the 00-0F byte. If the argument string contains anything other than hexadecimal digits, some implementation-defined result is returned (an exception isn&#39;t thrown). <br> If you want to convert the result to a number, you can use the functions &#39;reverse&#39; and &#39;reinterpretAs<i>Type</i>&#39;."
            },
            {
                "name": "toFloat64",
                "def": "toFloat64(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "bitAnd",
                "def": "bitAnd(a, b)",
                "docText": ""
            },
            {
                "name": "toStartOfYear",
                "def": "toStartOfYear(v)",
                "docText": "Rounds down a date or date with time to the first day of the year. <br> Returns the date."
            },
            {
                "name": "bitOr",
                "def": "bitOr(a, b)",
                "docText": ""
            },
            {
                "name": "SEToRoot",
                "def": "SEToRoot(v)",
                "docText": "Accepts a UInt8 number - the ID of the search engine from the Yandex.Metrica dictionary. If any search engine matches the passed number, it returns a UInt8 number - the ID of the corresponding root search engine (for example, it converts Yandex.Images to Yandex). Otherwise, returns 0."
            },
            {
                "name": "toRelativeMinuteNum",
                "def": "toRelativeMinuteNum(v)",
                "docText": "Converts a date with time or date to the number of the minute, starting from a certain fixed point in the past."
            },
            {
                "name": "visitParamExtractInt",
                "def": "visitParamExtractInt(params, name)",
                "docText": "The same as for Int64."
            },
            {
                "name": "emptyArrayInt16",
                "def": "emptyArrayInt16(v)",
                "docText": "Accepts zero arguments and returns an empty array of the appropriate type."
            },
            {
                "name": "visitParamExtractString",
                "def": "visitParamExtractString(params, name)",
                "docText": "Parses the string in double quotes. The value is unescaped. If unescaping failed, it returns an empty string. "
            },
            {
                "name": "arrayEnumerateUniq",
                "def": "arrayEnumerateUniq(arr, ...)",
                "docText": "Returns an array the same size as the source array, indicating for each element what its position is among elements with the same value. "
            },
            {
                "name": "visitParamExtractUInt",
                "def": "visitParamExtractUInt(params, name)",
                "docText": "Parses UInt64 from the value of the field named &#39;name&#39;. If this is a string field, it tries to parse a number from the beginning of the string. If the field doesn&#39;t exist, or it exists but doesn&#39;t contain a number, it returns 0."
            },
            {
                "name": "toTypeName",
                "def": "toTypeName(x)",
                "docText": "Gets the type name. Returns a string containing the type name of the passed argument."
            },
            {
                "name": "empty",
                "def": "empty(v)",
                "docText": "Accepts an empty array as argument and returns an array of one element equal to the default value."
            },
            {
                "name": "multiply",
                "def": "multiply(a, b), a * b operator",
                "docText": "Calculates the product of the numbers."
            },
            {
                "name": "has",
                "def": "has('database', 'table', 'column')",
                "docText": "Accepts constant String columns - database name, table name and column name. Returns constant UInt8 value, equal to 1 if column exists, <br> otherwise 0. <br> If table doesn't exist than exception is thrown. <br> For elements of nested data structure function checks existence of column. For nested data structure 0 is returned."
            },
            {
                "name": "bitNot",
                "def": "bitNot(a)",
                "docText": ""
            },
            {
                "name": "lessOrEquals",
                "def": "lessOrEquals(v)",
                "docText": "<h3>greaterOrEquals, >= operator</h3>"
            },
            {
                "name": "reinterpretAsInt64",
                "def": "reinterpretAsInt64(v)",
                "docText": ""
            },
            {
                "name": "IPv4NumToString",
                "def": "IPv4NumToString(num)",
                "docText": "Similar to IPv4NumToString, but using %%xxx%% instead of the last octet. "
            },
            {
                "name": "bitShiftLeft",
                "def": "bitShiftLeft(a, b)",
                "docText": ""
            },
            {
                "name": "dictGetInt16",
                "def": "dictGetInt16(v)",
                "docText": ""
            },
            {
                "name": "toUInt32OrZero",
                "def": "toUInt32OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "regionIn",
                "def": "regionIn(lhs, rhs[, geobase])",
                "docText": "Checks whether a &#39;lhs&#39; region belongs to a &#39;rhs&#39; region. Returns a UInt8 number equal to 1 if it belongs, or 0 if it doesn&#39;t belong. <br> The relationship is reflexive - any region also belongs to itself."
            },
            {
                "name": "reinterpretAsUInt8",
                "def": "reinterpretAsUInt8(v)",
                "docText": ""
            },
            {
                "name": "dictIsIn",
                "def": "dictIsIn(v)",
                "docText": "%%dictIsIn(&#39;dict_name&#39;, child_id, ancestor_id)%% <br> - For the &#39;dict_name&#39; hierarchical dictionary, finds out whether the &#39;child_id&#39; key is located inside &#39;ancestor_id&#39; (or matches &#39;ancestor_id&#39;). Returns UInt8."
            },
            {
                "name": "toSecond",
                "def": "toSecond(v)",
                "docText": "Converts a date with time to a UInt8 number containing the number of the second in the minute (0-59). <br> Leap seconds are not accounted for."
            },
            {
                "name": "least",
                "def": "least(a, b)",
                "docText": "Returns the least element of a and b."
            },
            {
                "name": "countEqual",
                "def": "countEqual(arr, x)",
                "docText": "Returns the number of elements in the array equal to &#39;x&#39;. Equivalent to <span class=\"inline-example\">arrayCount(elem -> elem = x, arr)</span>."
            },
            {
                "name": "IPv4StringToNum",
                "def": "IPv4StringToNum(s)",
                "docText": "The reverse function of IPv4NumToString. If the IPv4 address has an invalid format, it returns 0."
            },
            {
                "name": "replaceRegexpAll",
                "def": "replaceRegexpAll(haystack, pattern, replacement)",
                "docText": "This does the same thing, but replaces all the occurrences"
            },
            {
                "name": "SHA224",
                "def": "SHA224(v)",
                "docText": "Calculates SHA-1, SHA-224, or SHA-256 from a string and returns the resulting set of bytes as FixedString(20), FixedString(28), or FixedString(32). <br> The function works fairly slowly (SHA-1 processes about 5 million short strings per second per processor core, while SHA-224 and SHA-256 process about 2.2 million). "
            },
            {
                "name": "URLHash",
                "def": "URLHash(url[, N])",
                "docText": "A fast, decent-quality non-cryptographic hash function for a string obtained from a URL using some type of normalization. <br> URLHash(s) - Calculates a hash from a string without one of the trailing symbols /,? or # at the end, if present"
            },
            {
                "name": "equals",
                "def": "equals(v)",
                "docText": "<h3>greaterOrEquals, >= operator</h3>"
            },
            {
                "name": "plus",
                "def": "plus(a, b), a + b operator",
                "docText": "Calculates the sum of the numbers. <br>  <br> You can also add whole numbers with a date or date and time. In the case of a date, adding a whole number means adding the corresponding number of days. For a date with time, it means adding the corresponding number of seconds."
            },
            {
                "name": "less",
                "def": "less(v)",
                "docText": "<h3>greaterOrEquals, >= operator</h3>"
            },
            {
                "name": "regionHierarchy",
                "def": "regionHierarchy(id[, geobase])",
                "docText": "Accepts a UInt32 number - the region ID from the Yandex geobase. Returns an array of region IDs consisting of the passed region and all parents along the chain. <br> Example: %%regionHierarchy(toUInt32(213)) = [213,1,3,225,10001,10000]%%."
            },
            {
                "name": "toUInt64OrZero",
                "def": "toUInt64OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "rowNumberInAllBlocks",
                "def": "rowNumberInAllBlocks()",
                "docText": "Returns an incremental row number within all blocks that were processed by this function."
            },
            {
                "name": "toDayOfWeek",
                "def": "toDayOfWeek(v)",
                "docText": "Converts a date or date with time to a UInt8 number containing the number of the day of the week (Monday is 1, and Sunday is 7)."
            },
            {
                "name": "bar",
                "def": "bar(v)",
                "docText": "Allows building a unicode-art diagram. <br>  <br> bar(x, min, max, width) - Draws a band with a width proportional to (x - min) and equal to &#39;width&#39; characters when x"
            },
            {
                "name": "if",
                "def": "if(v)",
                "docText": "The suffix -%%If%% can be appended to the name of any aggregate function. In this case, the aggregate function accepts an extra argument - a condition (Uint8 type). "
            },
            {
                "name": "regionToArea",
                "def": "regionToArea(id[, geobase])",
                "docText": "Converts a region to an area (type 5 in the geobase). In every other way, this function is the same as &#39;regionToCity&#39;.──────────────────────────────────"
            },
            {
                "name": "dictGetUInt16",
                "def": "dictGetUInt16(v)",
                "docText": ""
            },
            {
                "name": "toUInt8",
                "def": "toUInt8(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "toUInt16",
                "def": "toUInt16(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "path",
                "def": "path(URL)",
                "docText": "- The same thing, but without the protocol and host in the result. The / element (root) is not included."
            },
            {
                "name": "extractURLParameters",
                "def": "extractURLParameters(URL)",
                "docText": "- Gets an array of name=value strings corresponding to the URL parameters. The values are not decoded in any way."
            },
            {
                "name": "OSHierarchy",
                "def": "OSHierarchy(v)",
                "docText": "Accepts a UInt8 number - the ID of the operating system from the Yandex.Metrica dictionary. Returns an array with a hierarchy of operating systems. Similar to the &#39;regionHierarchy&#39; function."
            },
            {
                "name": "cutQueryStringAndFragment",
                "def": "cutQueryStringAndFragment(v)",
                "docText": "Removes the query-string and fragment identifier. The question mark and number sign are also removed."
            },
            {
                "name": "timeSlots",
                "def": "timeSlots(StartTime, Duration)",
                "docText": "For a time interval starting at &#39;StartTime&#39; and continuing for &#39;Duration&#39; seconds, it returns an array of moments in time, consisting of points from this interval rounded down to the half hour. <br> For example, %%timeSlots(toDateTime(&#39;2012-01-01 12:20:00&#39;), toUInt32(600)) = [toDateTime(&#39;2012-01-01 12:00:00&#39;), toDateTime(&#39;2012-01-01 12:30:00&#39;)]%%. <br> This is necessary for searching for pageviews in the corresponding session."
            },
            {
                "name": "toUInt32",
                "def": "toUInt32(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "toStartOfMinute",
                "def": "toStartOfMinute(v)",
                "docText": "Rounds down a date with time to the start of the minute."
            },
            {
                "name": "version",
                "def": "version()",
                "docText": "Returns server's version as a string."
            },
            {
                "name": "toUInt64",
                "def": "toUInt64(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "toInt16",
                "def": "toInt16(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "reinterpretAsInt16",
                "def": "reinterpretAsInt16(v)",
                "docText": ""
            },
            {
                "name": "toInt64",
                "def": "toInt64(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "toFixedString",
                "def": "toFixedString(s, N)",
                "docText": "Converts a String type argument to a FixedString(N) type (a string with fixed length N). N must be a constant. If the string has fewer bytes than N, it is passed with null bytes to the right. If the string has more bytes than N, an exception is thrown."
            },
            {
                "name": "toFloat32",
                "def": "toFloat32(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "dictGetHierarchy",
                "def": "dictGetHierarchy(v)",
                "docText": "%%dictGetHierarchy(&#39;dict_name&#39;, id)%% <br> - For the &#39;dict_name&#39; hierarchical dictionary, returns an array of dictionary keys starting from &#39;id&#39; and continuing along the chain of parent elements. Returns Array(UInt64)."
            },
            {
                "name": "dictGetInt64",
                "def": "dictGetInt64(v)",
                "docText": ""
            },
            {
                "name": "CAST",
                "def": "CAST(x, t)",
                "docText": "Casts <i>x</i> to the <i>t</i> data type. <br> The syntax %%CAST(x AS t)%% is also supported. <br>  "
            },
            {
                "name": "toRelativeSecondNum",
                "def": "toRelativeSecondNum(v)",
                "docText": "Converts a date with time or date to the number of the second, starting from a certain fixed point in the past."
            },
            {
                "name": "toUInt8OrZero",
                "def": "toUInt8OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "toStartOfMonth",
                "def": "toStartOfMonth(v)",
                "docText": "Rounds down a date or date with time to the first day of the month. <br> Returns the date."
            },
            {
                "name": "rand64",
                "def": "rand64(v)",
                "docText": "Returns a pseudo-random UInt64 number, evenly distributed among all UInt64-type numbers. <br> Uses a linear congruential generator."
            },
            {
                "name": "toInt8OrZero",
                "def": "toInt8OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "toFloat32OrZero",
                "def": "toFloat32OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "toYear",
                "def": "toYear(v)",
                "docText": "Converts a date or date with time to a UInt16 number containing the year number (AD)."
            },
            {
                "name": "atan",
                "def": "atan(x)",
                "docText": "The arc tangent."
            },
            {
                "name": "toFloat64OrZero",
                "def": "toFloat64OrZero(v)",
                "docText": "Functions for converting between numbers, strings (but not fixed strings), dates, and dates with times. All these functions accept one argument. "
            },
            {
                "name": "arrayEnumerate",
                "def": "arrayEnumerate(arr, ...)",
                "docText": "Returns an array the same size as the source array, indicating for each element what its position is among elements with the same value. <br>"
            },
            {
                "name": "toDayOfMonth",
                "def": "toDayOfMonth(v)",
                "docText": "Converts a date or date with time to a UInt8 number containing the number of the day of the month (1-31)."
            },
            {
                "name": "dictGetUInt64",
                "def": "dictGetUInt64(v)",
                "docText": ""
            },
            {
                "name": "IPv4NumToStringClassC",
                "def": "IPv4NumToStringClassC(num)",
                "docText": "Similar to IPv4NumToString, but using %%xxx%% instead of the last octet. "
            },
            {
                "name": "reinterpretAsString",
                "def": "reinterpretAsString(v)",
                "docText": "This function accepts a number or date or date with time, and returns a string containing bytes representing the corresponding value in host order (little endian). Null bytes are dropped from the end. For example, a UInt32 type value of 255 is a string that is one byte long."
            },
            {
                "name": "toHour",
                "def": "toHour(v)",
                "docText": "Converts a date with time to a UInt8 number containing the number of the hour in 24-hour time (0-23). <br> This function assumes that if clocks are moved ahead, it is by one hour and occurs at 2 a.m., and if clocks are moved back, it is by one hour and occurs at 3 a.m. (which is not always true - even in Moscow the clocks were once changed at a different time)."
            },
            {
                "name": "ignore",
                "def": "ignore(...)",
                "docText": "A function that accepts any arguments and always returns 0. <br> However, the argument is still calculated. This can be used for benchmarks."
            },
            {
                "name": "arrayJoin",
                "def": "arrayJoin(v)",
                "docText": "This is a very unusual function. <br>  <br> Normal functions don&#39;t change a set of rows, but just change the values in each row (map). Aggregate functions compress a set of rows (fold or reduce). <br> The &#39;arrayJoin&#39; function takes each row and generates a set of rows (unfold). <br>  <br> T"
            },
            {
                "name": "length",
                "def": "length(v)",
                "docText": "Returns the length of a string in Unicode code points (not in characters), assuming that the string contains a set of bytes that make up UTF-8 encoded text. If this assumption is not met, it returns some result (it doesn&#39;t throw an exception). <br> The result type is UInt64."
            },
            {
                "name": "tuple",
                "def": "tuple(tuple, n), operator x.N",
                "docText": "A function that allows getting columns from a tuple. <br> &#39;N&#39; is the column index, starting from 1. &#39;N&#39; must be a constant. &#39;N&#39; must be a strict postive integer no greater than the size of the tuple. <br> There is no cost to execute the function."
            },
            {
                "name": "extractURLParameterNames",
                "def": "extractURLParameterNames(URL)",
                "docText": "- Gets an array of name=value strings corresponding to the names of URL parameters. The values are not decoded in any way."
            },
            {
                "name": "tupleElement",
                "def": "tupleElement(tuple, n), operator x.N",
                "docText": "A function that allows getting columns from a tuple. <br> &#39;N&#39; is the column index, starting from 1. &#39;N&#39; must be a constant. &#39;N&#39; must be a strict postive integer no greater than the size of the tuple. <br> There is no cost to execute the function."
            },
            {
                "name": "in",
                "def": "in(v)",
                "docText": "What to do when the amount of data exceeds one of the limits: &#39;throw&#39; or &#39;break&#39;. By default, throw."
            },
            {
                "name": "globalIn",
                "def": "globalIn(v)",
                "docText": "See the section &quot;IN operators&quot;."
            },
            {
                "name": "isFinite",
                "def": "isFinite(x)",
                "docText": "Accepts Float32 and Float64 and returns UInt8 equal to 1 if the argument is not infinite and not a NaN, otherwise 0."
            },
            {
                "name": "isNaN",
                "def": "isNaN(x)",
                "docText": "Accepts Float32 and Float64 and returns UInt8 equal to 1 if the argument is a NaN, otherwise 0."
            },
            {
                "name": "isInfinite",
                "def": "isInfinite(x)",
                "docText": "Accepts Float32 and Float64 and returns UInt8 equal to 1 if the argument is infinite, otherwise 0. <br> Note that 0 is returned for a NaN."
            },
            {
                "name": "transform",
                "def": "transform(v)",
                "docText": "Transforms a value according to the explicitly defined mapping of some elements to other ones. <br> There are two variations of this function: <br>  <br> 1. %%transform(x, array_from, array_to, default)%% "
            },
            {
                "name": "rand",
                "def": "rand(v)",
                "docText": "Returns a pseudo-random UInt64 number, evenly distributed among all UInt64-type numbers. <br> Uses a linear congruential generator."
            },
            {
                "name": "reinterpretAsUInt16",
                "def": "reinterpretAsUInt16(v)",
                "docText": ""
            },
            {
                "name": "pi",
                "def": "pi(v)",
                "docText": "Maximum pipeline depth. Corresponds to the number of transformations that each data block goes through during query processing. Counted within the limits of a single server. If the pipeline depth is greater, an exception is thrown. By default, 1000."
            },
            {
                "name": "reinterpretAsUInt32",
                "def": "reinterpretAsUInt32(v)",
                "docText": ""
            },
            {
                "name": "reinterpretAsUInt64",
                "def": "reinterpretAsUInt64(v)",
                "docText": ""
            },
            {
                "name": "reinterpretAsInt8",
                "def": "reinterpretAsInt8(v)",
                "docText": ""
            },
            {
                "name": "upperUTF8",
                "def": "upperUTF8(v)",
                "docText": "Converts a string to uppercase, assuming the string contains a set of bytes that make up a UTF-8 encoded text. It doesn&#39;t detect the language. So for Turkish the result might not be exactly correct. "
            },
            {
                "name": "reinterpretAsInt32",
                "def": "reinterpretAsInt32(v)",
                "docText": ""
            },
            {
                "name": "reinterpretAsFloat32",
                "def": "reinterpretAsFloat32(v)",
                "docText": ""
            },
            {
                "name": "reinterpretAsFloat64",
                "def": "reinterpretAsFloat64(v)",
                "docText": ""
            },
            {
                "name": "reinterpretAsDate",
                "def": "reinterpretAsDate(v)",
                "docText": ""
            },
            {
                "name": "reinterpretAsDateTime",
                "def": "reinterpretAsDateTime(v)",
                "docText": ""
            },
            {
                "name": "roundToExp2",
                "def": "roundToExp2(num)",
                "docText": "Accepts a number. If the number is less than one, it returns 0. Otherwise, it rounds the number down to the nearest (whole non-negative) degree of two."
            },
            {
                "name": "upper",
                "def": "upper(v)",
                "docText": "Converts a string to uppercase, assuming the string contains a set of bytes that make up a UTF-8 encoded text. It doesn&#39;t detect the language. So for Turkish the result might not be exactly correct."
            },
            {
                "name": "positionUTF8",
                "def": "positionUTF8(haystack, needle)",
                "docText": "The same as &#39;position&#39;, but the position is returned in Unicode code points. Works under the assumption that the string contains a set of bytes representing a UTF-8 encoded text. If this assumption is not met, it returns some result (it doesn&#39;t throw an exception). <br> There's also positionCaseInsensitiveUTF8 function."
            },
            {
                "name": "roundDuration",
                "def": "roundDuration(num)",
                "docText": "Accepts a number. If the number is less than one, it returns 0. Otherwise, it rounds the number down to numbers from the set: 1, 10, 30, 60, 120, 180, 240, 300, 600, 1200, 1800, 3600, 7200, 18000, 36000. This function is specific to Yandex.Metrica and used for implementing the report on session length."
            },
            {
                "name": "roundAge",
                "def": "roundAge(num)",
                "docText": "Accepts a number. If the number is less than 18, it returns 0. Otherwise, it rounds the number down to numbers from the set: 18, 25, 35, 45. This function is specific to Yandex.Metrica and used for implementing the report on user age."
            },
            {
                "name": "round",
                "def": "round(num)",
                "docText": "Accepts a number. If the number is less than 18, it returns 0. Otherwise, it rounds the number down to numbers from the set: 18, 25, 35, 45. This function is specific to Yandex.Metrica and used for implementing the report on user age."
            },
            {
                "name": "floor",
                "def": "floor(x[, N])",
                "docText": "Returns a rounder number that is less than or equal to &#39;x&#39;."
            },
            {
                "name": "notEmpty",
                "def": "notEmpty(v)",
                "docText": "Returns 0 for an empty array, or 1 for a non-empty array. <br> The result type is UInt8. <br> The function also works for strings."
            },
            {
                "name": "lengthUTF8",
                "def": "lengthUTF8(v)",
                "docText": "Returns the length of a string in Unicode code points (not in characters), assuming that the string contains a set of bytes that make up UTF-8 encoded text. If this assumption is not met, it returns some result (it doesn&#39;t throw an exception). <br> The result type is UInt64."
            },
            {
                "name": "lower",
                "def": "lower(v)",
                "docText": "Converts a string to lowercase, assuming the string contains a set of bytes that make up a UTF-8 encoded text. It doesn&#39;t detect the language.  "
            },
            {
                "name": "lowerUTF8",
                "def": "lowerUTF8(v)",
                "docText": "Converts a string to lowercase, assuming the string contains a set of bytes that make up a UTF-8 encoded text. It doesn&#39;t detect the language. "
            },
            {
                "name": "reverse",
                "def": "reverse(v)",
                "docText": "Reverses a sequence of Unicode code points, assuming that the string contains a set of bytes representing a UTF-8 text. Otherwise, it does something else (it doesn&#39;t throw an exception)."
            },
            {
                "name": "URLPathHierarchy",
                "def": "URLPathHierarchy(URL)",
                "docText": "- The same thing, but without the protocol and host in the result. The / element (root) is not included. "
            },
            {
                "name": "substringUTF8",
                "def": "substringUTF8(s, offset, length)",
                "docText": "The same as &#39;substring&#39;, but for Unicode code points. Works under the assumption that the string contains a set of bytes representing a UTF-8 encoded text. If this assumption is not met, it returns some result (it doesn&#39;t throw an exception)."
            },
            {
                "name": "appendTrailingCharIfAbsent",
                "def": "appendTrailingCharIfAbsent(s, c)",
                "docText": "If the %%s%% string is non-empty and does not contain the %%c%% character at the end, it appends the %%c%% character to the end."
            },
            {
                "name": "alphaTokens",
                "def": "alphaTokens(s)",
                "docText": "Selects substrings of consecutive bytes from the range a-z and A-Z. <br> Returns an array of selected substrings."
            },
            {
                "name": "splitByChar",
                "def": "splitByChar(separator, s)",
                "docText": "Splits a string into substrings, using &#39;separator&#39; as the separator. <br> &#39;separator&#39; must be a string constant consisting of exactly one character. <br> Returns an array of selected substrings"
            },
            {
                "name": "arrayStringConcat",
                "def": "arrayStringConcat(arr[, separator])",
                "docText": "Concatenates strings from the array elements, using &#39;separator&#39; as the separator. <br> &#39;separator&#39; is a string constant, an optional parameter. By default it is an empty string. <br> Returns a string."
            },
            {
                "name": "replaceAll",
                "def": "replaceAll(haystack, pattern, replacement)",
                "docText": "Replaces all occurrences of the &#39;pattern&#39; substring in &#39;haystack&#39; with the &#39;replacement&#39; substring."
            },
            {
                "name": "replaceRegexpOne",
                "def": "replaceRegexpOne(haystack, pattern, replacement)",
                "docText": "Replacement using the &#39;pattern&#39; regular expression. A re2 regular expression. Replaces only the first occurrence, if it exists. <br> A pattern can be specified as &#39;replacement&#39;. "
            },
            {
                "name": "cbrt",
                "def": "cbrt(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to the cubic root of the argument."
            },
            {
                "name": "match",
                "def": "match(pattern)(time, cond1, cond2, ...)",
                "docText": "Pattern matching for event chains. <br>  <br> &#39;pattern&#39; is a string containing a pattern to match. The pattern is similar to a regular expression."
            },
            {
                "name": "cutURLParameter",
                "def": "cutURLParameter(URL, name)",
                "docText": "Removes the URL parameter named &#39;name&#39;, if present. This function works under the assumption that the parameter name is encoded in the URL exactly the same way as in the passed argument."
            },
            {
                "name": "like",
                "def": "like(haystack, pattern), haystack NOT LIKE pattern operator",
                "docText": "The same thing as &#39;like&#39;, but negative."
            },
            {
                "name": "domain",
                "def": "domain(v)",
                "docText": "- Selects the part of the domain that includes top-level subdomains up to the &quot;first significant subdomain&quot; (see the explanation above). <br> For example, cutToFirstSignificantSubdomain(&#39;https://news.yandex.com.tr/&#39;) = &#39;yandex.com.tr&#39;."
            },
            {
                "name": "domainWithoutWWW",
                "def": "domainWithoutWWW(v)",
                "docText": "- Selects the domain and removes no more than one &#39;www.&#39; from the beginning of it, if present."
            },
            {
                "name": "firstSignificantSubdomain",
                "def": "firstSignificantSubdomain(v)",
                "docText": "- Selects the part of the domain that includes top-level subdomains up to the &quot;first significant subdomain&quot; (see the explanation above). <br> For example, cutToFirstSignificantSubdomain(&#39;https://news.yandex.com.tr/&#39;) = &#39;yandex.com.tr&#39;."
            },
            {
                "name": "queryString",
                "def": "queryString(v)",
                "docText": "Removes the query-string and fragment identifier. The question mark and number sign are also removed."
            },
            {
                "name": "queryStringAndFragment",
                "def": "queryStringAndFragment(v)",
                "docText": "Removes the query-string and fragment identifier. The question mark and number sign are also removed."
            },
            {
                "name": "extractURLParameter",
                "def": "extractURLParameter(URL)",
                "docText": "- Gets an array of name=value strings corresponding to the names of URL parameters. The values are not decoded in any way."
            },
            {
                "name": "URLHierarchy",
                "def": "URLHierarchy(URL)",
                "docText": "- Gets an array containing the URL trimmed to the %%/%%, %%?%% characters in the path and query-string.  Consecutive separator characters are counted as one. The cut is made in the position after all the consecutive separator characters. Example:"
            },
            {
                "name": "cutToFirstSignificantSubdomain",
                "def": "cutToFirstSignificantSubdomain(v)",
                "docText": "- Selects the part of the domain that includes top-level subdomains up to the &quot;first significant subdomain&quot; (see the explanation above). <br> For example, cutToFirstSignificantSubdomain(&#39;https://news.yandex.com.tr/&#39;) = &#39;yandex.com.tr&#39;."
            },
            {
                "name": "cutWWW",
                "def": "cutWWW(v)",
                "docText": "Removes no more than one &#39;www.&#39; from the beginning of the URL&#39;s domain, if present."
            },
            {
                "name": "cutQueryString",
                "def": "cutQueryString(v)",
                "docText": "Removes the query-string and fragment identifier. The question mark and number sign are also removed."
            },
            {
                "name": "cutFragment",
                "def": "cutFragment(v)",
                "docText": "Removes the fragment identifier. The number sign is also removed."
            },
            {
                "name": "visitParamHas",
                "def": "visitParamHas(params, name)",
                "docText": "Checks whether there is a field with the &#39;name&#39; name."
            },
            {
                "name": "visitParamExtractFloat",
                "def": "visitParamExtractFloat(params, name)",
                "docText": "The same as for Float64."
            },
            {
                "name": "visitParamExtractBool",
                "def": "visitParamExtractBool(params, name)",
                "docText": "Parses a true/false value. The result is UInt8."
            },
            {
                "name": "visitParamExtractRaw",
                "def": "visitParamExtractRaw(params, name)",
                "docText": "Returns the value of a field, including separators."
            },
            {
                "name": "exp",
                "def": "exp(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to 10<sup>x</sup>."
            },
            {
                "name": "exp2",
                "def": "exp2(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to 2<sup>x</sup>."
            },
            {
                "name": "exp10",
                "def": "exp10(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to 10<sup>x</sup>."
            },
            {
                "name": "tgamma",
                "def": "tgamma(x)",
                "docText": "Gamma function."
            },
            {
                "name": "log10",
                "def": "log10(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to the decimal logarithm of the argument."
            },
            {
                "name": "sqrt",
                "def": "sqrt(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to the square root of the argument."
            },
            {
                "name": "erf",
                "def": "erf(v)",
                "docText": "What to do when the amount of data exceeds one of the limits: &#39;throw&#39; or &#39;break&#39;. By default, throw."
            },
            {
                "name": "erfc",
                "def": "erfc(x)",
                "docText": "Accepts a numeric argument and returns a Float64 number close to 1 - erf(x), but without loss of precision for large &#39;x&#39; values."
            },
            {
                "name": "lgamma",
                "def": "lgamma(x)",
                "docText": "The logarithm of the gamma function."
            },
            {
                "name": "sin",
                "def": "sin(x)",
                "docText": "Accepts Float32 and Float64 and returns UInt8 equal to 1 if the argument is infinite, otherwise 0. <br> Note that 0 is returned for a NaN."
            },
            {
                "name": "cos",
                "def": "cos(x)",
                "docText": "The arc cosine."
            },
            {
                "name": "tan",
                "def": "tan(x)",
                "docText": "The arc tangent."
            },
            {
                "name": "pow",
                "def": "pow(x, y)",
                "docText": "x<sup>y</sup>."
            }
        ]
    };
    p.re = function (list) {
        return list.join("|")
    };

    exports.ClickhouseInfo = p;
});
