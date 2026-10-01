"use strict";

/* ============================================================
   GERMANY ADMIT AI HELPER
   COMPLETE dashboard/js/app.js

   FIXES:
   1. Emoji/mojibake repair
   2. Correct numeric university ranking detection
   3. Ranking Low -> High
   4. Ranking High -> Low
   5. Name A -> Z
   6. State filter
   7. University search
   8. All university rows
   9. University details
   10. Corrected scholarship semantics
   11. Fixed non-draggable Germany map
   12. Existing dashboard sections preserved
============================================================ */


/* ============================================================
   CONFIG
============================================================ */

const DATA_PATH =
    "../outputs/analytics/";

const LOCAL_GEOJSON_URL =
    "./assets/germany-states.geojson";

const REMOTE_GEOJSON_URL =
    "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/1_sehr_hoch.geo.json";


const DATASETS = {

    stateDashboard:
        DATA_PATH +
        "state_dashboard_corrected.csv",

    stateSummary:
        DATA_PATH +
        "state_summary.csv",

    fieldSummary:
        DATA_PATH +
        "field_summary.csv",

    industrySummary:
        DATA_PATH +
        "industry_summary.csv",

    stateIndustrySummary:
        DATA_PATH +
        "state_industry_summary.csv",

    stateFieldSummary:
        DATA_PATH +
        "state_field_summary.csv",

    scholarshipSummary:
        DATA_PATH +
        "university_scholarship_summary.csv",

    scholarshipStateSummary:
        DATA_PATH +
        "scholarship_state_summary_corrected.csv",

    scholarshipQuality:
        DATA_PATH +
        "scholarship_data_quality.csv",

    qualitySummary:
        DATA_PATH +
        "analytics_quality_summary.csv",

    universities:
        DATA_PATH +
        "universities_analytics.csv",

    courses:
        DATA_PATH +
        "courses_analytics.csv",

    scholarships:
        DATA_PATH +
        "scholarships_analytics.csv",

    companies:
        DATA_PATH +
        "companies_analytics.csv"

};


/* ============================================================
   GLOBAL STATE
============================================================ */

const DATA = {};

let germanyMap = null;

let geoJsonLayer = null;

let selectedMapState = "";

let stateMetrics = {};


/* ============================================================
   GERMAN STATES
============================================================ */

const GERMAN_STATES = [

    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen"

];


const STATE_ALIASES = {

    "Baden-Wuerttemberg":
        "Baden-Württemberg",

    "Baden Wurttemberg":
        "Baden-Württemberg",

    "Baden-Württemberg":
        "Baden-Württemberg",

    "Bavaria":
        "Bayern",

    "Bayern":
        "Bayern",

    "Berlin":
        "Berlin",

    "Brandenburg":
        "Brandenburg",

    "Bremen":
        "Bremen",

    "Hamburg":
        "Hamburg",

    "Hesse":
        "Hessen",

    "Hessen":
        "Hessen",

    "Mecklenburg-Western Pomerania":
        "Mecklenburg-Vorpommern",

    "Mecklenburg Vorpommern":
        "Mecklenburg-Vorpommern",

    "Mecklenburg-Vorpommern":
        "Mecklenburg-Vorpommern",

    "Lower Saxony":
        "Niedersachsen",

    "Niedersachsen":
        "Niedersachsen",

    "North Rhine-Westphalia":
        "Nordrhein-Westfalen",

    "Nordrhein Westphalia":
        "Nordrhein-Westfalen",

    "Nordrhein-Westfalen":
        "Nordrhein-Westfalen",

    "Rhineland-Palatinate":
        "Rheinland-Pfalz",

    "Rhineland Palatinate":
        "Rheinland-Pfalz",

    "Rheinland-Pfalz":
        "Rheinland-Pfalz",

    "Saarland":
        "Saarland",

    "Saxony":
        "Sachsen",

    "Sachsen":
        "Sachsen",

    "Saxony-Anhalt":
        "Sachsen-Anhalt",

    "Saxony Anhalt":
        "Sachsen-Anhalt",

    "Sachsen-Anhalt":
        "Sachsen-Anhalt",

    "Schleswig-Holstein":
        "Schleswig-Holstein",

    "Schleswig Holstein":
        "Schleswig-Holstein",

    "Thuringia":
        "Thüringen",

    "Thüringen":
        "Thüringen"

};


const STATE_CODES = {

    "DE-BW":
        "Baden-Württemberg",

    "BW":
        "Baden-Württemberg",

    "DE-BY":
        "Bayern",

    "BY":
        "Bayern",

    "DE-BE":
        "Berlin",

    "BE":
        "Berlin",

    "DE-BB":
        "Brandenburg",

    "BB":
        "Brandenburg",

    "DE-HB":
        "Bremen",

    "HB":
        "Bremen",

    "DE-HH":
        "Hamburg",

    "HH":
        "Hamburg",

    "DE-HE":
        "Hessen",

    "HE":
        "Hessen",

    "DE-MV":
        "Mecklenburg-Vorpommern",

    "MV":
        "Mecklenburg-Vorpommern",

    "DE-NI":
        "Niedersachsen",

    "NI":
        "Niedersachsen",

    "DE-NW":
        "Nordrhein-Westfalen",

    "NW":
        "Nordrhein-Westfalen",

    "DE-RP":
        "Rheinland-Pfalz",

    "RP":
        "Rheinland-Pfalz",

    "DE-SL":
        "Saarland",

    "SL":
        "Saarland",

    "DE-SN":
        "Sachsen",

    "SN":
        "Sachsen",

    "DE-ST":
        "Sachsen-Anhalt",

    "ST":
        "Sachsen-Anhalt",

    "DE-SH":
        "Schleswig-Holstein",

    "SH":
        "Schleswig-Holstein",

    "DE-TH":
        "Thüringen",

    "TH":
        "Thüringen"

};


/* ============================================================
   DOM
============================================================ */

function byId(id) {

    return document.getElementById(id);

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ============================================================
   NUMBERS
============================================================ */

function formatNumber(value) {

    const number =
        Number(
            String(value ?? "")
                .replace(/,/g, "")
                .trim()
        );


    if (
        !Number.isFinite(number)
    ) {

        return "—";

    }


    return number.toLocaleString(
        "en-US"
    );

}


function numberValue(value) {

    const number =
        Number(
            String(value ?? "")
                .replace(/,/g, "")
                .trim()
        );


    return Number.isFinite(number)
        ? number
        : null;

}


/*
   STRICT ranking parser.

   Valid:
       110
       #110
       Rank 110
       110-120
       110 – 120
       110.0

   Invalid:
       QS World University Rankings 2027
       QS Rankings 2027
       World University Rankings 2027
*/

function rankingValue(value) {

    const text =
        String(value ?? "")
            .trim();


    if (!text) {

        return null;

    }


    /*
       Plain number.
    */

    if (
        /^\#?\s*\d+(?:\.0+)?$/.test(
            text
        )
    ) {

        const cleaned =
            text
                .replace(
                    "#",
                    ""
                )
                .trim();


        return Number(
            cleaned
        );

    }


    /*
       Rank 110
       Ranking: 110
       Rank #110
    */

    const rankMatch =
        text.match(
            /^rank(?:ing)?\s*:?\s*\#?\s*(\d+)$/i
        );


    if (
        rankMatch
    ) {

        return Number(
            rankMatch[1]
        );

    }


    /*
       Ranking range:
       110-120
       110 – 120

       We use the lower bound for sorting.
    */

    const rangeMatch =
        text.match(
            /^(\d+)\s*[-–]\s*(\d+)$/
        );


    if (
        rangeMatch
    ) {

        return Number(
            rangeMatch[1]
        );

    }


    return null;

}


/* ============================================================
   STATE NORMALIZATION
============================================================ */

function normalizeStateName(
    value
) {

    if (!value) {

        return "";

    }


    const original =
        String(value)
            .trim();


    if (
        STATE_ALIASES[
            original
        ]
    ) {

        return STATE_ALIASES[
            original
        ];

    }


    if (
        STATE_CODES[
            original
        ]
    ) {

        return STATE_CODES[
            original
        ];

    }


    const lower =
        original.toLowerCase();


    for (
        const key of Object.keys(
            STATE_ALIASES
        )
    ) {

        if (
            key.toLowerCase() ===
            lower
        ) {

            return STATE_ALIASES[
                key
            ];

        }

    }


    return original;

}


function normalizeComparable(
    value
) {

    return normalizeStateName(
        value
    )
        .toLowerCase()
        .replace(
            /[ä]/g,
            "a"
        )
        .replace(
            /[ö]/g,
            "o"
        )
        .replace(
            /[ü]/g,
            "u"
        )
        .replace(
            /ß/g,
            "ss"
        )
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


function statesEqual(
    a,
    b
) {

    const left =
        normalizeComparable(
            a
        );


    const right =
        normalizeComparable(
            b
        );


    return (
        left !== "" &&
        left === right
    );

}


/* ============================================================
   EMOJI REPAIR
============================================================ */

/*
   Earlier dashboard versions contained UTF-8 text that was
   displayed as mojibake, for example:

       ðŸŽ“   instead of 🎓
       ðŸ“š   instead of 📚
       ðŸ’°   instead of 💰
       ðŸ¢   instead of 🏢

   We repair the text at runtime.

   Unicode code points are generated programmatically so this
   file itself does not depend on literal emoji characters.
*/

function repairBrokenEmojis() {

    const replacements = [

        [
            "ðŸŽ“",
            String.fromCodePoint(
                0x1F393
            )
        ],

        [
            "ðŸ“š",
            String.fromCodePoint(
                0x1F4DA
            )
        ],

        [
            "ðŸ’°",
            String.fromCodePoint(
                0x1F4B0
            )
        ],

        [
            "ðŸ¢",
            String.fromCodePoint(
                0x1F3E2
            )
        ]

    ];


    const walker =
        document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT
        );


    const nodes = [];


    let node =
        walker.nextNode();


    while (node) {

        nodes.push(
            node
        );

        node =
            walker.nextNode();

    }


    nodes.forEach(
        textNode => {

            let text =
                textNode.nodeValue;


            replacements.forEach(
                (
                    [
                        broken,
                        correct
                    ]
                ) => {

                    text =
                        text.replaceAll(
                            broken,
                            correct
                        );

                }
            );


            textNode.nodeValue =
                text;

        }
    );

}


