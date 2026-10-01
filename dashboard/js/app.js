"use strict";

/* ============================================================
   GERMANY ADMIT AI HELPER
   COMPLETE DASHBOARD APP.JS

   UNIVERSITY DIRECTORY FIX
   ------------------------------------------------------------
   - Uses actual university records
   - Removes blank university rows
   - Chooses the best populated name/state/city columns
   - Detects NUMERIC ranking columns only
   - Ignores text such as:
       "QS World University Rankings 2027"
   - Shows all available ranking fields
   - Search universities
   - Filter by state
   - Sort by ranking/name/state
   - Click a state on the map -> directory filters to that state
   - Same dashboard and same repository
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const DATA_PATH = "../outputs/analytics/";

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

    "DE-BW": "Baden-Württemberg",
    "BW": "Baden-Württemberg",

    "DE-BY": "Bayern",
    "BY": "Bayern",

    "DE-BE": "Berlin",
    "BE": "Berlin",

    "DE-BB": "Brandenburg",
    "BB": "Brandenburg",

    "DE-HB": "Bremen",
    "HB": "Bremen",

    "DE-HH": "Hamburg",
    "HH": "Hamburg",

    "DE-HE": "Hessen",
    "HE": "Hessen",

    "DE-MV": "Mecklenburg-Vorpommern",
    "MV": "Mecklenburg-Vorpommern",

    "DE-NI": "Niedersachsen",
    "NI": "Niedersachsen",

    "DE-NW": "Nordrhein-Westfalen",
    "NW": "Nordrhein-Westfalen",

    "DE-RP": "Rheinland-Pfalz",
    "RP": "Rheinland-Pfalz",

    "DE-SL": "Saarland",
    "SL": "Saarland",

    "DE-SN": "Sachsen",
    "SN": "Sachsen",

    "DE-ST": "Sachsen-Anhalt",
    "ST": "Sachsen-Anhalt",

    "DE-SH": "Schleswig-Holstein",
    "SH": "Schleswig-Holstein",

    "DE-TH": "Thüringen",
    "TH": "Thüringen"

};


/* ============================================================
   BASIC HELPERS
============================================================ */

function byId(id) {

    return document.getElementById(id);

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatNumber(value) {

    const number =
        Number(
            String(value ?? "")
                .replace(/,/g, "")
                .trim()
        );


    if (!Number.isFinite(number)) {

        return "—";

    }


    return number.toLocaleString("en-US");

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
   Handles:
   158
   #158
   Rank 158
   150-200
*/

function rankingValue(value) {

    const direct =
        numberValue(value);


    if (
        direct !== null
    ) {

        return direct;

    }


    const match =
        String(value ?? "")
            .replace(/,/g, "")
            .match(/\d+/);


    if (!match) {

        return null;

    }


    const parsed =
        Number(
            match[0]
        );


    return Number.isFinite(parsed)
        ? parsed
        : null;

}


function normalizedColumn(value) {

    return String(value ?? "")
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


/* ============================================================
   STATE NORMALIZATION
============================================================ */

function normalizeStateName(value) {

    if (!value) {

        return "";

    }


    const original =
        String(value).trim();


    if (
        STATE_ALIASES[original]
    ) {

        return STATE_ALIASES[original];

    }


    if (
        STATE_CODES[original]
    ) {

        return STATE_CODES[original];

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


function normalizeComparable(value) {

    return normalizeStateName(value)
        .toLowerCase()
        .replace(/[ä]/g, "a")
        .replace(/[ö]/g, "o")
        .replace(/[ü]/g, "u")
        .replace(/ß/g, "ss")
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


function statesEqual(a, b) {

    const first =
        normalizeComparable(a);


    const second =
        normalizeComparable(b);


    return (
        first !== "" &&
        first === second
    );

}


/* ============================================================
   CSV PARSER
============================================================ */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let cell = "";

    let insideQuotes = false;


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
            insideQuotes &&
            next === '"'
        ) {

            cell += '"';

            i++;

            continue;

        }


        if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(cell);

            cell = "";

            continue;

        }


        if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(cell);

            cell = "";


            if (
                row.length > 1 ||
                row[0] !== ""
            ) {

                rows.push(row);

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

        row.push(cell);

        rows.push(row);

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
        .map(values => {

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

        });

}


/* ============================================================
   DATA LOADING
============================================================ */

async function loadCSV(url) {

    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

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

        const localResponse =
            await fetch(
                LOCAL_GEOJSON_URL,
                {
                    cache: "no-store"
                }
            );


        if (
            localResponse.ok
        ) {

            return await localResponse.json();

        }

    } catch (error) {

        console.warn(
            "Local GeoJSON unavailable.",
            error
        );

    }


    const remoteResponse =
        await fetch(
            REMOTE_GEOJSON_URL,
            {
                cache: "no-store"
            }
        );


    if (
        !remoteResponse.ok
    ) {

        throw new Error(
            `Could not load Germany map (${remoteResponse.status})`
        );

    }


    return await remoteResponse.json();

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
   COLUMN DETECTION
============================================================ */

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
       Exact candidates first.
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
       Partial candidates.
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
                    ).includes(target)
            );


        if (partial) {

            return partial;

        }

    }


    return null;

}


