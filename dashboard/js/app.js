"use strict";

/* ============================================================
   GERMANY ADMIT AI HELPER
   COMPLETE DASHBOARD ENGINE

   FIXED IN THIS VERSION
   ------------------------------------------------------------
   1. Emoji / mojibake repair
   2. KPI icon repair
   3. Header bullet repair
   4. Correct scholarship KPI = distinct scholarship IDs
   5. Correct scholarship ecosystem = scholarship records
   6. Corrected state scholarship interpretation
   7. Full 60-university directory
   8. QS World University Rankings 2027
   9. Ranking Low -> High
   10. Ranking High -> Low
   11. University A -> Z
   12. State filtering
   13. University search
   14. Mobile university cards
   15. Desktop university table
   16. Germany interactive state map
   17. State labels
   18. No map dragging / accidental zoom
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const DATA_PATH =
    "../outputs/analytics/";


const DATASETS = {

    stateDashboardCorrected:
        DATA_PATH +
        "state_dashboard_corrected.csv",

    stateDashboard:
        DATA_PATH +
        "state_dashboard.csv",

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


const LOCAL_GEOJSON =
    "./assets/germany-states.geojson";


const REMOTE_GEOJSON =
    "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/main/2_bundeslaender/1_sehr_hoch.geo.json";


const DATA = {};


let germanyMap = null;

let geoJsonLayer = null;

let selectedMapState = "";

let selectedMapLayer = null;

const stateLayers = {};

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

    "North Rhine Westphalia":
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


/* ============================================================
   DOM HELPERS
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
   NUMBER HELPERS
============================================================ */

function numericValue(value) {

    const text =
        String(value ?? "")
            .trim();


    if (!text) {

        return null;

    }


    const normalized =
        text.replace(
            /,/g,
            ""
        );


    if (
        /^\d+(?:\.\d+)?$/.test(
            normalized
        )
    ) {

        const number =
            Number(
                normalized
            );


        return Number.isFinite(
            number
        )
            ? number
            : null;

    }


    return null;

}


function formatNumber(value) {

    const number =
        numericValue(
            value
        );


    if (
        number === null
    ) {

        return "—";

    }


    return number.toLocaleString(
        "en-US"
    );

}


/* ============================================================
   STRICT RANK VALUE PARSER
============================================================ */

/*
   This function deliberately does NOT extract random digits
   from arbitrary text.

   Therefore:

       "QS World University Rankings 2027"

   is NOT rank 2027.

   Valid examples:

       110
       =110
       #110
       110-120
       110 – 120
       Rank 110
*/