/* ============================================================
   CSV
============================================================ */

function parseCSV(
    text
) {

    const rows = [];

    let row = [];

    let cell = "";

    let quoted = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];


        const next =
            text[i + 1];


        if (
            char === '"' &&
            quoted &&
            next === '"'
        ) {

            cell += '"';

            i++;

            continue;

        }


        if (
            char === '"'
        ) {

            quoted =
                !quoted;

            continue;

        }


        if (
            char === "," &&
            !quoted
        ) {

            row.push(
                cell
            );

            cell = "";

            continue;

        }


        if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !quoted
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(
                cell
            );

            cell = "";


            if (
                row.length > 1 ||
                row[0] !== ""
            ) {

                rows.push(
                    row
                );

            }


            row = [];

            continue;

        }


        cell += char;

    }


    if (
        cell.length > 0 ||
        row.length > 0
    ) {

        row.push(
            cell
        );

        rows.push(
            row
        );

    }


    if (!rows.length) {

        return [];

    }


    const headers =
        rows[0].map(
            header =>
                String(header)
                    .trim()
        );


    return rows
        .slice(1)
        .map(
            values => {

                const object = {};


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        object[header] =
                            String(
                                values[index] ??
                                ""
                            ).trim();

                    }
                );


                return object;

            }
        );

}


/* ============================================================
   FETCH
============================================================ */

async function loadCSV(
    url
) {

    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `Could not load ${url} (${response.status})`
        );

    }


    return parseCSV(
        await response.text()
    );

}


async function loadGeoJSON() {

    try {

        const local =
            await fetch(
                LOCAL_GEOJSON_URL,
                {
                    cache:
                        "no-store"
                }
            );


        if (
            local.ok
        ) {

            return await local.json();

        }

    } catch (error) {

        console.warn(
            "Local GeoJSON unavailable.",
            error
        );

    }


    const remote =
        await fetch(
            REMOTE_GEOJSON_URL,
            {
                cache:
                    "no-store"
            }
        );


    if (
        !remote.ok
    ) {

        throw new Error(
            `Could not load Germany map (${remote.status})`
        );

    }


    return await remote.json();

}


async function loadAllData() {

    const entries =
        Object.entries(
            DATASETS
        );


    const results =
        await Promise.all(
            entries.map(
                async (
                    [
                        key,
                        url
                    ]
                ) => {

                    try {

                        return [

                            key,

                            await loadCSV(
                                url
                            )

                        ];

                    } catch (error) {

                        console.warn(
                            `Dataset failed: ${url}`,
                            error
                        );


                        return [

                            key,

                            []

                        ];

                    }

                }
            )
        );


    results.forEach(
        (
            [
                key,
                rows
            ]
        ) => {

            DATA[key] =
                rows;

        }
    );

}


/* ============================================================
   COLUMN HELPERS
============================================================ */

function normalizedColumn(
    value
) {

    return String(
        value ?? ""
    )
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


function findColumn(
    rows,
    candidates
) {

    if (
        !rows ||
        !rows.length
    ) {

        return null;

    }


    const columns =
        Object.keys(
            rows[0]
        );


    /*
       Exact normalized match.
    */

    for (
        const candidate of candidates
    ) {

        const target =
            normalizedColumn(
                candidate
            );


        const exact =
            columns.find(
                column =>
                    normalizedColumn(
                        column
                    ) === target
            );


        if (exact) {

            return exact;

        }

    }


    /*
       Partial match.
    */

    for (
        const candidate of candidates
    ) {

        const target =
            normalizedColumn(
                candidate
            );


        const partial =
            columns.find(
                column =>
                    normalizedColumn(
                        column
                    ).includes(
                        target
                    )
            );


        if (partial) {

            return partial;

        }

    }


    return null;

}


function findBestPopulatedColumn(
    rows,
    candidates
) {

    if (
        !rows ||
        !rows.length
    ) {

        return null;

    }


    const columns =
        Object.keys(
            rows[0]
        );


    const matches = [];


    columns.forEach(
        column => {

            const normalized =
                normalizedColumn(
                    column
                );


            let candidateIndex =
                -1;


            candidates.some(
                (
                    candidate,
                    index
                ) => {

                    const target =
                        normalizedColumn(
                            candidate
                        );


                    if (
                        normalized ===
                        target
                    ) {

                        candidateIndex =
                            index;

                        return true;

                    }


                    if (
                        normalized.includes(
                            target
                        ) ||
                        target.includes(
                            normalized
                        )
                    ) {

                        if (
                            candidateIndex < 0
                        ) {

                            candidateIndex =
                                index;

                        }

                    }


                    return false;

                }
            );


            if (
                candidateIndex < 0
            ) {

                return;

            }


            const populated =
                rows.filter(
                    row =>
                        String(
                            row[column] ??
                            ""
                        ).trim() !== ""
                ).length;


            const coverage =
                populated /
                rows.length;


            matches.push({

                column,

                coverage,

                candidateIndex

            });

        }
    );


    if (!matches.length) {

        return null;

    }


    matches.sort(
        (
            a,
            b
        ) => {

            if (
                b.coverage !==
                a.coverage
            ) {

                return (
                    b.coverage -
                    a.coverage
                );

            }


            return (
                a.candidateIndex -
                b.candidateIndex
            );

        }
    );


    return matches[0].column;

}


function findNumericColumn(
    rows,
    candidates
) {

    if (
        !rows ||
        !rows.length
    ) {

        return null;

    }


    const columns =
        Object.keys(
            rows[0]
        );


    const candidateColumns =
        [];


    columns.forEach(
        column => {

            const normalized =
                normalizedColumn(
                    column
                );


            const candidateIndex =
                candidates.findIndex(
                    candidate => {

                        const target =
                            normalizedColumn(
                                candidate
                            );


                        return (
                            normalized ===
                            target ||
                            normalized.includes(
                                target
                            )
                        );

                    }
                );


            if (
                candidateIndex < 0
            ) {

                return;

            }


            const valid =
                rows.filter(
                    row =>
                        numberValue(
                            row[column]
                        ) !== null
                ).length;


            if (
                valid > 0
            ) {

                candidateColumns.push({

                    column,

                    valid,

                    coverage:
                        valid /
                        rows.length,

                    candidateIndex

                });

            }

        }
    );


    if (
        !candidateColumns.length
    ) {

        return null;

    }


    candidateColumns.sort(
        (
            a,
            b
        ) => {

            if (
                b.coverage !==
                a.coverage
            ) {

                return (
                    b.coverage -
                    a.coverage
                );

            }


            return (
                a.candidateIndex -
                b.candidateIndex
            );

        }
    );


    return candidateColumns[0]
        .column;

}


/* ============================================================
   STATE ROWS
============================================================ */

function getStateColumn(
    rows
) {

    return findBestPopulatedColumn(
        rows,
        [
            "state",
            "federal_state",
            "federal state",
            "bundesland",
            "land",
            "state_name",
            "state name"
        ]
    );

}


function rowsForState(
    rows,
    state
) {

    if (
        !rows ||
        !rows.length ||
        !state
    ) {

        return [];

    }


    const column =
        getStateColumn(
            rows
        );


    if (!column) {

        return [];

    }


    return rows.filter(
        row =>
            statesEqual(
                row[column],
                state
            )
    );

}


function countUnique(
    rows,
    candidates
) {

    if (
        !rows ||
        !rows.length
    ) {

        return 0;

    }


    const column =
        findBestPopulatedColumn(
            rows,
            candidates
        );


    if (!column) {

        return rows.length;

    }


    const values =
        rows
            .map(
                row =>
                    String(
                        row[column] ??
                        ""
                    )
                        .trim()
                        .toLowerCase()
            )
            .filter(Boolean);


    return new Set(
        values
    ).size;

}


function countByValue(
    rows,
    column
) {

    const result = {};


    if (
        !rows ||
        !column
    ) {

        return result;

    }


    rows.forEach(
        row => {

            const value =
                String(
                    row[column] ??
                    ""
                ).trim();


            if (!value) {

                return;

            }


            result[value] =
                (
                    result[value] ||
                    0
                ) + 1;

        }
    );


    return result;

}


function topValues(
    rows,
    candidates,
    limit = 3
) {

    if (
        !rows ||
        !rows.length
    ) {

        return [];

    }


    const column =
        findBestPopulatedColumn(
            rows,
            candidates
        );


    if (!column) {

        return [];

    }


    return Object.entries(
        countByValue(
            rows,
            column
        )
    )
        .sort(
            (
                a,
                b
            ) =>
                b[1] -
                a[1]
        )
        .slice(
            0,
            limit
        );

}


/* ============================================================
   SCHOLARSHIPS
============================================================ */

function distinctScholarshipCount() {

    const rows =
        DATA.scholarships ||
        [];


    const idColumn =
        findBestPopulatedColumn(
            rows,
            [
                "scholarship_id",
                "scholarship id",
                "id"
            ]
        );


    if (!idColumn) {

        return rows.length;

    }


    return new Set(
        rows
            .map(
                row =>
                    String(
                        row[idColumn] ??
                        ""
                    )
                        .trim()
            )
            .filter(Boolean)
    ).size;

}


function getScholarshipStateRow(
    state
) {

    const corrected =
        rowsForState(
            DATA.scholarshipStateSummary ||
                [],
            state
        );


    if (
        corrected.length
    ) {

        return corrected[0];

    }


    const dashboard =
        rowsForState(
            DATA.stateDashboard ||
                [],
            state
        );


    return dashboard.length
        ? dashboard[0]
        : null;

}


function getStateScholarshipCount(
    state
) {

    const row =
        getScholarshipStateRow(
            state
        );


    if (!row) {

        return 0;

    }


    const column =
        findNumericColumn(
            [row],
            [
                "university_linked_scholarship_records",
                "scholarship_count",
                "scholarship count",
                "scholarships"
            ]
        );


    return column
        ? (
            numberValue(
                row[column]
            ) || 0
        )
        : 0;

}


function getStateScholarshipUniversityCount(
    state
) {

    const row =
        getScholarshipStateRow(
            state
        );


    if (!row) {

        return 0;

    }


    const column =
        findNumericColumn(
            [row],
            [
                "universities_with_linked_scholarships",
                "universities with linked scholarships"
            ]
        );


    return column
        ? (
            numberValue(
                row[column]
            ) || 0
        )
        : 0;

}


function getScholarshipNote(
    state
) {

    const row =
        getScholarshipStateRow(
            state
        );


    const fallback =
        "This metric represents university-linked scholarship records in the current dataset; it is not a count of every scholarship available in the state.";


    if (!row) {

        return fallback;

    }


    const column =
        findColumn(
            [row],
            [
                "scholarship_interpretation",
                "scholarship_metric_note",
                "interpretation",
                "note"
            ]
        );


    if (!column) {

        return fallback;

    }


    return (
        String(
            row[column] ??
            ""
        ).trim()
        ||
        fallback
    );

}


/* ============================================================
   UNIVERSITY DATA
============================================================ */

function getUniversityRows() {

    const rows =
        DATA.universities ||
        [];


    if (!rows.length) {

        return [];

    }


    const nameColumn =
        findBestPopulatedColumn(
            rows,
            [
                "university_name",
                "university name",
                "institution_name",
                "institution name",
                "institution",
                "university",
                "name",
                "short_name"
            ]
        );


    if (!nameColumn) {

        return [];

    }


    const valid =
        rows.filter(
            row =>
                String(
                    row[nameColumn] ??
                    ""
                ).trim() !== ""
        );


    /*
       Deduplicate by the actual university name.
    */

    const seen =
        new Set();


    const result = [];


    valid.forEach(
        row => {

            const name =
                String(
                    row[nameColumn] ??
                    ""
                )
                    .trim();


            const key =
                name
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        " "
                    );


            if (
                seen.has(key)
            ) {

                return;

            }


            seen.add(
                key
            );


            result.push(
                row
            );

        }
    );


    return result;

}


