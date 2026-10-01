"use strict";

/* ============================================================
   GERMANY ADMIT AI HELPER
   COMPLETE DASHBOARD APP.JS

   FIXES INCLUDED:
   1. Corrected scholarship semantics
   2. National scholarship KPI = distinct scholarship IDs
   3. State scholarship metric = university-linked records
   4. Interactive Germany map remains fixed
   5. All 16 German states remain visible
   6. Individual university directory restored
   7. All universities from universities_analytics.csv shown
   8. University ranking shown when available
   9. University search
   10. State filtering
   11. Ranking sorting
   12. Expandable "all details" for every university
   13. Responsive university table for mobile
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
   DOM HELPERS
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
   Ranking values can sometimes be stored as:
   123
   #123
   Rank 123
   123-150

   This helper extracts the first usable number for sorting.
*/

function rankingValue(value) {

    const direct =
        numberValue(value);


    if (direct !== null) {

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
        Number(match[0]);


    return Number.isFinite(parsed)
        ? parsed
        : null;

}


/* ============================================================
   STATE NORMALIZATION
============================================================ */

function normalizeStateName(value) {

    if (!value) {

        return "";

    }


    const original =
        String(value)
            .trim();


    if (STATE_ALIASES[original]) {

        return STATE_ALIASES[original];

    }


    if (STATE_CODES[original]) {

        return STATE_CODES[original];

    }


    const lower =
        original.toLowerCase();


    for (
        const key of Object.keys(STATE_ALIASES)
    ) {

        if (
            key.toLowerCase() === lower
        ) {

            return STATE_ALIASES[key];

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
        .replace(/[^a-z0-9]/g, "");

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
                (header, index) => {

                    object[header] =
                        String(
                            values[index] ?? ""
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

    /*
       Try local map first.
    */

    try {

        const response =
            await fetch(
                LOCAL_GEOJSON_URL,
                {
                    cache: "no-store"
                }
            );


        if (response.ok) {

            return await response.json();

        }

    } catch (error) {

        console.warn(
            "Local GeoJSON unavailable.",
            error
        );

    }


    /*
       Remote fallback.
    */

    const response =
        await fetch(
            REMOTE_GEOJSON_URL,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Could not load Germany map (${response.status})`
        );

    }


    return await response.json();

}


async function loadAllData() {

    const entries =
        Object.entries(
            DATASETS
        );


    const results =
        await Promise.all(

            entries.map(
                async ([key, url]) => {

                    try {

                        const rows =
                            await loadCSV(
                                url
                            );


                        return [
                            key,
                            rows
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
        ([key, rows]) => {

            DATA[key] =
                rows;

        }
    );

}


/* ============================================================
   COLUMN HELPERS
============================================================ */

function normalizedColumn(value) {

    return String(value ?? "")
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
       Exact match first.
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
       Partial match second.
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
                column => {

                    const normalized =
                        normalizedColumn(
                            column
                        );


                    return (
                        normalized.includes(
                            target
                        ) ||
                        target.includes(
                            normalized
                        )
                    );

                }
            );


        if (partial) {

            return partial;

        }

    }


    return null;

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

        return direct;

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


    for (
        const column of columns
    ) {

        const numericCount =
            rows.filter(
                row =>
                    numberValue(
                        row[column]
                    ) !== null
            ).length;


        if (
            numericCount >=
            Math.max(
                2,
                rows.length * 0.6
            )
        ) {

            return column;

        }

    }


    return null;

}


function getStateColumn(rows) {

    return findColumn(
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


    const stateColumn =
        getStateColumn(
            rows
        );


    if (!stateColumn) {

        return [];

    }


    return rows.filter(
        row =>
            statesEqual(
                row[stateColumn],
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
        findColumn(
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
                        row[column] ?? ""
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
                    row[column] ?? ""
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
        findColumn(
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
            (a, b) =>
                b[1] - a[1]
        )
        .slice(
            0,
            limit
        );

}


function sortByNumeric(
    rows,
    numericColumn,
    limit = 10
) {

    return [
        ...(rows || [])
    ]
        .sort(
            (a, b) => {

                const av =
                    numberValue(
                        a[numericColumn]
                    ) ??
                    -Infinity;


                const bv =
                    numberValue(
                        b[numericColumn]
                    ) ??
                    -Infinity;


                return bv - av;

            }
        )
        .slice(
            0,
            limit
        );

}


function getSummaryMetric(
    row,
    candidates
) {

    const column =
        findNumericColumn(
            [row],
            candidates
        );


    if (!column) {

        return null;

    }


    return numberValue(
        row[column]
    );

}


function getSummaryRowsForState(
    state
) {

    const dashboardRows =
        rowsForState(
            DATA.stateDashboard || [],
            state
        );


    if (
        dashboardRows.length
    ) {

        return dashboardRows;

    }


    return rowsForState(
        DATA.stateSummary || [],
        state
    );

}


/* ============================================================
   SCHOLARSHIP LOGIC
============================================================ */

/*
   The scholarship source contains repeated scholarship IDs.

   National KPI:
       DISTINCT scholarship IDs.

   State KPI:
       UNIVERSITY-LINKED SCHOLARSHIP RECORDS.

   A zero therefore does NOT mean:
       "no scholarships exist in this state."
*/

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

    const rows =
        rowsForState(
            DATA.scholarshipStateSummary || [],
            state
        );


    if (rows.length) {

        return rows[0];

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


    if (!column) {

        return 0;

    }


    return (
        numberValue(
            row[column]
        ) || 0
    );

}


function getStateScholarshipNote(
    state
) {

    const row =
        getCorrectedScholarshipStateRow(
            state
        );


    if (!row) {

        return (
            "Scholarship state mapping is not available " +
            "in the current analytics."
        );

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

        return (
            "This metric represents university-linked " +
            "scholarship records in the current dataset; " +
            "it is not a count of every scholarship " +
            "available in the state."
        );

    }


    return (
        String(
            row[column] ?? ""
        ).trim()
        ||
        (
            "This metric represents university-linked " +
            "scholarship records in the current dataset; " +
            "it is not a count of every scholarship " +
            "available in the state."
        )
    );

}


/* ============================================================
   KPI
============================================================ */

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


function renderKPIs() {

    updateKPI(
        "universityCount",
        (
            DATA.universities ||
            []
        ).length
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


    const label =
        byId(
            "scholarshipCountLabel"
        );


    if (label) {

        label.textContent =
            "Distinct scholarships";

    }


    const note =
        byId(
            "scholarshipCountNote"
        );


    if (note) {

        note.textContent =
            "Unique scholarship IDs in the dataset";

    }

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

        companies: 0,

        scholarshipNote:
            "This metric represents university-linked scholarship records in the current dataset; it is not a count of every scholarship available in the state.",

        topFields: [],

        topIndustries: [],

        concentration: "Lower",

        topRankedUniversity: null

    };

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


                const universityValue =
                    getSummaryMetric(
                        row,
                        [
                            "university_count",
                            "university count",
                            "universities"
                        ]
                    );


                const courseValue =
                    getSummaryMetric(
                        row,
                        [
                            "course_count",
                            "course count",
                            "program_count",
                            "program count",
                            "courses",
                            "programs"
                        ]
                    );


                const companyValue =
                    getSummaryMetric(
                        row,
                        [
                            "company_count",
                            "company count",
                            "companies"
                        ]
                    );


                if (
                    universityValue !== null
                ) {

                    metric.universities =
                        universityValue;

                }


                if (
                    courseValue !== null
                ) {

                    metric.courses =
                        courseValue;

                }


                if (
                    companyValue !== null
                ) {

                    metric.companies =
                        companyValue;

                }

            }


            /*
               University fallback.
            */

            if (
                metric.universities === 0
            ) {

                metric.universities =
                    countUnique(
                        rowsForState(
                            DATA.universities || [],
                            state
                        ),
                        [
                            "university_name",
                            "university name",
                            "university",
                            "institution",
                            "institution_name",
                            "name"
                        ]
                    );

            }


            /*
               Course fallback.
            */

            if (
                metric.courses === 0
            ) {

                metric.courses =
                    rowsForState(
                        DATA.courses || [],
                        state
                    ).length;

            }


            /*
               Company fallback.
            */

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
               Corrected scholarship metric.
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
        )
        .filter(
            metric =>
                GERMAN_STATES.includes(
                    metric.state
                )
        );


    if (!states.length) {

        return;

    }


    const sortedValues =
        states
            .map(
                item =>
                    item.universities
            )
            .sort(
                (a, b) =>
                    a - b
            );


    const percentile =
        (
            array,
            p
        ) => {

            if (!array.length) {

                return 0;

            }


            const index =
                (array.length - 1) *
                p;


            const lower =
                Math.floor(index);


            const upper =
                Math.ceil(index);


            if (
                lower === upper
            ) {

                return array[lower];

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
            sortedValues,
            0.25
        );


    const upperThreshold =
        percentile(
            sortedValues,
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
   TOP RANKED UNIVERSITY PER STATE
============================================================ */

function applyTopRankedUniversities() {

    const rows =
        DATA.universities || [];


    if (!rows.length) {

        return;

    }


    const stateColumn =
        getStateColumn(
            rows
        );


    const universityColumn =
        findColumn(
            rows,
            [
                "university_name",
                "university name",
                "university",
                "institution",
                "institution_name",
                "name"
            ]
        );


    const rankColumn =
        findColumn(
            rows,
            [
                "QS Rank",
                "QS Ranking",
                "QS World University Ranking",
                "QS World Rank",
                "World University Ranking",
                "World Rank",
                "University Ranking",
                "Rank",
                "Ranking"
            ]
        );


    if (
        !stateColumn ||
        !universityColumn ||
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
                    row[rankColumn]
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
                    row[universityColumn],

                rank

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
                (a, b) =>
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

        color: "#ffffff",

        weight: 2,

        fillColor: "#2563eb",

        fillOpacity: 0.72

    };

}


function selectedStateStyle() {

    return {

        color: "#111827",

        weight: 3,

        fillColor: "#0f172a",

        fillOpacity: 0.92

    };

}


function hoverStateStyle() {

    return {

        color: "#ffffff",

        weight: 3,

        fillColor: "#1d4ed8",

        fillOpacity: 0.95

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
        metric.topFields || [];


    const topIndustries =
        metric.topIndustries || [];


    const scholarshipExtra =
        metric.scholarshipUniversities > 0

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
                        Highest-ranked university in available ranking data
                    </span>

                    <strong>

                        ${escapeHtml(
                            metric.topRankedUniversity.name
                        )}

                    </strong>

                    <small>

                        Ranking position:
                        ${formatNumber(
                            metric.topRankedUniversity.rank
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

                        The current university file does not
                        expose a usable numeric ranking field.

                    </small>

                </div>

              `;


    panel.innerHTML = `

        <div class="selected-state-name">

            <span class="state-badge">
                Selected
            </span>

            <h4>
                ${escapeHtml(state)}
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
   UNIVERSITY DIRECTORY STYLES
   Injected by JS so no CSS file replacement is required.
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

            margin: 28px auto;

            width: min(
                1400px,
                calc(100% - 32px)
            );

            background: #ffffff;

            border: 1px solid #e5e7eb;

            border-radius: 20px;

            padding: 24px;

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

            display: flex;

            align-items: flex-start;

            justify-content: space-between;

            gap: 20px;

            margin-bottom: 20px;

            flex-wrap: wrap;

        }


        #universityDirectory
        .university-directory-title {

            flex: 1;

            min-width: 240px;

        }


        #universityDirectory
        .university-directory-title h2 {

            margin: 0 0 6px 0;

            font-size: 26px;

            line-height: 1.15;

            color: #0f172a;

        }


        #universityDirectory
        .university-directory-title p {

            margin: 0;

            color: #64748b;

            font-size: 14px;

            line-height: 1.6;

        }


        #universityDirectory
        .university-directory-count {

            display: inline-flex;

            align-items: center;

            gap: 8px;

            background: #eff6ff;

            color: #1d4ed8;

            padding: 9px 13px;

            border-radius: 999px;

            font-size: 13px;

            font-weight: 700;

            white-space: nowrap;

        }


        #universityDirectory
        .university-directory-controls {

            display: grid;

            grid-template-columns:
                minmax(220px, 2fr)
                minmax(160px, 1fr)
                minmax(160px, 1fr)
                auto;

            gap: 12px;

            margin-bottom: 18px;

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

            width: 100%;

            box-sizing: border-box;

            min-height: 44px;

            border: 1px solid #dbe2ea;

            border-radius: 10px;

            background: #ffffff;

            color: #0f172a;

            padding: 0 13px;

            font: inherit;

        }


        #universityDirectory
        .university-directory-controls
        button {

            cursor: pointer;

            font-weight: 700;

            background: #0f172a;

            color: #ffffff;

            border-color: #0f172a;

        }


        #universityDirectory
        .university-directory-controls
        button:hover {

            opacity: 0.92;

        }


        #universityDirectory
        .university-directory-summary {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 12px;

            margin-bottom: 12px;

            flex-wrap: wrap;

            color: #64748b;

            font-size: 13px;

        }


        #universityDirectory
        .university-table-wrap {

            width: 100%;

            overflow-x: auto;

            border: 1px solid #e5e7eb;

            border-radius: 14px;

        }


        #universityDirectory
        table {

            width: 100%;

            min-width: 850px;

            border-collapse: collapse;

        }


        #universityDirectory
        thead th {

            position: sticky;

            top: 0;

            z-index: 1;

            background: #f8fafc;

            color: #475569;

            text-align: left;

            padding: 13px 14px;

            border-bottom: 1px solid #e5e7eb;

            font-size: 12px;

            font-weight: 800;

            letter-spacing: .02em;

        }


        #universityDirectory
        tbody td {

            padding: 14px;

            border-bottom: 1px solid #eef2f7;

            vertical-align: top;

            color: #334155;

            font-size: 13px;

        }


        #universityDirectory
        tbody tr:last-child td {

            border-bottom: none;

        }


        #universityDirectory
        tbody tr:hover {

            background: #f8fafc;

        }


        #universityDirectory
        .university-name-cell {

            min-width: 260px;

        }


        #universityDirectory
        .university-name {

            font-weight: 800;

            color: #0f172a;

            line-height: 1.4;

        }


        #universityDirectory
        .university-rank {

            display: inline-flex;

            align-items: center;

            padding: 5px 8px;

            border-radius: 8px;

            background: #f1f5f9;

            color: #0f172a;

            font-weight: 800;

            white-space: nowrap;

        }


        #universityDirectory
        .university-state {

            display: inline-flex;

            padding: 5px 8px;

            border-radius: 8px;

            background: #f8fafc;

            color: #475569;

            font-weight: 700;

            white-space: nowrap;

        }


        #universityDirectory
        details {

            margin-top: 7px;

        }


        #universityDirectory
        details summary {

            cursor: pointer;

            color: #2563eb;

            font-size: 12px;

            font-weight: 700;

        }


        #universityDirectory
        .university-details {

            margin-top: 10px;

            padding: 11px;

            border-radius: 10px;

            background: #f8fafc;

            border: 1px solid #e2e8f0;

        }


        #universityDirectory
        .university-detail-row {

            display: grid;

            grid-template-columns:
                minmax(130px, 0.8fr)
                minmax(180px, 1.8fr);

            gap: 12px;

            padding: 6px 0;

            border-bottom: 1px solid #e2e8f0;

        }


        #universityDirectory
        .university-detail-row:last-child {

            border-bottom: none;

        }


        #universityDirectory
        .university-detail-key {

            color: #64748b;

            font-weight: 700;

        }


        #universityDirectory
        .university-detail-value {

            color: #0f172a;

            word-break: break-word;

        }


        #universityDirectory
        .university-empty {

            text-align: center;

            padding: 40px 20px;

            color: #64748b;

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

                gap: 3px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* ============================================================
   UNIVERSITY DIRECTORY — CREATE SECTION
============================================================ */

function ensureUniversityDirectory() {

    if (
        byId(
            "universityDirectory"
        )
    ) {

        return;

    }


    injectUniversityDirectoryStyles();


    const section =
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

                    Explore every university contained
                    in the current university analytics dataset,
                    including ranking information where available.

                </p>

            </div>


            <div
                class="university-directory-count"
                id="universityDirectoryCount"
            >

                Loading universities...

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
                    Ranking: low → high
                </option>

                <option value="rank-desc">
                    Ranking: high → low
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

                Ranking is shown from the available
                university dataset; blank ranking values
                remain unranked rather than being invented.

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
                            Ranking
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
                        >
                            Loading university data...

                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;


    /*
       Try to place it after the existing state/list area.
       If unavailable, append to main/body.
    */

    const existingStateList =
        byId(
            "stateUniversityList"
        );


    if (
        existingStateList
    ) {

        const parent =
            existingStateList.closest(
                "section, .card, .panel, .dashboard-card"
            ) ||
            existingStateList.parentElement;


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

        const mapDetail =
            byId(
                "mapStateDetail"
            );


        if (
            mapDetail?.parentElement
        ) {

            mapDetail.parentElement.appendChild(
                section
            );

        } else {

            document.body.appendChild(
                section
            );

        }

    }


    setupUniversityDirectoryControls();

    renderUniversityDirectory();

}


/* ============================================================
   UNIVERSITY DIRECTORY — DATA HELPERS
============================================================ */

function getUniversityNameColumn() {

    return findColumn(
        DATA.universities || [],
        [
            "university_name",
            "university name",
            "university",
            "institution",
            "institution_name",
            "name"
        ]
    );

}


function getUniversityRankColumn() {

    return findColumn(
        DATA.universities || [],
        [
            "QS Rank",
            "QS Ranking",
            "QS World University Ranking",
            "QS World Rank",
            "World University Ranking",
            "World Rank",
            "University Ranking",
            "Rank",
            "Ranking"
        ]
    );

}


function getUniversityCityColumn() {

    return findColumn(
        DATA.universities || [],
        [
            "city",
            "location",
            "university_city",
            "university city"
        ]
    );

}


function getUniversityTypeColumn() {

    return findColumn(
        DATA.universities || [],
        [
            "university_type",
            "university type",
            "type",
            "institution_type",
            "institution type"
        ]
    );

}


function universitySearchText(
    row
) {

    return Object.values(
        row || {}
    )
        .join(" ")
        .toLowerCase();

}


function getUniversityFilteredRows() {

    const allRows =
        [
            ...(DATA.universities || [])
        ];


    const searchInput =
        byId(
            "universitySearch"
        );


    const stateFilter =
        byId(
            "universityStateFilter"
        );


    const sortSelect =
        byId(
            "universityRankSort"
        );


    const search =
        String(
            searchInput?.value || ""
        )
            .trim()
            .toLowerCase();


    const selectedState =
        String(
            stateFilter?.value || ""
        )
            .trim();


    let rows =
        allRows.filter(
            row => {

                /*
                   Search all fields.
                */

                if (
                    search &&
                    !universitySearchText(
                        row
                    ).includes(
                        search
                    )
                ) {

                    return false;

                }


                /*
                   State filter.
                */

                if (
                    selectedState
                ) {

                    const stateColumn =
                        getStateColumn(
                            allRows
                        );


                    if (
                        !stateColumn ||
                        !statesEqual(
                            row[stateColumn],
                            selectedState
                        )
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    const nameColumn =
        getUniversityNameColumn();


    const rankColumn =
        getUniversityRankColumn();


    const stateColumn =
        getStateColumn(
            allRows
        );


    const cityColumn =
        getUniversityCityColumn();


    const sort =
        sortSelect?.value ||
        "rank-asc";


    rows.sort(
        (a, b) => {

            if (
                sort ===
                "name-asc"
            ) {

                return String(
                    a[nameColumn] || ""
                )
                    .localeCompare(
                        String(
                            b[nameColumn] || ""
                        )
                    );

            }


            if (
                sort ===
                "state-asc"
            ) {

                return String(
                    a[stateColumn] || ""
                )
                    .localeCompare(
                        String(
                            b[stateColumn] || ""
                        )
                    );

            }


            if (
                sort ===
                "rank-desc"
            ) {

                const ar =
                    rankingValue(
                        a[rankColumn]
                    );


                const br =
                    rankingValue(
                        b[rankColumn]
                    );


                if (
                    ar === null &&
                    br === null
                ) {

                    return 0;

                }


                if (
                    ar === null
                ) {

                    return 1;

                }


                if (
                    br === null
                ) {

                    return -1;

                }


                return br - ar;

            }


            /*
               Default: rank ascending,
               unranked last.
            */

            const ar =
                rankingValue(
                    a[rankColumn]
                );


            const br =
                rankingValue(
                    b[rankColumn]
                );


            if (
                ar === null &&
                br === null
            ) {

                return String(
                    a[nameColumn] || ""
                )
                    .localeCompare(
                        String(
                            b[nameColumn] || ""
                        )
                    );

            }


            if (
                ar === null
            ) {

                return 1;

            }


            if (
                br === null
            ) {

                return -1;

            }


            return ar - br;

        }
    );


    return rows;

}


/* ============================================================
   UNIVERSITY DIRECTORY — DETAILS
============================================================ */

function renderUniversityDetails(
    row
) {

    const entries =
        Object.entries(
            row || {}
        )
            .filter(
                ([, value]) =>
                    String(
                        value ?? ""
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

        <div
            class="university-details"
        >

            ${
                entries
                    .map(
                        ([key, value]) => `

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


    const rows =
        getUniversityFilteredRows();


    const allRows =
        DATA.universities || [];


    const countBadge =
        byId(
            "universityDirectoryCount"
        );


    const summary =
        byId(
            "universityDirectorySummary"
        );


    const nameColumn =
        getUniversityNameColumn();


    const rankColumn =
        getUniversityRankColumn();


    const stateColumn =
        getStateColumn(
            allRows
        );


    const cityColumn =
        getUniversityCityColumn();


    const typeColumn =
        getUniversityTypeColumn();


    /*
       Header count.
    */

    if (countBadge) {

        countBadge.textContent =
            `${formatNumber(
                allRows.length
            )} universities`;

    }


    /*
       Summary count.
    */

    if (summary) {

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
                (row, index) => {

                    const universityName =
                        nameColumn
                            ? row[nameColumn]
                            : `University ${index + 1}`;


                    const rankingRaw =
                        rankColumn
                            ? row[rankColumn]
                            : "";


                    const rankNumber =
                        rankingValue(
                            rankingRaw
                        );


                    const state =
                        stateColumn
                            ? normalizeStateName(
                                row[stateColumn]
                            )
                            : "";


                    const city =
                        cityColumn
                            ? row[cityColumn]
                            : "";


                    const type =
                        typeColumn
                            ? row[typeColumn]
                            : "";


                    const rankDisplay =
                        String(
                            rankingRaw ?? ""
                        ).trim()
                        ||
                        (
                            rankNumber !== null
                                ? formatNumber(
                                    rankNumber
                                )
                                : "Not ranked"
                        );


                    return `

                        <tr>

                            <td
                                class="university-name-cell"
                            >

                                <div
                                    class="university-name"
                                >

                                    ${escapeHtml(
                                        universityName
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

                                <span
                                    class="university-rank"
                                >

                                    ${escapeHtml(
                                        rankDisplay
                                    )}

                                </span>

                            </td>


                            <td>

                                <span
                                    class="university-state"
                                >

                                    ${escapeHtml(
                                        state || "—"
                                    )}

                                </span>

                            </td>


                            <td>

                                ${escapeHtml(
                                    city || "—"
                                )}

                            </td>


                            <td>

                                ${escapeHtml(
                                    type || "—"
                                )}

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

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


    /*
       Dropdown.
    */

    const stateSelect =
        byId(
            "stateSelect"
        );


    if (stateSelect) {

        const option =
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


        if (option) {

            stateSelect.value =
                option.value;

        }

    }


    /*
       Main state detail.
    */

    renderMapDetail(
        normalized
    );


    renderSelectedState(
        normalized
    );


    /*
       Map highlighting.
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
       Automatically filter university directory
       to selected state.
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
       No map movement or zoom.
    */

    if (!updateMap) {

        return;

    }

}


/* ============================================================
   INITIALIZE MAP
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
        typeof L === "undefined"
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

                The dashboard uses the local GeoJSON first
                and a public fallback second.

            </div>

        `;

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


    const existingValues =
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
                existingValues.has(
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

            if (!select.value) {

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
                (sum, metric) =>
                    sum +
                    metric.universities,
                0
            );


        const totalCourses =
            metrics.reduce(
                (sum, metric) =>
                    sum +
                    metric.courses,
                0
            );


        const totalCompanies =
            metrics.reduce(
                (sum, metric) =>
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


        <div
            class="state-stat-note"
        >

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


    const ranking =
        Object.values(
            stateMetrics
        )
            .filter(
                metric =>
                    GERMAN_STATES.includes(
                        metric.state
                    )
            )
            .sort(
                (a, b) =>
                    b.universities -
                    a.universities
            );


    if (!ranking.length) {

        container.innerHTML = `

            <div class="empty-state">

                State university metrics unavailable.

            </div>

        `;

        return;

    }


    const max =
        Math.max(
            ...ranking.map(
                metric =>
                    metric.universities
            ),
            1
        );


    container.innerHTML =
        ranking
            .map(
                metric => {

                    const percentage =
                        (
                            metric.universities /
                            max
                        ) *
                        100;


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
                                            width:${percentage}%
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


    const highestUniversities =
        [...states]
            .sort(
                (a, b) =>
                    b.universities -
                    a.universities
            )[0];


    const lowestUniversities =
        [...states]
            .sort(
                (a, b) =>
                    a.universities -
                    b.universities
            )[0];


    const largestCourseVolume =
        [...states]
            .sort(
                (a, b) =>
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
            highestUniversities?.state ||
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
            lowestUniversities?.state ||
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
            largestCourseVolume?.state ||
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
        findColumn(
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
        sortByNumeric(
            rows,
            numericColumn,
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
                                        row[fieldColumn]
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
        findColumn(
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
        sortByNumeric(
            rows,
            numericColumn,
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
                                        row[industryColumn]
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


    const bodyRows =
        rows.slice(
            0,
            maxRows
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
                        bodyRows
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
   TABLES
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


        Object.keys(row)
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
                    row.metric ?? ""
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
                    row.metric ?? ""
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
   FINAL DASHBOARD INITIALIZATION
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


        /*
           THIS IS THE IMPORTANT RESTORED FEATURE.
        */

        ensureUniversityDirectory();


        await initializeMap();


        /*
           Log useful counts for debugging.
        */

        console.log(
            "Germany Admit AI Helper loaded."
        );


        console.log(
            "Universities:",
            DATA.universities?.length || 0
        );


        console.log(
            "Distinct scholarships:",
            distinctScholarshipCount()
        );


        console.log(
            "State metrics:",
            stateMetrics
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

                    Check the browser console and
                    confirm the analytics CSV files exist
                    under outputs/analytics/.

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