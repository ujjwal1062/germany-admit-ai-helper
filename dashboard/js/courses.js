/* ============================================================
   GERMANY ADMIT AI HELPER — COURSE EXPLORER

   Standalone module. Does not replace the existing dashboard.

   Source:
     ../outputs/analytics/courses_analytics.csv

   Features:
     - Bachelor's, Master's, PhD / Doctoral, Teaching, All Courses
     - Previous bachelor's degree selection for Master's
     - Field-of-study filtering
     - University, state and language filters
     - Admission status filter
     - Programme requirements and language requirements
     - Tuition fees, semester contributions, ECTS and duration
     - Application deadlines and official links
     - Responsive cards for mobile
     - Pagination for large datasets
============================================================ */

(function () {
    "use strict";

    const COURSE_CSV_URL =
        "../outputs/analytics/courses_analytics.csv";

    const PAGE_SIZE = 20;

    let allCourses = [];
    let doctoralFallbackCourses = [];
    let currentPage = 0;
    let selectedPreviousBachelor = null;
    let previousBachelorOptions = new Map();
    let activeFieldOptions = [];
    let fieldExplanation = "";

    const el = (id) =>
        document.getElementById(id);


    /* ========================================================
       HELPERS
    ======================================================== */

    function normalise(value) {
        return String(value ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
            .replace(/\s+/g, " ");
    }


    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function pretty(value) {
        const text = String(value ?? "").trim();

        return text || "Not provided in dataset";
    }


    function getValue(row, candidates) {
        if (!row) return "";

        const keys = Object.keys(row);

        const keyMap = new Map(
            keys.map((key) => [
                normalise(key),
                key
            ])
        );

        for (const candidate of candidates) {
            const key = keyMap.get(
                normalise(candidate)
            );

            if (
                key &&
                String(row[key] ?? "").trim() !== ""
            ) {
                return String(row[key]).trim();
            }
        }

        for (const candidate of candidates) {
            const wanted = normalise(candidate);

            const key = keys.find((item) =>
                normalise(item).includes(wanted) ||
                wanted.includes(normalise(item))
            );

            if (
                key &&
                String(row[key] ?? "").trim() !== ""
            ) {
                return String(row[key]).trim();
            }
        }

        return "";
    }


    /* ========================================================
       CSV PARSER

       Supports quoted cells, commas, escaped quotes and
       line breaks inside quoted cells.
    ======================================================== */

    function parseCsv(text) {
        const source = String(text ?? "")
            .replace(/^\uFEFF/, "");

        const rows = [];

        let row = [];
        let cell = "";
        let quoted = false;

        for (let i = 0; i < source.length; i++) {
            const ch = source[i];
            const next = source[i + 1];

            if (
                ch === '"' &&
                quoted &&
                next === '"'
            ) {
                cell += '"';
                i++;
                continue;
            }

            if (ch === '"') {
                quoted = !quoted;
                continue;
            }

            if (ch === "," && !quoted) {
                row.push(cell);
                cell = "";
                continue;
            }

            if (
                (ch === "\n" || ch === "\r") &&
                !quoted
            ) {
                if (
                    ch === "\r" &&
                    next === "\n"
                ) {
                    i++;
                }

                row.push(cell);
                cell = "";

                if (
                    row.some(
                        (part) =>
                            String(part).trim() !== ""
                    )
                ) {
                    rows.push(row);
                }

                row = [];
                continue;
            }

            cell += ch;
        }

        if (cell.length || row.length) {
            row.push(cell);

            if (
                row.some(
                    (part) =>
                        String(part).trim() !== ""
                )
            ) {
                rows.push(row);
            }
        }

        if (!rows.length) return [];

        const headers = rows[0].map(
            (header) => String(header ?? "").trim()
        );

        return rows.slice(1).map(
            (values, index) => {
                const record = {
                    __course_row_id: index + 1
                };

                headers.forEach((header, col) => {
                    record[header] =
                        String(values[col] ?? "").trim();
                });

                return record;
            }
        );
    }


    /* ========================================================
       DEGREE CLASSIFICATION

       Teaching is detected first so Bachelor/Master of
       Education programmes are placed in the Teaching route.

       The university-level phd_available flag is not treated
       as proof that an individual PhD programme is listed.
    ======================================================== */

    function classifyCourse(row) {
        const degree = normalise(
            getValue(row, [
                "degree_type",
                "degree type",
                "degree"
            ])
        );

        const field = normalise(
            getValue(row, [
                "field_of_study",
                "field of study",
                "subject",
                "field"
            ])
        );

        const programme = normalise(
            getValue(row, [
                "programme_name",
                "program_name",
                "programme name",
                "course_name",
                "course name"
            ])
        );

        const teaching =
            degree.includes("bachelor of education") ||
            degree.includes("master of education") ||
            degree.includes("teaching") ||
            degree.includes("lehramt") ||
            field.includes("teaching degree") ||
            field.includes("teacher education") ||
            programme.includes("teaching degree") ||
            programme.includes("lehramt") ||
            programme.includes("teacher education");

        if (teaching) return "teaching";

        if (
            /(^| )(phd|ph d|doctor of philosophy|doctoral|doctorate|promotion)( |$)/
                .test(degree) ||
            /(^| )(phd|ph d|doctor of philosophy|doctoral programme|doctoral program|doctorate)( |$)/
                .test(programme)
        ) {
            return "phd";
        }

        if (
            degree.includes("master") ||
            degree.startsWith("msc ") ||
            degree.startsWith("ma ")
        ) {
            return "master";
        }

        if (
            degree.includes("bachelor") ||
            degree.startsWith("bsc ") ||
            degree.startsWith("ba ")
        ) {
            return "bachelor";
        }

        if (
            programme.includes("doctoral programme") ||
            programme.includes("doctoral program")
        ) {
            return "phd";
        }

        return "other";
    }


    /* ========================================================
       NORMALISE DATASET ROWS

       These map the columns to consistent internal properties.
    ======================================================== */

    function standardise(row) {
        return {
            raw: row,

            programme: getValue(row, [
                "programme_name",
                "programme name",
                "program_name",
                "program name",
                "course_name",
                "course name",
                "course",
                "title"
            ]),

            degree: getValue(row, [
                "degree_type",
                "degree type",
                "degree"
            ]),

            field: getValue(row, [
                "field_of_study",
                "field of study",
                "subject",
                "field"
            ]),

            university: getValue(row, [
                "university",
                "university_name",
                "university name",
                "institution"
            ]),

            state: getValue(row, [
                "state",
                "federal_state",
                "federal state",
                "bundesland"
            ]),

            city: getValue(row, [
                "city",
                "location"
            ]),

            universityType: getValue(row, [
                "university_type",
                "university type",
                "institution_type"
            ]),

            rank: getValue(row, [
                "qs_world_university_ranking_2027",
                "qs world university ranking 2027",
                "qs ranking",
                "qs rank"
            ]),

            language: getValue(row, [
                "language_of_instruction",
                "language of instruction",
                "language"
            ]),

            mode: getValue(row, [
                "study_mode",
                "study mode",
                "mode"
            ]),

            semester: getValue(row, [
                "start_semester",
                "start semester",
                "intake",
                "semester"
            ]),

            admission: getValue(row, [
                "admission_status",
                "admission status",
                "admission"
            ]),

            duration: getValue(row, [
                "standard_duration",
                "standard duration",
                "duration"
            ]),

            ects: getValue(row, [
                "ects",
                "credits",
                "credit_points"
            ]),

            tuition: getValue(row, [
                "tuition_fee",
                "tuition fee",
                "tuition"
            ]),

            semesterContribution: getValue(row, [
                "semester_contribution",
                "semester contribution",
                "semester_fee"
            ]),

            entryRequirements: getValue(row, [
                "entry_requirements",
                "entry requirements",
                "admission_requirements",
                "admission requirements"
            ]),

            languageRequirements: getValue(row, [
                "language_requirements",
                "language requirements",
                "language_requirement"
            ]),

            deadline: getValue(row, [
                "application_deadline",
                "application deadline",
                "deadline"
            ]),

            applicationRoute: getValue(row, [
                "application_route",
                "application route",
                "application_process"
            ]),

            faculty: getValue(row, [
                "faculty",
                "department"
            ]),

            phdAvailable: getValue(row, [
                "phd_available",
                "phd available",
                "doctoral_available"
            ]),

            catalogueUrl: getValue(row, [
                "official_programme_catalogue",
                "official programme catalogue",
                "programme_url",
                "official_course_url"
            ]),

            bachelorMasterUrl: getValue(row, [
                "official_bachelor_master",
                "official bachelor master"
            ]),

            applicationUrl: getValue(row, [
                "official_application",
                "official application",
                "application_url"
            ]),

            feesUrl: getValue(row, [
                "official_fees",
                "official fees",
                "fees_url"
            ]),

            lastChecked: getValue(row, [
                "last_checked",
                "last checked",
                "source_checked_at"
            ]),

            category: classifyCourse(row)
        };
    }


    function uniqueSorted(values) {
        const map = new Map();

        values.forEach((value) => {
            const display = String(value ?? "").trim();

            if (!display) return;

            const key = normalise(display);

            if (key && !map.has(key)) {
                map.set(key, display);
            }
        });

        return [...map.values()].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    undefined,
                    { sensitivity: "base" }
                )
        );
    }


    function distinctFieldValues(rows) {
        return uniqueSorted(
            rows.map(
                (row) => row.field || "Other / not stated"
            )
        );
    }


    function isBachelorSource(row) {
        const degree = normalise(row.degree);

        return (
            degree.includes("bachelor") ||
            degree.startsWith("bsc ") ||
            degree.startsWith("ba ")
        );
    }


    /* ========================================================
       MASTER'S FIELD SUGGESTIONS

       This uses field labels, programme titles and available
       entry-requirement text to suggest relevant fields.

       It does not claim to establish formal admission
       eligibility, because the dataset does not contain a
       verified subject-to-eligibility matrix.
    ======================================================== */

    const FIELD_FAMILIES = [
        [
            "computing",
            [
                "computer science",
                "computing",
                "informatics",
                "information technology",
                "data science",
                "artificial intelligence",
                "software engineering"
            ]
        ],
        [
            "engineering",
            [
                "engineering",
                "mechanical",
                "electrical",
                "civil engineering",
                "industrial",
                "technology",
                "mechatronics",
                "process engineering"
            ]
        ],
        [
            "natural sciences",
            [
                "natural sciences",
                "physics",
                "chemistry",
                "biology",
                "life sciences",
                "earth sciences",
                "geoscience",
                "environment",
                "mathematics",
                "statistics"
            ]
        ],
        [
            "business",
            [
                "business",
                "management",
                "economics",
                "finance",
                "accounting",
                "marketing",
                "commerce",
                "entrepreneurship"
            ]
        ],
        [
            "social sciences",
            [
                "social sciences",
                "sociology",
                "political science",
                "politics",
                "psychology",
                "public policy",
                "communication",
                "education"
            ]
        ],
        [
            "humanities",
            [
                "humanities",
                "history",
                "philosophy",
                "languages",
                "literature",
                "culture",
                "arts",
                "linguistics"
            ]
        ],
        [
            "law",
            [
                "law",
                "legal studies",
                "jurisprudence"
            ]
        ],
        [
            "health",
            [
                "medicine",
                "health",
                "nursing",
                "pharmacy",
                "biomedical",
                "public health",
                "dentistry"
            ]
        ],
        [
            "teaching",
            [
                "teaching",
                "teacher",
                "lehramt",
                "education"
            ]
        ]
    ];


    function familiesFor(text) {
        const n = normalise(text);

        return FIELD_FAMILIES
            .filter(([, keywords]) =>
                keywords.some(
                    (keyword) =>
                        n.includes(normalise(keyword))
                )
            )
            .map(([family]) => family);
    }


    function relatedMasterFields(previousBachelor) {
        const masterCourses = allCourses.filter(
            (course) =>
                course.category === "master"
        );

        const fields = distinctFieldValues(masterCourses);

        if (!previousBachelor || !fields.length) {
            fieldExplanation =
                "Choose your completed bachelor's degree first. " +
                "The dataset does not provide a formal subject-to-admission eligibility matrix.";

            return [];
        }

        const priorField =
            previousBachelor.field || "";

        const priorName =
            previousBachelor.programme || "";

        const priorFamilies = new Set([
            ...familiesFor(priorField),
            ...familiesFor(priorName)
        ]);

        const priorTokens = normalise(
            `${priorName} ${priorField}`
        )
            .split(" ")
            .filter(
                (token) =>
                    token.length >= 5 &&
                    ![
                        "bachelor",
                        "science",
                        "degree",
                        "study",
                        "studies",
                        "programme",
                        "program",
                        "arts",
                        "applied"
                    ].includes(token)
            );


        const scored = masterCourses.map((course) => {
            let score = 0;

            const targetField =
                course.field || "Other / not stated";

            const targetNorm =
                normalise(targetField);

            const reqNorm =
                normalise(course.entryRequirements);

            const titleNorm =
                normalise(course.programme);


            if (
                targetNorm === normalise(priorField) &&
                priorField
            ) {
                score += 100;
            }


            const targetFamilies = new Set([
                ...familiesFor(targetField),
                ...familiesFor(course.programme)
            ]);

            for (const family of priorFamilies) {
                if (targetFamilies.has(family)) {
                    score += 35;
                    break;
                }
            }


            if (
                priorField &&
                reqNorm.includes(normalise(priorField))
            ) {
                score += 45;
            }


            if (
                priorName &&
                reqNorm.includes(normalise(priorName))
            ) {
                score += 60;
            }


            const meaningfulTokenHits =
                priorTokens.filter(
                    (token) =>
                        reqNorm.includes(token) ||
                        titleNorm.includes(token)
                );

            score +=
                Math.min(
                    meaningfulTokenHits.length,
                    3
                ) * 4;


            return {
                field: targetField,
                score
            };
        });


        const bestByField = new Map();

        scored.forEach((item) => {
            const key = normalise(item.field);

            const old = bestByField.get(key);

            if (
                !old ||
                old.score < item.score
            ) {
                bestByField.set(key, item);
            }
        });


        const matched = [...bestByField.values()]
            .filter((item) => item.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score ||
                    a.field.localeCompare(b.field)
            );


        if (matched.length) {
            const threshold =
                matched[0].score >= 100
                    ? Math.max(35, matched[0].score - 70)
                    : Math.max(1, matched[0].score - 25);


            const relevant =
                matched
                    .filter(
                        (item) =>
                            item.score >= threshold
                    )
                    .map(
                        (item) =>
                            item.field
                    );


            fieldExplanation =
                "Fields are suggested using the dataset's field labels " +
                "and available degree-requirement text. This is a discovery " +
                "aid, not an official eligibility decision. Verify each programme's requirements.";

            return uniqueSorted(relevant);
        }


        fieldExplanation =
            "The dataset does not contain a structured compatibility " +
            "mapping for this bachelor's degree. All master's fields are " +
            "shown rather than incorrectly excluding possible options. " +
            "Check each course's entry requirements and official page.";

        return fields;
    }


    /* ========================================================
       SELECT HELPERS
    ======================================================== */

    function setSelectOptions(
        select,
        values,
        placeholder,
        includeAll
    ) {
        if (!select) return;

        const previous = select.value;

        const items = [];

        if (includeAll) {
            items.push(
                '<option value="__all__">All fields</option>'
            );
        } else {
            items.push(
                `<option value="">${escapeHtml(placeholder)}</option>`
            );
        }

        values.forEach((value) => {
            items.push(
                `<option value="${escapeHtml(value)}">` +
                `${escapeHtml(value)}</option>`
            );
        });

        select.innerHTML = items.join("");

        const exists = [
            ...select.options
        ].some(
            (option) =>
                option.value === previous
        );

        if (exists) {
            select.value = previous;
        } else {
            select.value = includeAll ? "__all__" : "";
        }
    }


    /* ========================================================
       RESPONSIVE CSS

       All course-explorer styles are scoped to this module,
       preserving the existing dashboard CSS.
    ======================================================== */

    function ensureCourseExplorerStyles() {
        if (el("course-explorer-styles")) return;

        const style = document.createElement("style");

        style.id = "course-explorer-styles";

        style.textContent = `
            #courseExplorer {
                width: min(1400px, calc(100% - 24px));
                margin: 28px auto;
                padding: 24px;
                box-sizing: border-box;
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(15,23,42,.06);
                color: #172033;
            }

            #courseExplorer * {
                box-sizing: border-box;
            }

            #courseExplorer .course-heading {
                display: flex;
                gap: 16px;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
                margin-bottom: 16px;
            }

            #courseExplorer h2 {
                margin: 0 0 7px;
                font-size: 26px;
                line-height: 1.2;
                color: #0f172a;
            }

            #courseExplorer .course-subtitle {
                margin: 0;
                color: #64748b;
                font-size: 14px;
                line-height: 1.6;
                max-width: 900px;
            }

            #courseExplorer .course-count-badge {
                white-space: nowrap;
                border-radius: 999px;
                padding: 9px 12px;
                background: #eff6ff;
                color: #1d4ed8;
                font-size: 12px;
                font-weight: 800;
            }

            #courseExplorer .course-controls {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
                margin: 18px 0 12px;
            }

            #courseExplorer .course-control {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
            }

            #courseExplorer .course-control label {
                font-size: 12px;
                font-weight: 800;
                color: #334155;
            }

            #courseExplorer input,
            #courseExplorer select {
                width: 100%;
                min-height: 44px;
                border: 1px solid #dbe2ea;
                border-radius: 10px;
                padding: 9px 11px;
                background: #fff;
                color: #0f172a;
                font: inherit;
                min-width: 0;
            }

            #courseExplorer .course-search-row {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr;
                gap: 12px;
                margin-bottom: 12px;
            }

            #courseExplorer .course-note {
                margin: 12px 0;
                padding: 12px 14px;
                border: 1px solid #dbeafe;
                border-radius: 11px;
                background: #f8fbff;
                color: #475569;
                font-size: 12px;
                line-height: 1.6;
            }

            #courseExplorer .course-note strong {
                color: #1e40af;
            }

            #courseExplorer .course-results-summary {
                display: flex;
                gap: 12px;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                margin: 15px 0;
                color: #64748b;
                font-size: 13px;
                line-height: 1.5;
            }

            #courseExplorer .course-list {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
            }

            #courseExplorer .course-card {
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                padding: 17px;
                background: #fff;
                min-width: 0;
            }

            #courseExplorer .course-card-head {
                display: flex;
                gap: 12px;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
                margin-bottom: 12px;
            }

            #courseExplorer .course-title {
                font-size: 17px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.4;
                overflow-wrap: anywhere;
                margin: 0 0 5px;
            }

            #courseExplorer .course-university {
                font-size: 13px;
                color: #475569;
                line-height: 1.5;
                overflow-wrap: anywhere;
            }

            #courseExplorer .course-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }

            #courseExplorer .course-badge {
                display: inline-flex;
                padding: 5px 8px;
                border-radius: 8px;
                background: #f1f5f9;
                color: #334155;
                font-size: 11px;
                font-weight: 800;
                line-height: 1.4;
            }

            #courseExplorer .course-badge.blue {
                background: #eff6ff;
                color: #1d4ed8;
            }

            #courseExplorer .course-badge.green {
                background: #ecfdf5;
                color: #047857;
            }

            #courseExplorer .course-facts {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
                margin: 12px 0;
            }

            #courseExplorer .course-fact {
                min-width: 0;
                border-radius: 9px;
                padding: 9px;
                background: #f8fafc;
            }

            #courseExplorer .course-fact-label {
                display: block;
                margin-bottom: 4px;
                color: #64748b;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: .03em;
            }

            #courseExplorer .course-fact-value {
                display: block;
                color: #0f172a;
                font-size: 12px;
                font-weight: 700;
                line-height: 1.5;
                overflow-wrap: anywhere;
                white-space: pre-wrap;
            }

            #courseExplorer details {
                margin-top: 9px;
                border-top: 1px solid #eef2f7;
                padding-top: 10px;
            }

            #courseExplorer summary {
                cursor: pointer;
                font-size: 12px;
                font-weight: 800;
                color: #2563eb;
            }

            #courseExplorer .course-requirements {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 10px;
            }

            #courseExplorer .course-requirement {
                min-width: 0;
                padding: 12px;
                border-radius: 10px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
            }

            #courseExplorer .course-requirement h4 {
                margin: 0 0 7px;
                font-size: 12px;
                color: #334155;
            }

            #courseExplorer .course-requirement p {
                margin: 0;
                color: #475569;
                font-size: 12px;
                line-height: 1.65;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            #courseExplorer .course-links {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            #courseExplorer .course-link {
                display: inline-block;
                padding: 8px 10px;
                border: 1px solid #dbeafe;
                background: #eff6ff;
                border-radius: 9px;
                color: #1d4ed8;
                text-decoration: none;
                font-size: 11px;
                font-weight: 800;
                overflow-wrap: anywhere;
            }

            #courseExplorer .course-link:hover {
                background: #dbeafe;
            }

            #courseExplorer .course-empty {
                padding: 30px 18px;
                text-align: center;
                border: 1px dashed #cbd5e1;
                border-radius: 13px;
                color: #64748b;
                font-size: 14px;
                line-height: 1.7;
            }

            #courseExplorer .course-pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                margin-top: 18px;
                flex-wrap: wrap;
            }

            #courseExplorer .course-pagination button {
                min-height: 40px;
                padding: 8px 14px;
                border: 1px solid #cbd5e1;
                border-radius: 9px;
                background: #fff;
                color: #0f172a;
                font: inherit;
                font-weight: 800;
                cursor: pointer;
            }

            #courseExplorer .course-pagination button:disabled {
                opacity: .4;
                cursor: not-allowed;
            }

            #courseExplorer .course-pagination span {
                font-size: 12px;
                color: #64748b;
            }

            #courseExplorer .course-reset {
                min-height: 44px;
                border: 0;
                border-radius: 10px;
                padding: 9px 14px;
                background: #0f172a;
                color: #fff;
                font-weight: 800;
                cursor: pointer;
            }

            #courseExplorer .course-inline-message {
                font-size: 12px;
                color: #64748b;
                line-height: 1.6;
                margin-top: 6px;
            }

            #courseExplorer .course-prior-wrap[hidden] {
                display: none !important;
            }

            @media (max-width: 900px) {
                #courseExplorer .course-controls {
                    grid-template-columns: 1fr 1fr;
                }

                #courseExplorer .course-search-row {
                    grid-template-columns: 1fr 1fr;
                }

                #courseExplorer .course-facts {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 600px) {
                #courseExplorer {
                    width: calc(100% - 16px);
                    padding: 15px;
                    margin: 18px auto;
                    border-radius: 15px;
                }

                #courseExplorer h2 {
                    font-size: 22px;
                }

                #courseExplorer .course-controls,
                #courseExplorer .course-search-row {
                    grid-template-columns: 1fr;
                }

                #courseExplorer .course-facts {
                    grid-template-columns: 1fr 1fr;
                }

                #courseExplorer .course-requirements {
                    grid-template-columns: 1fr;
                }

                #courseExplorer .course-card {
                    padding: 13px;
                }

                #courseExplorer .course-title {
                    font-size: 15px;
                }
            }
        `;

        document.head.appendChild(style);
    }


    /* ========================================================
       CREATE THE EXPLORER

       Inserts a new section without replacing existing cards.
    ======================================================== */

    function createCourseExplorer() {
        if (el("courseExplorer")) {
            return el("courseExplorer");
        }

        ensureCourseExplorerStyles();

        const section =
            document.createElement("section");

        section.id = "courseExplorer";

        section.innerHTML = `
            <div class="course-heading">
                <div>
                    <h2>Study Programme Explorer</h2>

                    <p class="course-subtitle">
                        Explore programmes by degree route, subject,
                        university and state. Open a programme to see
                        available entry requirements, language requirements,
                        fees, deadlines and official links.
                        Other qualification types remain available under
                        All courses rather than being forced into the
                        wrong category.
                    </p>
                </div>

                <div
                    class="course-count-badge"
                    id="courseExplorerTotal"
                >
                    Loading courses…
                </div>
            </div>

            <div class="course-controls">
                <div class="course-control">
                    <label for="courseDegreeLevel">
                        1. Choose study route
                    </label>

                    <select id="courseDegreeLevel">
                        <option value="all">All courses</option>
                        <option value="bachelor">Bachelor's</option>
                        <option value="master">Master's</option>
                        <option value="phd">PhD / Doctoral</option>
                        <option value="teaching">Teaching / Lehramt</option>
                    </select>
                </div>

                <div class="course-control">
                    <label for="courseField">
                        2. Choose subject / field
                    </label>

                    <select id="courseField">
                        <option value="__all__">All fields</option>
                    </select>
                </div>

                <div
                    class="course-control course-prior-wrap"
                    id="coursePriorWrap"
                    hidden
                >
                    <label for="coursePreviousBachelor">
                        Master's route: your completed bachelor's degree
                    </label>

                    <input
                        id="coursePreviousBachelor"
                        list="coursePreviousBachelorOptions"
                        placeholder="Type and select your bachelor's programme"
                        autocomplete="off"
                    >

                    <datalist id="coursePreviousBachelorOptions"></datalist>

                    <div class="course-inline-message">
                        Choose a programme from the suggestions.
                        Its field helps suggest related master's fields.
                    </div>
                </div>
            </div>

            <div class="course-search-row">
                <div class="course-control">
                    <label for="courseSearch">
                        Search courses and requirements
                    </label>

                    <input
                        id="courseSearch"
                        type="search"
                        placeholder="Programme, university, subject, requirement…"
                        autocomplete="off"
                    >
                </div>

                <div class="course-control">
                    <label for="courseState">State</label>

                    <select id="courseState">
                        <option value="__all__">All states</option>
                    </select>
                </div>

                <div class="course-control">
                    <label for="courseLanguage">
                        Language of instruction
                    </label>

                    <select id="courseLanguage">
                        <option value="__all__">All languages</option>
                    </select>
                </div>
            </div>

            <div class="course-search-row">
                <div class="course-control">
                    <label for="courseAdmission">
                        Admission status
                    </label>

                    <select id="courseAdmission">
                        <option value="__all__">
                            All admission statuses
                        </option>
                    </select>
                </div>

                <div class="course-control">
                    <label for="courseSort">Sort results</label>

                    <select id="courseSort">
                        <option value="programme">Programme A–Z</option>
                        <option value="university">University A–Z</option>
                        <option value="state">State A–Z</option>
                    </select>
                </div>

                <div
                    class="course-control"
                    style="justify-content:flex-end"
                >
                    <label>&nbsp;</label>

                    <button
                        class="course-reset"
                        id="courseReset"
                        type="button"
                    >
                        Reset course filters
                    </button>
                </div>
            </div>

            <div
                class="course-note"
                id="courseExplorerNote"
            >
                <strong>How to use:</strong>
                Choose a study route, then select a subject or field
                to list courses. For a master's search, select your
                previous bachelor's degree first.
            </div>

            <div class="course-results-summary">
                <span id="courseResultsCount">
                    Loading course records…
                </span>

                <span>
                    A maximum of 20 records is shown per page
                    to keep the site responsive on mobile.
                </span>
            </div>

            <div
                class="course-list"
                id="courseList"
            ></div>

            <div
                class="course-pagination"
                id="coursePagination"
            ></div>
        `;


        const anchor =
            el("fieldList") ||
            el("stateUniversityList") ||
            el("industryList") ||
            el("scholarshipTable");


        if (anchor) {
            const card = anchor.closest(
                "section, .dashboard-section, .analytics-card, .panel, .card"
            ) || anchor.parentElement;

            if (card && card.parentNode) {
                card.parentNode.insertBefore(
                    section,
                    card.nextSibling
                );
            } else {
                document.body.appendChild(section);
            }
        } else {
            document.body.appendChild(section);
        }

        return section;
    }


    /* ========================================================
       DOCTORAL AVAILABILITY

       If individual PhD programme rows are absent but the source
       has a university-level phd_available indicator, display one
       clearly labelled record per university. Never label it as an
       individual verified PhD course.
    ======================================================== */

    function explicitDoctoralRows() {
        return allCourses.filter(
            (course) =>
                course.category === "phd"
        );
    }


    function doctoralIndicated(value) {
        const n = normalise(value);

        if (
            !n ||
            n === "no" ||
            n.startsWith("no ") ||
            n.includes("not available") ||
            n.includes("not offer")
        ) {
            return false;
        }

        return (
            n === "yes" ||
            n.includes("doctoral") ||
            n.includes("doctorate") ||
            n.includes("phd") ||
            n.includes("doctor of philosophy") ||
            n.includes("promotion")
        );
    }


    function buildDoctoralAvailabilityFallback(courses) {
        if (
            courses.some(
                (course) =>
                    course.category === "phd"
            )
        ) {
            return [];
        }

        const byUniversity = new Map();

        courses.forEach((course) => {
            if (
                !doctoralIndicated(course.phdAvailable) ||
                !course.university
            ) {
                return;
            }

            const key =
                `${normalise(course.university)}|${normalise(course.state)}`;

            if (byUniversity.has(key)) {
                return;
            }

            byUniversity.set(key, {
                ...course,

                programme:
                    `Doctoral opportunities at ${course.university}`,

                degree:
                    "Doctoral availability (university-level indicator)",

                field:
                    "Check university doctoral catalogue",

                language:
                    "Programme-specific; verify official source",

                mode:
                    "Programme-specific; verify official source",

                semester:
                    "Programme-specific; verify official source",

                admission:
                    "Individual doctoral programme requirements apply",

                duration:
                    "Programme-specific; verify official source",

                ects:
                    "Not specified at university level",

                tuition:
                    "Check official doctoral programme / fees page",

                semesterContribution:
                    course.semesterContribution ||
                    "Check official university fees page",

                entryRequirements:
                    "The source dataset indicates doctoral / PhD " +
                    "availability at university level. It does not " +
                    "provide a distinct PhD programme row here. Check " +
                    "the official doctoral catalogue for supervisor " +
                    "availability, subject-specific prerequisites, " +
                    "funding and application procedure.",

                languageRequirements:
                    "Programme-specific. Confirm the required language, " +
                    "accepted certificates and minimum scores on the " +
                    "official doctoral programme page.",

                deadline:
                    "Programme-specific; verify official source",

                applicationRoute:
                    "Use the university's official doctoral school, " +
                    "graduate centre or programme page.",

                category:
                    "phd",

                isDoctoralFallback:
                    true
            });
        });

        return [...byUniversity.values()].sort(
            (a, b) =>
                a.university.localeCompare(b.university)
        );
    }


    /* ========================================================
       SAFE LINKS AND COURSE CARDS
    ======================================================== */

    function safeUrl(value) {
        const text = String(value ?? "").trim();

        if (!text) return "";

        try {
            const url = new URL(
                text,
                window.location.href
            );

            if (
                url.protocol !== "https:" &&
                url.protocol !== "http:"
            ) {
                return "";
            }

            return url.href;
        } catch (_) {
            return "";
        }
    }


    function linkButton(label, url) {
        const href = safeUrl(url);

        if (!href) return "";

        return `
            <a
                class="course-link"
                href="${escapeHtml(href)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${escapeHtml(label)}
            </a>
        `;
    }


    function fact(label, value) {
        return `
            <div class="course-fact">
                <span class="course-fact-label">
                    ${escapeHtml(label)}
                </span>

                <span class="course-fact-value">
                    ${escapeHtml(pretty(value))}
                </span>
            </div>
        `;
    }


    function renderCourseCard(course) {
        const rank =
            course.rank
                ? `QS 2027: ${course.rank}`
                : "QS rank not listed";


        const admission =
            course.admission
                ? `
                    <span class="course-badge ${
                        /restricted|nc/i.test(course.admission)
                            ? "blue"
                            : "green"
                    }">
                        ${escapeHtml(course.admission)}
                    </span>
                `
                : "";


        const links = [
            linkButton(
                "Official programme catalogue",
                course.catalogueUrl
            ),

            linkButton(
                "Bachelor / Master information",
                course.bachelorMasterUrl
            ),

            linkButton(
                "Official application",
                course.applicationUrl
            ),

            linkButton(
                "Official fees",
                course.feesUrl
            )
        ]
            .filter(Boolean)
            .join("");


        const doctoralNote =
            course.isDoctoralFallback
                ? `
                    <div class="course-note">
                        <strong>Important:</strong>
                        This is a university-level doctoral availability
                        indicator, not a separately listed PhD course.
                        Use the official doctoral catalogue for individual
                        subject and admission details.
                    </div>
                `
                : "";


        return `
            <article class="course-card">
                <div class="course-card-head">
                    <div style="min-width:0;flex:1">
                        <h3 class="course-title">
                            ${escapeHtml(
                                pretty(course.programme)
                            )}
                        </h3>

                        <div class="course-university">
                            ${escapeHtml(
                                pretty(course.university)
                            )}
                            ·
                            ${escapeHtml(
                                pretty(course.city)
                            )},
                            ${escapeHtml(
                                pretty(course.state)
                            )}
                        </div>

                        <div class="course-badges">
                            <span class="course-badge blue">
                                ${escapeHtml(
                                    pretty(course.degree)
                                )}
                            </span>

                            <span class="course-badge">
                                ${escapeHtml(
                                    pretty(course.field)
                                )}
                            </span>

                            ${admission}
                        </div>
                    </div>
                </div>

                ${doctoralNote}

                <div class="course-facts">
                    ${fact(
                        "Instruction language",
                        course.language
                    )}

                    ${fact(
                        "Study mode",
                        course.mode
                    )}

                    ${fact(
                        "Intake / semester",
                        course.semester
                    )}

                    ${fact(
                        "Duration",
                        course.duration
                    )}

                    ${fact(
                        "ECTS",
                        course.ects
                    )}

                    ${fact(
                        "Tuition fee",
                        course.tuition
                    )}

                    ${fact(
                        "Semester contribution",
                        course.semesterContribution
                    )}

                    ${fact(
                        "Application deadline",
                        course.deadline
                    )}

                    ${fact(
                        "University type",
                        course.universityType
                    )}

                    ${fact(
                        "Faculty / department",
                        course.faculty
                    )}

                    ${fact(
                        "QS 2027 ranking",
                        rank
                    )}

                    ${fact(
                        "Last checked",
                        course.lastChecked
                    )}
                </div>

                <details>
                    <summary>
                        View entry requirements, language requirements
                        and application details
                    </summary>

                    <div class="course-requirements">
                        <div class="course-requirement">
                            <h4>Entry / admission requirements</h4>

                            <p>
                                ${escapeHtml(
                                    pretty(course.entryRequirements)
                                )}
                            </p>
                        </div>

                        <div class="course-requirement">
                            <h4>Language requirements</h4>

                            <p>
                                ${escapeHtml(
                                    pretty(course.languageRequirements)
                                )}
                            </p>
                        </div>

                        <div class="course-requirement">
                            <h4>Application route</h4>

                            <p>
                                ${escapeHtml(
                                    pretty(course.applicationRoute)
                                )}
                            </p>
                        </div>

                        <div class="course-requirement">
                            <h4>
                                Doctoral availability note
                            </h4>

                            <p>
                                ${escapeHtml(
                                    pretty(course.phdAvailable)
                                )}
                            </p>
                        </div>
                    </div>

                    <div class="course-links">
                        ${
                            links ||
                            `
                                <span class="course-inline-message">
                                    No official links were provided for this row.
                                </span>
                            `
                        }
                    </div>
                </details>
            </article>
        `;
    }


    /* ========================================================
       DATA FOR SELECTED DEGREE LEVEL
    ======================================================== */

    function currentLevel() {
        return (
            el("courseDegreeLevel")?.value ||
            "all"
        );
    }


    function coursesForLevel(level) {
        if (level === "all") {
            return allCourses;
        }

        if (
            level === "phd" &&
            !explicitDoctoralRows().length
        ) {
            return doctoralFallbackCourses;
        }

        return allCourses.filter(
            (course) =>
                course.category === level
        );
    }


    function previousBachelorLabel(course) {
        return (
            `${course.programme} — ` +
            `${course.field || "Field not stated"}`
        );
    }


    /* ========================================================
       PREVIOUS BACHELOR DEGREE OPTIONS
    ======================================================== */

    function setupBachelorDatalist() {
        const datalist =
            el("coursePreviousBachelorOptions");

        if (!datalist) return;

        const map = new Map();

        allCourses
            .filter(isBachelorSource)
            .forEach((course) => {
                if (!course.programme) return;

                const label =
                    previousBachelorLabel(course);

                const key =
                    normalise(label);

                if (!map.has(key)) {
                    map.set(key, {
                        label,
                        course
                    });
                }
            });


        previousBachelorOptions =
            new Map();


        const options =
            [...map.values()].sort(
                (a, b) =>
                    a.label.localeCompare(
                        b.label
                    )
            );


        datalist.innerHTML =
            options.map((item) => {
                previousBachelorOptions.set(
                    item.label,
                    item.course
                );

                return `
                    <option value="${
                        escapeHtml(item.label)
                    }"></option>
                `;
            }).join("");
    }


    /* ========================================================
       DYNAMIC FIELD OPTIONS
    ======================================================== */

    function updateFieldOptions() {
        const level = currentLevel();

        const fieldSelect =
            el("courseField");

        const priorWrap =
            el("coursePriorWrap");

        const priorInput =
            el("coursePreviousBachelor");

        if (!fieldSelect) return;

        fieldExplanation = "";

        if (priorWrap) {
            priorWrap.hidden =
                level !== "master";
        }


        if (level === "master") {
            if (
                !selectedPreviousBachelor &&
                priorInput
            ) {
                fieldSelect.disabled = true;

                setSelectOptions(
                    fieldSelect,
                    [],
                    "Choose your bachelor's degree first",
                    false
                );

                fieldExplanation =
                    "For master's programmes, choose your completed " +
                    "bachelor's programme first. Then the available " +
                    "field options will be suggested from the master's dataset.";

                activeFieldOptions = [];

                updateCourseNote();

                return;
            }

            fieldSelect.disabled = false;

            const options =
                relatedMasterFields(
                    selectedPreviousBachelor
                );

            activeFieldOptions = options;

            setSelectOptions(
                fieldSelect,
                options,
                "Choose a master's field",
                false
            );
        } else if (level === "all") {
            fieldSelect.disabled = false;

            const options =
                distinctFieldValues(allCourses);

            activeFieldOptions = options;

            setSelectOptions(
                fieldSelect,
                options,
                "All fields",
                true
            );
        } else {
            fieldSelect.disabled = false;

            const options =
                distinctFieldValues(
                    coursesForLevel(level)
                );

            activeFieldOptions = options;

            setSelectOptions(
                fieldSelect,
                options,
                `Choose a ${
                    level === "bachelor"
                        ? "bachelor's"
                        : level === "phd"
                            ? "doctoral"
                            : "teaching"
                } field`,
                false
            );

            if (
                level === "phd" &&
                !explicitDoctoralRows().length &&
                doctoralFallbackCourses.length
            ) {
                fieldExplanation =
                    "Individual PhD course rows are not present " +
                    "in the dataset. The results below show distinct " +
                    "universities whose course data indicates doctoral " +
                    "availability; these are not individual doctoral programmes.";
            }
        }

        updateCourseNote();
    }


    /* ========================================================
       FILTER DROPDOWNS
    ======================================================== */

    function updateFilterOptions() {
        const filterSource = [
            ...allCourses,
            ...doctoralFallbackCourses
        ];

        const states = uniqueSorted(
            filterSource.map(
                (course) =>
                    course.state
            )
        );

        const languages = uniqueSorted(
            filterSource.map(
                (course) =>
                    course.language
            )
        );

        const admissions = uniqueSorted(
            filterSource.map(
                (course) =>
                    course.admission
            )
        );


        setSelectOptions(
            el("courseState"),
            states,
            "All states",
            true
        );

        setSelectOptions(
            el("courseLanguage"),
            languages,
            "All languages",
            true
        );

        setSelectOptions(
            el("courseAdmission"),
            admissions,
            "All admission statuses",
            true
        );
    }


    /* ========================================================
       NOTE / GUIDANCE
    ======================================================== */

    function updateCourseNote(extra) {
        const note =
            el("courseExplorerNote");

        if (!note) return;

        const level = currentLevel();

        let message = "";

        if (level === "master") {
            message =
                fieldExplanation ||
                "Choose your completed bachelor's degree, " +
                "then choose a suggested master's field.";
        } else if (
            [
                "bachelor",
                "phd",
                "teaching"
            ].includes(level)
        ) {
            message =
                `Choose a subject / field to see the ${
                    level === "bachelor"
                        ? "bachelor's"
                        : level === "phd"
                            ? "PhD / doctoral"
                            : "teaching / Lehramt"
                } programmes in the dataset.`;

            if (
                level === "phd" &&
                !explicitDoctoralRows().length &&
                doctoralFallbackCourses.length
            ) {
                message +=
                    " The dataset has university-level doctoral " +
                    "availability indicators but no individual PhD " +
                    "programme rows, so university-level records are shown.";
            }
        } else {
            message =
                "All courses shows every row in the current course " +
                "dataset. Choose a field or other filters to narrow results.";
        }

        note.innerHTML = `
            <strong>Important:</strong>
            ${escapeHtml(message)}

            ${extra ? escapeHtml(extra) : ""}

            <br><br>

            Requirements are displayed as recorded in the dataset and
            may be programme-specific or incomplete. Field matching and
            previous-degree suggestions do not guarantee admission.
            Verify eligibility, language scores, deadlines, fees and
            links on the official programme page.
        `;
    }


    /* ========================================================
       FILTERING
    ======================================================== */

    function masterSelectionIsReady() {
        if (currentLevel() !== "master") {
            return true;
        }

        return Boolean(
            selectedPreviousBachelor
        );
    }


    function matchesCourse(course) {
        const level = currentLevel();

        if (
            level !== "all" &&
            course.category !== level
        ) {
            return false;
        }


        const field =
            el("courseField")?.value ||
            "__all__";

        if (
            level !== "all" &&
            !field
        ) {
            return false;
        }

        if (
            field !== "__all__" &&
            field &&
            normalise(
                course.field ||
                "Other / not stated"
            ) !== normalise(field)
        ) {
            return false;
        }


        const state =
            el("courseState")?.value ||
            "__all__";

        if (
            state !== "__all__" &&
            normalise(course.state) !== normalise(state)
        ) {
            return false;
        }


        const language =
            el("courseLanguage")?.value ||
            "__all__";

        if (
            language !== "__all__" &&
            normalise(course.language) !== normalise(language)
        ) {
            return false;
        }


        const admission =
            el("courseAdmission")?.value ||
            "__all__";

        if (
            admission !== "__all__" &&
            normalise(course.admission) !== normalise(admission)
        ) {
            return false;
        }


        const query =
            normalise(
                el("courseSearch")?.value ||
                ""
            );

        if (query) {
            const searchable = normalise([
                course.programme,
                course.degree,
                course.field,
                course.university,
                course.state,
                course.city,
                course.language,
                course.admission,
                course.entryRequirements,
                course.languageRequirements,
                course.faculty,
                course.applicationRoute,
                course.tuition,
                course.semesterContribution
            ].join(" "));

            if (!searchable.includes(query)) {
                return false;
            }
        }

        return true;
    }


    /* ========================================================
       SORTING
    ======================================================== */

    function sortCourses(rows) {
        const mode =
            el("courseSort")?.value ||
            "programme";

        const sorted = [...rows];

        sorted.sort((a, b) => {
            let first = "";
            let second = "";

            if (mode === "university") {
                first = a.university;
                second = b.university;
            } else if (mode === "state") {
                first = a.state;
                second = b.state;
            } else {
                first = a.programme;
                second = b.programme;
            }

            const compare =
                String(first).localeCompare(
                    String(second),
                    undefined,
                    { sensitivity: "base" }
                );

            if (compare !== 0) {
                return compare;
            }

            return String(a.university).localeCompare(
                String(b.university),
                undefined,
                { sensitivity: "base" }
            );
        });

        return sorted;
    }


    /* ========================================================
       RENDER RESULTS
    ======================================================== */

    function render() {
        const list =
            el("courseList");

        const pagination =
            el("coursePagination");

        const count =
            el("courseResultsCount");

        const total =
            el("courseExplorerTotal");

        if (!list || !pagination) return;

        if (total) {
            total.textContent =
                `${allCourses.length.toLocaleString()} course records`;
        }


        if (!masterSelectionIsReady()) {
            list.innerHTML = `
                <div class="course-empty">
                    Select your completed bachelor's degree above.
                    Then choose a suggested master's subject / field
                    to see matching programmes.
                </div>
            `;

            pagination.innerHTML = "";

            if (count) {
                count.textContent =
                    "Waiting for previous bachelor's degree selection.";
            }

            currentPage = 0;

            return;
        }


        const level = currentLevel();

        const selectedField =
            el("courseField")?.value ||
            "";


        if (
            level !== "all" &&
            !selectedField
        ) {
            list.innerHTML = `
                <div class="course-empty">
                    Choose a subject / field above to list programmes.
                    The available fields are based on the selected study
                    route and the course dataset.
                </div>
            `;

            pagination.innerHTML = "";

            if (count) {
                count.textContent =
                    `${coursesForLevel(level).length.toLocaleString()} ` +
                    "records available in this study route before field filtering.";
            }

            currentPage = 0;

            return;
        }


        const baseRows =
            coursesForLevel(level);

        const filtered =
            sortCourses(
                baseRows.filter(
                    (course) =>
                        matchesCourse(course)
                )
            );


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filtered.length /
                    PAGE_SIZE
                )
            );


        currentPage =
            Math.min(
                currentPage,
                totalPages - 1
            );


        const start =
            currentPage *
            PAGE_SIZE;


        const visible =
            filtered.slice(
                start,
                start + PAGE_SIZE
            );


        if (count) {
            count.textContent =
                filtered.length
                    ? `Showing ${(start + 1).toLocaleString()}–` +
                      `${Math.min(start + PAGE_SIZE, filtered.length).toLocaleString()} ` +
                      `of ${filtered.length.toLocaleString()} matching courses · ` +
                      `${allCourses.length.toLocaleString()} records in total.`
                    : `No courses match the selected filters. ` +
                      `${allCourses.length.toLocaleString()} records are present in the dataset.`;
        }


        list.innerHTML =
            visible.length
                ? visible.map(renderCourseCard).join("")
                : `
                    <div class="course-empty">
                        No courses match these filters.
                        Try another field, state, language or search term.
                    </div>
                `;


        pagination.innerHTML =
            filtered.length > PAGE_SIZE
                ? `
                    <button
                        type="button"
                        id="coursePreviousPage"
                        ${currentPage === 0 ? "disabled" : ""}
                    >
                        Previous
                    </button>

                    <span>
                        Page ${(currentPage + 1).toLocaleString()}
                        of ${totalPages.toLocaleString()}
                    </span>

                    <button
                        type="button"
                        id="courseNextPage"
                        ${currentPage >= totalPages - 1 ? "disabled" : ""}
                    >
                        Next
                    </button>
                `
                : (
                    filtered.length
                        ? "<span>All matching results are shown.</span>"
                        : ""
                );


        el("coursePreviousPage")?.addEventListener(
            "click",
            () => {
                currentPage =
                    Math.max(0, currentPage - 1);

                render();

                el("courseExplorer")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );


        el("courseNextPage")?.addEventListener(
            "click",
            () => {
                currentPage =
                    Math.min(
                        totalPages - 1,
                        currentPage + 1
                    );

                render();

                el("courseExplorer")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        );
    }


    function refreshAndRender(resetPage = true) {
        if (resetPage) {
            currentPage = 0;
        }

        render();
    }


    /* ========================================================
       MASTER'S SELECTION HANDLER
    ======================================================== */

    function handleBachelorInput() {
        const input =
            el("coursePreviousBachelor");

        const typed =
            input?.value || "";

        const exact =
            previousBachelorOptions.get(typed);

        const normalisedMatch =
            [
                ...previousBachelorOptions.entries()
            ].find(
                ([label]) =>
                    normalise(label) === normalise(typed)
            );


        selectedPreviousBachelor =
            exact ||
            (
                normalisedMatch
                    ? normalisedMatch[1]
                    : null
            );


        if (el("courseField")) {
            el("courseField").value = "";
        }

        updateFieldOptions();

        refreshAndRender(true);
    }


    /* ========================================================
       EVENT WIRING
    ======================================================== */

    function setupEvents() {
        el("courseDegreeLevel")?.addEventListener(
            "change",
            () => {
                selectedPreviousBachelor = null;

                if (
                    el("coursePreviousBachelor")
                ) {
                    el("coursePreviousBachelor").value = "";
                }

                if (el("courseField")) {
                    el("courseField").value =
                        currentLevel() === "all"
                            ? "__all__"
                            : "";
                }

                currentPage = 0;

                updateFieldOptions();

                render();
            }
        );


        el("coursePreviousBachelor")?.addEventListener(
            "change",
            handleBachelorInput
        );


        el("coursePreviousBachelor")?.addEventListener(
            "input",
            () => {
                const input =
                    el("coursePreviousBachelor");

                if (!input) return;

                const value =
                    input.value || "";


                if (
                    !previousBachelorOptions.has(value)
                ) {
                    selectedPreviousBachelor = null;

                    if (el("courseField")) {
                        el("courseField").value = "";
                    }

                    updateFieldOptions();

                    render();
                }
            }
        );


        [
            "courseField",
            "courseState",
            "courseLanguage",
            "courseAdmission",
            "courseSort"
        ].forEach((id) => {
            el(id)?.addEventListener(
                "change",
                () => refreshAndRender(true)
            );
        });


        el("courseSearch")?.addEventListener(
            "input",
            () => refreshAndRender(true)
        );


        el("courseReset")?.addEventListener(
            "click",
            () => {
                el("courseDegreeLevel").value = "all";

                el("coursePreviousBachelor").value = "";

                el("courseSearch").value = "";

                el("courseState").value = "__all__";

                el("courseLanguage").value = "__all__";

                el("courseAdmission").value = "__all__";

                el("courseSort").value = "programme";

                selectedPreviousBachelor = null;

                currentPage = 0;

                updateFieldOptions();

                render();
            }
        );
    }


    /* ========================================================
       LOAD DATA
    ======================================================== */

    async function initialise() {
        if (el("courseExplorer")) return;

        createCourseExplorer();

        const list =
            el("courseList");

        if (list) {
            list.innerHTML = `
                <div class="course-empty">
                    Loading the course dataset…
                </div>
            `;
        }


        try {
            const response =
                await fetch(
                    COURSE_CSV_URL,
                    {
                        cache: "no-store"
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `Course CSV returned HTTP ${response.status}`
                );
            }


            const csv =
                await response.text();


            const rawRows =
                parseCsv(csv);


            allCourses =
                rawRows
                    .map(standardise)
                    .filter(
                        (course) =>
                            course.programme ||
                            course.university
                    );


            if (!allCourses.length) {
                throw new Error(
                    "The course CSV loaded, but no programme rows " +
                    "were found. Check the CSV headers and published file path."
                );
            }


            doctoralFallbackCourses =
                buildDoctoralAvailabilityFallback(
                    allCourses
                );


            setupBachelorDatalist();

            updateFilterOptions();

            setupEvents();

            updateFieldOptions();

            render();


            console.info(
                "Course Explorer ready",
                {
                    totalRows:
                        allCourses.length,

                    bachelorRows:
                        allCourses.filter(
                            (row) =>
                                row.category === "bachelor"
                        ).length,

                    masterRows:
                        allCourses.filter(
                            (row) =>
                                row.category === "master"
                        ).length,

                    doctoralRows:
                        allCourses.filter(
                            (row) =>
                                row.category === "phd"
                        ).length,

                    doctoralUniversityFallbackRows:
                        doctoralFallbackCourses.length,

                    teachingRows:
                        allCourses.filter(
                            (row) =>
                                row.category === "teaching"
                        ).length,

                    otherRows:
                        allCourses.filter(
                            (row) =>
                                row.category === "other"
                        ).length
                }
            );

        } catch (error) {
            console.error(
                "Course Explorer could not load:",
                error
            );


            if (list) {
                list.innerHTML = `
                    <div class="course-empty">
                        Could not load the course dataset.

                        <br><br>

                        ${escapeHtml(error.message)}

                        <br><br>

                        Confirm that
                        <code>outputs/analytics/courses_analytics.csv</code>
                        exists in the same GitHub repository.
                    </div>
                `;
            }


            const total =
                el("courseExplorerTotal");

            if (total) {
                total.textContent =
                    "Course data unavailable";
            }
        }
    }


    /* ========================================================
       START SAFELY

       Works whether the browser is still parsing HTML or the
       module is loaded after DOMContentLoaded.
    ======================================================== */

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            { once: true }
        );
    } else {
        initialise();
    }

})();