function getUniversityNameColumn(
    rows
) {

    return findBestPopulatedColumn(
        rows,
        [
            "university_name",
            "university name",
            "institution_name",
            "institution name",
            "institution",
            "university",
            "name",
            "short_name"
        ]
    );

}


function getUniversityStateColumn(
    rows
) {

    return getStateColumn(
        rows
    );

}


function getUniversityCityColumn(
    rows
) {

    return findBestPopulatedColumn(
        rows,
        [
            "city",
            "university_city",
            "university city",
            "location"
        ]
    );

}


function getUniversityTypeColumn(
    rows
) {

    return findBestPopulatedColumn(
        rows,
        [
            "institution_type",
            "institution type",
            "university_type",
            "university type",
            "type"
        ]
    );

}


/* ============================================================
   RANKING COLUMNS
============================================================ */

function getRankingColumns(
    rows
) {

    if (
        !rows ||
        !rows.length
    ) {

        return [];

    }


    const columns =
        Object.keys(
            rows[0]
        );


    const result = [];


    columns.forEach(
        column => {

            const normalized =
                normalizedColumn(
                    column
                );


            const looksLikeRanking =
                normalized.includes(
                    "rank"
                ) ||
                normalized.includes(
                    "ranking"
                ) ||
                normalized.includes(
                    "qs"
                ) ||
                normalized.includes(
                    "arwu"
                ) ||
                normalized.includes(
                    "timeshighereducation"
                );


            if (
                !looksLikeRanking
            ) {

                return;

            }


            /*
               IMPORTANT:
               We only count actual numeric rank values.
            */

            const valid =
                rows.filter(
                    row =>
                        rankingValue(
                            row[column]
                        ) !== null
                ).length;


            if (
                valid === 0
            ) {

                /*
                   Reject text fields such as:
                     QS World University Rankings 2027
                */

                return;

            }


            result.push({

                column,

                valid,

                coverage:
                    valid /
                    rows.length

            });

        }
    );


    /*
       Preferred ordering.
    */

    const preferred = [

        "qsworldrank2027",
        "qsrank2027",
        "qsrank",
        "qsworldrank",
        "qsworlduniversityranking",
        "theworldrank2026",
        "theworldrank",
        "arwuworldrank2025",
        "arwuworldrank",
        "ranking",
        "rank"

    ];


    result.sort(
        (
            a,
            b
        ) => {

            const aName =
                normalizedColumn(
                    a.column
                );


            const bName =
                normalizedColumn(
                    b.column
                );


            const aIndex =
                preferred.findIndex(
                    item =>
                        aName.includes(
                            item
                        )
                );


            const bIndex =
                preferred.findIndex(
                    item =>
                        bName.includes(
                            item
                        )
                );


            const aPriority =
                aIndex < 0
                    ? 999
                    : aIndex;


            const bPriority =
                bIndex < 0
                    ? 999
                    : bIndex;


            if (
                aPriority !==
                bPriority
            ) {

                return (
                    aPriority -
                    bPriority
                );

            }


            return (
                b.valid -
                a.valid
            );

        }
    );


    return result;

}


function getPrimaryRankingColumn(
    rows
) {

    const rankingColumns =
        getRankingColumns(
            rows
        );


    return rankingColumns.length
        ? rankingColumns[0].column
        : null;

}


function rankingDisplayLabel(
    column
) {

    const normalized =
        normalizedColumn(
            column
        );


    if (
        normalized.includes(
            "qsworldrank2027"
        )
    ) {

        return "QS 2027";

    }


    if (
        normalized.includes(
            "qsrank2027"
        )
    ) {

        return "QS 2027";

    }


    if (
        normalized.includes(
            "qsrank"
        )
    ) {

        return "QS";

    }


    if (
        normalized.includes(
            "theworldrank2026"
        )
    ) {

        return "THE 2026";

    }


    if (
        normalized.includes(
            "arwuworldrank2025"
        )
    ) {

        return "ARWU 2025";

    }


    return String(
        column
    )
        .replace(
            /_/g,
            " "
        );

}


/* ============================================================
   STATE METRICS
============================================================ */

function createMetric(
    state
) {

    return {

        state,

        universities: 0,

        courses: 0,

        scholarships: 0,

        scholarshipUniversities:
            0,

        companies: 0,

        scholarshipNote:
            "",

        topFields: [],

        topIndustries: [],

        concentration:
            "Moderate",

        topRankedUniversity:
            null

    };

}


function getStateSummaryRow(
    state
) {

    const corrected =
        rowsForState(
            DATA.stateDashboard ||
                [],
            state
        );


    if (
        corrected.length
    ) {

        return corrected[0];

    }


    const summary =
        rowsForState(
            DATA.stateSummary ||
                [],
            state
        );


    return summary.length
        ? summary[0]
        : null;

}


function buildStateMetrics() {

    stateMetrics = {};


    GERMAN_STATES.forEach(
        state => {

            stateMetrics[state] =
                createMetric(
                    state
                );

        }
    );


    GERMAN_STATES.forEach(
        state => {

            const metric =
                stateMetrics[state];


            const summary =
                getStateSummaryRow(
                    state
                );


            if (
                summary
            ) {

                const universityColumn =
                    findNumericColumn(
                        [summary],
                        [
                            "university_count",
                            "university count",
                            "universities"
                        ]
                    );


                const courseColumn =
                    findNumericColumn(
                        [summary],
                        [
                            "course_count",
                            "course count",
                            "program_count",
                            "program count",
                            "courses",
                            "programs"
                        ]
                    );


                const companyColumn =
                    findNumericColumn(
                        [summary],
                        [
                            "company_count",
                            "company count",
                            "companies"
                        ]
                    );


                if (
                    universityColumn
                ) {

                    metric.universities =
                        numberValue(
                            summary[
                                universityColumn
                            ]
                        ) || 0;

                }


                if (
                    courseColumn
                ) {

                    metric.courses =
                        numberValue(
                            summary[
                                courseColumn
                            ]
                        ) || 0;

                }


                if (
                    companyColumn
                ) {

                    metric.companies =
                        numberValue(
                            summary[
                                companyColumn
                            ]
                        ) || 0;

                }

            }


            if (
                metric.universities ===
                0
            ) {

                metric.universities =
                    rowsForState(
                        getUniversityRows(),
                        state
                    ).length;

            }


            if (
                metric.courses ===
                0
            ) {

                metric.courses =
                    rowsForState(
                        DATA.courses ||
                            [],
                        state
                    ).length;

            }


            if (
                metric.companies ===
                0
            ) {

                metric.companies =
                    countUnique(
                        rowsForState(
                            DATA.companies ||
                                [],
                            state
                        ),
                        [
                            "company_name",
                            "company name",
                            "company",
                            "name"
                        ]
                    );

            }


            metric.scholarships =
                getStateScholarshipCount(
                    state
                );


            metric.scholarshipUniversities =
                getStateScholarshipUniversityCount(
                    state
                );


            metric.scholarshipNote =
                getScholarshipNote(
                    state
                );


            metric.topFields =
                topValues(
                    rowsForState(
                        DATA.courses ||
                            [],
                        state
                    ),
                    [
                        "field",
                        "study_field",
                        "study field",
                        "subject",
                        "discipline",
                        "category"
                    ],
                    3
                );


            metric.topIndustries =
                topValues(
                    rowsForState(
                        DATA.companies ||
                            [],
                        state
                    ),
                    [
                        "industry",
                        "industry_name",
                        "industry name",
                        "sector",
                        "category"
                    ],
                    3
                );

        }
    );


    applyUniversityConcentration();

    applyTopRankedUniversities();

}


/* ============================================================
   UNIVERSITY CONCENTRATION
============================================================ */

