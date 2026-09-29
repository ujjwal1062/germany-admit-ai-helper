/* ============================================================
   GERMANY ADMIT AI HELPER
   COMPLETE DASHBOARD APP.JS
   Ready to replace:
   dashboard/js/app.js

   Scholarship semantics:
   - National KPI = distinct scholarship_id values
   - State scholarship metric = university-linked scholarship records
   - A state value of 0 does NOT mean scholarships are unavailable
============================================================ */

"use strict";

/* ============================================================
   CONFIGURATION
============================================================ */

const DATA_PATH = "../outputs/analytics/";

const LOCAL_GEOJSON_URL = "./assets/germany-states.geojson";

const REMOTE_GEOJSON_URL =
    "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/1_sehr_hoch.geo.json";

const DATASETS = {
    stateDashboard:
        DATA_PATH + "state_dashboard_corrected.csv",

    stateSummary:
        DATA_PATH + "state_summary.csv",

    fieldSummary:
        DATA_PATH + "field_summary.csv",

    industrySummary:
        DATA_PATH + "industry_summary.csv",

    stateIndustrySummary:
        DATA_PATH + "state_industry_summary.csv",

    stateFieldSummary:
        DATA_PATH + "state_field_summary.csv",

    scholarshipSummary:
        DATA_PATH + "university_scholarship_summary.csv",

    scholarshipStateSummary:
        DATA_PATH + "scholarship_state_summary_corrected.csv",

    scholarshipQuality:
        DATA_PATH + "scholarship_data_quality.csv",

    qualitySummary:
        DATA_PATH + "analytics_quality_summary.csv",

    universities:
        DATA_PATH + "universities_analytics.csv",

    courses:
        DATA_PATH + "courses_analytics.csv",

    scholarships:
        DATA_PATH + "scholarships_analytics.csv",

    companies:
        DATA_PATH + "companies_analytics.csv"
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
    "Baden-Wuerttemberg": "Baden-Württemberg",
    "Baden Wurttemberg": "Baden-Württemberg",
    "Baden-Württemberg": "Baden-Württemberg",

    "Bavaria": "Bayern",
    "Bayern": "Bayern",

    "Berlin": "Berlin",
    "Brandenburg": "Brandenburg",
    "Bremen": "Bremen",
    "Hamburg": "Hamburg",

    "Hesse": "Hessen",
    "Hessen": "Hessen",

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
    const number = Number(
        String(value ?? "")
            .replace(/,/g, "")
            .trim()
    );

    return Number.isFinite(number)
        ? number.toLocaleString("en-US")
        : "—";
}