function parseRankValue(value) {

    const text =
        String(value ?? "")
            .trim();


    if (!text) {

        return null;

    }


    /*
       Plain numeric rank.
    */

    if (
        /^[=#]?\s*\d+$/.test(
            text
        )
    ) {

        const cleaned =
            text.replace(
                /^[=#]\s*/,
                ""
            );


        return {

            sortValue:
                Number(cleaned),

            display:
                text

        };

    }


    /*
       Rank 110
       Ranking: 110
    */

    const prefixed =
        text.match(
            /^rank(?:ing)?\s*:?\s*[=#]?\s*(\d+)$/i
        );


    if (
        prefixed
    ) {

        return {

            sortValue:
                Number(
                    prefixed[1]
                ),

            display:
                text

        };

    }


    /*
       Ranking band.

       Example:
       721-730

       We sort using the lower bound.
    */

    const band =
        text.match(
            /^(\d+)\s*[-–]\s*(\d+)$/
        );


    if (
        band
    ) {

        return {

            sortValue:
                Number(
                    band[1]
                ),

            display:
                text

        };

    }


    /*
       Nothing numeric and rank-like.
    */

    return null;

}


/* ============================================================
   UNIVERSITY KEY
============================================================ */

function universityKey(
    value
) {

    return String(
        value ?? ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /ß/g,
            "ss"
        )
        .replace(
            /&/g,
            "and"
        )
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


/* ============================================================
   QS WORLD UNIVERSITY RANKINGS 2027
   VERIFIED AGAINST CURRENT QS GERMANY GUIDE
============================================================ */

/*
   For ranked bands:

       721-730
       771-780
       etc.

   sortValue is the lower bound.

   For 1401+:

       sortValue = 1401

   The UI still displays the real band.
*/

const QS_2027 = {};


function addQS(
    names,
    display
) {

    const parsed =
        parseRankValue(
            display
        );


    if (!parsed) {

        /*
           Open-ended band such as 1401+
        */

        const plus =
            String(
                display
            )
                .match(
                    /^(\d+)\+$/
                );


        if (
            plus
        ) {

            names.forEach(
                name => {

                    QS_2027[
                        universityKey(
                            name
                        )
                    ] = {

                        display,

                        sortValue:
                            Number(
                                plus[1]
                            )

                    };

                }
            );

        }


        return;

    }


    names.forEach(
        name => {

            QS_2027[
                universityKey(
                    name
                )
            ] = {

                display,

                sortValue:
                    parsed.sortValue

            };

        }
    );

}


/* ------------------------------------------------------------
   1 - 10
------------------------------------------------------------ */

addQS(
    [
        "Technical University of Munich",
        "Technische Universität München",
        "TU München",
        "TUM"
    ],
    "25"
);


addQS(
    [
        "Ludwig-Maximilians-Universität München",
        "Ludwig-Maximilians-Universitaet München",
        "Ludwig-Maximilians-Universitaet Muenchen",
        "LMU München",
        "LMU Munich"
    ],
    "61"
);


addQS(
    [
        "Universität Heidelberg",
        "Universitaet Heidelberg",
        "Heidelberg University"
    ],
    "86"
);


addQS(
    [
        "Freie Universitaet Berlin",
        "Freie Universität Berlin",
        "Free University Berlin"
    ],
    "98"
);


addQS(
    [
        "RWTH Aachen University",
        "Rheinisch-Westfälische Technische Hochschule Aachen",
        "Rheinisch-Westfaelische Technische Hochschule Aachen"
    ],
    "104"
);


addQS(
    [
        "KIT, Karlsruhe Institute of Technology",
        "Karlsruhe Institute of Technology",
        "KIT"
    ],
    "110"
);


addQS(
    [
        "Humboldt-Universität zu Berlin",
        "Humboldt-Universitaet zu Berlin",
        "Humboldt University of Berlin"
    ],
    "140"
);


addQS(
    [
        "Technische Universität Berlin (TU Berlin)",
        "Technische Universität Berlin",
        "Technische Universitaet Berlin",
        "TU Berlin"
    ],
    "158"
);


addQS(
    [
        "Technische Universität Dresden",
        "Technische Universitaet Dresden",
        "TU Dresden"
    ],
    "185"
);


addQS(
    [
        "Rheinische Friedrich-Wilhelms-Universität Bonn",
        "Rheinische Friedrich-Wilhelms-Universitaet Bonn",
        "University of Bonn",
        "Universität Bonn"
    ],
    "209"
);


/* ------------------------------------------------------------
   11 - 20
------------------------------------------------------------ */

addQS(
    [
        "Universität Hamburg",
        "Universitaet Hamburg",
        "University of Hamburg"
    ],
    "209"
);


addQS(
    [
        "Friedrich-Alexander-Universität Erlangen-Nürnberg",
        "Friedrich-Alexander-Universitaet Erlangen-Nuernberg",
        "Friedrich-Alexander-Universität Erlangen-Nürnberg",
        "FAU Erlangen-Nürnberg"
    ],
    "218"
);


addQS(
    [
        "Eberhard Karls Universität Tübingen",
        "Eberhard Karls Universitaet Tuebingen",
        "University of Tübingen",
        "University of Tuebingen"
    ],
    "230"
);


addQS(
    [
        "Albert-Ludwigs-Universitaet Freiburg",
        "Albert-Ludwigs-Universität Freiburg",
        "University of Freiburg"
    ],
    "245"
);


addQS(
    [
        "Technical University of Darmstadt",
        "Technische Universität Darmstadt",
        "Technische Universitaet Darmstadt",
        "TU Darmstadt"
    ],
    "250"
);


addQS(
    [
        "University of Göttingen",
        "University of Gottingen",
        "Universität Göttingen",
        "Universitaet Goettingen"
    ],
    "261"
);


addQS(
    [
        "University of Cologne",
        "Universität zu Köln",
        "Universitaet zu Koeln"
    ],
    "269"
);


addQS(
    [
        "Universität Stuttgart",
        "Universitaet Stuttgart",
        "University of Stuttgart"
    ],
    "318"
);


addQS(
    [
        "University of Münster",
        "University of Munster",
        "Universität Münster",
        "Universitaet Muenster"
    ],
    "370"
);


addQS(
    [
        "Goethe-University Frankfurt am Main",
        "Goethe University Frankfurt",
        "Goethe-Universität Frankfurt am Main",
        "Goethe Universitaet Frankfurt am Main"
    ],
    "376"
);


/* ------------------------------------------------------------
   21 - 30
------------------------------------------------------------ */

addQS(
    [
        "Ruhr-Universität Bochum",
        "Ruhr-Universitaet Bochum",
        "Ruhr University Bochum"
    ],
    "402"
);


addQS(
    [
        "Universität Konstanz",
        "Universitaet Konstanz",
        "University of Konstanz"
    ],
    "425"
);


addQS(
    [
        "Universität Mannheim",
        "Universitaet Mannheim",
        "University of Mannheim"
    ],
    "425"
);


addQS(
    [
        "Julius-Maximilians-Universität Würzburg",
        "Julius-Maximilians-Universitaet Wuerzburg",
        "University of Würzburg",
        "University of Wuerzburg"
    ],
    "430"
);


addQS(
    [
        "Leibniz University Hannover",
        "Leibniz Universität Hannover",
        "Leibniz Universitaet Hannover",
        "University of Hanover"
    ],
    "470"
);


addQS(
    [
        "University of Bayreuth",
        "Universität Bayreuth",
        "Universitaet Bayreuth"
    ],
    "472"
);


addQS(
    [
        "Johannes Gutenberg Universität Mainz",
        "Johannes Gutenberg Universitaet Mainz",
        "Johannes Gutenberg University Mainz",
        "Johannes Gutenberg-Universität Mainz"
    ],
    "500"
);


addQS(
    [
        "Universität Potsdam",
        "Universitaet Potsdam",
        "University of Potsdam"
    ],
    "500"
);


addQS(
    [
        "Justus-Liebig-University Giessen",
        "Justus-Liebig-Universität Giessen",
        "Justus-Liebig-Universitaet Giessen",
        "Justus Liebig University Giessen",
        "Universität Giessen"
    ],
    "521"
);


addQS(
    [
        "Universität Leipzig",
        "Universitaet Leipzig",
        "University of Leipzig"
    ],
    "540"
);


/* ------------------------------------------------------------
   31 - 40
------------------------------------------------------------ */

addQS(
    [
        "Universität Jena",
        "Universitaet Jena",
        "Friedrich-Schiller-Universität Jena",
        "University of Jena"
    ],
    "567"
);


addQS(
    [
        "Ulm University",
        "Universität Ulm",
        "Universitaet Ulm"
    ],
    "575"
);


addQS(
    [
        "Universität Bremen",
        "Universitaet Bremen",
        "University of Bremen"
    ],
    "581"
);


addQS(
    [
        "Saarland University",
        "Universität des Saarlandes",
        "Universitaet des Saarlandes"
    ],
    "588"
);


addQS(
    [
        "Technische Universität Bergakademie Freiberg",
        "Technische Universitaet Bergakademie Freiberg",
        "TU Bergakademie Freiberg"
    ],
    "594"
);


addQS(
    [
        "Christian-Albrechts-University zu Kiel",
        "Christian-Albrechts-Universität zu Kiel",
        "Christian-Albrechts-Universitaet zu Kiel",
        "Kiel University"
    ],
    "620"
);


addQS(
    [
        "Otto-von-Guericke-Universität Magdeburg",
        "Otto-von-Guericke-Universitaet Magdeburg",
        "University of Magdeburg"
    ],
    "646"
);


addQS(
    [
        "TU Dortmund University",
        "Technische Universität Dortmund",
        "Technische Universitaet Dortmund",
        "TU Dortmund"
    ],
    "691"
);


addQS(
    [
        "Universität Regensburg",
        "Universitaet Regensburg",
        "University of Regensburg"
    ],
    "696"
);


addQS(
    [
        "TUHH Hamburg University of Technology",
        "Hamburg University of Technology",
        "Technische Universität Hamburg",
        "Technische Universitaet Hamburg",
        "TU Hamburg"
    ],
    "721-730"
);


/* ------------------------------------------------------------
   41 - 50
------------------------------------------------------------ */

addQS(
    [
        "University of Hohenheim",
        "Universität Hohenheim",
        "Universitaet Hohenheim"
    ],
    "771-780"
);


addQS(
    [
        "Technische Universität Braunschweig",
        "Technische Universitaet Braunschweig",
        "TU Braunschweig"
    ],
    "781-790"
);


addQS(
    [
        "Martin-Luther-Universität Halle-Wittenberg",
        "Martin-Luther-Universitaet Halle-Wittenberg",
        "Martin Luther University Halle-Wittenberg"
    ],
    "801-850"
);


addQS(
    [
        "Universität Duisburg-Essen",
        "Universitaet Duisburg-Essen",
        "University of Duisburg-Essen"
    ],
    "801-850"
);


addQS(
    [
        "Universität Rostock",
        "Universitaet Rostock",
        "University of Rostock"
    ],
    "901-950"
);


addQS(
    [
        "Philipps-Universität Marburg",
        "Philipps-Universitaet Marburg",
        "Philipps University Marburg"
    ],
    "951-1000"
);


addQS(
    [
        "University Duesseldorf",
        "University Düsseldorf",
        "Universität Düsseldorf",
        "Universitaet Duesseldorf",
        "Heinrich-Heine-Universität Düsseldorf",
        "Heinrich-Heine-Universitaet Duesseldorf"
    ],
    "951-1000"
);


addQS(
    [
        "Bergische Universität Wuppertal",
        "Bergische Universitaet Wuppertal",
        "University of Wuppertal"
    ],
    "1001-1200"
);


addQS(
    [
        "Bielefeld University",
        "Universität Bielefeld",
        "Universitaet Bielefeld"
    ],
    "1001-1200"
);


addQS(
    [
        "Carl von Ossietzky Universität Oldenburg",
        "Carl von Ossietzky Universitaet Oldenburg",
        "University of Oldenburg"
    ],
    "1001-1200"
);


/* ------------------------------------------------------------
   51 - 60
------------------------------------------------------------ */

addQS(
    [
        "Ernst-Moritz-Arndt-Universität Greifswald",
        "Ernst-Moritz-Arndt-Universitaet Greifswald",
        "University of Greifswald"
    ],
    "1001-1200"
);


addQS(
    [
        "Technische Universität Chemnitz",
        "Technische Universitaet Chemnitz",
        "TU Chemnitz",
        "Chemnitz University of Technology"
    ],
    "1001-1200"
);


addQS(
    [
        "Otto-Friedrich-Universität Bamberg",
        "Otto-Friedrich-Universitaet Bamberg",
        "University of Bamberg"
    ],
    "1201-1400"
);


addQS(
    [
        "Universität Kassel",
        "Universitaet Kassel",
        "University of Kassel"
    ],
    "1201-1400"
);


addQS(
    [
        "Universität Paderborn",
        "Universitaet Paderborn",
        "University of Paderborn"
    ],
    "1201-1400"
);


addQS(
    [
        "Universität Siegen",
        "Universitaet Siegen",
        "University of Siegen"
    ],
    "1201-1400"
);


addQS(
    [
        "University of Passau",
        "Universität Passau",
        "Universitaet Passau"
    ],
    "1201-1400"
);


addQS(
    [
        "Universität Trier",
        "Universitaet Trier",
        "University of Trier"
    ],
    "1401+"
);


addQS(
    [
        "University of Augsburg",
        "Universität Augsburg",
        "Universitaet Augsburg"
    ],
    "1401+"
);


addQS(
    [
        "University of Kaiserslautern-Landau (RPTU)",
        "RPTU Kaiserslautern-Landau",
        "RPTU",
        "Rheinland-Pfälzische Technische Universität Kaiserslautern-Landau",
        "Rheinland-Pfaelzische Technische Universitaet Kaiserslautern-Landau"
    ],
    "1401+"
);


/* ============================================================
   STATE HELPERS
============================================================ */

function normalizeStateName(
    value
) {

    if (!value) {

        return "";

    }


    const original =
        String(value).trim();


    if (
        STATE_ALIASES[
            original
        ]
    ) {

        return STATE_ALIASES[
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


function comparableState(
    value
) {

    return normalizeStateName(
        value
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
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

    const first =
        comparableState(
            a
        );


    const second =
        comparableState(
            b
        );


    return (
        first !== "" &&
        first === second
    );

}


/* ============================================================
   CSV PARSER
============================================================ */

function parseCSV(
    text
) {

    const rows = [];

    let row = [];

    let cell = "";

    let inQuotes = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];


        const next =
            text[
                i + 1
            ];


        if (
            char === '"' &&
            inQuotes &&
            next === '"'
        ) {

            cell += '"';

            i++;

            continue;

        }


        if (
            char === '"'
        ) {

            inQuotes =
                !inQuotes;

            continue;

        }


        if (
            char === "," &&
            !inQuotes
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
            !inQuotes
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
            value =>
                String(
                    value ?? ""
                ).trim()
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
   DATA LOADING
============================================================ */

async function loadCSV(
    url
) {

    const response =
        await fetch(
            url,
            {
                cache:
                    "no-store"
            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `${url} returned ${response.status}`
        );

    }


    return parseCSV(
        await response.text()
    );

}


async function loadAllData() {

    const results =
        await Promise.all(
            Object.entries(
                DATASETS
            ).map(
                async (
                    [
                        key,
                        url
                    ]
                ) => {

                    try {

                        const rows =
                            await loadCSV(
                                url
                            );


                        return [
                            key,
                            rows
                        ];

                    } catch (
                        error
                    ) {

                        console.warn(
                            `Dataset unavailable: ${url}`,
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
       Exact first.
    */

    for (
        const candidate of
        candidates
    ) {

        const wanted =
            normalizedColumn(
                candidate
            );


        const exact =
            columns.find(
                column =>
                    normalizedColumn(
                        column
                    ) === wanted
            );


        if (exact) {

            return exact;

        }

    }


    /*
       Partial second.
    */

    for (
        const candidate of
        candidates
    ) {

        const wanted =
            normalizedColumn(
                candidate
            );


        const partial =
            columns.find(
                column =>
                    normalizedColumn(
                        column
                    ).includes(
                        wanted
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


    const scored = [];


    columns.forEach(
        column => {

            const normalized =
                normalizedColumn(
                    column
                );


            let candidateIndex =
                -1;


            for (
                let i = 0;
                i < candidates.length;
                i++
            ) {

                const wanted =
                    normalizedColumn(
                        candidates[i]
                    );


                if (
                    normalized ===
                    wanted
                ) {

                    candidateIndex =
                        i;

                    break;

                }


                if (
                    candidateIndex <
                    0 &&
                    (
                        normalized.includes(
                            wanted
                        ) ||
                        wanted.includes(
                            normalized
                        )
                    )
                ) {

                    candidateIndex =
                        i;

                }

            }


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


            scored.push({

                column,

                coverage:
                    populated /
                    rows.length,

                candidateIndex

            });

        }
    );


    if (!scored.length) {

        return null;

    }


    scored.sort(
        (
            a,
            b
        ) => {

            if (
                a.coverage !==
                b.coverage
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


    return scored[0].column;

}


/* ============================================================
   UNIVERSITY DATA HELPERS
============================================================ */

function universityRows() {

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
                "name"
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
       Remove duplicate university rows.
    */

    const seen =
        new Set();


    const result = [];


    valid.forEach(
        row => {

            const key =
                universityKey(
                    row[
                        nameColumn
                    ]
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


function universityNameColumn(
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
            "name"
        ]
    );

}


function universityStateColumn(
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


function universityCityColumn(
    rows
) {

    return findBestPopulatedColumn(
        rows,
        [
            "city",
            "location",
            "university_city",
            "university city"
        ]
    );

}


function universityTypeColumn(
    rows
) {

    return findBestPopulatedColumn(
        rows,
        [
            "university_type",
            "university type",
            "institution_type",
            "institution type",
            "type"
        ]
    );

}


/* ============================================================
   RANKING DETECTION
============================================================ */

function rankingColumns(
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


    const matches = [];


    columns.forEach(
        column => {

            const normalized =
                normalizedColumn(
                    column
                );


            const looksLikeRank =
                normalized.includes(
                    "rank"
                ) ||
                normalized.includes(
                    "ranking"
                ) ||
                normalized.includes(
                    "qsworld"
                ) ||
                normalized.includes(
                    "qs"
                );


            if (
                !looksLikeRank
            ) {

                return;

            }


            const valid =
                rows.filter(
                    row =>
                        parseRankValue(
                            row[column]
                        )
                        !== null
                ).length;


            if (
                valid > 0
            ) {

                matches.push({

                    column,

                    valid

                });

            }

        }
    );


    return matches.sort(
        (
            a,
            b
        ) =>
            b.valid -
            a.valid
    );

}


function rankingInfo(
    row
) {

    /*
       First: real numeric ranking field,
       if it exists in the dataset.
    */

    const rows =
        [
            row
        ];


    const directCandidates = [

        "qs_world_rank_2027",

        "qs world rank 2027",

        "qs_world_university_ranking_2027",

        "qs world university ranking 2027",

        "qs_rank_2027",

        "qs rank 2027",

        "qs_rank",

        "qs rank",

        "world_rank_2027",

        "world rank 2027"

    ];


    const directColumn =
        findColumn(
            rows,
            directCandidates
        );


    if (
        directColumn
    ) {

        const parsed =
            parseRankValue(
                row[
                    directColumn
                ]
            );


        if (
            parsed
        ) {

            return {

                display:
                    parsed.display,

                sortValue:
                    parsed.sortValue,

                source:
                    directColumn

            };

        }

    }


    /*
       Second: any usable rank-like numeric column.
    */

    const detected =
        rankingColumns(
            rows
        );


    for (
        const detectedColumn
        of detected
    ) {

        const parsed =
            parseRankValue(
                row[
                    detectedColumn.column
                ]
            );


        if (
            parsed
        ) {

            return {

                display:
                    parsed.display,

                sortValue:
                    parsed.sortValue,

                source:
                    detectedColumn.column

            };

        }

    }


    /*
       Third: verified QS 2027 mapping
       for this 60-university project.
    */

    const nameColumn =
        universityNameColumn(
            [row]
        );


    const name =
        nameColumn
            ? row[
                nameColumn
            ]
            : "";


    const mapped =
        QS_2027[
            universityKey(
                name
            )
        ];


    if (
        mapped
    ) {

        return {

            display:
                mapped.display,

            sortValue:
                mapped.sortValue,

            source:
                "QS World University Rankings 2027"

        };

    }


    return null;

}


/* ============================================================
   SCHOLARSHIP DATA
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
                    ).trim()
            )
            .filter(Boolean)
    ).size;

}


function scholarshipStateRow(
    state
) {

    const rows =
        DATA.scholarshipStateSummary ||
        [];


    if (!rows.length) {

        return null;

    }


    const stateColumn =
        findBestPopulatedColumn(
            rows,
            [
                "state",
                "federal_state",
                "federal state",
                "bundesland"
            ]
        );


    if (!stateColumn) {

        return null;

    }


    return rows.find(
        row =>
            statesEqual(
                row[
                    stateColumn
                ],
                state
            )
    ) || null;

}


function stateScholarshipCount(
    state
) {

    const row =
        scholarshipStateRow(
            state
        );


    if (!row) {

        return 0;

    }


    const column =
        findColumn(
            [row],
            [
                "university_linked_scholarship_records",
                "scholarship_count",
                "scholarships"
            ]
        );


    return column
        ? (
            numericValue(
                row[column]
            ) || 0
        )
        : 0;

}


function stateScholarshipUniversityCount(
    state
) {

    const row =
        scholarshipStateRow(
            state
        );


    if (!row) {

        return 0;

    }


    const column =
        findColumn(
            [row],
            [
                "universities_with_linked_scholarships",
                "universities with linked scholarships"
            ]
        );


    return column
        ? (
            numericValue(
                row[column]
            ) || 0
        )
        : 0;

}


function stateScholarshipNote(
    state
) {

    const row =
        scholarshipStateRow(
            state
        );


    const fallback =
        "University-linked scholarship records in the current scholarship summary; not a count of all scholarships available in the state.";


    if (!row) {

        return fallback;

    }


    const noteColumn =
        findColumn(
            [row],
            [
                "scholarship_interpretation",
                "scholarship metric note",
                "interpretation",
                "note"
            ]
        );


    if (!noteColumn) {

        return fallback;

    }


    return (
        String(
            row[
                noteColumn
            ] ??
            ""
        ).trim()
        ||
        fallback
    );

}


/* ============================================================
   STATE METRICS
============================================================ */

function createStateMetric(
    state
) {

    return {

        state,

        universities:
            0,

        courses:
            0,

        scholarships:
            0,

        scholarshipUniversities:
            0,

        companies:
            0,

        concentration:
            "Moderate",

        topFields:
            [],

        topIndustries:
            [],

        topRankedUniversity:
            null

    };

}


function rowsForState(
    rows,
    state
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


    if (!column) {

        return [];

    }


    return rows.filter(
        row =>
            statesEqual(
                row[
                    column
                ],
                state
            )
    );

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


    const counts = {};


    rows.forEach(
        row => {

            const value =
                String(
                    row[
                        column
                    ] ??
                    ""
                ).trim();


            if (!value) {

                return;

            }


            counts[value] =
                (
                    counts[value] ||
                    0
                ) + 1;

        }
    );


    return Object.entries(
        counts
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


function buildStateMetrics() {

    stateMetrics = {};


    GERMAN_STATES.forEach(
        state => {

            stateMetrics[
                state
            ] =
                createStateMetric(
                    state
                );

        }
    );


    const dashboardRows =
        DATA.stateDashboardCorrected?.length
            ? DATA.stateDashboardCorrected
            : (
                DATA.stateDashboard?.length
                    ? DATA.stateDashboard
                    : DATA.stateSummary
            );


    GERMAN_STATES.forEach(
        state => {

            const metric =
                stateMetrics[state];


            const summaryRows =
                rowsForState(
                    dashboardRows,
                    state
                );


            if (
                summaryRows.length
            ) {

                const row =
                    summaryRows[0];


                const universityColumn =
                    findColumn(
                        [row],
                        [
                            "university_count",
                            "university count",
                            "universities"
                        ]
                    );


                const courseColumn =
                    findColumn(
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
                    findColumn(
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
                        numericValue(
                            row[
                                universityColumn
                            ]
                        ) || 0;

                }


                if (
                    courseColumn
                ) {

                    metric.courses =
                        numericValue(
                            row[
                                courseColumn
                            ]
                        ) || 0;

                }


                if (
                    companyColumn
                ) {

                    metric.companies =
                        numericValue(
                            row[
                                companyColumn
                            ]
                        ) || 0;

                }

            }


            /*
               University fallback from the actual 60 list.
            */

            if (
                metric.universities ===
                0
            ) {

                metric.universities =
                    rowsForState(
                        universityRows(),
                        state
                    ).length;

            }


            if (
                metric.courses ===
                0
            ) {

                metric.courses =
                    rowsForState(
                        DATA.courses || [],
                        state
                    ).length;

            }


            if (
                metric.companies ===
                0
            ) {

                const companyRows =
                    rowsForState(
                        DATA.companies || [],
                        state
                    );


                metric.companies =
                    companyRows.length;

            }


            /*
               CORRECT scholarship metric.
            */

            metric.scholarships =
                stateScholarshipCount(
                    state
                );


            metric.scholarshipUniversities =
                stateScholarshipUniversityCount(
                    state
                );


            metric.scholarshipNote =
                stateScholarshipNote(
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


    /*
       University concentration.
    */

    const values =
        GERMAN_STATES
            .map(
                state =>
                    stateMetrics[
                        state
                    ].universities
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

        if (!array.length) {

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


    GERMAN_STATES.forEach(
        state => {

            const metric =
                stateMetrics[state];


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


    /*
       Highest-ranked university by QS mapping.
    */

    const rows =
        universityRows();


    const nameColumn =
        universityNameColumn(
            rows
        );


    const stateColumn =
        universityStateColumn(
            rows
        );


    if (
        nameColumn &&
        stateColumn
    ) {

        GERMAN_STATES.forEach(
            state => {

                const candidates =
                    rowsForState(
                        rows,
                        state
                    )
                        .map(
                            row => {

                                const rank =
                                    rankingInfo(
                                        row
                                    );


                                if (
                                    !rank
                                ) {

                                    return null;

                                }


                                return {

                                    name:
                                        row[
                                            nameColumn
                                        ],

                                    rank:
                                        rank.sortValue,

                                    display:
                                        rank.display

                                };

                            }
                        )
                        .filter(Boolean)
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                a.rank -
                                b.rank
                        );


                if (
                    candidates.length
                ) {

                    stateMetrics[state]
                        .topRankedUniversity =
                        candidates[0];

                }

            }
        );

    }

}


/* ============================================================
   KPI
============================================================ */

function renderKPIs() {

    const universities =
        universityRows();


    const universityElement =
        byId(
            "universityCount"
        );


    if (
        universityElement
    ) {

        universityElement.textContent =
            formatNumber(
                universities.length
            );

    }


    const courseElement =
        byId(
            "courseCount"
        );


    if (
        courseElement
    ) {

        courseElement.textContent =
            formatNumber(
                (
                    DATA.courses ||
                    []
                ).length
            );

    }


    const scholarshipElement =
        byId(
            "scholarshipCount"
        );


    if (
        scholarshipElement
    ) {

        scholarshipElement.textContent =
            formatNumber(
                distinctScholarshipCount()
            );

    }


    const companyElement =
        byId(
            "companyCount"
        );


    if (
        companyElement
    ) {

        companyElement.textContent =
            formatNumber(
                (
                    DATA.companies ||
                    []
                ).length
            );

    }


    const scholarshipCard =
        scholarshipElement?.closest(
            ".kpi-card"
        );


    const scholarshipLabel =
        scholarshipCard?.querySelector(
            ".kpi-label"
        );


    const scholarshipNote =
        scholarshipCard?.querySelector(
            ".kpi-note"
        );


    if (
        scholarshipLabel
    ) {

        scholarshipLabel.textContent =
            "Scholarships";

    }


    if (
        scholarshipNote
    ) {

        scholarshipNote.textContent =
            "Distinct scholarship IDs";

    }


    fixKPIIcons();

}


/* ============================================================
   EMOJI / MOJIBAKE REPAIR
============================================================ */

function emoji(
    codePoint
) {

    return String.fromCodePoint(
        codePoint
    );

}


function repairKnownMojibakeText(
    text
) {

    return String(
        text
    )
        .replaceAll(
            "â€¢",
            "\u2022"
        )
        .replaceAll(
            "â€“",
            "\u2013"
        )
        .replaceAll(
            "â€”",
            "\u2014"
        )
        .replaceAll(
            "â€™",
            "\u2019"
        )
        .replaceAll(
            "â€œ",
            "\u201c"
        )
        .replaceAll(
            "â€",
            "\u201d"
        )
        .replaceAll(
            "ðŸŽ“",
            emoji(
                0x1F393
            )
        )
        .replaceAll(
            "ðŸ“š",
            emoji(
                0x1F4DA
            )
        )
        .replaceAll(
            "ðŸ’°",
            emoji(
                0x1F4B0
            )
        )
        .replaceAll(
            "ðŸ¢",
            emoji(
                0x1F3E2
            )
        )
        .replaceAll(
            "ðŸŒ",
            emoji(
                0x1F310
            )
        )
        .replaceAll(
            "ðŸ—ºï¸",
            emoji(
                0x1F5FA
            )
        );

}


function repairDOMText() {

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

            textNode.nodeValue =
                repairKnownMojibakeText(
                    textNode.nodeValue
                );

        }
    );


    /*
       Fix the header subtitle explicitly.
    */

    const bodyElements =
        document.querySelectorAll(
            "header *, body *"
        );


    bodyElements.forEach(
        element => {

            if (
                element.children.length
            ) {

                return;

            }


            const text =
                String(
                    element.textContent ||
                    ""
                ).trim();


            if (
                text.length < 120 &&
                text.includes(
                    "Study"
                ) &&
                text.includes(
                    "Scholarships"
                ) &&
                text.includes(
                    "Universities"
                ) &&
                text.includes(
                    "Careers"
                )
            ) {

                element.textContent =
                    [
                        "Study",
                        "Scholarships",
                        "Universities",
                        "Careers"
                    ].join(
                        " \u2022 "
                    );

            }

        }
    );

}


function fixKPIIcons() {

    const icons =
        [
            ...document.querySelectorAll(
                ".kpi-card .kpi-icon"
            ),

            ...document.querySelectorAll(
                ".kpi-icon"
            )
        ];


    /*
       De-duplicate.
    */

    const unique =
        [
            ...new Set(
                icons
            )
        ];


    const iconValues = [

        emoji(
            0x1F393
        ),

        emoji(
            0x1F4DA
        ),

        emoji(
            0x1F4B0
        ),

        emoji(
            0x1F3E2
        )

    ];


    unique
        .slice(
            0,
            4
        )
        .forEach(
            (
                element,
                index
            ) => {

                element.textContent =
                    iconValues[index];

            }
        );

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

            <div
                class="map-detail-empty"
            >

                <div
                    class="map-detail-icon"
                >

                    ${emoji(
                        0x1F1E9
                    )}${emoji(
                        0x1F1EA
                    )}

                </div>


                <h4>
                    Germany overview
                </h4>


                <p>

                    Click a federal state to inspect
                    universities, study programs,
                    scholarships and career data.

                </p>

            </div>

        `;


        return;

    }


    const metric =
        stateMetrics[
            state
        ];


    if (!metric) {

        panel.innerHTML = `

            <div class="empty-state">

                No state analytics available.

            </div>

        `;


        return;

    }


    const fieldTags =
        metric.topFields.length

            ? metric.topFields
                .map(
                    item => `

                        <span
                            class="data-tag"
                        >

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

            : `

                <small>
                    No state-level field data available.
                </small>

              `;


    const industryTags =
        metric.topIndustries.length

            ? metric.topIndustries
                .map(
                    item => `

                        <span
                            class="data-tag"
                        >

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

            : `

                <small>
                    No state-level industry data available.
                </small>

              `;


    const ranked =
        metric.topRankedUniversity;


    const rankingBlock =
        ranked

            ? `

                <div
                    class="map-detail-block"
                >

                    <span
                        class="detail-label"
                    >

                        Highest-ranked university
                        in this dataset

                    </span>


                    <strong>

                        ${escapeHtml(
                            ranked.name
                        )}

                    </strong>


                    <small>

                        QS World University Rankings 2027:
                        ${escapeHtml(
                            ranked.display
                        )}

                    </small>

                </div>

              `

            : `

                <div
                    class="map-detail-block"
                >

                    <span
                        class="detail-label"
                    >
                        University ranking
                    </span>


                    <strong>
                        Ranking unavailable
                    </strong>


                    <small>
                        No verified ranking was matched.
                    </small>

                </div>

              `;


    panel.innerHTML = `

        <div
            class="selected-state-name"
        >

            <span
                class="state-badge"
            >
                Selected state
            </span>


            <h4>

                ${escapeHtml(
                    state
                )}

            </h4>

        </div>


        <div
            class="detail-metrics"
        >

            <div
                class="detail-metric"
            >

                <span>
                    Universities
                </span>


                <strong>

                    ${formatNumber(
                        metric.universities
                    )}

                </strong>

            </div>


            <div
                class="detail-metric"
            >

                <span>
                    Study programs
                </span>


                <strong>

                    ${formatNumber(
                        metric.courses
                    )}

                </strong>

            </div>


            <div
                class="detail-metric"
            >

                <span>
                    Uni-linked scholarships
                </span>


                <strong>

                    ${formatNumber(
                        metric.scholarships
                    )}

                </strong>

            </div>


            <div
                class="detail-metric"
            >

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


        <div
            class="map-detail-block"
        >

            <span
                class="detail-label"
            >
                Scholarship interpretation
            </span>


            ${
                metric.scholarshipUniversities
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

                            linked to these records.

                        </small>

                      `
                    : `
                        <small>
                            No university-linked scholarship records
                            are mapped to this state in the current
                            summary.
                        </small>
                      `
            }


            <small>

                ${escapeHtml(
                    metric.scholarshipNote
                )}

            </small>

        </div>


        <div
            class="map-detail-block"
        >

            <span
                class="detail-label"
            >
                University concentration
            </span>


            <strong>

                ${escapeHtml(
                    metric.concentration
                )}

            </strong>


            <small>

                Relative to the other German
                states represented in this dataset.

            </small>

        </div>


        <div
            class="map-detail-columns"
        >

            <div
                class="map-detail-block"
            >

                <span
                    class="detail-label"
                >
                    Leading study fields
                </span>


                <div
                    class="tag-list"
                >

                    ${fieldTags}

                </div>

            </div>


            <div
                class="map-detail-block"
            >

                <span
                    class="detail-label"
                >
                    Leading industries
                </span>


                <div
                    class="tag-list"
                >

                    ${industryTags}

                </div>

            </div>

        </div>


        ${rankingBlock}

    `;

}


/* ============================================================
   STATE OVERVIEW
============================================================ */

function renderStateOverview(
    state = ""
) {

    const container =
        byId(
            "stateOverview"
        );


    if (!container) {

        return;

    }


    if (!state) {

        const metrics =
            GERMAN_STATES.map(
                name =>
                    stateMetrics[
                        name
                    ]
            );


        const universities =
            metrics.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.universities,
                0
            );


        const courses =
            metrics.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.courses,
                0
            );


        const companies =
            metrics.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.companies,
                0
            );


        container.innerHTML = `

            <div class="state-stat">

                <span>
                    German states
                </span>

                <strong>
                    ${GERMAN_STATES.length}
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
            state
        ];


    if (!metric) {

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
   STATE TOTAL LIST
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
        GERMAN_STATES
            .map(
                state =>
                    stateMetrics[
                        state
                    ]
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
                row =>
                    row.universities
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
            ].map(
                option =>
                    comparableState(
                        option.value
                    )
            )
        );


    GERMAN_STATES.forEach(
        state => {

            if (
                existing.has(
                    comparableState(
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

            selectState(
                select.value
            );

        }
    );


    select.dataset.ready =
        "true";

}


/* ============================================================
   SELECT STATE
============================================================ */

function selectState(
    state
) {

    if (
        !state
    ) {

        selectedMapState =
            "";


        if (
            selectedMapLayer
        ) {

            selectedMapLayer.setStyle(
                mapDefaultStyle()
            );

            selectedMapLayer =
                null;

        }


        renderStateOverview(
            ""
        );


        renderMapDetail(
            ""
        );


        const universityFilter =
            byId(
                "universityStateFilter"
            );


        if (
            universityFilter
        ) {

            universityFilter.value =
                "";

        }


        renderUniversityDirectory();

        return;

    }


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


    if (select) {

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


    if (
        selectedMapLayer
    ) {

        selectedMapLayer.setStyle(
            mapDefaultStyle()
        );

    }


    selectedMapLayer =
        stateLayers[
            normalized
        ] ||
        null;


    if (
        selectedMapLayer
    ) {

        selectedMapLayer.setStyle(
            mapSelectedStyle()
        );


        selectedMapLayer.bringToFront();

    }


    renderStateOverview(
        normalized
    );


    renderMapDetail(
        normalized
    );


    const universityFilter =
        byId(
            "universityStateFilter"
        );


    if (
        universityFilter
    ) {

        universityFilter.value =
            normalized;

    }


    renderUniversityDirectory();

}


/* ============================================================
   MAP
============================================================ */

function mapDefaultStyle() {

    return {

        color:
            "#ffffff",

        weight:
            2,

        opacity:
            1,

        fillColor:
            "#3b82f6",

        fillOpacity:
            0.78

    };

}


function mapHoverStyle() {

    return {

        color:
            "#172033",

        weight:
            3,

        opacity:
            1,

        fillColor:
            "#1d4ed8",

        fillOpacity:
            0.95

    };

}


function mapSelectedStyle() {

    return {

        color:
            "#0f172a",

        weight:
            4,

        opacity:
            1,

        fillColor:
            "#111827",

        fillOpacity:
            0.95

    };

}


function geoStateName(
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

        properties.GEN,

        properties.state,

        properties.bundesland,

        feature?.id

    ];


    for (
        const candidate of
        candidates
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


        const comparable =
            comparableState(
                candidate
            );


        const matching =
            GERMAN_STATES.find(
                state =>
                    comparableState(
                        state
                    ) === comparable
            );


        if (
            matching
        ) {

            return matching;

        }

    }


    return "";

}


async function fetchGeoJSON() {

    try {

        const local =
            await fetch(
                LOCAL_GEOJSON,
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

    } catch (
        error
    ) {

        console.warn(
            "Local GeoJSON unavailable.",
            error
        );

    }


    const remote =
        await fetch(
            REMOTE_GEOJSON,
            {
                cache:
                    "no-store"
            }
        );


    if (
        !remote.ok
    ) {

        throw new Error(
            "Germany GeoJSON unavailable."
        );

    }


    return await remote.json();

}


async function initializeGermanyMap() {

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

            <div
                class="map-loading error-map"
            >

                Leaflet could not be loaded.

            </div>

        `;


        return;

    }


    try {

        germanyMap =
            L.map(
                mapElement,
                {

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

                    zoomControl:
                        true,

                    attributionControl:
                        true,

                    tap:
                        false

                }
            );


        germanyMap.setView(
            [
                51.1,
                10.45
            ],
            6.15
        );


        const geojson =
            await fetchGeoJSON();


        geoJsonLayer =
            L.geoJSON(
                geojson,
                {

                    style:
                        mapDefaultStyle,


                    onEachFeature:
                        (
                            feature,
                            layer
                        ) => {

                            const state =
                                geoStateName(
                                    feature
                                );


                            if (!state) {

                                return;

                            }


                            stateLayers[
                                state
                            ] =
                                layer;


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

                                    interactive:
                                        false

                                }
                            );


                            layer.on(
                                "mouseover",
                                () => {

                                    if (
                                        layer !==
                                        selectedMapLayer
                                    ) {

                                        layer.setStyle(
                                            mapHoverStyle()
                                        );

                                    }

                                }
                            );


                            layer.on(
                                "mouseout",
                                () => {

                                    if (
                                        layer !==
                                        selectedMapLayer
                                    ) {

                                        layer.setStyle(
                                            mapDefaultStyle()
                                        );

                                    }

                                }
                            );


                            layer.on(
                                "click",
                                event => {

                                    L.DomEvent
                                        .stopPropagation(
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


        const status =
            byId(
                "mapStatus"
            );


        if (
            status
        ) {

            status.textContent =
                "Ready • click a state";

            status.classList.add(
                "is-ready"
            );

        }


        mapElement
            .querySelector(
                ".map-loading"
            )
            ?.remove();


    } catch (
        error
    ) {

        console.error(
            "Germany map initialization failed:",
            error
        );


        const status =
            byId(
                "mapStatus"
            );


        if (
            status
        ) {

            status.textContent =
                "Map boundary data unavailable";

        }


        mapElement.innerHTML = `

            <div
                class="map-loading error-map"
            >

                <strong>
                    Germany map unavailable
                </strong>

                <br><br>

                The analytics dashboard
                remains available.

            </div>

        `;

    }

}


/* ============================================================
   REGIONAL SIGNALS
============================================================ */

function renderRegionalSignals() {

    const states =
        GERMAN_STATES.map(
            state =>
                stateMetrics[
                    state
                ]
        );


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


    const courseLeader =
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
        document.querySelectorAll(
            ".signal-card"
        );


    if (
        cards[0]
    ) {

        const strong =
            cards[0].querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                highest?.state ||
                "—";

        }

    }


    if (
        cards[1]
    ) {

        const strong =
            cards[1].querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                lowest?.state ||
                "—";

        }

    }


    if (
        cards[2]
    ) {

        const strong =
            cards[2].querySelector(
                "strong"
            );


        if (strong) {

            strong.textContent =
                courseLeader?.state ||
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
        DATA.fieldSummary ||
        [];


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


    const countColumn =
        findColumn(
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
        !countColumn
    ) {

        container.innerHTML = `

            <div class="empty-state">

                Field analytics unavailable.

            </div>

        `;


        return;

    }


    const ranked =
        [
            ...rows
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    (
                        numericValue(
                            b[
                                countColumn
                            ]
                        ) || 0
                    ) -
                    (
                        numericValue(
                            a[
                                countColumn
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
            ...ranked.map(
                row =>
                    numericValue(
                        row[
                            countColumn
                        ]
                    ) || 0
            ),
            1
        );


    container.innerHTML =
        ranked.map(
            row => {

                const value =
                    numericValue(
                        row[
                            countColumn
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
        ).join("");

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


    const countColumn =
        findColumn(
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
        !countColumn
    ) {

        container.innerHTML = `

            <div class="empty-state">

                Industry analytics unavailable.

            </div>

        `;


        return;

    }


    const ranked =
        [
            ...rows
        ]
            .sort(
                (
                    a,
                    b
                ) =>
                    (
                        numericValue(
                            b[
                                countColumn
                            ]
                        ) || 0
                    ) -
                    (
                        numericValue(
                            a[
                                countColumn
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
            ...ranked.map(
                row =>
                    numericValue(
                        row[
                            countColumn
                        ]
                    ) || 0
            ),
            1
        );


    container.innerHTML =
        ranked.map(
            row => {

                const value =
                    numericValue(
                        row[
                            countColumn
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
        ).join("");

}


/* ============================================================
   GENERIC TABLE
============================================================ */

function genericTable(
    rows,
    columns,
    maxRows
) {

    if (
        !rows ||
        !rows.length
    ) {

        return `

            <div class="empty-state">
                No data available.
            </div>

        `;

    }


    return `

        <div class="generic-table-scroll">

            <table>

                <thead>

                    <tr>

                        ${
                            columns
                                .map(
                                    column =>
                                        `

                                            <th>

                                                ${escapeHtml(
                                                    column.label
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
                                row =>
                                    `

                                        <tr>

                                            ${
                                                columns
                                                    .map(
                                                        column =>
                                                            `

                                                                <td>

                                                                    ${escapeHtml(
                                                                        row[
                                                                            column.key
                                                                        ]
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
   INDUSTRY TABLE
============================================================ */

function renderIndustryTable() {

    const container =
        byId(
            "industryTable"
        );


    if (!container) {

        return;

    }


    const rows =
        DATA.stateIndustrySummary ||
        [];


    if (!rows.length) {

        container.innerHTML = `

            <div class="empty-state">
                No state-industry data available.
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
                6
            )
            .map(
                key => ({

                    key,

                    label:
                        key

                })
            );


    container.innerHTML =
        genericTable(
            rows,
            columns,
            30
        );

}


/* ============================================================
   SCHOLARSHIP TABLE
============================================================ */

function renderScholarshipTable() {

    const container =
        byId(
            "scholarshipTable"
        );


    if (!container) {

        return;

    }


    const rows =
        DATA.scholarships ||
        [];


    if (!rows.length) {

        container.innerHTML = `

            <div class="empty-state">

                Scholarship records unavailable.

            </div>

        `;


        return;

    }


    const nameColumn =
        findBestPopulatedColumn(
            rows,
            [
                "scholarship_name",
                "scholarship name",
                "name"
            ]
        );


    const idColumn =
        findBestPopulatedColumn(
            rows,
            [
                "scholarship_id",
                "scholarship id",
                "id"
            ]
        );


    const providerColumn =
        findBestPopulatedColumn(
            rows,
            [
                "provider",
                "provider_name",
                "provider name"
            ]
        );


    const minColumn =
        findBestPopulatedColumn(
            rows,
            [
                "amount_min_eur",
                "amount min eur",
                "minimum amount"
            ]
        );


    const maxColumn =
        findBestPopulatedColumn(
            rows,
            [
                "amount_max_eur",
                "amount max eur",
                "maximum amount"
            ]
        );


    const durationColumn =
        findBestPopulatedColumn(
            rows,
            [
                "duration"
            ]
        );


    const eligibilityColumn =
        findBestPopulatedColumn(
            rows,
            [
                "eligibility"
            ]
        );


    const deadlineColumn =
        findBestPopulatedColumn(
            rows,
            [
                "deadline",
                "application_deadline",
                "application deadline"
            ]
        );


    const studyLevelColumn =
        findBestPopulatedColumn(
            rows,
            [
                "study_level",
                "study level",
                "degree_level",
                "degree level"
            ]
        );


    const fieldColumn =
        findBestPopulatedColumn(
            rows,
            [
                "field",
                "study_field",
                "study field",
                "subject"
            ]
        );


    const universityColumn =
        findBestPopulatedColumn(
            rows,
            [
                "university_name",
                "university name",
                "university",
                "institution"
            ]
        );


    /*
       Build a scholarship-specific view instead of
       accidentally showing university_scholarship_summary.
    */

    const visibleRows =
        rows.map(
            row => ({

                scholarship:
                    nameColumn
                        ? row[
                            nameColumn
                        ]
                        : "",

                id:
                    idColumn
                        ? row[
                            idColumn
                        ]
                        : "",

                provider:
                    providerColumn
                        ? row[
                            providerColumn
                        ]
                        : "",

                amount:
                    (
                        minColumn &&
                        maxColumn &&
                        (
                            row[minColumn] ||
                            row[maxColumn]
                        )
                    )
                        ? `${row[minColumn] || "—"} – ${row[maxColumn] || "—"} EUR`
                        : (
                            minColumn
                                ? `${row[minColumn]} EUR`
                                : (
                                    maxColumn
                                        ? `${row[maxColumn]} EUR`
                                        : "—"
                                )
                        ),

                duration:
                    durationColumn
                        ? row[
                            durationColumn
                        ]
                        : "",

                eligibility:
                    eligibilityColumn
                        ? row[
                            eligibilityColumn
                        ]
                        : "",

                deadline:
                    deadlineColumn
                        ? row[
                            deadlineColumn
                        ]
                        : "",

                studyLevel:
                    studyLevelColumn
                        ? row[
                            studyLevelColumn
                        ]
                        : "",

                field:
                    fieldColumn
                        ? row[
                            fieldColumn
                        ]
                        : "",

                university:
                    universityColumn
                        ? row[
                            universityColumn
                        ]
                        : ""

            })
        );


    const columns = [

        {
            key:
                "scholarship",

            label:
                "Scholarship"
        },

        {
            key:
                "id",

            label:
                "ID"
        },

        {
            key:
                "provider",

            label:
                "Provider"
        },

        {
            key:
                "amount",

            label:
                "Amount"
        },

        {
            key:
                "duration",

            label:
                "Duration"
        },

        {
            key:
                "eligibility",

            label:
                "Eligibility"
        },

        {
            key:
                "deadline",

            label:
                "Deadline"
        },

        {
            key:
                "studyLevel",

            label:
                "Study level"
        },

        {
            key:
                "field",

            label:
                "Field"
        },

        {
            key:
                "university",

            label:
                "University"
        }

    ];


    container.innerHTML = `

        <div
            class="scholarship-data-note"
        >

            Showing scholarship records from
            <strong>
                scholarships_analytics.csv
            </strong>.

            The national KPI counts distinct
            scholarship IDs. State-level scholarship
            metrics are shown separately as
            university-linked records.

        </div>


        ${
            genericTable(
                visibleRows,
                columns,
                40
            )
        }

    `;

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


    const qualityRows =
        DATA.scholarshipQuality ||
        [];


    const sourceRows =
        qualityRows.find(
            row =>
                String(
                    row.metric ??
                    ""
                ).trim() ===
                "scholarship_source_rows"
        );


    const distinctRows =
        qualityRows.find(
            row =>
                String(
                    row.metric ??
                    ""
                ).trim() ===
                "distinct_scholarship_ids"
        );


    const linkedRows =
        qualityRows.find(
            row =>
                String(
                    row.metric ??
                    ""
                ).trim() ===
                "rows_with_university_link"
        );


    const explicitStateRows =
        qualityRows.find(
            row =>
                String(
                    row.metric ??
                    ""
                ).trim() ===
                "rows_with_explicit_state"
        );


    container.innerHTML = `

        <div
            class="quality-card"
        >

            <span>
                Scholarship source rows
            </span>

            <strong>

                ${formatNumber(
                    sourceRows?.value ||
                    DATA.scholarships.length
                )}

            </strong>

        </div>


        <div
            class="quality-card"
        >

            <span>
                Distinct scholarship IDs
            </span>

            <strong>

                ${formatNumber(
                    distinctRows?.value ||
                    distinctScholarshipCount()
                )}

            </strong>

        </div>


        <div
            class="quality-card"
        >

            <span>
                University-linked rows
            </span>

            <strong>

                ${formatNumber(
                    linkedRows?.value ||
                    0
                )}

            </strong>

        </div>


        <div
            class="quality-card"
        >

            <span>
                Explicit scholarship states
            </span>

            <strong>

                ${formatNumber(
                    explicitStateRows?.value ||
                    0
                )}

            </strong>

        </div>

    `;

}


/* ============================================================
   UNIVERSITY DIRECTORY STYLES
============================================================ */

function injectUniversityStyles() {

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
                    calc(100% - 24px)
                );

            margin:
                28px auto;

            padding:
                24px;

            box-sizing:
                border-box;

            border:
                1px solid #e5e7eb;

            border-radius:
                20px;

            background:
                #ffffff;

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
                minmax(190px, 1fr)
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

            -webkit-overflow-scrolling:
                touch;

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
                1050px;

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
                270px;

            color:
                #0f172a;

            font-weight:
                800;

            line-height:
                1.45;

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
        .university-rankings {

            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                6px;

            min-width:
                240px;

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
                40px 20px;

            text-align:
                center;

            color:
                #64748b;

        }


        /* ----------------------------------------------------
           MOBILE
        ---------------------------------------------------- */

        #universityDirectory
        .university-mobile-list {

            display:
                none;

        }


        #universityDirectory
        .university-mobile-card {

            padding:
                15px;

            border:
                1px solid #e5e7eb;

            border-radius:
                14px;

            background:
                #ffffff;

            margin-bottom:
                10px;

        }


        #universityDirectory
        .mobile-university-name {

            color:
                #0f172a;

            font-weight:
                800;

            font-size:
                15px;

            line-height:
                1.4;

            margin-bottom:
                8px;

        }


        #universityDirectory
        .mobile-university-meta {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                7px;

            margin-bottom:
                10px;

        }


        #universityDirectory
        .mobile-meta-item {

            padding:
                8px;

            border-radius:
                9px;

            background:
                #f8fafc;

        }


        #universityDirectory
        .mobile-meta-label {

            display:
                block;

            color:
                #64748b;

            font-size:
                10px;

            font-weight:
                700;

            margin-bottom:
                2px;

        }


        #universityDirectory
        .mobile-meta-value {

            display:
                block;

            color:
                #0f172a;

            font-size:
                12px;

            font-weight:
                800;

        }


        #universityDirectory
        .mobile-ranking {

            display:
                inline-flex;

            padding:
                6px 9px;

            border-radius:
                8px;

            background:
                #eff6ff;

            color:
                #1d4ed8;

            font-size:
                11px;

            font-weight:
                800;

            margin-bottom:
                9px;

        }


        /* ----------------------------------------------------
           SCHOLARSHIP TABLE
        ---------------------------------------------------- */

        .scholarship-data-note {

            margin-bottom:
                14px;

            padding:
                11px 13px;

            border-radius:
                10px;

            background:
                #f8fafc;

            color:
                #64748b;

            font-size:
                12px;

            line-height:
                1.5;

        }


        .generic-table-scroll {

            width:
                100%;

            overflow-x:
                auto;

            -webkit-overflow-scrolling:
                touch;

        }


        .generic-table-scroll table {

            width:
                100%;

            min-width:
                950px;

            border-collapse:
                collapse;

        }


        .generic-table-scroll th {

            padding:
                11px 12px;

            text-align:
                left;

            background:
                #f8fafc;

            border-bottom:
                1px solid #e5e7eb;

            font-size:
                11px;

            color:
                #475569;

        }


        .generic-table-scroll td {

            padding:
                11px 12px;

            vertical-align:
                top;

            border-bottom:
                1px solid #eef2f7;

            font-size:
                12px;

            line-height:
                1.45;

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
            max-width: 700px
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
            .university-table-wrap {

                display:
                    none;

            }


            #universityDirectory
            .university-mobile-list {

                display:
                    block;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* ============================================================
   UNIVERSITY DETAILS HTML
============================================================ */

function universityDetailsHTML(
    row
) {

    const entries =
        Object.entries(
            row
        )
            .filter(
                (
                    [
                        ,
                        value
                    ]
                ) =>
                    String(
                        value ?? ""
                    ).trim() !== ""
            );


    if (!entries.length) {

        return `

            <div
                class="university-details"
            >

                No additional data.

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
   UNIVERSITY DIRECTORY HTML
============================================================ */

function ensureUniversityDirectory() {

    injectUniversityStyles();


    let section =
        byId(
            "universityDirectory"
        );


    if (
        !section
    ) {

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

                        All universities in the current
                        60-university dataset, with QS 2027
                        ranking information and detailed records.

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

                    QS 2027 rank bands are sorted
                    by their lower bound.

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
                                QS 2027
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

                    </tbody>

                </table>

            </div>


            <div
                class="university-mobile-list"
                id="universityMobileList"
            >

            </div>

        `;


        const anchor =
            byId(
                "stateUniversityList"
            );


        if (
            anchor?.parentElement?.parentElement
        ) {

            const parent =
                anchor.parentElement.parentElement;


            parent.parentNode.insertBefore(
                section,
                parent.nextSibling
            );

        } else if (
            anchor?.parentElement
        ) {

            anchor.parentElement.parentNode
                .insertBefore(
                    section,
                    anchor.parentElement.nextSibling
                );

        } else {

            document.body.appendChild(
                section
            );

        }

    }


    setupUniversityDirectory();

    renderUniversityDirectory();

}


/* ============================================================
   UNIVERSITY DIRECTORY CONTROLS
============================================================ */

function setupUniversityDirectory() {

    const stateFilter =
        byId(
            "universityStateFilter"
        );


    const search =
        byId(
            "universitySearch"
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

        const existing =
            new Set(
                [
                    ...stateFilter.options
                ]
                    .map(
                        option =>
                            comparableState(
                                option.value
                            )
                    )
            );


        GERMAN_STATES.forEach(
            state => {

                if (
                    existing.has(
                        comparableState(
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


        stateFilter.addEventListener(
            "change",
            renderUniversityDirectory
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
            renderUniversityDirectory
        );


        search.dataset.ready =
            "true";

    }


    if (
        rankSort &&
        rankSort.dataset.ready !==
        "true"
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
        reset.dataset.ready !==
        "true"
    ) {

        reset.addEventListener(
            "click",
            () => {

                if (
                    search
                ) {

                    search.value =
                        "";

                }


                if (
                    stateFilter
                ) {

                    stateFilter.value =
                        "";

                }


                if (
                    rankSort
                ) {

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
   UNIVERSITY SORT
============================================================ */

function getUniversityDirectoryRows() {

    const rows =
        universityRows();


    const nameColumn =
        universityNameColumn(
            rows
        );


    const stateColumn =
        universityStateColumn(
            rows
        );


    const cityColumn =
        universityCityColumn(
            rows
        );


    const typeColumn =
        universityTypeColumn(
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
        ).trim();


    let filtered =
        rows.filter(
            row => {

                if (
                    search
                ) {

                    const haystack =
                        Object.values(
                            row
                        )
                            .join(" ")
                            .toLowerCase();


                    if (
                        !haystack.includes(
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


    const mode =
        byId(
            "universityRankSort"
        )?.value ||
        "rank-asc";


    /*
       NAME
    */

    if (
        mode ===
        "name-asc"
    ) {

        filtered.sort(
            (
                a,
                b
            ) =>
                String(
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
                    )
        );


        return {

            rows:
                filtered,

            allRows:
                rows,

            nameColumn,

            stateColumn,

            cityColumn,

            typeColumn

        };

    }


    /*
       STATE
    */

    if (
        mode ===
        "state-asc"
    ) {

        filtered.sort(
            (
                a,
                b
            ) => {

                const first =
                    normalizeStateName(
                        a[
                            stateColumn
                        ]
                    );


                const second =
                    normalizeStateName(
                        b[
                            stateColumn
                        ]
                    );


                const compare =
                    first.localeCompare(
                        second,
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );


                if (
                    compare !==
                    0
                ) {

                    return compare;

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
                        )
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

            typeColumn

        };

    }


    /*
       RANKING

       THIS IS THE IMPORTANT FIX.

       It NEVER reads 2027 from the text
       "QS World University Rankings 2027".

       It uses the verified QS_2027 mapping
       or a genuine numeric field.
    */

    filtered.sort(
        (
            a,
            b
        ) => {

            const rankA =
                rankingInfo(
                    a
                );


            const rankB =
                rankingInfo(
                    b
                );


            if (
                !rankA &&
                !rankB
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


            /*
               Unranked last.
            */

            if (
                !rankA
            ) {

                return 1;

            }


            if (
                !rankB
            ) {

                return -1;

            }


            if (
                mode ===
                "rank-desc"
            ) {

                return (
                    rankB.sortValue -
                    rankA.sortValue
                );

            }


            return (
                rankA.sortValue -
                rankB.sortValue
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

        typeColumn

    };

}


/* ============================================================
   RANK BADGE
============================================================ */

function rankingBadgeHTML(
    row
) {

    const info =
        rankingInfo(
            row
        );


    if (!info) {

        return `

            <span
                class="ranking-pill"
            >

                Not ranked

            </span>

        `;

    }


    return `

        <span
            class="ranking-pill"
        >

            QS 2027

            <b>

                ${escapeHtml(
                    info.display
                )}

            </b>

        </span>

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


    const mobile =
        byId(
            "universityMobileList"
        );


    if (
        !body &&
        !mobile
    ) {

        return;

    }


    const result =
        getUniversityDirectoryRows();


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

        summary.textContent =
            rows.length ===
            allRows.length

                ? `Showing all ${formatNumber(
                    allRows.length
                )} universities`

                : `Showing ${formatNumber(
                    rows.length
                )} of ${formatNumber(
                    allRows.length
                )} universities`;

    }


    /*
       DESKTOP TABLE
    */

    if (
        body
    ) {

        if (!rows.length) {

            body.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        class="university-empty"
                    >

                        No universities match
                        the current filter.

                    </td>

                </tr>

            `;

        } else {

            body.innerHTML =
                rows.map(
                    row => {

                        const name =
                            nameColumn
                                ? row[
                                    nameColumn
                                ]
                                : "";


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
                                ? row[
                                    cityColumn
                                ]
                                : "";


                        const type =
                            typeColumn
                                ? row[
                                    typeColumn
                                ]
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


                                        ${universityDetailsHTML(
                                            row
                                        )}

                                    </details>

                                </td>


                                <td>

                                    <div
                                        class="university-rankings"
                                    >

                                        ${rankingBadgeHTML(
                                            row
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

    }


    /*
       MOBILE CARDS

       This prevents the table columns from becoming
       visually scrambled on small screens.
    */

    if (
        mobile
    ) {

        if (!rows.length) {

            mobile.innerHTML = `

                <div
                    class="university-empty"
                >

                    No universities match
                    the current filter.

                </div>

            `;

        } else {

            mobile.innerHTML =
                rows.map(
                    row => {

                        const name =
                            nameColumn
                                ? row[
                                    nameColumn
                                ]
                                : "";


                        const state =
                            stateColumn
                                ? normalizeStateName(
                                    row[
                                        stateColumn
                                    ]
                                )
                                : "—";


                        const city =
                            cityColumn
                                ? row[
                                    cityColumn
                                ]
                                : "—";


                        const type =
                            typeColumn
                                ? row[
                                    typeColumn
                                ]
                                : "—";


                        const ranking =
                            rankingInfo(
                                row
                            );


                        return `

                            <div
                                class="university-mobile-card"
                            >

                                <div
                                    class="mobile-university-name"
                                >

                                    ${escapeHtml(
                                        name
                                    )}

                                </div>


                                <div
                                    class="mobile-ranking"
                                >

                                    ${
                                        ranking
                                            ? `QS 2027 · ${
                                                escapeHtml(
                                                    ranking.display
                                                )
                                            }`
                                            : "Ranking unavailable"
                                    }

                                </div>


                                <div
                                    class="mobile-university-meta"
                                >

                                    <div
                                        class="mobile-meta-item"
                                    >

                                        <span
                                            class="mobile-meta-label"
                                        >
                                            State
                                        </span>


                                        <span
                                            class="mobile-meta-value"
                                        >

                                            ${escapeHtml(
                                                state
                                            )}

                                        </span>

                                    </div>


                                    <div
                                        class="mobile-meta-item"
                                    >

                                        <span
                                            class="mobile-meta-label"
                                        >
                                            City
                                        </span>


                                        <span
                                            class="mobile-meta-value"
                                        >

                                            ${escapeHtml(
                                                city
                                            )}

                                        </span>

                                    </div>


                                    <div
                                        class="mobile-meta-item"
                                    >

                                        <span
                                            class="mobile-meta-label"
                                        >
                                            Type
                                        </span>


                                        <span
                                            class="mobile-meta-value"
                                        >

                                            ${escapeHtml(
                                                type
                                            )}

                                        </span>

                                    </div>

                                </div>


                                <details>

                                    <summary>
                                        View all university details
                                    </summary>


                                    ${universityDetailsHTML(
                                        row
                                    )}

                                </details>

                            </div>

                        `;

                    }
                )
                    .join("");

        }

    }

}


/* ============================================================
   STARTUP
============================================================ */

async function initializeDashboard() {

    try {

        /*
           Load first.
        */

        await loadAllData();


        /*
           Build analytics.
        */

        buildStateMetrics();


        /*
           Standard dashboard.
        */

        renderKPIs();


        setupStateSelector();


        renderStateOverview(
            ""
        );


        renderMapDetail(
            ""
        );


        renderStateUniversityList();


        renderRegionalSignals();


        renderFieldList();


        renderIndustryList();


        renderIndustryTable();


        /*
           IMPORTANT:
           scholarshipTable now uses REAL scholarship records.
        */

        renderScholarshipTable();


        renderQuality();


        /*
           Restored full university directory.
        */

        ensureUniversityDirectory();


        /*
           Germany map.
        */

        await initializeGermanyMap();


        /*
           Fix encoding AFTER all dynamic sections exist.
        */

        repairDOMText();


        fixKPIIcons();


        console.log(
            "=========================================="
        );


        console.log(
            "GERMANY ADMIT AI HELPER"
        );


        console.log(
            "Universities:",
            universityRows().length
        );


        console.log(
            "Distinct scholarships:",
            distinctScholarshipCount()
        );


        console.log(
            "Detected QS rankings:",
            Object.keys(
                QS_2027
            ).length
        );


        console.log(
            "=========================================="
        );

    } catch (
        error
    ) {

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

                    Dashboard could not initialize.

                    <br><br>

                    ${escapeHtml(
                        error.message
                    )}

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