function applyUniversityConcentration() {

    const states =
        Object.values(
            stateMetrics
        );


    if (!states.length) {

        return;

    }


    const values =
        states
            .map(
                metric =>
                    metric.universities
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    a -
                    b
            );


    function percentile(
        array,
        p
    ) {

        if (
            !array.length
        ) {

            return 0;

        }


        const index =
            (
                array.length -
                1
            ) * p;


        const lower =
            Math.floor(
                index
            );


        const upper =
            Math.ceil(
                index
            );


        if (
            lower ===
            upper
        ) {

            return array[
                lower
            ];

        }


        return (
            array[lower] +
            (
                array[upper] -
                array[lower]
            ) *
            (
                index -
                lower
            )
        );

    }


    const lower =
        percentile(
            values,
            0.25
        );


    const upper =
        percentile(
            values,
            0.75
        );


    states.forEach(
        metric => {

            if (
                metric.universities >=
                upper
            ) {

                metric.concentration =
                    "High";

            } else if (
                metric.universities <=
                lower
            ) {

                metric.concentration =
                    "Lower";

            } else {

                metric.concentration =
                    "Moderate";

            }

        }
    );

}


/* ============================================================
   TOP-RANKED UNIVERSITY PER STATE
============================================================ */

function applyTopRankedUniversities() {

    const rows =
        getUniversityRows();


    if (!rows.length) {

        return;

    }


    const stateColumn =
        getUniversityStateColumn(
            rows
        );


    const nameColumn =
        getUniversityNameColumn(
            rows
        );


    const rankColumn =
        getPrimaryRankingColumn(
            rows
        );


    if (
        !stateColumn ||
        !nameColumn ||
        !rankColumn
    ) {

        return;

    }


    const grouped = {};


    rows.forEach(
        row => {

            const state =
                normalizeStateName(
                    row[stateColumn]
                );


            if (
                !GERMAN_STATES.includes(
                    state
                )
            ) {

                return;

            }


            const rank =
                rankingValue(
                    row[
                        rankColumn
                    ]
                );


            if (
                rank === null ||
                rank <= 0
            ) {

                return;

            }


            grouped[state] ??= [];


            grouped[state].push({

                name:
                    row[
                        nameColumn
                    ],

                rank,

                rawRank:
                    row[
                        rankColumn
                    ],

                rankColumn

            });

        }
    );


    Object.entries(
        grouped
    )
        .forEach(
            (
                [
                    state,
                    universities
                ]
            ) => {

                universities.sort(
                    (
                        a,
                        b
                    ) =>
                        a.rank -
                        b.rank
                );


                if (
                    stateMetrics[state]
                ) {

                    stateMetrics[state]
                        .topRankedUniversity =
                        universities[0];

                }

            }
        );

}


/* ============================================================
   MAP FEATURE NAME
============================================================ */

function stateNameFromFeature(
    feature
) {

    const properties =
        feature?.properties ||
        {};


    const candidates = [

        properties.name,

        properties.NAME,

        properties.NAME_1,

        properties.name_1,

        properties.NAME_DE,

        properties.name_de,

        properties.name_en,

        properties.nameEN,

        properties.state,

        properties.bundesland,

        properties.GEN,

        properties.VARNAME_1,

        feature?.id

    ];


    for (
        const candidate of candidates
    ) {

        if (!candidate) {

            continue;

        }


        const state =
            normalizeStateName(
                candidate
            );


        if (
            GERMAN_STATES.includes(
                state
            )
        ) {

            return state;

        }

    }


    return "";

}


/* ============================================================
   MAP STYLES
============================================================ */

function defaultStateStyle() {

    return {

        color:
            "#ffffff",

        weight:
            2,

        fillColor:
            "#2563eb",

        fillOpacity:
            0.72

    };

}


function selectedStateStyle() {

    return {

        color:
            "#111827",

        weight:
            3,

        fillColor:
            "#0f172a",

        fillOpacity:
            0.92

    };

}


function hoverStateStyle() {

    return {

        color:
            "#ffffff",

        weight:
            3,

        fillColor:
            "#1d4ed8",

        fillOpacity:
            0.95

    };

}


/* ============================================================
   MAP DETAIL
============================================================ */

function renderMapDetail(
    state = ""
) {

    const panel =
        byId(
            "mapStateDetail"
        );


    if (!panel) {

        return;

    }


    if (!state) {

        panel.innerHTML = `

            <div class="map-detail-empty">

                <div class="map-detail-icon">

                    ${String.fromCodePoint(
                        0x1F1E9,
                        0x1F1EA
                    )}

                </div>


                <h4>
                    Germany overview
                </h4>


                <p>

                    Click a federal state on the map
                    to inspect its regional study and
                    career ecosystem.

                </p>

            </div>

        `;


        return;

    }


    const metric =
        stateMetrics[state];


    if (!metric) {

        panel.innerHTML = `

            <div class="empty-state">
                No state analytics available.
            </div>

        `;


        return;

    }


    const scholarshipExtra =
        metric.scholarshipUniversities >
        0

            ? `

                <small>

                    ${formatNumber(
                        metric.scholarshipUniversities
                    )}

                    universit${
                        metric.scholarshipUniversities ===
                        1
                            ? "y"
                            : "ies"
                    }

                    linked to these scholarship records.

                </small>

              `

            : `

                <small>

                    No university-linked scholarship records
                    are mapped to this state in the current
                    summary. This does not mean scholarships
                    are unavailable to students here.

                </small>

              `;


    const ranking =
        metric.topRankedUniversity;


    const rankingHtml =
        ranking

            ? `

                <div class="map-detail-block">

                    <span class="detail-label">

                        Highest-ranked university
                        in available ranking data

                    </span>


                    <strong>

                        ${escapeHtml(
                            ranking.name
                        )}

                    </strong>


                    <small>

                        Ranking position:
                        ${formatNumber(
                            ranking.rank
                        )}

                        ·
                        ${escapeHtml(
                            rankingDisplayLabel(
                                ranking.rankColumn
                            )
                        )}

                    </small>

                </div>

              `

            : `

                <div class="map-detail-block muted-block">

                    <span class="detail-label">
                        University ranking
                    </span>

                    <strong>
                        Ranking data unavailable
                    </strong>

                    <small>

                        No numeric ranking position
                        was detected.

                    </small>

                </div>

              `;


    const fieldHtml =
        metric.topFields.length

            ? `

                <div class="tag-list">

                    ${
                        metric.topFields
                            .map(
                                item => `

                                    <span class="data-tag">

                                        ${escapeHtml(
                                            item[0]
                                        )}

                                        <b>

                                            ${formatNumber(
                                                item[1]
                                            )}

                                        </b>

                                    </span>

                                `
                            )
                            .join("")
                    }

                </div>

              `

            : `

                <small>
                    No state-level field data available.
                </small>

              `;


    const industryHtml =
        metric.topIndustries.length

            ? `

                <div class="tag-list">

                    ${
                        metric.topIndustries
                            .map(
                                item => `

                                    <span class="data-tag">

                                        ${escapeHtml(
                                            item[0]
                                        )}

                                        <b>

                                            ${formatNumber(
                                                item[1]
                                            )}

                                        </b>

                                    </span>

                                `
                            )
                            .join("")
                    }

                </div>

              `

            : `

                <small>
                    No state-level industry data available.
                </small>

              `;


    panel.innerHTML = `

        <div class="selected-state-name">

            <span class="state-badge">
                Selected
            </span>


            <h4>
                ${escapeHtml(
                    state
                )}
            </h4>

        </div>


        <div class="detail-metrics">


            <div class="detail-metric">

                <span>
                    Universities
                </span>


                <strong>

                    ${formatNumber(
                        metric.universities
                    )}

                </strong>

            </div>


            <div class="detail-metric">

                <span>
                    Study programs
                </span>


                <strong>

                    ${formatNumber(
                        metric.courses
                    )}

                </strong>

            </div>


            <div class="detail-metric">

                <span>
                    Uni-linked scholarships
                </span>


                <strong>

                    ${formatNumber(
                        metric.scholarships
                    )}

                </strong>

            </div>


            <div class="detail-metric">

                <span>
                    Companies
                </span>


                <strong>

                    ${formatNumber(
                        metric.companies
                    )}

                </strong>

            </div>


        </div>


        <div class="map-detail-block">

            <span class="detail-label">

                Scholarship interpretation

            </span>


            ${scholarshipExtra}


            <small>

                ${escapeHtml(
                    metric.scholarshipNote
                )}

            </small>

        </div>


        <div class="map-detail-block">

            <span class="detail-label">

                University concentration

            </span>


            <strong>

                ${escapeHtml(
                    metric.concentration
                )}

            </strong>


            <small>

                Relative to the other German states
                represented in this dataset.

            </small>

        </div>


        <div class="map-detail-columns">


            <div class="map-detail-block">

                <span class="detail-label">
                    Leading study fields
                </span>

                ${fieldHtml}

            </div>


            <div class="map-detail-block">

                <span class="detail-label">
                    Leading industries
                </span>

                ${industryHtml}

            </div>


        </div>


        ${rankingHtml}

    `;

}


/* ============================================================
   STATE SELECTOR
============================================================ */

function setupStateSelector() {

    const select =
        byId(
            "stateSelect"
        );


    if (!select) {

        return;

    }


    if (
        select.dataset.ready ===
        "true"
    ) {

        return;

    }


    const existing =
        new Set(
            [
                ...select.options
            ]
                .map(
                    option =>
                        normalizeComparable(
                            option.value
                        )
                )
        );


    GERMAN_STATES.forEach(
        state => {

            if (
                existing.has(
                    normalizeComparable(
                        state
                    )
                )
            ) {

                return;

            }


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                state;


            option.textContent =
                state;


            select.appendChild(
                option
            );

        }
    );


    select.addEventListener(
        "change",
        () => {

            const state =
                select.value;


            if (!state) {

                selectedMapState =
                    "";


                renderMapDetail(
                    ""
                );


                renderSelectedState(
                    ""
                );


                const directoryFilter =
                    byId(
                        "universityStateFilter"
                    );


                if (
                    directoryFilter
                ) {

                    directoryFilter.value =
                        "";

                }


                renderUniversityDirectory();


                if (
                    geoJsonLayer
                ) {

                    geoJsonLayer.eachLayer(
                        layer =>
                            layer.setStyle(
                                defaultStateStyle()
                            )
                    );

                }


                return;

            }


            selectState(
                state
            );

        }
    );


    select.dataset.ready =
        "true";

}


/* ============================================================
   STATE SELECTION
============================================================ */