function numberValue(value) {
    const number = Number(
        String(value ?? "")
            .replace(/,/g, "")
            .trim()
    );

    return Number.isFinite(number)
        ? number
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
        String(value).trim();

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

    const normalizedA =
        normalizeComparable(a);

    const normalizedB =
        normalizeComparable(b);

    return (
        normalizedA !== "" &&
        normalizedA === normalizedB
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

        const char = text[i];

        const next = text[i + 1];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            cell += '"';

            i++;

            continue;
        }


        if (char === '"') {

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
                header.trim()
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
        await fetch(url);

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
       First try the local GeoJSON file.
       This is useful for public hosting because the map
       does not need to download its boundary file every time.
    */

    try {

        const localResponse =
            await fetch(
                LOCAL_GEOJSON_URL,
                {
                    cache: "no-store"
                }
            );

        if (localResponse.ok) {

            return await localResponse.json();

        }

    } catch (error) {

        console.warn(
            "Local Germany GeoJSON unavailable. Trying remote source.",
            error
        );

    }


    /*
       Remote fallback.
    */

    const remoteResponse =
        await fetch(
            REMOTE_GEOJSON_URL,
            {
                cache: "no-store"
            }
        );

    if (!remoteResponse.ok) {

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
                async ([key, url]) => {

                    try {

                        return [
                            key,
                            await loadCSV(url)
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

            DATA[key] = rows;

        }
    );
}

/* ============================================================
   COLUMN HELPERS
============================================================ */

function normalizedColumnName(value) {

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
       First pass:
       exact normalized match.
    */

    for (
        const candidate of candidates
    ) {

        const target =
            normalizedColumnName(
                candidate
            );


        const exact =
            columns.find(
                column =>
                    normalizedColumnName(
                        column
                    ) === target
            );


        if (exact) {

            return exact;

        }
    }


    /*
       Second pass:
       partial normalized match.
    */

    for (
        const candidate of candidates
    ) {

        const target =
            normalizedColumnName(
                candidate
            );


        const partial =
            columns.find(
                column => {

                    const normalized =
                        normalizedColumnName(
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


function uniqueValues(
    rows,
    column
) {

    if (!column) {
        return [];
    }

    return [
        ...new Set(
            (rows || [])
                .map(
                    row =>
                        row[column]
                )
                .filter(Boolean)
        )
    ];
}

/* ============================================================
   STATE ROW HELPERS
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
        findColumn(
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


    if (!stateColumn) {

        return [];
    }


    return rows.filter(
        row =>
            normalizeComparable(
                row[stateColumn]
            ) ===
            normalizeComparable(
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


    return new Set(values).size;
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

/* ============================================================
   SUMMARY HELPERS
============================================================ */

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


    if (dashboardRows.length) {

        return dashboardRows;
    }


    return rowsForState(
        DATA.stateSummary || [],
        state
    );
}

/* ============================================================
   SCHOLARSHIP LOGIC — CORRECTED
============================================================ */

/*
   National scholarship KPI:
   Count distinct scholarship_id values.

   The source contains 270 scholarship rows but repeated IDs.
   Therefore raw rows are not used as the national KPI.
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


/*
   Get the corrected state scholarship record.

   Priority:
   1. scholarship_state_summary_corrected.csv
   2. state_dashboard_corrected.csv
*/

function getCorrectedScholarshipStateRow(
    state
) {

    const scholarshipRows =
        rowsForState(
            DATA.scholarshipStateSummary || [],
            state
        );


    if (
        scholarshipRows.length
    ) {

        return scholarshipRows[0];

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


/*
   State scholarship metric:
   university-linked scholarship records.

   IMPORTANT:
   There is deliberately NO fallback to raw scholarships
   filtered by state.
*/

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


    return column
        ? (
            numberValue(
                row[column]
            ) || 0
        )
        : 0;
}


/*
   Number of universities that have linked scholarship
   records in the corrected state summary.
*/

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


/*
   Explicit state-tagged scholarship records.

   In the current corrected dataset this can be zero because
   the original scholarship data did not contain state tags.
*/

function getStateExplicitScholarshipCount(
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
                "state_explicit_scholarship_records",
                "state explicit scholarship records"
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


/*
   Human-readable note shown in the state panel.
*/

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
        DATA.universities?.length || 0
    );


    updateKPI(
        "courseCount",
        DATA.courses?.length || 0
    );


    /*
       CORRECTED:
       Use distinct scholarship IDs, not raw scholarship rows.
    */

    updateKPI(
        "scholarshipCount",
        distinctScholarshipCount()
    );


    updateKPI(
        "companyCount",
        DATA.companies?.length || 0
    );


    /*
       These two elements are optional.
       They will only update if the HTML contains them.
    */

    const scholarshipLabel =
        byId(
            "scholarshipCountLabel"
        );


    if (scholarshipLabel) {

        scholarshipLabel.textContent =
            "Distinct scholarships";
    }


    const scholarshipNote =
        byId(
            "scholarshipCountNote"
        );


    if (scholarshipNote) {

        scholarshipNote.textContent =
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

        stateExplicitScholarships: 0,

        scholarshipNote:
            "This metric represents university-linked scholarship records in the current dataset; it is not a count of every scholarship available in the state.",

        companies: 0,

        topFields: [],

        topIndustries: [],

        concentration: "Lower",

        topRankedUniversity: null
    };
}


function buildStateMetrics() {

    stateMetrics = {};


    /*
       Always initialize all 16 German states.
    */

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


            /*
               Primary state-level values come from:
               state_dashboard_corrected.csv
            */

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
               Raw-data fallback for university count.
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
               Raw-data fallback for courses.
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
               Raw-data fallback for companies.
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
               CORRECTED SCHOLARSHIP LOGIC

               Do NOT use:

               rowsForState(DATA.scholarships, state)

               because the scholarship source does not provide
               reliable state mapping.

               We use the corrected scholarship summary.
            */

            metric.scholarships =
                getCorrectedStateScholarshipCount(
                    state
                );


            metric.scholarshipUniversities =
                getStateScholarshipUniversityCount(
                    state
                );


            metric.stateExplicitScholarships =
                getStateExplicitScholarshipCount(
                    state
                );


            metric.scholarshipNote =
                getStateScholarshipNote(
                    state
                );


            /*
               Top study fields.
            */

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


            /*
               Top industries.
            */

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
            )
            .sort(
                (a, b) =>
                    b.universities -
                    a.universities
            );


    if (!states.length) {
        return;
    }


    const values =
        states.map(
            metric =>
                metric.universities
        );


    const sorted =
        [...values].sort(
            (a, b) =>
                a - b
        );


    const percentile =
        (array, p) => {

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
            sorted,
            0.25
        );


    const upperThreshold =
        percentile(
            sorted,
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
   TOP RANKED UNIVERSITY
============================================================ */

function applyTopRankedUniversities() {

    const rows =
        DATA.universities || [];


    if (!rows.length) {
        return;
    }


    const stateColumn =
        findColumn(
            rows,
            [
                "state",
                "federal_state",
                "federal state",
                "bundesland",
                "land"
            ]
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
                numberValue(
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
                    row[
                        universityColumn
                    ],

                rank

            });
        }
    );


    Object.entries(
        grouped
    )
        .forEach(
            ([state, universities]) => {

                universities.sort(
                    (a, b) =>
                        a.rank -
                        b.rank
                );


                if (
                    universities.length
                ) {

                    stateMetrics[state]
                        .topRankedUniversity =
                        universities[0];
                }
            }
        );
}

/* ============================================================
   MAP NAME EXTRACTION
============================================================ */

function stateNameFromFeature(
    feature
) {

    const properties =
        feature?.properties || {};


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
   MAP DETAIL PANEL
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


    const scholarshipNote =
        metric.scholarshipNote ||
        (
            "This metric represents university-linked " +
            "scholarship records in the current dataset; " +
            "it is not a count of every scholarship " +
            "available in the state."
        );


    const scholarshipMappingHtml =
        metric.scholarshipUniversities > 0

            ? `

                <small>

                    ${formatNumber(
                        metric.scholarshipUniversities
                    )}

                    universit${(
                        metric.scholarshipUniversities === 1
                            ? "y"
                            : "ies"
                    )}

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


    let rankingHtml = "";


    if (
        metric.topRankedUniversity
    ) {

        rankingHtml = `

            <div class="map-detail-block">

                <span class="detail-label">
                    Top-ranked university in available ranking data
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

                </small>

            </div>

        `;

    } else {

        rankingHtml = `

            <div class="map-detail-block muted-block">

                <span class="detail-label">
                    University ranking
                </span>

                <strong>
                    Ranking data not available
                </strong>

                <small>

                    The current university analytics do not
                    expose a usable numeric ranking column.

                </small>

            </div>

        `;
    }


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


            ${scholarshipMappingHtml}


            <small>

                ${escapeHtml(
                    scholarshipNote
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
       Update dropdown.
    */

    const select =
        byId(
            "stateSelect"
        );


    if (select) {

        const option =
            [...select.options]
                .find(
                    item =>
                        statesEqual(
                            item.value,
                            normalized
                        )
                );


        if (option) {

            select.value =
                option.value;
        }
    }


    /*
       Update panels.
    */

    renderMapDetail(
        normalized
    );


    renderSelectedState(
        normalized
    );


    /*
       Update state colors.
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


                    if (
                        layer.bringToFront
                    ) {

                        layer.bringToFront();
                    }

                } else {

                    layer.setStyle(
                        defaultStateStyle()
                    );
                }
            }
        );
    }


    /*
       IMPORTANT:
       The map does not zoom or move when a state is selected.
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

                    /*
                       No zoom controls.
                       No dragging.
                       No wheel zoom.
                       No double-click zoom.
                       No touch zoom.
                       No keyboard map movement.
                    */

                    zoomControl: false,

                    attributionControl: true,

                    dragging: false,

                    scrollWheelZoom: false,

                    doubleClickZoom: false,

                    touchZoom: false,

                    boxZoom: false,

                    keyboard: false,

                    tap: false,

                    zoomSnap: 0.25,

                    zoomDelta: 0.5
                }
            );


        /*
           Fixed Germany view.
        */

        germanyMap.setView(
            [51.05, 10.45],
            6.2
        );


        /*
           Load boundaries.
        */

        const geojson =
            await loadGeoJSON();


        geoJsonLayer =
            L.geoJSON(
                geojson,
                {

                    style:
                        defaultStateStyle,


                    onEachFeature:
                        (feature, layer) => {

                            const state =
                                stateNameFromFeature(
                                    feature
                                );


                            if (!state) {
                                return;
                            }


                            /*
                               Permanent state name.
                            */

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


                            /*
                               Hover only changes color.
                               It does not move the map.
                            */

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


                            /*
                               Click selects the state.
                            */

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


        /*
           Remove loading message.
        */

        mapElement
            .querySelector(
                ".map-loading"
            )
            ?.remove();


        /*
           Re-apply selected state if there was one.
        */

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
                and a public GeoJSON fallback second.

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


    const existingValues =
        new Set(
            [...select.options]
                .map(
                    option =>
                        normalizeComparable(
                            option.value
                        )
                )
        );


    GERMAN_STATES.forEach(
        state => {

            const key =
                normalizeComparable(
                    state
                );


            if (
                existingValues.has(
                    key
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


    /*
       Germany overview.
    */

    if (!selectedState) {

        const totalUniversities =
            Object.values(
                stateMetrics
            )
            .reduce(
                (sum, metric) =>
                    sum +
                    metric.universities,
                0
            );


        const totalCourses =
            Object.values(
                stateMetrics
            )
            .reduce(
                (sum, metric) =>
                    sum +
                    metric.courses,
                0
            );


        const totalCompanies =
            Object.values(
                stateMetrics
            )
            .reduce(
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


        <div class="state-stat-note">

            ${escapeHtml(
                metric.scholarshipNote
            )}

        </div>

    `;
}

/* ============================================================
   STATE UNIVERSITY CONCENTRATION LIST
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

                        <div class="ranking-item">

                            <div
                                style="flex:1"
                            >

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        metric.state
                                    )}

                                </div>


                                <div class="ranking-bar">

                                    <span
                                        style="
                                            width:${percentage}%
                                        "
                                    ></span>

                                </div>

                            </div>


                            <div class="ranking-value">

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


    if (cards[0]) {

        const strong =
            cards[0].querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                highestUniversities?.state ||
                "—";
        }
    }


    if (cards[1]) {

        const strong =
            cards[1].querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                lowestUniversities?.state ||
                "—";
        }
    }


    if (cards[2]) {

        const strong =
            cards[2].querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                largestCourseVolume?.state ||
                "—";
        }
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


                    const percentage =
                        (
                            value /
                            max
                        ) *
                        100;


                    return `

                        <div class="ranking-item">

                            <div
                                style="flex:1"
                            >

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        row[fieldColumn]
                                    )}

                                </div>


                                <div class="ranking-bar">

                                    <span
                                        style="
                                            width:${percentage}%
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


                    const percentage =
                        (
                            value /
                            max
                        ) *
                        100;


                    return `

                        <div class="ranking-item">

                            <div
                                style="flex:1"
                            >

                                <div class="ranking-name">

                                    ${escapeHtml(
                                        row[industryColumn]
                                    )}

                                </div>


                                <div class="ranking-bar">

                                    <span
                                        style="
                                            width:${percentage}%
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


    const body =
        rows.slice(
            0,
            maxRows
        );


    container.innerHTML = `

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
                    body
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


    /*
       Existing analytics quality information.
    */

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


    /*
       Corrected scholarship quality information.
    */

    const distinctScholarships =
        scholarshipRows.find(
            row =>
                String(
                    row.metric ?? ""
                ).trim() ===
                "distinct_scholarship_ids"
        );


    if (
        distinctScholarships
    ) {

        cards.push({

            label:
                "distinct_scholarship_ids",

            value:
                distinctScholarships.value

        });
    }


    const scholarshipSourceRows =
        scholarshipRows.find(
            row =>
                String(
                    row.metric ?? ""
                ).trim() ===
                "scholarship_source_rows"
        );


    if (
        scholarshipSourceRows
    ) {

        cards.push({

            label:
                "scholarship_source_rows",

            value:
                scholarshipSourceRows.value

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
   DASHBOARD INITIALIZATION
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


        await initializeMap();


        console.log(

            "Germany Admit AI Helper dashboard loaded.",

            DATA,

            stateMetrics

        );

    } catch (error) {

        console.error(
            error
        );


        document.body.insertAdjacentHTML(

            "afterbegin",

            `

                <div class="error-state">

                    Dashboard could not load its analytics data.

                    <br>

                    Check the browser console and confirm that
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