/*
   IMPORTANT:
   Unlike the old detector, this one chooses the candidate
   with the best NON-EMPTY coverage.

   This prevents a sparse "university_name" field from
   winning over a fully populated institution/name field.
*/

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


    const normalizedCandidates =
        candidates.map(
            candidate =>
                normalizedColumn(
                    candidate
                )
        );


    const matches = [];


    columns.forEach(
        column => {

            const normalized =
                normalizedColumn(
                    column
                );


            let candidateIndex =
                normalizedCandidates.indexOf(
                    normalized
                );


            if (
                candidateIndex < 0
            ) {

                candidateIndex =
                    normalizedCandidates
                        .findIndex(
                            candidate =>
                                normalized.includes(
                                    candidate
                                ) ||
                                candidate.includes(
                                    normalized
                                )
                        );

            }


            if (
                candidateIndex < 0
            ) {

                return;

            }


            const nonEmpty =
                rows.filter(
                    row =>
                        String(
                            row[column] ??
                            ""
                        ).trim() !== ""
                ).length;


            const coverage =
                nonEmpty /
                rows.length;


            /*
               Candidate order matters, but population
               coverage matters more.
            */

            const score =
                coverage * 1000 -
                candidateIndex;


            matches.push({

                column,

                score,

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
        ) =>
            b.score -
            a.score
    );


    return matches[0].column;

}


function getStateColumn(rows) {

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


/* ============================================================
   GENERIC DATA HELPERS
============================================================ */

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


function findNumericColumn(
    rows,
    candidates
) {

    const direct =
        findColumn(
            rows,
            candidates
        );


    if (direct) {

        const usable =
            rows.filter(
                row =>
                    numberValue(
                        row[direct]
                    ) !== null
            ).length;


        if (
            usable >=
            Math.max(
                1,
                rows.length * 0.3
            )
        ) {

            return direct;

        }

    }


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


    let best =
        null;


    let bestCount =
        0;


    columns.forEach(
        column => {

            const count =
                rows.filter(
                    row =>
                        numberValue(
                            row[column]
                        ) !== null
                ).length;


            if (
                count > bestCount
            ) {

                bestCount =
                    count;

                best =
                    column;

            }

        }
    );


    return best;

}


/* ============================================================
   SCHOLARSHIP LOGIC
============================================================ */

function distinctScholarshipCount() {

    return countUnique(
        DATA.scholarships || [],
        [
            "scholarship_id",
            "scholarship id",
            "id"
        ]
    );

}


function getCorrectedScholarshipStateRow(
    state
) {

    const correctedRows =
        rowsForState(
            DATA.scholarshipStateSummary || [],
            state
        );


    if (
        correctedRows.length
    ) {

        return correctedRows[0];

    }


    const dashboardRows =
        rowsForState(
            DATA.stateDashboard || [],
            state
        );


    if (
        dashboardRows.length
    ) {

        return dashboardRows[0];

    }


    return null;

}


function getCorrectedStateScholarshipCount(
    state
) {

    const row =
        getCorrectedScholarshipStateRow(
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


    if (!column) {

        return 0;

    }


    return (
        numberValue(
            row[column]
        ) || 0
    );

}


function getStateScholarshipUniversityCount(
    state
) {

    const row =
        getCorrectedScholarshipStateRow(
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


function getStateScholarshipNote(
    state
) {

    const row =
        getCorrectedScholarshipStateRow(
            state
        );


    const defaultText =
        "This metric represents university-linked scholarship records in the current dataset; it is not a count of every scholarship available in the state.";


    if (!row) {

        return defaultText;

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


    return (
        String(
            row?.[column] ??
            ""
        ).trim()
        ||
        defaultText
    );

}


/* ============================================================
   UNIVERSITY DATA MODEL
============================================================ */

function getUniversityRows() {

    const rows =
        DATA.universities || [];


    if (!rows.length) {

        return [];

    }


    /*
       Choose the best populated university-name column.
    */

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


    /*
       Remove rows with no actual university name.
    */

    const validRows =
        rows.filter(
            row =>
                String(
                    row[nameColumn] ??
                    ""
                ).trim() !== ""
        );


    /*
       Deduplicate by university name.
       This prevents duplicate university records from
       appearing as separate universities.
    */

    const seen =
        new Set();


    const unique =
        [];


    validRows.forEach(
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


            seen.add(key);

            unique.push(row);

        }
    );


    return unique;

}


/*
   Find the actual numeric ranking columns.

   We NEVER treat a text field such as:

       "QS World University Rankings 2027"

   as a ranking position.

   A ranking column must:
       - look like a ranking field
       - contain numeric rank values
*/

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


    const rankingColumns = [];


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
                (
                    normalized.includes(
                        "qs"
                    ) &&
                    normalized.includes(
                        "world"
                    )
                ) ||
                normalized.includes(
                    "arwu"
                ) ||
                normalized.includes(
                    "timeshighereducation"
                ) ||
                (
                    normalized.includes(
                        "the"
                    ) &&
                    normalized.includes(
                        "world"
                    )
                );


            if (
                !looksLikeRanking
            ) {

                return;

            }


            const numericRows =
                rows.filter(
                    row =>
                        rankingValue(
                            row[column]
                        ) !== null
                );


            if (
                !numericRows.length
            ) {

                /*
                   This is exactly how we reject:
                     "QS World University Rankings 2027"
                   when it is only a text/source field.
                */

                return;

            }


            rankingColumns.push({

                column,

                numericCount:
                    numericRows.length,

                coverage:
                    numericRows.length /
                    rows.length

            });

        }
    );


    /*
       Preferred ranking order.
    */

    const priority =
        [
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


    rankingColumns.sort(
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


            const aPriority =
                priority.findIndex(
                    item =>
                        aName.includes(
                            item
                        )
                );


            const bPriority =
                priority.findIndex(
                    item =>
                        bName.includes(
                            item
                        )
                );


            const aScore =
                aPriority < 0
                    ? 999
                    : aPriority;


            const bScore =
                bPriority < 0
                    ? 999
                    : bPriority;


            if (
                aScore !==
                bScore
            ) {

                return (
                    aScore -
                    bScore
                );

            }


            return (
                b.numericCount -
                a.numericCount
            );

        }
    );


    return rankingColumns;

}


function rankingLabel(
    column
) {

    const normalized =
        normalizedColumn(
            column
        );


    if (
        normalized.includes(
            "qsworldrank2027"
        ) ||
        (
            normalized.includes(
                "qs"
            ) &&
            normalized.includes(
                "world"
            ) &&
            normalized.includes(
                "rank"
            ) &&
            normalized.includes(
                "2027"
            )
        )
    ) {

        return "QS 2027";

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
            "qseuroperank2026"
        )
    ) {

        return "QS Europe 2026";

    }


    if (
        normalized.includes(
            "qssubjectrankbest2026"
        )
    ) {

        return "QS Subject 2026";

    }


    if (
        normalized.includes(
            "arwuworldrank2025"
        )
    ) {

        return "ARWU 2025";

    }


    return String(column)
        .replace(
            /_/g,
            " "
        );

}


/*
   Pick the primary ranking used for:
   - state "highest-ranked university"
   - directory ranking sorting
*/

function getPrimaryRankingColumn(
    rows
) {

    const columns =
        getRankingColumns(
            rows
        );


    if (!columns.length) {

        return null;

    }


    return columns[0].column;

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


function getUniversityStateColumn(
    rows
) {

    return getStateColumn(
        rows
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

        scholarshipUniversities: 0,

        scholarshipNote:
            "",

        companies: 0,

        topFields: [],

        topIndustries: [],

        concentration: "Lower",

        topRankedUniversity:
            null

    };

}


function getSummaryRowsForState(
    state
) {

    const correctedRows =
        rowsForState(
            DATA.stateDashboard || [],
            state
        );


    if (
        correctedRows.length
    ) {

        return correctedRows;

    }


    return rowsForState(
        DATA.stateSummary || [],
        state
    );

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


            const summaryRows =
                getSummaryRowsForState(
                    state
                );


            if (
                summaryRows.length
            ) {

                const row =
                    summaryRows[0];


                const universityColumn =
                    findNumericColumn(
                        [row],
                        [
                            "university_count",
                            "university count",
                            "universities"
                        ]
                    );


                const courseColumn =
                    findNumericColumn(
                        [row],
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
                        [row],
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
                            row[
                                universityColumn
                            ]
                        ) || 0;

                }


                if (
                    courseColumn
                ) {

                    metric.courses =
                        numberValue(
                            row[
                                courseColumn
                            ]
                        ) || 0;

                }


                if (
                    companyColumn
                ) {

                    metric.companies =
                        numberValue(
                            row[
                                companyColumn
                            ]
                        ) || 0;

                }

            }


            /*
               University fallback from real university
               directory data.
            */

            if (
                metric.universities === 0
            ) {

                metric.universities =
                    rowsForState(
                        getUniversityRows(),
                        state
                    ).length;

            }


            if (
                metric.courses === 0
            ) {

                metric.courses =
                    rowsForState(
                        DATA.courses || [],
                        state
                    ).length;

            }


            if (
                metric.companies === 0
            ) {

                metric.companies =
                    countUnique(
                        rowsForState(
                            DATA.companies || [],
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


            /*
               CORRECT scholarship metric.
               No raw state filter fallback.
            */

            metric.scholarships =
                getCorrectedStateScholarshipCount(
                    state
                );


            metric.scholarshipUniversities =
                getStateScholarshipUniversityCount(
                    state
                );


            metric.scholarshipNote =
                getStateScholarshipNote(
                    state
                );


            metric.topFields =
                topValues(
                    rowsForState(
                        DATA.courses || [],
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
                        DATA.companies || [],
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


    const percentile =
        (
            array,
            p
        ) => {

            if (
                !array.length
            ) {

                return 0;

            }


            const index =
                (
                    array.length -
                    1
                ) *
                p;


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

        };


    const lowerThreshold =
        percentile(
            values,
            0.25
        );


    const upperThreshold =
        percentile(
            values,
            0.75
        );


    states.forEach(
        metric => {

            if (
                metric.universities >=
                upperThreshold
            ) {

                metric.concentration =
                    "High";

            } else if (
                metric.universities <=
                lowerThreshold
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


    const primaryRankColumn =
        getPrimaryRankingColumn(
            rows
        );


    if (
        !stateColumn ||
        !nameColumn ||
        !primaryRankColumn
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


            const rawRank =
                row[
                    primaryRankColumn
                ];


            const rank =
                rankingValue(
                    rawRank
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

                rawRank,

                rankColumn:
                    primaryRankColumn

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
                    universities.length &&
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


        const normalized =
            normalizeStateName(
                candidate
            );


        if (
            GERMAN_STATES.includes(
                normalized
            )
        ) {

            return normalized;

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
                    🇩🇪
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


    const topFields =
        metric.topFields ||
        [];


    const topIndustries =
        metric.topIndustries ||
        [];


    const scholarshipExtra =
        metric.scholarshipUniversities >
        0

            ? `

                <small>

                    ${formatNumber(
                        metric.scholarshipUniversities
                    )}

                    universit${
                        metric.scholarshipUniversities === 1
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


    const rankingHtml =
        metric.topRankedUniversity

            ? `

                <div class="map-detail-block">

                    <span class="detail-label">

                        Highest-ranked university
                        in available ranking data

                    </span>

                    <strong>

                        ${escapeHtml(
                            metric
                                .topRankedUniversity
                                .name
                        )}

                    </strong>

                    <small>

                        Ranking position:
                        ${formatNumber(
                            metric
                                .topRankedUniversity
                                .rank
                        )}

                        ·
                        ${escapeHtml(
                            rankingLabel(
                                metric
                                    .topRankedUniversity
                                    .rankColumn
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
                        was detected in the current
                        university analytics.

                    </small>

                </div>

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


                ${
                    topFields.length

                        ? `

                            <div class="tag-list">

                                ${
                                    topFields
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

                          `
                }

            </div>


            <div class="map-detail-block">

                <span class="detail-label">
                    Leading industries
                </span>


                ${
                    topIndustries.length

                        ? `

                            <div class="tag-list">

                                ${
                                    topIndustries
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

                          `
                }

            </div>

        </div>


        ${rankingHtml}

    `;

}


/* ============================================================
   KPI
============================================================ */

function renderKPIs() {

    const universities =
        getUniversityRows();


    updateKPI(
        "universityCount",
        universities.length
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
   MAP
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
                        false,

                    zoomSnap:
                        0.25,

                    zoomDelta:
                        0.5

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
   SELECT STATE
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


    const stateSelect =
        byId(
            "stateSelect"
        );


    if (
        stateSelect
    ) {

        const matchingOption =
            [
                ...stateSelect.options
            ]
                .find(
                    option =>
                        statesEqual(
                            option.value,
                            normalized
                        )
                );


        if (
            matchingOption
        ) {

            stateSelect.value =
                matchingOption.value;

        }

    }


    renderMapDetail(
        normalized
    );


    renderSelectedState(
        normalized
    );


    /*
       Map highlight.
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
       University directory automatically follows
       the selected state.
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
       No zoom and no movement.
    */

    if (
        !updateMap
    ) {

        return;

    }

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
        select.dataset.ready
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

            if (
                !select.value
            ) {

                selectedMapState =
                    "";


                renderMapDetail("");

                renderSelectedState("");


                const universityStateFilter =
                    byId(
                        "universityStateFilter"
                    );


                if (
                    universityStateFilter
                ) {

                    universityStateFilter.value =
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
                select.value
            );

        }
    );


    select.dataset.ready =
        "true";

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


        const totalUniversities =
            metrics.reduce(
                (
                    sum,
                    metric
                ) =>
                    sum +
                    metric.universities,
                0
            );


        const totalCourses =
            metrics.reduce(
                (
                    sum,
                    metric
                ) =>
                    sum +
                    metric.courses,
                0
            );


        const totalCompanies =
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
                        totalUniversities
                    )}

                </strong>

            </div>


            <div class="state-stat">

                <span>
                    Study programs
                </span>

                <strong>

                    ${formatNumber(
                        totalCourses
                    )}

                </strong>

            </div>


            <div class="state-stat">

                <span>
                    Companies
                </span>

                <strong>

                    ${formatNumber(
                        totalCompanies
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
   STATE UNIVERSITY COUNT LIST
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


    if (!rows.length) {

        container.innerHTML = `

            <div class="empty-state">

                State university metrics unavailable.

            </div>

        `;

        return;

    }


    const max =
        Math.max(
            ...rows.map(
                row =>
                    row.universities
            ),
            1
        );


    container.innerHTML =
        rows
            .map(
                row => {

                    const width =
                        (
                            row.universities /
                            max
                        ) *
                        100;


                    return `

                        <div class="ranking-item">

                            <div style="flex:1">

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        row.state
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
                                    row.universities
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
        ]
            .sort(
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
        ]
            .sort(
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
        ]
            .sort(
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

        cards[0].querySelector(
            "strong"
        ).textContent =
            highest?.state ||
            "—";

    }


    if (
        cards[1]?.querySelector(
            "strong"
        )
    ) {

        cards[1].querySelector(
            "strong"
        ).textContent =
            lowest?.state ||
            "—";

    }


    if (
        cards[2]?.querySelector(
            "strong"
        )
    ) {

        cards[2].querySelector(
            "strong"
        ).textContent =
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
        DATA.fieldSummary || [];


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
                            b[numericColumn]
                        ) || 0
                    ) -
                    (
                        numberValue(
                            a[numericColumn]
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
                        row[numericColumn]
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
                            row[numericColumn]
                        ) || 0;


                    const width =
                        (
                            value /
                            max
                        ) *
                        100;


                    return `

                        <div class="ranking-item">

                            <div style="flex:1">

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        row[fieldColumn]
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
        DATA.industrySummary || [];


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
                            b[numericColumn]
                        ) || 0
                    ) -
                    (
                        numberValue(
                            a[numericColumn]
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
                        row[numericColumn]
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
                            row[numericColumn]
                        ) || 0;


                    const width =
                        (
                            value /
                            max
                        ) *
                        100;


                    return `

                        <div class="ranking-item">

                            <div style="flex:1">

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        row[industryColumn]
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

        <div style="overflow-x:auto">

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


/* ============================================================
   INDUSTRY / SCHOLARSHIP TABLES
============================================================ */

function renderIndustryTable() {

    renderGenericTable(
        "industryTable",
        DATA.stateIndustrySummary || [],
        5,
        30
    );

}


function renderScholarshipTable() {

    renderGenericTable(
        "scholarshipTable",
        DATA.scholarshipSummary || [],
        6,
        30
    );

}


/* ============================================================
   DATA QUALITY
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
        DATA.qualitySummary || [];


    const scholarshipRows =
        DATA.scholarshipQuality || [];


    const cards = [];


    if (rows.length) {

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


    const sourceRows =
        scholarshipRows.find(
            row =>
                String(
                    row.metric ??
                    ""
                ).trim() ===
                "scholarship_source_rows"
        );


    if (sourceRows) {

        cards.push({

            label:
                "scholarship_source_rows",

            value:
                sourceRows.value

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

                    <div class="quality-card">

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
   UNIVERSITY DIRECTORY
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
                    0.06
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

            min-width:
                240px;

            flex:
                1;

        }


        #universityDirectory
        .university-directory-title h2 {

            margin:
                0 0 6px;

            color:
                #0f172a;

            font-size:
                26px;

            line-height:
                1.2;

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

            font-weight:
                800;

            font-size:
                13px;

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
                minmax(160px, 1fr)
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

            min-height:
                44px;

            width:
                100%;

            box-sizing:
                border-box;

            border:
                1px solid #dbe2ea;

            border-radius:
                10px;

            padding:
                0 12px;

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

            background:
                #0f172a;

            color:
                #ffffff;

            border-color:
                #0f172a;

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
                950px;

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

            border-bottom:
                1px solid #eef2f7;

            vertical-align:
                top;

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

            color:
                #0f172a;

            font-weight:
                800;

            line-height:
                1.4;

            min-width:
                280px;

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
                4px;

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
        .ranking-pill
        b {

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

            border:
                1px solid #e2e8f0;

            border-radius:
                10px;

            background:
                #f8fafc;

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
                42px 20px;

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

                border-radius:
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
   UNIVERSITY DIRECTORY — HTML
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
                    including available ranking information.

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
                    Primary ranking: low → high
                </option>

                <option value="rank-desc">
                    Primary ranking: high → low
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

                Ranking badges use numeric ranking positions
                found in the university dataset.

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


    /*
       Put it after the existing university-state area.
    */

    const existing =
        byId(
            "stateUniversityList"
        );


    if (
        existing
    ) {

        const parent =
            existing.closest(
                "section, .card, .panel, .dashboard-card"
            ) ||
            existing.parentElement;


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
   UNIVERSITY DIRECTORY — CONTROLS
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
        !stateFilter.dataset.ready
    ) {

        GERMAN_STATES.forEach(
            state => {

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
        !search.dataset.ready
    ) {

        search.addEventListener(
            "input",
            renderUniversityDirectory
        );


        search.dataset.ready =
            "true";

    }


    if (
        stateFilter &&
        !stateFilter.dataset.listener
    ) {

        stateFilter.addEventListener(
            "change",
            renderUniversityDirectory
        );


        stateFilter.dataset.listener =
            "true";

    }


    if (
        rankSort &&
        !rankSort.dataset.ready
    ) {

        rankSort.addEventListener(
            "change",
            renderUniversityDirectory
        );


        rankSort.dataset.ready =
            "true";

    }


    if (
        reset &&
        !reset.dataset.ready
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
   UNIVERSITY DIRECTORY — FILTERING
============================================================ */

function getFilteredUniversityRows() {

    const rows =
        getUniversityRows();


    const search =
        String(
            byId(
                "universitySearch"
            )?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const stateFilter =
        String(
            byId(
                "universityStateFilter"
            )?.value ||
            ""
        )
            .trim();


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


    const rankColumn =
        getPrimaryRankingColumn(
            rows
        );


    let filtered =
        rows.filter(
            row => {

                const name =
                    nameColumn
                        ? String(
                            row[
                                nameColumn
                            ] ??
                            ""
                        )
                        : "";


                const state =
                    stateColumn
                        ? String(
                            row[
                                stateColumn
                            ] ??
                            ""
                        )
                        : "";


                const city =
                    cityColumn
                        ? String(
                            row[
                                cityColumn
                            ] ??
                            ""
                        )
                        : "";


                const allText =
                    Object.values(
                        row
                    )
                        .join(" ")
                        .toLowerCase();


                if (
                    search &&
                    !(
                        allText.includes(
                            search
                        ) ||
                        name.toLowerCase()
                            .includes(
                                search
                            ) ||
                        state.toLowerCase()
                            .includes(
                                search
                            ) ||
                        city.toLowerCase()
                            .includes(
                                search
                            )
                    )
                ) {

                    return false;

                }


                if (
                    stateFilter &&
                    (
                        !stateColumn ||
                        !statesEqual(
                            row[
                                stateColumn
                            ],
                            stateFilter
                        )
                    )
                ) {

                    return false;

                }


                return true;

            }
        );


    const sortMode =
        byId(
            "universityRankSort"
        )?.value ||
        "rank-asc";


    filtered.sort(
        (
            a,
            b
        ) => {

            if (
                sortMode ===
                "name-asc"
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
                        )
                    );

            }


            if (
                sortMode ===
                "state-asc"
            ) {

                return String(
                    a[
                        stateColumn
                    ] ||
                    ""
                )
                    .localeCompare(
                        String(
                            b[
                                stateColumn
                            ] ||
                            ""
                        )
                    );

            }


            const aRank =
                rankColumn
                    ? rankingValue(
                        a[
                            rankColumn
                        ]
                    )
                    : null;


            const bRank =
                rankColumn
                    ? rankingValue(
                        b[
                            rankColumn
                        ]
                    )
                    : null;


            /*
               Unranked universities go last.
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
                        )
                    );

            }


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


            if (
                sortMode ===
                "rank-desc"
            ) {

                return (
                    bRank -
                    aRank
                );

            }


            return (
                aRank -
                bRank
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

        rankColumn,

        rankingColumns:
            getRankingColumns(
                rows
            )

    };

}


/* ============================================================
   UNIVERSITY DETAILS
============================================================ */

function renderUniversityDetails(
    row
) {

    const entries =
        Object.entries(
            row || {}
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
   UNIVERSITY RANKING BADGES
============================================================ */

function renderUniversityRankings(
    row,
    rankingColumns
) {

    const badges = [];


    rankingColumns.forEach(
        item => {

            const raw =
                row[
                    item.column
                ];


            const numeric =
                rankingValue(
                    raw
                );


            if (
                numeric === null ||
                numeric <= 0
            ) {

                return;

            }


            badges.push(`

                <span
                    class="ranking-pill"
                >

                    ${escapeHtml(
                        rankingLabel(
                            item.column
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
   UNIVERSITY DIRECTORY — RENDER
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
        getFilteredUniversityRows();


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


    const rankingColumns =
        result.rankingColumns;


    const typeColumn =
        getUniversityTypeColumn(
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


    /*
       Show the real number of unique university records.
    */

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


    if (!rows.length) {

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
                            : `University ${
                                index + 1
                            }`;


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

}


/* ============================================================
   UNIVERSITY DIRECTORY SCROLL / INITIALIZATION
============================================================ */

function renderUniversityDirectoryPosition() {

    const directory =
        byId(
            "universityDirectory"
        );


    if (!directory) {

        return;

    }

    /*
       No automatic scrolling.
       This function intentionally exists so future navigation
       can use it without changing the current dashboard behavior.
    */

}


/* ============================================================
   STARTUP
============================================================ */

async function initializeDashboard() {

    try {

        await loadAllData();


        buildStateMetrics();


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


        ensureUniversityDirectory();


        renderUniversityDirectoryPosition();


        await initializeMap();


        console.log(
            "Germany Admit AI Helper loaded."
        );


        console.log(
            "University records:",
            getUniversityRows().length
        );


        console.log(
            "Ranking columns detected:",
            getRankingColumns(
                getUniversityRows()
            )
        );


        console.log(
            "Distinct scholarships:",
            distinctScholarshipCount()
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

                    Check the browser console and confirm
                    the analytics CSV files exist under
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