function selectState(
    state,
    updateMap = true
) {

    const normalized =
        normalizeStateName(
            state
        );


    if (
        !GERMAN_STATES.includes(
            normalized
        )
    ) {

        return;

    }


    selectedMapState =
        normalized;


    const select =
        byId(
            "stateSelect"
        );


    if (
        select
    ) {

        const option =
            [
                ...select.options
            ]
                .find(
                    item =>
                        statesEqual(
                            item.value,
                            normalized
                        )
                );


        if (
            option
        ) {

            select.value =
                option.value;

        }

    }


    renderMapDetail(
        normalized
    );


    renderSelectedState(
        normalized
    );


    /*
       Automatic university state filter.
    */

    const universityStateFilter =
        byId(
            "universityStateFilter"
        );


    if (
        universityStateFilter
    ) {

        universityStateFilter.value =
            normalized;


        renderUniversityDirectory();

    }


    /*
       Highlight selected map state.
    */

    if (
        geoJsonLayer
    ) {

        geoJsonLayer.eachLayer(
            layer => {

                const layerState =
                    stateNameFromFeature(
                        layer.feature
                    );


                if (
                    statesEqual(
                        layerState,
                        normalized
                    )
                ) {

                    layer.setStyle(
                        selectedStateStyle()
                    );


                    layer.bringToFront?.();

                } else {

                    layer.setStyle(
                        defaultStateStyle()
                    );

                }

            }
        );

    }


    /*
       Never move/zoom the map.
    */

    if (!updateMap) {

        return;

    }

}


/* ============================================================
   MAP INITIALIZATION
============================================================ */

async function initializeMap() {

    const mapElement =
        byId(
            "germanyMap"
        );


    if (!mapElement) {

        return;

    }


    if (
        typeof L ===
        "undefined"
    ) {

        mapElement.innerHTML = `

            <div class="map-loading error-map">

                Leaflet could not load.

            </div>

        `;


        return;

    }


    try {

        germanyMap =
            L.map(
                "germanyMap",
                {

                    zoomControl:
                        false,

                    attributionControl:
                        true,

                    dragging:
                        false,

                    scrollWheelZoom:
                        false,

                    doubleClickZoom:
                        false,

                    touchZoom:
                        false,

                    boxZoom:
                        false,

                    keyboard:
                        false,

                    tap:
                        false

                }
            );


        germanyMap.setView(
            [
                51.05,
                10.45
            ],
            6.2
        );


        const geojson =
            await loadGeoJSON();


        geoJsonLayer =
            L.geoJSON(
                geojson,
                {

                    style:
                        defaultStateStyle,


                    onEachFeature:
                        (
                            feature,
                            layer
                        ) => {

                            const state =
                                stateNameFromFeature(
                                    feature
                                );


                            if (!state) {

                                return;

                            }


                            layer.bindTooltip(
                                escapeHtml(
                                    state
                                ),
                                {

                                    permanent:
                                        true,

                                    direction:
                                        "center",

                                    className:
                                        "state-label",

                                    opacity:
                                        1,

                                    sticky:
                                        false,

                                    interactive:
                                        false

                                }
                            );


                            layer.on(
                                "mouseover",
                                () => {

                                    if (
                                        !statesEqual(
                                            selectedMapState,
                                            state
                                        )
                                    ) {

                                        layer.setStyle(
                                            hoverStateStyle()
                                        );

                                    }

                                }
                            );


                            layer.on(
                                "mouseout",
                                () => {

                                    if (
                                        !statesEqual(
                                            selectedMapState,
                                            state
                                        )
                                    ) {

                                        layer.setStyle(
                                            defaultStateStyle()
                                        );

                                    }

                                }
                            );


                            layer.on(
                                "click",
                                event => {

                                    L.DomEvent.stopPropagation(
                                        event
                                    );


                                    selectState(
                                        state
                                    );

                                }
                            );

                        }

                }
            )
            .addTo(
                germanyMap
            );


        mapElement
            .querySelector(
                ".map-loading"
            )
            ?.remove();


        if (
            selectedMapState
        ) {

            selectState(
                selectedMapState,
                false
            );

        }

    } catch (error) {

        console.error(
            "Germany map failed:",
            error
        );


        mapElement.innerHTML = `

            <div class="map-loading error-map">

                Germany map could not be loaded.

                <br><br>

                The dashboard uses the local GeoJSON
                first and a public fallback second.

            </div>

        `;

    }

}


/* ============================================================
   STATE OVERVIEW
============================================================ */

function renderSelectedState(
    selectedState = ""
) {

    const container =
        byId(
            "stateOverview"
        );


    if (!container) {

        return;

    }


    if (!selectedState) {

        const metrics =
            Object.values(
                stateMetrics
            );


        const universities =
            metrics.reduce(
                (
                    sum,
                    metric
                ) =>
                    sum +
                    metric.universities,
                0
            );


        const courses =
            metrics.reduce(
                (
                    sum,
                    metric
                ) =>
                    sum +
                    metric.courses,
                0
            );


        const companies =
            metrics.reduce(
                (
                    sum,
                    metric
                ) =>
                    sum +
                    metric.companies,
                0
            );


        container.innerHTML = `

            <div class="state-stat">

                <span>
                    States represented
                </span>

                <strong>

                    ${formatNumber(
                        GERMAN_STATES.length
                    )}

                </strong>

            </div>


            <div class="state-stat">

                <span>
                    Universities
                </span>

                <strong>

                    ${formatNumber(
                        universities
                    )}

                </strong>

            </div>


            <div class="state-stat">

                <span>
                    Study programs
                </span>

                <strong>

                    ${formatNumber(
                        courses
                    )}

                </strong>

            </div>


            <div class="state-stat">

                <span>
                    Companies
                </span>

                <strong>

                    ${formatNumber(
                        companies
                    )}

                </strong>

            </div>

        `;


        return;

    }


    const metric =
        stateMetrics[
            selectedState
        ];


    if (!metric) {

        container.innerHTML = `

            <div class="empty-state">

                No data available for this state.

            </div>

        `;


        return;

    }


    container.innerHTML = `

        <div class="state-stat">

            <span>
                Universities
            </span>

            <strong>

                ${formatNumber(
                    metric.universities
                )}

            </strong>

        </div>


        <div class="state-stat">

            <span>
                Study programs
            </span>

            <strong>

                ${formatNumber(
                    metric.courses
                )}

            </strong>

        </div>


        <div class="state-stat">

            <span>
                Uni-linked scholarships
            </span>

            <strong>

                ${formatNumber(
                    metric.scholarships
                )}

            </strong>

        </div>


        <div class="state-stat">

            <span>
                Companies
            </span>

            <strong>

                ${formatNumber(
                    metric.companies
                )}

            </strong>

        </div>


        <div class="state-stat-note">

            ${escapeHtml(
                metric.scholarshipNote
            )}

        </div>

    `;

}


/* ============================================================
   STATE UNIVERSITY TOTALS
============================================================ */

function renderStateUniversityList() {

    const container =
        byId(
            "stateUniversityList"
        );


    if (!container) {

        return;

    }


    const rows =
        Object.values(
            stateMetrics
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.universities -
                    a.universities
            );


    const max =
        Math.max(
            ...rows.map(
                item =>
                    item.universities
            ),
            1
        );


    container.innerHTML =
        rows
            .map(
                metric => {

                    const width =
                        (
                            metric.universities /
                            max
                        ) * 100;


                    return `

                        <div
                            class="ranking-item"
                        >

                            <div
                                style="flex:1"
                            >

                                <div
                                    class="ranking-name"
                                >

                                    ${escapeHtml(
                                        metric.state
                                    )}

                                </div>


                                <div
                                    class="ranking-bar"
                                >

                                    <span
                                        style="
                                            width:${width}%
                                        "
                                    ></span>

                                </div>

                            </div>


                            <div
                                class="ranking-value"
                            >

                                ${formatNumber(
                                    metric.universities
                                )}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   REGIONAL SIGNALS
============================================================ */

function renderRegionalSignals() {

    const container =
        byId(
            "regionalSignals"
        );


    if (!container) {

        return;

    }


    const states =
        Object.values(
            stateMetrics
        );


    if (!states.length) {

        return;

    }


    const highest =
        [
            ...states
        ].sort(
            (
                a,
                b
            ) =>
                b.universities -
                a.universities
        )[0];


    const lowest =
        [
            ...states
        ].sort(
            (
                a,
                b
            ) =>
                a.universities -
                b.universities
        )[0];


    const courses =
        [
            ...states
        ].sort(
            (
                a,
                b
            ) =>
                b.courses -
                a.courses
        )[0];


    const cards =
        container.querySelectorAll(
            ".signal-card"
        );


    if (
        cards[0]?.querySelector(
            "strong"
        )
    ) {

        cards[0]
            .querySelector(
                "strong"
            )
            .textContent =
            highest?.state ||
            "—";

    }


    if (
        cards[1]?.querySelector(
            "strong"
        )
    ) {

        cards[1]
            .querySelector(
                "strong"
            )
            .textContent =
            lowest?.state ||
            "—";

    }


    if (
        cards[2]?.querySelector(
            "strong"
        )
    ) {

        cards[2]
            .querySelector(
                "strong"
            )
            .textContent =
            courses?.state ||
            "—";

    }

}


/* ============================================================
   FIELD LIST
============================================================ */

function renderFieldList() {

    const container =
        byId(
            "fieldList"
        );


    if (!container) {

        return;

    }


    const rows =
        DATA.fieldSummary ||
        [];


    if (!rows.length) {

        container.innerHTML = `

            <div class="empty-state">
                Field analytics unavailable.
            </div>

        `;


        return;

    }


    const fieldColumn =
        findBestPopulatedColumn(
            rows,
            [
                "field",
                "study_field",
                "study field",
                "subject",
                "discipline",
                "category"
            ]
        );


    const numericColumn =
        findNumericColumn(
            rows,
            [
                "course_count",
                "course count",
                "courses",
                "program_count",
                "program count",
                "programs",
                "count"
            ]
        );


    if (
        !fieldColumn ||
        !numericColumn
    ) {

        container.innerHTML = `

            <div class="empty-state">
                Field metrics unavailable.
            </div>

        `;


        return;

    }


    const ranking =
        [
            ...rows
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    (
                        numberValue(
                            b[
                                numericColumn
                            ]
                        ) || 0
                    ) -
                    (
                        numberValue(
                            a[
                                numericColumn
                            ]
                        ) || 0
                    )
            )
            .slice(
                0,
                12
            );


    const max =
        Math.max(
            ...ranking.map(
                row =>
                    numberValue(
                        row[
                            numericColumn
                        ]
                    ) || 0
            ),
            1
        );


    container.innerHTML =
        ranking
            .map(
                row => {

                    const value =
                        numberValue(
                            row[
                                numericColumn
                            ]
                        ) || 0;


                    const width =
                        (
                            value /
                            max
                        ) * 100;


                    return `

                        <div class="ranking-item">

                            <div style="flex:1">

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        row[
                                            fieldColumn
                                        ]
                                    )}

                                </div>


                                <div class="ranking-bar">

                                    <span
                                        style="
                                            width:${width}%
                                        "
                                    ></span>

                                </div>

                            </div>


                            <div class="ranking-value">

                                ${formatNumber(
                                    value
                                )}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   INDUSTRY LIST
============================================================ */

function renderIndustryList() {

    const container =
        byId(
            "industryList"
        );


    if (!container) {

        return;

    }


    const rows =
        DATA.industrySummary ||
        [];


    if (!rows.length) {

        container.innerHTML = `

            <div class="empty-state">
                Industry analytics unavailable.
            </div>

        `;


        return;

    }


    const industryColumn =
        findBestPopulatedColumn(
            rows,
            [
                "industry",
                "industry_name",
                "industry name",
                "sector",
                "category"
            ]
        );


    const numericColumn =
        findNumericColumn(
            rows,
            [
                "company_count",
                "company count",
                "companies",
                "count"
            ]
        );


    if (
        !industryColumn ||
        !numericColumn
    ) {

        container.innerHTML = `

            <div class="empty-state">
                Industry metrics unavailable.
            </div>

        `;


        return;

    }


    const ranking =
        [
            ...rows
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    (
                        numberValue(
                            b[
                                numericColumn
                            ]
                        ) || 0
                    ) -
                    (
                        numberValue(
                            a[
                                numericColumn
                            ]
                        ) || 0
                    )
            )
            .slice(
                0,
                12
            );


    const max =
        Math.max(
            ...ranking.map(
                row =>
                    numberValue(
                        row[
                            numericColumn
                        ]
                    ) || 0
            ),
            1
        );


    container.innerHTML =
        ranking
            .map(
                row => {

                    const value =
                        numberValue(
                            row[
                                numericColumn
                            ]
                        ) || 0;


                    const width =
                        (
                            value /
                            max
                        ) * 100;


                    return `

                        <div class="ranking-item">

                            <div style="flex:1">

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        row[
                                            industryColumn
                                        ]
                                    )}

                                </div>


                                <div class="ranking-bar">

                                    <span
                                        style="
                                            width:${width}%
                                        "
                                    ></span>

                                </div>

                            </div>


                            <div class="ranking-value">

                                ${formatNumber(
                                    value
                                )}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   GENERIC TABLE
============================================================ */

function renderGenericTable(
    containerId,
    rows,
    maxColumns = 6,
    maxRows = 30
) {

    const container =
        byId(
            containerId
        );


    if (!container) {

        return;

    }


    if (
        !rows ||
        !rows.length
    ) {

        container.innerHTML = `

            <div class="empty-state">
                Analytics unavailable.
            </div>

        `;


        return;

    }


    const columns =
        Object.keys(
            rows[0]
        )
            .slice(
                0,
                maxColumns
            );


    container.innerHTML = `

        <div
            style="
                overflow-x:auto;
            "
        >

            <table>

                <thead>

                    <tr>

                        ${
                            columns
                                .map(
                                    column => `

                                        <th>

                                            ${escapeHtml(
                                                column
                                            )}

                                        </th>

                                    `
                                )
                                .join("")
                        }

                    </tr>

                </thead>


                <tbody>

                    ${
                        rows
                            .slice(
                                0,
                                maxRows
                            )
                            .map(
                                row => `

                                    <tr>

                                        ${
                                            columns
                                                .map(
                                                    column => `

                                                        <td>

                                                            ${escapeHtml(
                                                                row[column]
                                                            )}

                                                        </td>

                                                    `
                                                )
                                                .join("")
                                        }

                                    </tr>

                                `
                            )
                            .join("")
                    }

                </tbody>

            </table>

        </div>

    `;

}


function renderIndustryTable() {

    renderGenericTable(
        "industryTable",
        DATA.stateIndustrySummary ||
            [],
        5,
        30
    );

}


function renderScholarshipTable() {

    renderGenericTable(
        "scholarshipTable",
        DATA.scholarshipSummary ||
            [],
        6,
        30
    );

}


/* ============================================================
   QUALITY
============================================================ */

function renderQuality() {

    const container =
        byId(
            "qualityGrid"
        );


    if (!container) {

        return;

    }


    const rows =
        DATA.qualitySummary ||
        [];


    const scholarshipRows =
        DATA.scholarshipQuality ||
        [];


    const cards = [];


    if (
        rows.length
    ) {

        const row =
            rows[0];


        Object.keys(
            row
        )
            .slice(
                0,
                8
            )
            .forEach(
                column => {

                    cards.push({

                        label:
                            column,

                        value:
                            row[column]

                    });

                }
            );

    }


    const distinct =
        scholarshipRows.find(
            row =>
                String(
                    row.metric ??
                    ""
                ).trim() ===
                "distinct_scholarship_ids"
        );


    if (distinct) {

        cards.push({

            label:
                "distinct_scholarship_ids",

            value:
                distinct.value

        });

    }


    const source =
        scholarshipRows.find(
            row =>
                String(
                    row.metric ??
                    ""
                ).trim() ===
                "scholarship_source_rows"
        );


    if (source) {

        cards.push({

            label:
                "scholarship_source_rows",

            value:
                source.value

        });

    }


    if (!cards.length) {

        cards.push({

            label:
                "Analytics status",

            value:
                "Available"

        });

    }


    container.innerHTML =
        cards
            .slice(
                0,
                9
            )
            .map(
                card => `

                    <div
                        class="quality-card"
                    >

                        <span>

                            ${escapeHtml(
                                card.label
                            )}

                        </span>


                        <strong>

                            ${escapeHtml(
                                card.value
                            )}

                        </strong>

                    </div>

                `
            )
            .join("");

}


/* ============================================================
   UNIVERSITY DIRECTORY STYLES
============================================================ */

function injectUniversityDirectoryStyles() {

    if (
        byId(
            "university-directory-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "university-directory-styles";


    style.textContent = `

        #universityDirectory {

            width:
                min(
                    1400px,
                    calc(100% - 32px)
                );

            margin:
                28px auto;

            padding:
                24px;

            box-sizing:
                border-box;

            background:
                #ffffff;

            border:
                1px solid #e5e7eb;

            border-radius:
                20px;

            box-shadow:
                0 10px 30px rgba(
                    15,
                    23,
                    42,
                    .06
                );

        }


        #universityDirectory
        .university-directory-header {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                flex-start;

            gap:
                18px;

            flex-wrap:
                wrap;

            margin-bottom:
                18px;

        }


        #universityDirectory
        .university-directory-title {

            flex:
                1;

            min-width:
                240px;

        }


        #universityDirectory
        .university-directory-title h2 {

            margin:
                0 0 6px;

            font-size:
                26px;

            color:
                #0f172a;

        }


        #universityDirectory
        .university-directory-title p {

            margin:
                0;

            color:
                #64748b;

            font-size:
                14px;

            line-height:
                1.6;

        }


        #universityDirectory
        .university-directory-count {

            padding:
                9px 13px;

            border-radius:
                999px;

            background:
                #eff6ff;

            color:
                #1d4ed8;

            font-size:
                13px;

            font-weight:
                800;

            white-space:
                nowrap;

        }


        #universityDirectory
        .university-directory-controls {

            display:
                grid;

            grid-template-columns:
                minmax(220px, 2fr)
                minmax(160px, 1fr)
                minmax(180px, 1fr)
                auto;

            gap:
                10px;

            margin-bottom:
                14px;

        }


        #universityDirectory
        .university-directory-controls
        input,

        #universityDirectory
        .university-directory-controls
        select,

        #universityDirectory
        .university-directory-controls
        button {

            width:
                100%;

            min-height:
                44px;

            box-sizing:
                border-box;

            padding:
                0 12px;

            border:
                1px solid #dbe2ea;

            border-radius:
                10px;

            background:
                #ffffff;

            color:
                #0f172a;

            font:
                inherit;

        }


        #universityDirectory
        .university-directory-controls
        button {

            cursor:
                pointer;

            border-color:
                #0f172a;

            background:
                #0f172a;

            color:
                #ffffff;

            font-weight:
                800;

        }


        #universityDirectory
        .university-directory-summary {

            display:
                flex;

            justify-content:
                space-between;

            gap:
                12px;

            flex-wrap:
                wrap;

            margin-bottom:
                12px;

            color:
                #64748b;

            font-size:
                13px;

            line-height:
                1.5;

        }


        #universityDirectory
        .university-table-wrap {

            width:
                100%;

            overflow-x:
                auto;

            border:
                1px solid #e5e7eb;

            border-radius:
                14px;

        }


        #universityDirectory
        table {

            width:
                100%;

            min-width:
                980px;

            border-collapse:
                collapse;

        }


        #universityDirectory
        thead th {

            position:
                sticky;

            top:
                0;

            z-index:
                2;

            padding:
                13px 14px;

            background:
                #f8fafc;

            border-bottom:
                1px solid #e5e7eb;

            color:
                #475569;

            text-align:
                left;

            font-size:
                12px;

            font-weight:
                800;

        }


        #universityDirectory
        tbody td {

            padding:
                14px;

            vertical-align:
                top;

            border-bottom:
                1px solid #eef2f7;

            color:
                #334155;

            font-size:
                13px;

        }


        #universityDirectory
        tbody tr:hover {

            background:
                #f8fafc;

        }


        #universityDirectory
        .university-name {

            min-width:
                260px;

            color:
                #0f172a;

            font-weight:
                800;

            line-height:
                1.45;

        }


        #universityDirectory
        .university-rankings {

            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                6px;

            min-width:
                260px;

        }


        #universityDirectory
        .ranking-pill {

            display:
                inline-flex;

            align-items:
                center;

            gap:
                5px;

            padding:
                6px 8px;

            border-radius:
                8px;

            background:
                #f1f5f9;

            color:
                #0f172a;

            font-size:
                11px;

            font-weight:
                800;

            white-space:
                nowrap;

        }


        #universityDirectory
        .ranking-pill b {

            color:
                #1d4ed8;

        }


        #universityDirectory
        .university-state {

            display:
                inline-flex;

            padding:
                5px 8px;

            border-radius:
                8px;

            background:
                #f8fafc;

            color:
                #475569;

            font-weight:
                700;

            white-space:
                nowrap;

        }


        #universityDirectory
        details {

            margin-top:
                7px;

        }


        #universityDirectory
        details summary {

            cursor:
                pointer;

            color:
                #2563eb;

            font-size:
                12px;

            font-weight:
                800;

        }


        #universityDirectory
        .university-details {

            margin-top:
                10px;

            padding:
                11px;

            background:
                #f8fafc;

            border:
                1px solid #e2e8f0;

            border-radius:
                10px;

        }


        #universityDirectory
        .university-detail-row {

            display:
                grid;

            grid-template-columns:
                minmax(150px, .8fr)
                minmax(220px, 1.8fr);

            gap:
                12px;

            padding:
                7px 0;

            border-bottom:
                1px solid #e2e8f0;

        }


        #universityDirectory
        .university-detail-row:last-child {

            border-bottom:
                none;

        }


        #universityDirectory
        .university-detail-key {

            color:
                #64748b;

            font-weight:
                700;

        }


        #universityDirectory
        .university-detail-value {

            color:
                #0f172a;

            word-break:
                break-word;

        }


        #universityDirectory
        .university-empty {

            padding:
                40px 20px;

            text-align:
                center;

            color:
                #64748b;

        }


        @media (
            max-width: 900px
        ) {

            #universityDirectory
            .university-directory-controls {

                grid-template-columns:
                    1fr 1fr;

            }

        }


        @media (
            max-width: 640px
        ) {

            #universityDirectory {

                width:
                    calc(100% - 20px);

                margin:
                    18px auto;

                padding:
                    16px;

            }


            #universityDirectory
            .university-directory-title h2 {

                font-size:
                    22px;

            }


            #universityDirectory
            .university-directory-controls {

                grid-template-columns:
                    1fr;

            }


            #universityDirectory
            .university-detail-row {

                grid-template-columns:
                    1fr;

                gap:
                    3px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* ============================================================
   UNIVERSITY DIRECTORY HTML
============================================================ */

function ensureUniversityDirectory() {

    let section =
        byId(
            "universityDirectory"
        );


    if (
        section
    ) {

        setupUniversityDirectoryControls();

        renderUniversityDirectory();

        return;

    }


    injectUniversityDirectoryStyles();


    section =
        document.createElement(
            "section"
        );


    section.id =
        "universityDirectory";


    section.innerHTML = `

        <div
            class="university-directory-header"
        >

            <div
                class="university-directory-title"
            >

                <h2>
                    University Directory
                </h2>


                <p>

                    Explore every university in the
                    current university analytics dataset,
                    with available ranking information,
                    state, city, type and full details.

                </p>

            </div>


            <div
                class="university-directory-count"
                id="universityDirectoryCount"
            >

                Loading...

            </div>

        </div>


        <div
            class="university-directory-controls"
        >

            <input
                id="universitySearch"
                type="search"
                placeholder="Search university, city or state..."
                autocomplete="off"
            >


            <select
                id="universityStateFilter"
            >

                <option value="">
                    All German states
                </option>

            </select>


            <select
                id="universityRankSort"
            >

                <option value="rank-asc">
                    Ranking: Low → High
                </option>


                <option value="rank-desc">
                    Ranking: High → Low
                </option>


                <option value="name-asc">
                    Name: A → Z
                </option>


                <option value="state-asc">
                    State: A → Z
                </option>

            </select>


            <button
                id="universityReset"
                type="button"
            >

                Show all universities

            </button>

        </div>


        <div
            class="university-directory-summary"
        >

            <span
                id="universityDirectorySummary"
            >
                Loading...
            </span>


            <span>

                Ranking sort uses numeric ranking
                positions only. Unranked entries stay last.

            </span>

        </div>


        <div
            class="university-table-wrap"
        >

            <table>

                <thead>

                    <tr>

                        <th>
                            University
                        </th>

                        <th>
                            Rankings
                        </th>

                        <th>
                            State
                        </th>

                        <th>
                            City
                        </th>

                        <th>
                            Type
                        </th>

                    </tr>

                </thead>


                <tbody
                    id="universityDirectoryBody"
                >

                    <tr>

                        <td
                            colspan="5"
                            class="university-empty"
                        >

                            Loading university data...

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;


    const anchor =
        byId(
            "stateUniversityList"
        );


    if (
        anchor
    ) {

        const parent =
            anchor.closest(
                "section, .card, .panel, .dashboard-card"
            ) ||
            anchor.parentElement;


        if (
            parent?.parentNode
        ) {

            parent.parentNode.insertBefore(
                section,
                parent.nextSibling
            );

        } else {

            document.body.appendChild(
                section
            );

        }

    } else {

        document.body.appendChild(
            section
        );

    }


    setupUniversityDirectoryControls();

    renderUniversityDirectory();

}


/* ============================================================
   UNIVERSITY DIRECTORY CONTROLS
============================================================ */

function setupUniversityDirectoryControls() {

    const search =
        byId(
            "universitySearch"
        );


    const stateFilter =
        byId(
            "universityStateFilter"
        );


    const rankSort =
        byId(
            "universityRankSort"
        );


    const reset =
        byId(
            "universityReset"
        );


    if (
        stateFilter &&
        stateFilter.dataset.ready !==
        "true"
    ) {

        /*
           Prevent duplicate state options if they
           already exist.
        */

        const existing =
            new Set(
                [
                    ...stateFilter.options
                ]
                    .map(
                        option =>
                            normalizeComparable(
                                option.value
                            )
                    )
            );


        GERMAN_STATES.forEach(
            state => {

                if (
                    existing.has(
                        normalizeComparable(
                            state
                        )
                    )
                ) {

                    return;

                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    state;


                option.textContent =
                    state;


                stateFilter.appendChild(
                    option
                );

            }
        );


        stateFilter.dataset.ready =
            "true";

    }


    if (
        search &&
        search.dataset.ready !==
        "true"
    ) {

        search.addEventListener(
            "input",
            () =>
                renderUniversityDirectory()
        );


        search.dataset.ready =
            "true";

    }


    if (
        stateFilter &&
        stateFilter.dataset.listener !==
        "true"
    ) {

        stateFilter.addEventListener(
            "change",
            () =>
                renderUniversityDirectory()
        );


        stateFilter.dataset.listener =
            "true";

    }


    if (
        rankSort &&
        rankSort.dataset.ready !==
        "true"
    ) {

        rankSort.addEventListener(
            "change",
            () =>
                renderUniversityDirectory()
        );


        rankSort.dataset.ready =
            "true";

    }


    if (
        reset &&
        reset.dataset.ready !==
        "true"
    ) {

        reset.addEventListener(
            "click",
            () => {

                if (search) {

                    search.value =
                        "";

                }


                if (stateFilter) {

                    stateFilter.value =
                        "";

                }


                if (rankSort) {

                    rankSort.value =
                        "rank-asc";

                }


                renderUniversityDirectory();

            }
        );


        reset.dataset.ready =
            "true";

    }

}


/* ============================================================
   UNIVERSITY DIRECTORY FILTER + SORT
============================================================ */

function getUniversityDirectoryData() {

    const rows =
        getUniversityRows();


    const nameColumn =
        getUniversityNameColumn(
            rows
        );


    const stateColumn =
        getUniversityStateColumn(
            rows
        );


    const cityColumn =
        getUniversityCityColumn(
            rows
        );


    const typeColumn =
        getUniversityTypeColumn(
            rows
        );


    const primaryRankColumn =
        getPrimaryRankingColumn(
            rows
        );


    const search =
        String(
            byId(
                "universitySearch"
            )?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const selectedState =
        String(
            byId(
                "universityStateFilter"
            )?.value ||
            ""
        )
            .trim();


    const sort =
        byId(
            "universityRankSort"
        )?.value ||
        "rank-asc";


    let filtered =
        rows.filter(
            row => {

                if (
                    search
                ) {

                    const searchText =
                        Object.values(
                            row
                        )
                            .join(" ")
                            .toLowerCase();


                    if (
                        !searchText.includes(
                            search
                        )
                    ) {

                        return false;

                    }

                }


                if (
                    selectedState
                ) {

                    if (
                        !stateColumn ||
                        !statesEqual(
                            row[
                                stateColumn
                            ],
                            selectedState
                        )
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    /*
       NAME SORT
    */

    if (
        sort ===
        "name-asc"
    ) {

        filtered.sort(
            (
                a,
                b
            ) => {

                return String(
                    a[
                        nameColumn
                    ] ||
                    ""
                )
                    .localeCompare(
                        String(
                            b[
                                nameColumn
                            ] ||
                            ""
                        ),
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );

            }
        );


        return {

            rows:
                filtered,

            allRows:
                rows,

            nameColumn,

            stateColumn,

            cityColumn,

            typeColumn,

            primaryRankColumn

        };

    }


    /*
       STATE SORT
    */

    if (
        sort ===
        "state-asc"
    ) {

        filtered.sort(
            (
                a,
                b
            ) => {

                const first =
                    String(
                        a[
                            stateColumn
                        ] ||
                        ""
                    );


                const second =
                    String(
                        b[
                            stateColumn
                        ] ||
                        ""
                    );


                const stateCompare =
                    first.localeCompare(
                        second,
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );


                if (
                    stateCompare !==
                    0
                ) {

                    return stateCompare;

                }


                return String(
                    a[
                        nameColumn
                    ] ||
                    ""
                )
                    .localeCompare(
                        String(
                            b[
                                nameColumn
                            ] ||
                            ""
                        ),
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );

            }
        );


        return {

            rows:
                filtered,

            allRows:
                rows,

            nameColumn,

            stateColumn,

            cityColumn,

            typeColumn,

            primaryRankColumn

        };

    }


    /*
       RANK SORT

       IMPORTANT:
       rankingValue() returns null for the text:
           QS World University Rankings 2027

       Therefore the sort only uses actual numeric ranks.
    */

    filtered.sort(
        (
            a,
            b
        ) => {

            const aRank =
                primaryRankColumn
                    ? rankingValue(
                        a[
                            primaryRankColumn
                        ]
                    )
                    : null;


            const bRank =
                primaryRankColumn
                    ? rankingValue(
                        b[
                            primaryRankColumn
                        ]
                    )
                    : null;


            /*
               Both unranked:
               alphabetical tie breaker.
            */

            if (
                aRank === null &&
                bRank === null
            ) {

                return String(
                    a[
                        nameColumn
                    ] ||
                    ""
                )
                    .localeCompare(
                        String(
                            b[
                                nameColumn
                            ] ||
                            ""
                        ),
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );

            }


            /*
               Unranked entries always last.
            */

            if (
                aRank === null
            ) {

                return 1;

            }


            if (
                bRank === null
            ) {

                return -1;

            }


            /*
               LOW -> HIGH
            */

            if (
                sort ===
                "rank-asc"
            ) {

                return (
                    aRank -
                    bRank
                );

            }


            /*
               HIGH -> LOW
            */

            return (
                bRank -
                aRank
            );

        }
    );


    return {

        rows:
            filtered,

        allRows:
            rows,

        nameColumn,

        stateColumn,

        cityColumn,

        typeColumn,

        primaryRankColumn

    };

}


/* ============================================================
   UNIVERSITY RANKING BADGES
============================================================ */

function renderUniversityRankings(
    row,
    rankingColumns
) {

    const badges = [];


    rankingColumns.forEach(
        info => {

            const raw =
                row[
                    info.column
                ];


            const rank =
                rankingValue(
                    raw
                );


            if (
                rank === null ||
                rank <= 0
            ) {

                return;

            }


            badges.push(`

                <span
                    class="ranking-pill"
                >

                    ${escapeHtml(
                        rankingDisplayLabel(
                            info.column
                        )
                    )}

                    <b>

                        ${escapeHtml(
                            String(
                                raw
                            )
                        )}

                    </b>

                </span>

            `);

        }
    );


    if (!badges.length) {

        return `

            <span
                class="ranking-pill"
            >

                Not ranked

            </span>

        `;

    }


    return badges.join("");

}


/* ============================================================
   UNIVERSITY DETAILS
============================================================ */

function renderUniversityDetails(
    row
) {

    const entries =
        Object.entries(
            row ||
            {}
        )
            .filter(
                (
                    [
                        ,
                        value
                    ]
                ) =>
                    String(
                        value ??
                        ""
                    ).trim() !== ""
            );


    if (!entries.length) {

        return `

            <div class="university-details">

                No additional university data available.

            </div>

        `;

    }


    return `

        <div class="university-details">

            ${
                entries
                    .map(
                        (
                            [
                                key,
                                value
                            ]
                        ) => `

                            <div
                                class="university-detail-row"
                            >

                                <div
                                    class="university-detail-key"
                                >

                                    ${escapeHtml(
                                        key
                                    )}

                                </div>


                                <div
                                    class="university-detail-value"
                                >

                                    ${escapeHtml(
                                        value
                                    )}

                                </div>

                            </div>

                        `
                    )
                    .join("")
            }

        </div>

    `;

}


/* ============================================================
   UNIVERSITY DIRECTORY RENDER
============================================================ */

function renderUniversityDirectory() {

    const body =
        byId(
            "universityDirectoryBody"
        );


    if (!body) {

        return;

    }


    const result =
        getUniversityDirectoryData();


    const rows =
        result.rows;


    const allRows =
        result.allRows;


    const nameColumn =
        result.nameColumn;


    const stateColumn =
        result.stateColumn;


    const cityColumn =
        result.cityColumn;


    const typeColumn =
        result.typeColumn;


    const primaryRankColumn =
        result.primaryRankColumn;


    const rankingColumns =
        getRankingColumns(
            allRows
        );


    const countBadge =
        byId(
            "universityDirectoryCount"
        );


    const summary =
        byId(
            "universityDirectorySummary"
        );


    if (
        countBadge
    ) {

        countBadge.textContent =
            `${formatNumber(
                allRows.length
            )} universities`;

    }


    if (
        summary
    ) {

        if (
            rows.length ===
            allRows.length
        ) {

            summary.textContent =
                `Showing all ${formatNumber(
                    allRows.length
                )} universities`;

        } else {

            summary.textContent =
                `Showing ${formatNumber(
                    rows.length
                )} of ${formatNumber(
                    allRows.length
                )} universities`;

        }

    }


    if (
        !rows.length
    ) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="university-empty"
                >

                    No universities match your
                    current search/filter.

                </td>

            </tr>

        `;


        return;

    }


    body.innerHTML =
        rows
            .map(
                (
                    row,
                    index
                ) => {

                    const name =
                        nameColumn
                            ? String(
                                row[
                                    nameColumn
                                ] ??
                                ""
                            ).trim()
                            : (
                                `University ${
                                    index + 1
                                }`
                            );


                    const state =
                        stateColumn
                            ? normalizeStateName(
                                row[
                                    stateColumn
                                ]
                            )
                            : "";


                    const city =
                        cityColumn
                            ? String(
                                row[
                                    cityColumn
                                ] ??
                                ""
                            ).trim()
                            : "";


                    const type =
                        typeColumn
                            ? String(
                                row[
                                    typeColumn
                                ] ??
                                ""
                            ).trim()
                            : "";


                    return `

                        <tr>

                            <td>

                                <div
                                    class="university-name"
                                >

                                    ${escapeHtml(
                                        name
                                    )}

                                </div>


                                <details>

                                    <summary>

                                        View all university details

                                    </summary>


                                    ${renderUniversityDetails(
                                        row
                                    )}

                                </details>

                            </td>


                            <td>

                                <div
                                    class="university-rankings"
                                >

                                    ${renderUniversityRankings(
                                        row,
                                        rankingColumns
                                    )}

                                </div>

                            </td>


                            <td>

                                <span
                                    class="university-state"
                                >

                                    ${escapeHtml(
                                        state ||
                                        "—"
                                    )}

                                </span>

                            </td>


                            <td>

                                ${escapeHtml(
                                    city ||
                                    "—"
                                )}

                            </td>


                            <td>

                                ${escapeHtml(
                                    type ||
                                    "—"
                                )}

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    /*
       Diagnostic information in console.
    */

    console.log(
        "University directory:",
        {
            total:
                allRows.length,

            showing:
                rows.length,

            primaryRankingColumn:
                primaryRankColumn,

            rankingColumns:
                rankingColumns.map(
                    item =>
                        item.column
                )
        }
    );

}


/* ============================================================
   KPI
============================================================ */

function renderKPIs() {

    const universityRows =
        getUniversityRows();


    updateKPI(
        "universityCount",
        universityRows.length
    );


    updateKPI(
        "courseCount",
        (
            DATA.courses ||
            []
        ).length
    );


    updateKPI(
        "scholarshipCount",
        distinctScholarshipCount()
    );


    updateKPI(
        "companyCount",
        (
            DATA.companies ||
            []
        ).length
    );


    /*
       Existing optional labels.
    */

    const scholarshipLabel =
        byId(
            "scholarshipCountLabel"
        );


    if (
        scholarshipLabel
    ) {

        scholarshipLabel.textContent =
            "Distinct scholarships";

    }


    const scholarshipNote =
        byId(
            "scholarshipCountNote"
        );


    if (
        scholarshipNote
    ) {

        scholarshipNote.textContent =
            "Unique scholarship IDs in dataset";

    }

}


function updateKPI(
    id,
    value
) {

    const element =
        byId(id);


    if (!element) {

        return;

    }


    element.textContent =
        formatNumber(
            value
        );

}


/* ============================================================
   INITIALIZATION
============================================================ */

async function initializeDashboard() {

    try {

        /*
           Repair old mojibake before rendering.
        */

        repairBrokenEmojis();


        /*
           Load every dataset.
        */

        await loadAllData();


        /*
           Build state analytics.
        */

        buildStateMetrics();


        /*
           Render normal dashboard.
        */

        renderKPIs();


        setupStateSelector();


        renderSelectedState();


        renderMapDetail();


        renderStateUniversityList();


        renderRegionalSignals();


        renderFieldList();


        renderIndustryList();


        renderIndustryTable();


        renderScholarshipTable();


        renderQuality();


        /*
           Restore university directory.
        */

        ensureUniversityDirectory();


        /*
           Initialize map last.
        */

        await initializeMap();


        /*
           Run emoji repair again because some DOM sections
           may have been created after the first pass.
        */

        repairBrokenEmojis();


        console.log(
            "Germany Admit AI Helper loaded successfully."
        );


        console.log(
            "Universities:",
            getUniversityRows().length
        );


        console.log(
            "Distinct scholarships:",
            distinctScholarshipCount()
        );


        console.log(
            "Primary ranking:",
            getPrimaryRankingColumn(
                getUniversityRows()
            )
        );


    } catch (error) {

        console.error(
            "Dashboard initialization failed:",
            error
        );


        document.body.insertAdjacentHTML(
            "afterbegin",
            `

                <div
                    class="error-state"
                >

                    Dashboard could not load
                    its analytics data.

                    <br><br>

                    Check the browser console
                    and confirm that the analytics
                    CSV files exist under
                    outputs/analytics/.

                </div>

            `
        );

    }

}


/* ============================================================
   START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboard
);