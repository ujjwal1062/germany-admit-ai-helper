"use strict";

/* ============================================================
   GERMANY ADMIT AI HELPER
   STUDY PROGRAMME EXPLORER â€” REVISED VERSION

   Preserves app.js and existing dashboard sections.

   Fixes:
   - Recognise common degree abbreviations
   - Infer fields from programme titles when missing
   - Search by subject synonyms such as commerce/business
   - Show courses without forcing a field selection
   - Preserve all 14,922 source records where available
   - Show actual source requirements and official URLs
   - Cache searchable text to reduce lag
   - Render only 20 cards per page
   - Support responsive mobile browsing
   - Do not invent individual PhD programmes
============================================================ */

(function () {
    "use strict";

    const CSV_URL =
        "../outputs/analytics/courses_analytics.csv";

    const PAGE_SIZE = 20;

    const state = {
        rows: [],
        page: 0,
        selectedBachelor: null,
        bachelorLookup: new Map(),
        timer: null,
        loading: false
    };

    const $ = (id) =>
        document.getElementById(id);


    /* ========================================================
       NORMALISATION
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

    function compact(value) {
        return normalise(value).replace(/\s/g, "");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function isEmpty(value) {
        const text = normalise(value);

        return !text ||
            [
                "na",
                "n a",
                "n a",
                "not available",
                "not provided",
                "not provided in dataset",
                "unknown",
                "null",
                "none",
                "other not stated"
            ].includes(text);
    }

    function displayValue(value) {
        return isEmpty(value)
            ? "Not provided in source data"
            : String(value).trim();
    }


    /* ========================================================
       CSV PARSER

       Supports quoted commas, escaped quotes and embedded
       line breaks in quoted cells.
    ======================================================== */

    function parseCSV(text) {
        const source =
            String(text ?? "").replace(/^\uFEFF/, "");

        const rows = [];

        let row = [];
        let cell = "";
        let quoted = false;

        for (let i = 0; i < source.length; i++) {
            const ch = source[i];
            const next = source[i + 1];

            if (ch === '"' && quoted && next === '"') {
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
                (ch === "\r" || ch === "\n") &&
                !quoted
            ) {
                if (ch === "\r" && next === "\n") {
                    i++;
                }

                row.push(cell);
                cell = "";

                if (
                    row.some(
                        value => String(value).trim() !== ""
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
                    value => String(value).trim() !== ""
                )
            ) {
                rows.push(row);
            }
        }

        if (!rows.length) return [];

        const headers = rows[0].map(
            value => String(value ?? "").trim()
        );

        return rows.slice(1).map(values => {
            const record = {};

            headers.forEach((header, index) => {
                record[header] =
                    String(values[index] ?? "").trim();
            });

            return record;
        });
    }


    /* ========================================================
       COLUMN LOOKUP

       Exact aliases are checked before partial matches.
    ======================================================== */

    function getValue(row, aliases) {
        const keys = Object.keys(row || {});

        const byNormalisedName = new Map();

        keys.forEach(key => {
            byNormalisedName.set(normalise(key), key);
        });

        for (const alias of aliases) {
            const key =
                byNormalisedName.get(normalise(alias));

            if (
                key &&
                String(row[key] ?? "").trim() !== ""
            ) {
                return String(row[key]).trim();
            }
        }

        for (const alias of aliases) {
            const wanted = normalise(alias);

            const key = keys.find(column => {
                const actual = normalise(column);

                return actual.includes(wanted) ||
                    wanted.includes(actual);
            });

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
       FIELD CLASSIFICATION

       Keep the original field when it is meaningful.
       Infer from programme / faculty when the field is blank.
    ======================================================== */

    const FIELD_RULES = [
        {
            label: "AI & Data Science",
            terms: [
                "artificial intelligence",
                "machine learning",
                "data science",
                "data analytics",
                "big data",
                "computational data",
                "intelligent systems",
                "deep learning"
            ]
        },
        {
            label: "Computer Science & IT",
            terms: [
                "computer science",
                "informatics",
                "information technology",
                "software engineering",
                "cyber security",
                "cybersecurity",
                "information systems",
                "computer engineering",
                "computing",
                "web development"
            ]
        },
        {
            label: "Engineering & Technology",
            terms: [
                "engineering",
                "aerospace",
                "mechanical",
                "electrical",
                "electronic engineering",
                "civil engineering",
                "chemical engineering",
                "industrial engineering",
                "automotive",
                "robotics",
                "mechatronics",
                "materials engineering",
                "energy engineering",
                "renewable energy",
                "process engineering"
            ]
        },
        {
            label: "Architecture & Built Environment",
            terms: [
                "architecture",
                "urban planning",
                "urban design",
                "spatial planning",
                "civil construction",
                "built environment",
                "landscape architecture"
            ]
        },
        {
            label: "Business, Economics & Commerce",
            terms: [
                "business administration",
                "business studies",
                "commerce",
                "commercial",
                "management",
                "economics",
                "economy",
                "accounting",
                "finance",
                "marketing",
                "entrepreneurship",
                "international business",
                "business intelligence",
                "business analytics",
                "bwl",
                "volkswirtschaft",
                "wirtschaft",
                "handel"
            ]
        },
        {
            label: "Medicine & Health",
            terms: [
                "medicine",
                "medical",
                "health science",
                "health sciences",
                "public health",
                "nursing",
                "pharmacy",
                "dentistry",
                "biomedical",
                "clinical",
                "physiotherapy",
                "healthcare"
            ]
        },
        {
            label: "Natural & Life Sciences",
            terms: [
                "natural sciences",
                "life sciences",
                "biology",
                "biological",
                "chemistry",
                "physics",
                "biotechnology",
                "molecular biology",
                "microbiology",
                "biochemistry",
                "geoscience",
                "geology",
                "astronomy"
            ]
        },
        {
            label: "Mathematics & Statistics",
            terms: [
                "mathematics",
                "mathematical",
                "statistics",
                "statistical",
                "actuarial science",
                "operations research"
            ]
        },
        {
            label: "Agriculture & Environmental Sciences",
            terms: [
                "agriculture",
                "agricultural",
                "forestry",
                "environmental science",
                "environmental studies",
                "ecology",
                "sustainability",
                "climate",
                "conservation",
                "agronomy",
                "natural resource"
            ]
        },
        {
            label: "Transport & Logistics",
            terms: [
                "transport",
                "logistics",
                "supply chain",
                "maritime",
                "shipping",
                "port management",
                "aviation management",
                "railway",
                "traffic engineering"
            ]
        },
        {
            label: "Law & Public Administration",
            terms: [
                "law",
                "legal studies",
                "jurisprudence",
                "public administration",
                "public policy",
                "governance"
            ]
        },
        {
            label: "Social Sciences & Psychology",
            terms: [
                "psychology",
                "sociology",
                "social science",
                "social sciences",
                "political science",
                "international relations",
                "social work",
                "criminology",
                "behavioural science",
                "behavioral science"
            ]
        },
        {
            label: "Education & Teaching",
            terms: [
                "teacher training",
                "teacher education",
                "teaching degree",
                "lehramt",
                "education",
                "educational science",
                "educational sciences",
                "pedagogy",
                "didactics"
            ]
        },
        {
            label: "Arts, Media & Design",
            terms: [
                "art and design",
                "art studies",
                "fine arts",
                "design",
                "graphic design",
                "media studies",
                "communication studies",
                "film studies",
                "music",
                "performing arts",
                "visual arts",
                "photography"
            ]
        },
        {
            label: "Humanities & Languages",
            terms: [
                "humanities",
                "history",
                "philosophy",
                "literature",
                "linguistics",
                "language studies",
                "languages",
                "archaeology",
                "cultural studies",
                "religious studies",
                "ancient studies"
            ]
        },
        {
            label: "Hospitality & Tourism",
            terms: [
                "hospitality",
                "tourism",
                "hotel management",
                "event management"
            ]
        }
    ];


    function inferField(courseName, faculty, originalField) {
        const raw = String(originalField ?? "").trim();

        if (
            raw &&
            !isEmpty(raw) &&
            ![
                "other",
                "not stated",
                "other / not stated"
            ].includes(normalise(raw))
        ) {
            return raw;
        }

        const text = normalise(
            `${courseName} ${faculty}`
        );

        for (const rule of FIELD_RULES) {
            if (
                rule.terms.some(term =>
                    text.includes(normalise(term))
                )
            ) {
                return rule.label;
            }
        }

        return "Other / not stated";
    }


    /* ========================================================
       DEGREE CLASSIFICATION

       The compact form is important:
       B.Sc. -> bsc
       M.Sc. -> msc
       B.A.  -> ba
       M.A.  -> ma
    ======================================================== */

    function classifyDegree(
        programme,
        degreeType,
        field
    ) {
        const title = normalise(programme);
        const degree = normalise(degreeType);
        const degreeCode = compact(degreeType);
        const subject = normalise(field);

        /*
           Teaching routes first.
           M.Ed. and B.Ed. are explicitly teaching degrees.
        */

        const educationCode =
            /^(bed|med|bachelorofeducation|masterofeducation)$/
                .test(degreeCode);

        const isTeaching =
            educationCode ||
            title.includes("lehramt") ||
            title.includes("teacher training") ||
            title.includes("teacher education") ||
            title.includes("teaching degree") ||
            subject.includes("teaching") ||
            subject.includes("teacher education") ||
            title.includes("(teacher training)") ||
            title.includes("(teaching)");

        if (isTeaching) {
            return "teaching";
        }


        /*
           PhD / doctorate.
        */

        const isDoctoral =
            degree.includes("phd") ||
            degree.includes("doctor of philosophy") ||
            degree.includes("doctoral") ||
            degree.includes("doctorate") ||
            degree.includes("promotion") ||
            /^(phd|doctorate|doctoral|doctorofphilosophy)$/
                .test(degreeCode) ||
            title.includes("doctoral programme") ||
            title.includes("doctoral program");

        if (isDoctoral) {
            return "phd";
        }


        /*
           Master's degrees.
        */

        const isMaster =
            degree.includes("master") ||
            degree.includes("postgraduate") ||
            /^(msc|ms|ma|meng|mba|llm|mphil|mfa|mph|mtech|mcom|mbl)$/
                .test(degreeCode) ||
            /^(msc|ms|ma|meng|mba|llm|mphil|mfa|mph|mtech|mcom|mbl)(major|minor|hons|honours|honors)$/
                .test(degreeCode);

        if (isMaster) {
            return "master";
        }


        /*
           Bachelor's / undergraduate degrees.

           State Examination is included in the undergraduate
           route because German law and medicine programmes may
           use it instead of a Bachelor's award.
        */

        const isBachelor =
            degree.includes("bachelor") ||
            degree.includes("undergraduate") ||
            degree.includes("state examination") ||
            degree.includes("staatsexamen") ||
            degree.includes("erstes staatsexamen") ||
            /^(bsc|ba|beng|bba|bcom|llb|barch|bdes|bfa|bphil|bmus)$/
                .test(degreeCode) ||
            /^(bsc|ba|beng|bba|bcom|llb|barch|bdes|bfa|bphil|bmus)(major|minor|hons|honours|honors)$/
                .test(degreeCode);

        if (isBachelor) {
            return "bachelor";
        }


        /*
           Do not guess degree levels from the university's
           phd_available flag or from admission requirements.
        */

        return "other";
    }


    function degreeLabel(level) {
        const labels = {
            bachelor: "Bachelor's / Undergraduate",
            master: "Master's",
            phd: "PhD / Doctoral",
            teaching: "Teaching / Lehramt",
            other: "Other / level not stated"
        };

        return labels[level] || "Other / level not stated";
    }


    /* ========================================================
       SYNONYMS FOR USER SEARCH

       Commerce should find business / economics courses even
       if the word "commerce" is absent from the title.
    ======================================================== */

    const SEARCH_SYNONYMS = {
        commerce: [
            "commerce",
            "commercial",
            "business administration",
            "business",
            "management",
            "economics",
            "economy",
            "accounting",
            "finance",
            "marketing",
            "trade",
            "bwl",
            "wirtschaft",
            "handel"
        ],

        business: [
            "commerce",
            "commercial",
            "business administration",
            "business",
            "management",
            "economics",
            "accounting",
            "finance",
            "marketing",
            "bwl",
            "wirtschaft"
        ],

        "business administration": [
            "business administration",
            "business management",
            "management",
            "commerce",
            "economics",
            "bwl",
            "wirtschaft"
        ],

        "ai ml": [
            "artificial intelligence",
            "machine learning",
            "data science",
            "computer science",
            "informatics",
            "computing",
            "intelligent systems"
        ],

        ai: [
            "artificial intelligence",
            "machine learning",
            "data science",
            "computer science",
            "informatics",
            "intelligent systems"
        ],

        "machine learning": [
            "machine learning",
            "artificial intelligence",
            "data science",
            "computer science",
            "informatics",
            "deep learning"
        ],

        computing: [
            "computer science",
            "computing",
            "informatics",
            "information technology",
            "software engineering",
            "cybersecurity",
            "data science"
        ],

        cs: [
            "computer science",
            "computing",
            "informatics",
            "information technology"
        ],

        engineering: [
            "engineering",
            "aerospace",
            "mechanical",
            "electrical",
            "civil",
            "chemical engineering",
            "industrial engineering",
            "robotics",
            "mechatronics"
        ],

        medicine: [
            "medicine",
            "medical",
            "health science",
            "health sciences",
            "clinical",
            "biomedical"
        ],

        teaching: [
            "teaching",
            "teacher training",
            "teacher education",
            "lehramt",
            "education"
        ]
    };


    function matchesSearch(course, query) {
        if (!query) return true;

        const q = normalise(query);

        if (course.searchText.includes(q)) {
            return true;
        }

        const synonyms = SEARCH_SYNONYMS[q];

        if (synonyms) {
            return synonyms.some(term =>
                course.searchText.includes(
                    normalise(term)
                )
            );
        }

        /*
           Free-text search: all query words must be present,
           unless the exact phrase has already matched.
        */

        const words = q.split(" ").filter(Boolean);

        return words.length > 1 &&
            words.every(word =>
                course.searchText.includes(word)
            );
    }


    /* ========================================================
       NORMALISE ONE COURSE

       Every source column is preserved in `raw`, so the detail
       view can show metadata even if it is not a recognised
       standard field.
    ======================================================== */

    function standardise(raw, index) {
        const programme = getValue(raw, [
            "programme_name",
            "program_name",
            "programme",
            "program",
            "course_name",
            "course_title",
            "study_programme",
            "study_program",
            "degree_programme",
            "degree_program",
            "title"
        ]);

        const university = getValue(raw, [
            "university",
            "university_name",
            "institution",
            "institution_name"
        ]);

        const degree = getValue(raw, [
            "degree_type",
            "degree",
            "degree_level",
            "study_level",
            "programme_level",
            "program_level",
            "qualification",
            "qualification_type",
            "award",
            "academic_degree"
        ]);

        const fieldRaw = getValue(raw, [
            "field_of_study",
            "study_field",
            "subject_area",
            "study_area",
            "subject",
            "discipline",
            "field",
            "programme_field",
            "program_field"
        ]);

        const faculty = getValue(raw, [
            "faculty",
            "department",
            "school",
            "faculty_department"
        ]);

        const field = inferField(
            programme,
            faculty,
            fieldRaw
        );

        const level = classifyDegree(
            programme,
            degree,
            `${fieldRaw} ${faculty}`
        );

        const course = {
            index,

            raw,

            programme,

            university,

            degree,

            level,

            levelLabel:
                degreeLabel(level),

            field,

            fieldRaw,

            faculty,

            state: getValue(raw, [
                "state",
                "federal_state",
                "bundesland"
            ]),

            city: getValue(raw, [
                "city",
                "location"
            ]),

            universityType: getValue(raw, [
                "university_type",
                "institution_type",
                "university type"
            ]),

            rank: getValue(raw, [
                "qs_world_university_ranking_2027",
                "qs_world_university_ranking_2027",
                "qs_rank",
                "qs ranking"
            ]),

            language: getValue(raw, [
                "language_of_instruction",
                "language",
                "instruction_language"
            ]),

            mode: getValue(raw, [
                "study_mode",
                "mode"
            ]),

            semester: getValue(raw, [
                "start_semester",
                "semester",
                "intake"
            ]),

            admission: getValue(raw, [
                "admission_status",
                "admission_restriction",
                "admission",
                "admission_type"
            ]),

            duration: getValue(raw, [
                "standard_duration",
                "duration",
                "study_duration"
            ]),

            ects: getValue(raw, [
                "ects",
                "credits",
                "credit_points"
            ]),

            tuition: getValue(raw, [
                "tuition_fee",
                "tuition",
                "tuition_fees"
            ]),

            contribution: getValue(raw, [
                "semester_contribution",
                "semester_fee",
                "semester_fees"
            ]),

            entryRequirements: getValue(raw, [
                "entry_requirements",
                "admission_requirements",
                "entry requirement"
            ]),

            languageRequirements: getValue(raw, [
                "language_requirements",
                "language_requirement"
            ]),

            deadline: getValue(raw, [
                "application_deadline",
                "deadline"
            ]),

            applicationRoute: getValue(raw, [
                "application_route",
                "application_process"
            ]),

            phdAvailable: getValue(raw, [
                "phd_available",
                "doctoral_available"
            ]),

            catalogueUrl: getValue(raw, [
                "official_programme_catalogue",
                "programme_url",
                "official_course_url"
            ]),

            bachelorMasterUrl: getValue(raw, [
                "official_bachelor_master"
            ]),

            applicationUrl: getValue(raw, [
                "official_application",
                "application_url"
            ]),

            feesUrl: getValue(raw, [
                "official_fees",
                "fees_url"
            ]),

            requirementsUrl: getValue(raw, [
                "official_requirements_source",
                "official_requirements_url"
            ]),

            lastChecked: getValue(raw, [
                "last_checked",
                "source_checked_at"
            ])
        };

        /*
           Precompute searchable corpus once. Filtering does
           not normalise all CSV columns repeatedly on every key.
        */

        course.searchText = normalise([
            ...Object.values(raw),
            course.programme,
            course.university,
            course.degree,
            course.field,
            course.faculty,
            course.state,
            course.city
        ].join(" "));

        course.normalisedState =
            normalise(course.state);

        course.normalisedField =
            normalise(course.field);

        course.normalisedLanguage =
            normalise(course.language);

        course.normalisedAdmission =
            normalise(course.admission);

        return course;
    }


    /* ========================================================
       OPTIONS
    ======================================================== */

    function uniqueSorted(values) {
        const map = new Map();

        values.forEach(value => {
            const text = String(value ?? "").trim();

            if (isEmpty(text)) return;

            const key = normalise(text);

            if (!map.has(key)) {
                map.set(key, text);
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


    function setSelect(select, values, allLabel) {
        if (!select) return;

        const oldValue = select.value;

        select.innerHTML = [
            `<option value="__all__">${escapeHtml(allLabel)}</option>`,
            ...values.map(value =>
                `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
            )
        ].join("");

        if (
            [...select.options].some(
                option => option.value === oldValue
            )
        ) {
            select.value = oldValue;
        } else {
            select.value = "__all__";
        }
    }


    function routeCourses(level) {
        if (level === "all") {
            return state.rows;
        }

        return state.rows.filter(
            course => course.level === level
        );
    }


    function previousBachelorOptions() {
        return state.rows.filter(
            course =>
                course.level === "bachelor" &&
                course.programme
        );
    }


    function fieldListFor(level) {
        const courses = routeCourses(level);

        let values = uniqueSorted(
            courses.map(course => course.field)
        );

        /*
           Master's degree selection reorders suggestions.
           It does NOT remove other fields; the user can still
           explore every Master's programme.
        */

        if (
            level === "master" &&
            state.selectedBachelor
        ) {
            const priorField =
                normalise(
                    state.selectedBachelor.field
                );

            const priorName =
                normalise(
                    state.selectedBachelor.programme
                );

            const priorText =
                `${priorField} ${priorName}`;

            values.sort((a, b) => {
                const score = value => {
                    const text = normalise(value);
                    let result = 0;

                    if (
                        priorField &&
                        text === priorField
                    ) {
                        result += 100;
                    }

                    if (
                        text &&
                        priorText.includes(text)
                    ) {
                        result += 20;
                    }

                    const familyMatches =
                        FIELD_RULES.some(rule =>
                            rule.label === value &&
                            rule.terms.some(term =>
                                priorText.includes(
                                    normalise(term)
                                )
                            )
                        );

                    if (familyMatches) {
                        result += 30;
                    }

                    return result;
                };

                return score(b) - score(a) ||
                    a.localeCompare(b);
            });
        }

        return values;
    }


    function updateFields() {
        const level =
            $("courseDegreeLevel")?.value || "all";

        const select =
            $("courseField");

        if (!select) return;

        const options =
            fieldListFor(level);

        setSelect(
            select,
            options,
            "All fields"
        );
    }


    function updateFilterOptions() {
        setSelect(
            $("courseState"),
            uniqueSorted(
                state.rows.map(course => course.state)
            ),
            "All states"
        );

        setSelect(
            $("courseLanguage"),
            uniqueSorted(
                state.rows.map(course => course.language)
            ),
            "All languages"
        );

        setSelect(
            $("courseAdmission"),
            uniqueSorted(
                state.rows.map(course => course.admission)
            ),
            "All admission statuses"
        );
    }


    /* ========================================================
       PREVIOUS BACHELOR LOOKUP
    ======================================================== */

    function makeBachelorOptions() {
        const list =
            $("coursePreviousBachelorOptions");

        if (!list) return;

        const courses =
            previousBachelorOptions();

        state.bachelorLookup.clear();

        const options = [];

        courses.forEach(course => {
            const label = [
                course.programme,
                course.field
            ].filter(Boolean).join(" â€” ");

            const key = normalise(label);

            if (
                !key ||
                state.bachelorLookup.has(key)
            ) {
                return;
            }

            state.bachelorLookup.set(key, course);

            options.push({
                label,
                key
            });
        });

        options.sort(
            (a, b) =>
                a.label.localeCompare(b.label)
        );

        list.innerHTML =
            options.map(item =>
                `<option value="${escapeHtml(item.label)}"></option>`
            ).join("");
    }


    /* ========================================================
       CSS
    ======================================================== */

    function addStyles() {
        if ($("course-explorer-styles")) return;

        const style =
            document.createElement("style");

        style.id =
            "course-explorer-styles";

        style.textContent = `
            #courseExplorer {
                width: min(1400px, calc(100% - 24px));
                margin: 28px auto;
                padding: 24px;
                border: 1px solid #e5e7eb;
                border-radius: 20px;
                background: #fff;
                box-shadow: 0 10px 30px rgba(15,23,42,.06);
                box-sizing: border-box;
                color: #172033;
            }

            #courseExplorer * {
                box-sizing: border-box;
            }

            #courseExplorer .ce-head {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 18px;
            }

            #courseExplorer h2 {
                margin: 0 0 7px;
                font-size: 26px;
                line-height: 1.25;
                color: #0f172a;
            }

            #courseExplorer .ce-subtitle {
                margin: 0;
                max-width: 850px;
                color: #64748b;
                font-size: 14px;
                line-height: 1.65;
            }

            #courseExplorer .ce-count {
                padding: 9px 12px;
                border-radius: 999px;
                background: #eff6ff;
                color: #1d4ed8;
                font-size: 12px;
                font-weight: 800;
                white-space: nowrap;
            }

            #courseExplorer .ce-controls {
                display: grid;
                grid-template-columns: repeat(3, minmax(0,1fr));
                gap: 12px;
                margin: 18px 0 12px;
            }

            #courseExplorer .ce-search-controls {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr;
                gap: 12px;
                margin: 12px 0;
            }

            #courseExplorer .ce-control {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
            }

            #courseExplorer .ce-control label {
                font-size: 12px;
                font-weight: 800;
                color: #334155;
            }

            #courseExplorer input,
            #courseExplorer select,
            #courseExplorer button {
                width: 100%;
                min-height: 44px;
                padding: 9px 11px;
                border: 1px solid #dbe2ea;
                border-radius: 10px;
                background: white;
                color: #0f172a;
                font: inherit;
                min-width: 0;
            }

            #courseExplorer .ce-reset {
                background: #0f172a;
                border-color: #0f172a;
                color: white;
                font-weight: 800;
                cursor: pointer;
            }

            #courseExplorer .ce-note {
                margin: 14px 0;
                padding: 12px 14px;
                border: 1px solid #dbeafe;
                border-radius: 11px;
                background: #f8fbff;
                color: #475569;
                font-size: 12px;
                line-height: 1.65;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-note strong {
                color: #1d4ed8;
            }

            #courseExplorer .ce-summary {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                margin: 16px 0;
                color: #64748b;
                font-size: 12px;
                line-height: 1.6;
            }

            #courseExplorer .ce-list {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
            }

            #courseExplorer .ce-card {
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                padding: 16px;
                background: white;
                min-width: 0;
            }

            #courseExplorer .ce-card-title {
                margin: 0 0 5px;
                font-size: 16px;
                font-weight: 800;
                line-height: 1.45;
                color: #0f172a;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-university {
                font-size: 13px;
                color: #475569;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 9px;
            }

            #courseExplorer .ce-badge {
                padding: 5px 8px;
                border-radius: 8px;
                background: #f1f5f9;
                color: #334155;
                font-size: 11px;
                font-weight: 800;
                line-height: 1.4;
            }

            #courseExplorer .ce-badge.blue {
                background: #eff6ff;
                color: #1d4ed8;
            }

            #courseExplorer .ce-facts {
                display: grid;
                grid-template-columns: repeat(4, minmax(0,1fr));
                gap: 8px;
                margin: 13px 0;
            }

            #courseExplorer .ce-fact {
                min-width: 0;
                padding: 10px;
                border-radius: 9px;
                background: #f8fafc;
            }

            #courseExplorer .ce-fact-label {
                display: block;
                margin-bottom: 5px;
                color: #64748b;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: .03em;
            }

            #courseExplorer .ce-fact-value {
                display: block;
                color: #0f172a;
                font-size: 12px;
                line-height: 1.5;
                overflow-wrap: anywhere;
                white-space: pre-wrap;
            }

            #courseExplorer details {
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid #eef2f7;
            }

            #courseExplorer summary {
                cursor: pointer;
                color: #2563eb;
                font-size: 12px;
                font-weight: 800;
                line-height: 1.6;
            }

            #courseExplorer .ce-requirements {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 12px;
            }

            #courseExplorer .ce-requirement {
                min-width: 0;
                padding: 12px;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #f8fafc;
            }

            #courseExplorer .ce-requirement h4 {
                margin: 0 0 7px;
                font-size: 12px;
                color: #334155;
            }

            #courseExplorer .ce-requirement p {
                margin: 0;
                color: #475569;
                font-size: 12px;
                line-height: 1.7;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-all-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-top: 12px;
            }

            #courseExplorer .ce-detail {
                min-width: 0;
                padding: 9px;
                border-radius: 8px;
                background: #f8fafc;
            }

            #courseExplorer .ce-detail-key {
                display: block;
                margin-bottom: 4px;
                color: #64748b;
                font-size: 10px;
                font-weight: 800;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-detail-value {
                display: block;
                color: #334155;
                font-size: 11px;
                line-height: 1.6;
                overflow-wrap: anywhere;
                white-space: pre-wrap;
            }

            #courseExplorer .ce-links {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            #courseExplorer .ce-link {
                display: inline-block;
                padding: 8px 10px;
                border: 1px solid #dbeafe;
                border-radius: 9px;
                background: #eff6ff;
                color: #1d4ed8;
                font-size: 11px;
                font-weight: 800;
                text-decoration: none;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-empty {
                padding: 28px 16px;
                border: 1px dashed #cbd5e1;
                border-radius: 12px;
                color: #64748b;
                text-align: center;
                font-size: 13px;
                line-height: 1.7;
            }

            #courseExplorer .ce-pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 18px;
            }

            #courseExplorer .ce-pagination button {
                width: auto;
                min-height: 40px;
                padding: 8px 14px;
                cursor: pointer;
                font-weight: 800;
            }

            #courseExplorer .ce-pagination button:disabled {
                cursor: not-allowed;
                opacity: .4;
            }

            #courseExplorer .ce-pagination span {
                color: #64748b;
                font-size: 12px;
            }

            @media (max-width: 900px) {
                #courseExplorer .ce-controls {
                    grid-template-columns: 1fr 1fr;
                }

                #courseExplorer .ce-search-controls {
                    grid-template-columns: 1fr 1fr;
                }

                #courseExplorer .ce-facts {
                    grid-template-columns: repeat(2,minmax(0,1fr));
                }
            }

            @media (max-width: 600px) {
                #courseExplorer {
                    width: calc(100% - 16px);
                    padding: 14px;
                    margin: 18px auto;
                    border-radius: 15px;
                }

                #courseExplorer h2 {
                    font-size: 22px;
                }

                #courseExplorer .ce-controls,
                #courseExplorer .ce-search-controls,
                #courseExplorer .ce-requirements,
                #courseExplorer .ce-all-details {
                    grid-template-columns: 1fr;
                }

                #courseExplorer .ce-facts {
                    grid-template-columns: 1fr 1fr;
                }

                #courseExplorer .ce-card {
                    padding: 13px;
                }
            }
        `;

        document.head.appendChild(style);
    }


    /* ========================================================
       CREATE SECTION

       Does not replace existing index.html sections.
    ======================================================== */

    function createSection() {
        const existingCourseExplorer = $("courseExplorer");

        if (existingCourseExplorer) {
            existingCourseExplorer.remove();
        }

        addStyles();

        const section =
            document.createElement("section");

        section.id = "courseExplorer";

        section.innerHTML = `
            <div class="ce-head">
                <div>
                    <h2>Study Programme Explorer</h2>

                    <p class="ce-subtitle">
                        Browse the course dataset by degree level,
                        subject, university, language and state.
                        Open any programme to inspect its requirements,
                        fees, deadlines and official links.
                    </p>
                </div>

                <div class="ce-count" id="ceTotal">
                    Loading course recordsâ€¦
                </div>
            </div>

            <div class="ce-controls">
                <div class="ce-control">
                    <label for="ceLevel">
                        1. Study level
                    </label>

                    <select id="ceLevel">
                        <option value="all">All courses</option>
                        <option value="bachelor">Bachelor's / Undergraduate</option>
                        <option value="master">Master's</option>
                        <option value="phd">PhD / Doctoral</option>
                        <option value="teaching">Teaching / Lehramt</option>
                        <option value="other">Other / level not stated</option>
                    </select>
                </div>

                <div class="ce-control">
                    <label for="ceField">
                        2. Subject / field
                    </label>

                    <select id="ceField">
                        <option value="__all__">All fields</option>
                    </select>
                </div>

                <div
                    class="ce-control"
                    id="ceBachelorWrap"
                    hidden
                >
                    <label for="ceBachelor">
                        Previous Bachelor's degree (optional)
                    </label>

                    <input
                        id="ceBachelor"
                        list="ceBachelorOptions"
                        placeholder="Type or choose a programme"
                        autocomplete="off"
                    >

                    <datalist id="ceBachelorOptions"></datalist>
                </div>
            </div>

            <div class="ce-search-controls">
                <div class="ce-control">
                    <label for="ceSearch">
                        Search programme, subject or requirements
                    </label>

                    <input
                        id="ceSearch"
                        type="search"
                        placeholder="Try commerce, computer science, AI, engineeringâ€¦"
                        autocomplete="off"
                    >
                </div>

                <div class="ce-control">
                    <label for="ceState">German state</label>

                    <select id="ceState">
                        <option value="__all__">All states</option>
                    </select>
                </div>

                <div class="ce-control">
                    <label for="ceLanguage">Language of instruction</label>

                    <select id="ceLanguage">
                        <option value="__all__">All languages</option>
                    </select>
                </div>
            </div>

            <div class="ce-search-controls">
                <div class="ce-control">
                    <label for="ceAdmission">Admission status</label>

                    <select id="ceAdmission">
                        <option value="__all__">All admission statuses</option>
                    </select>
                </div>

                <div class="ce-control">
                    <label for="ceSort">Sort results</label>

                    <select id="ceSort">
                        <option value="programme">Programme Aâ€“Z</option>
                        <option value="university">University Aâ€“Z</option>
                        <option value="state">State Aâ€“Z</option>
                    </select>
                </div>

                <div class="ce-control">
                    <label>&nbsp;</label>

                    <button
                        type="button"
                        class="ce-reset"
                        id="ceReset"
                    >
                        Reset course filters
                    </button>
                </div>
            </div>

            <div class="ce-note" id="ceNote">
                All courses are shown by default. Choose a study level
                and field to narrow the results.
            </div>

            <div class="ce-summary">
                <span id="ceResultsCount">
                    Loadingâ€¦
                </span>

                <span>
                    20 programmes per page for faster mobile browsing.
                </span>
            </div>

            <div class="ce-list" id="ceList"></div>

            <div
                class="ce-pagination"
                id="cePagination"
            ></div>
        `;


        /*
           Put the explorer after the existing study fields section.
        */

        const anchor =
            $("fieldList") ||
            $("stateUniversityList") ||
            $("industryList");

        if (anchor) {
            const sectionParent =
                anchor.closest(
                    ".section, section"
                ) || anchor.parentElement;

            if (
                sectionParent &&
                sectionParent.parentNode
            ) {
                sectionParent.parentNode.insertBefore(
                    section,
                    sectionParent.nextSibling
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
       PREVIOUS BACHELOR SUGGESTION

       Suggestions influence field ordering but never guarantee
       or block eligibility.
    ======================================================== */

    function findBachelorSelection() {
        const input = $("ceBachelor");

        if (!input) return;

        const key = normalise(input.value);

        state.selectedBachelor =
            state.bachelorLookup.get(key) || null;

        updateFields();

        render();
    }


    function setupBachelorOptions() {
        const datalist =
            $("ceBachelorOptions");

        if (!datalist) return;

        const bachelorCourses =
            routeCourses("bachelor");

        const labels = new Map();

        bachelorCourses.forEach(course => {
            if (!course.programme) return;

            const label = [
                course.programme,
                course.field
            ].filter(Boolean).join(" â€” ");

            const key = normalise(label);

            if (!labels.has(key)) {
                labels.set(key, {
                    label,
                    course
                });
            }
        });

        state.bachelorLookup.clear();

        const sorted = [...labels.values()].sort(
            (a, b) =>
                a.label.localeCompare(b.label)
        );

        datalist.innerHTML =
            sorted.map(item => {
                state.bachelorLookup.set(
                    normalise(item.label),
                    item.course
                );

                return `
                    <option value="${escapeHtml(item.label)}"></option>
                `;
            }).join("");
    }


    /* ========================================================
       RESULT HELPERS
    ======================================================== */

    function visibleCourses() {
        const level =
            $("ceLevel")?.value || "all";

        const field =
            $("ceField")?.value || "__all__";

        const stateFilter =
            $("ceState")?.value || "__all__";

        const languageFilter =
            $("ceLanguage")?.value || "__all__";

        const admissionFilter =
            $("ceAdmission")?.value || "__all__";

        const query =
            $("ceSearch")?.value || "";


        let result =
            routeCourses(level);


        if (field !== "__all__") {
            const selected = normalise(field);

            result = result.filter(course =>
                normalise(course.field) === selected
            );
        }


        if (stateFilter !== "__all__") {
            const selected = normalise(stateFilter);

            result = result.filter(course =>
                course.normalisedState === selected
            );
        }


        if (languageFilter !== "__all__") {
            const selected = normalise(languageFilter);

            result = result.filter(course =>
                course.normalisedLanguage === selected
            );
        }


        if (admissionFilter !== "__all__") {
            const selected = normalise(admissionFilter);

            result = result.filter(course =>
                course.normalisedAdmission === selected
            );
        }


        if (query.trim()) {
            result = result.filter(course =>
                matchesSearch(course, query)
            );
        }


        const sort =
            $("ceSort")?.value || "programme";

        const fieldMap = {
            programme: "programme",
            university: "university",
            state: "state"
        };

        const key = fieldMap[sort] || "programme";

        result = [...result].sort((a, b) =>
            String(a[key] || "").localeCompare(
                String(b[key] || ""),
                undefined,
                { sensitivity: "base" }
            )
        );

        return result;
    }


    /* ========================================================
       COURSE CARDS
    ======================================================== */

    function safeUrl(value) {
        const raw = String(value ?? "").trim();

        if (!raw) return "";

        try {
            const url = new URL(
                raw,
                window.location.href
            );

            if (
                !["http:", "https:"].includes(url.protocol)
            ) {
                return "";
            }

            return url.href;
        } catch (_) {
            return "";
        }
    }


    function linkButton(label, value) {
        const url = safeUrl(value);

        if (!url) return "";

        return `
            <a
                class="ce-link"
                href="${escapeHtml(url)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${escapeHtml(label)}
            </a>
        `;
    }


    function fact(label, value) {
        return `
            <div class="ce-fact">
                <span class="ce-fact-label">
                    ${escapeHtml(label)}
                </span>

                <span class="ce-fact-value">
                    ${escapeHtml(displayValue(value))}
                </span>
            </div>
        `;
    }


    function allSourceDetails(course) {
        const entries =
            Object.entries(course.raw)
                .filter(([key, value]) => {
                    if (isEmpty(value)) return false;

                    const header = normalise(key);

                    return ![
                        "index",
                        "sr no",
                        "sr no.",
                        "row number"
                    ].includes(header);
                });

        if (!entries.length) {
            return `
                <div class="ce-empty">
                    No additional source fields were provided for this record.
                </div>
            `;
        }

        return `
            <div class="ce-all-details">
                ${
                    entries.map(([key, value]) => `
                        <div class="ce-detail">
                            <span class="ce-detail-key">
                                ${escapeHtml(key)}
                            </span>

                            <span class="ce-detail-value">
                                ${escapeHtml(value)}
                            </span>
                        </div>
                    `).join("")
                }
            </div>
        `;
    }


    function renderCard(course) {
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
            ),
            linkButton(
                "Requirements source",
                course.requirementsUrl
            )
        ].filter(Boolean).join("");


        const degree =
            course.degree || course.levelLabel;


        return `
            <article class="ce-card">
                <h3 class="ce-card-title">
                    ${escapeHtml(
                        displayValue(course.programme)
                    )}
                </h3>

                <div class="ce-university">
                    ${escapeHtml(
                        displayValue(course.university)
                    )}

                    Â·

                    ${escapeHtml(
                        displayValue(course.city)
                    )}

                    Â·

                    ${escapeHtml(
                        displayValue(course.state)
                    )}
                </div>

                <div class="ce-badges">
                    <span class="ce-badge blue">
                        ${escapeHtml(degree)}
                    </span>

                    <span class="ce-badge">
                        ${escapeHtml(course.field)}
                    </span>

                    ${
                        course.admission
                            ? `
                                <span class="ce-badge">
                                    ${escapeHtml(course.admission)}
                                </span>
                              `
                            : ""
                    }
                </div>

                <div class="ce-facts">
                    ${fact(
                        "Language",
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
                        course.contribution
                    )}

                    ${fact(
                        "Application deadline",
                        course.deadline
                    )}
                </div>

                <details>
                    <summary>
                        View entry requirements, language requirements
                        and all available source details
                    </summary>

                    <div class="ce-requirements">
                        <div class="ce-requirement">
                            <h4>Entry / admission requirements</h4>
                            <p>${escapeHtml(
                                displayValue(
                                    course.entryRequirements
                                )
                            )}</p>
                        </div>

                        <div class="ce-requirement">
                            <h4>Language requirements</h4>
                            <p>${escapeHtml(
                                displayValue(
                                    course.languageRequirements
                                )
                            )}</p>
                        </div>

                        <div class="ce-requirement">
                            <h4>Application route</h4>
                            <p>${escapeHtml(
                                displayValue(
                                    course.applicationRoute
                                )
                            )}</p>
                        </div>

                        <div class="ce-requirement">
                            <h4>University-level doctoral availability</h4>
                            <p>${escapeHtml(
                                displayValue(
                                    course.phdAvailable
                                )
                            )}</p>
                        </div>
                    </div>

                    ${allSourceDetails(course)}

                    <div class="ce-links">
                        ${
                            links ||
                            `
                                <span>
                                    No official URL was provided for this record.
                                </span>
                            `
                        }
                    </div>
                </details>
            </article>
        `;
    }


    /* ========================================================
       FIELD OPTIONS

       "All fields" stays available at every study level, so
       users can immediately see courses without selecting one.
    ======================================================== */

    function updateFields() {
        const level =
            $("ceLevel")?.value || "all";

        const select =
            $("ceField");

        const bachelorWrap =
            $("ceBachelorWrap");

        if (!select) return;

        if (bachelorWrap) {
            bachelorWrap.hidden =
                level !== "master";
        }

        const oldField = select.value;

        const options = uniqueSorted(
            routeCourses(level).map(course =>
                course.field
            )
        );

        setSelect(
            select,
            options,
            "All fields"
        );

        if (
            options.some(
                option =>
                    normalise(option) === normalise(oldField)
            )
        ) {
            select.value = oldField;
        } else {
            select.value = "__all__";
        }
    }


    /* ========================================================
       DATA QUALITY DIAGNOSTICS

       These counts help show whether a problem comes from the
       interface or from missing/uncategorised source values.
    ======================================================== */

    function renderDiagnostics() {
        const counts = {
            bachelor: 0,
            master: 0,
            phd: 0,
            teaching: 0,
            other: 0
        };

        let missingField = 0;
        let missingRequirements = 0;

        state.rows.forEach(course => {
            counts[course.level] =
                (counts[course.level] || 0) + 1;

            if (course.field === "Other / not stated") {
                missingField++;
            }

            if (
                isEmpty(course.entryRequirements) &&
                isEmpty(course.languageRequirements)
            ) {
                missingRequirements++;
            }
        });

        const note =
            $("ceNote");

        if (!note) return;

        note.innerHTML = `
            <strong>Dataset coverage:</strong>

            ${state.rows.length.toLocaleString()} source records.

            Bachelor's / undergraduate:
            ${counts.bachelor.toLocaleString()}.

            Master's:
            ${counts.master.toLocaleString()}.

            PhD / doctoral:
            ${counts.phd.toLocaleString()}.

            Teaching / Lehramt:
            ${counts.teaching.toLocaleString()}.

            Other / unspecified level:
            ${counts.other.toLocaleString()}.

            <br><br>

            Fields inferred or unavailable:
            ${missingField.toLocaleString()}.

            Records missing both entry and language requirements:
            ${missingRequirements.toLocaleString()}.

            <br><br>

            Fields are inferred from programme titles only when source
            fields are missing. They are search aids, not official
            academic classifications. Course requirements and deadlines
            must be verified on each official programme page.
        `;
    }


    /* ========================================================
       RENDER
    ======================================================== */

    function render() {
        const list =
            $("ceList");

        const pagination =
            $("cePagination");

        const summary =
            $("ceResultsCount");

        if (!list || !pagination) return;

        const totalBadge =
            $("ceTotal");

        if (totalBadge) {
            totalBadge.textContent =
                `${state.rows.length.toLocaleString()} course records`;
        }


        const level =
            $("ceLevel")?.value || "all";

        const matching =
            visibleCourses();


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    matching.length / PAGE_SIZE
                )
            );

        state.page =
            Math.min(
                state.page,
                totalPages - 1
            );


        const start =
            state.page * PAGE_SIZE;

        const visible =
            matching.slice(
                start,
                start + PAGE_SIZE
            );


        if (summary) {
            summary.textContent =
                matching.length
                    ? `Showing ${(start + 1).toLocaleString()}â€“` +
                      `${Math.min(start + PAGE_SIZE, matching.length).toLocaleString()} ` +
                      `of ${matching.length.toLocaleString()} matching records.`
                    : `No matching records for these filters. ` +
                      `${state.rows.length.toLocaleString()} source records were loaded.`;
        }


        /*
           PhD is intentionally not fabricated from phd_available.
        */

        if (
            level === "phd" &&
            matching.length === 0
        ) {
            list.innerHTML = `
                <div class="ce-empty">
                    No individual PhD / doctoral programme rows were
                    identified in the current course data.

                    <br><br>

                    A university-level "PhD available" flag is not
                    an individual doctoral course. Choose All Courses
                    to inspect the source records, or add individual
                    doctoral programme records to the dataset.
                </div>
            `;

        } else if (!visible.length) {
            list.innerHTML = `
                <div class="ce-empty">
                    No programmes match the current filters.
                    Try All fields, clear the search, or select a
                    different degree level or state.
                </div>
            `;

        } else {
            list.innerHTML =
                visible.map(renderCard).join("");
        }


        if (
            matching.length > PAGE_SIZE
        ) {
            pagination.innerHTML = `
                <button
                    id="cePrev"
                    type="button"
                    ${state.page === 0 ? "disabled" : ""}
                >
                    Previous
                </button>

                <span>
                    Page ${(state.page + 1).toLocaleString()}
                    of ${totalPages.toLocaleString()}
                </span>

                <button
                    id="ceNext"
                    type="button"
                    ${state.page >= totalPages - 1 ? "disabled" : ""}
                >
                    Next
                </button>
            `;

            $("cePrev")?.addEventListener(
                "click",
                () => {
                    state.page =
                        Math.max(0, state.page - 1);

                    render();

                    $("courseExplorer")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            );

            $("ceNext")?.addEventListener(
                "click",
                () => {
                    state.page =
                        Math.min(
                            totalPages - 1,
                            state.page + 1
                        );

                    render();

                    $("courseExplorer")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            );
        } else {
            pagination.innerHTML =
                matching.length
                    ? "<span>All matching records are shown.</span>"
                    : "";
        }
    }


    function refresh(resetPage = true) {
        if (resetPage) {
            state.page = 0;
        }

        render();
    }


    /* ========================================================
       EVENTS
    ======================================================== */

    function setupEvents() {
        $("ceLevel")?.addEventListener(
            "change",
            () => {
                state.page = 0;
                state.selectedBachelor = null;

                if ($("ceBachelor")) {
                    $("ceBachelor").value = "";
                }

                updateFields();
                render();
            }
        );


        $("ceField")?.addEventListener(
            "change",
            () => refresh(true)
        );


        $("ceState")?.addEventListener(
            "change",
            () => refresh(true)
        );


        $("ceLanguage")?.addEventListener(
            "change",
            () => refresh(true)
        );


        $("ceAdmission")?.addEventListener(
            "change",
            () => refresh(true)
        );


        $("ceSort")?.addEventListener(
            "change",
            () => refresh(true)
        );


        $("ceSearch")?.addEventListener(
            "input",
            () => {
                clearTimeout(state.timer);

                state.timer = setTimeout(
                    () => refresh(true),
                    160
                );
            }
        );


        $("ceBachelor")?.addEventListener(
            "change",
            findBachelorSelection
        );


        $("ceReset")?.addEventListener(
            "click",
            () => {
                $("ceLevel").value = "all";
                $("ceBachelor").value = "";
                $("ceSearch").value = "";
                $("ceState").value = "__all__";
                $("ceLanguage").value = "__all__";
                $("ceAdmission").value = "__all__";
                $("ceSort").value = "programme";

                state.selectedBachelor = null;
                state.page = 0;

                updateFields();

                $("ceField").value = "__all__";

                render();
            }
        );
    }


    /* ========================================================
       LOAD DATA

       Parse and normalise the CSV once. Search and filters use
       precomputed normalised fields, rather than rebuilding
       the whole search text on every keystroke.
    ======================================================== */

    async function initialise() {
        if (state.loading) {
            return;
        }

        state.loading = true;

        createSection();

        $("ceList").innerHTML = `
            <div class="ce-empty">
                Loading programme dataâ€¦
            </div>
        `;

        try {
            const response =
                await fetch(
                    CSV_URL,
                    { cache: "no-store" }
                );

            if (!response.ok) {
                throw new Error(
                    `Course CSV returned HTTP ${response.status}.`
                );
            }

            const csv =
                await response.text();

            const rawRows =
                parseCSV(csv);

            state.rows =
                rawRows
                    .map(standardise)
                    .filter(course =>
                        course.programme ||
                        course.university
                    );


            if (!state.rows.length) {
                throw new Error(
                    "The CSV loaded but no course rows with a programme " +
                    "or university name were found. Check the CSV headers."
                );
            }


            setupBachelorOptions();

            updateFilterOptions();

            updateFields();

            setupEvents();

            renderDiagnostics();

            render();


            console.info(
                "Study Programme Explorer loaded",
                {
                    totalSourceRows:
                        rawRows.length,

                    displayedCourseRows:
                        state.rows.length,

                    bachelor's:
                        routeCourses("bachelor").length,

                    master's:
                        routeCourses("master").length,

                    doctoral:
                        routeCourses("phd").length,

                    teaching:
                        routeCourses("teaching").length,

                    other:
                        routeCourses("other").length,

                    sampleHeaders:
                        Object.keys(rawRows[0] || {})
                }
            );

        } catch (error) {
            console.error(
                "Study Programme Explorer failed:",
                error
            );

            $("ceList").innerHTML = `
                <div class="ce-empty">
                    The course CSV could not be loaded.

                    <br><br>

                    ${escapeHtml(error.message)}

                    <br><br>

                    Confirm that this file exists in your GitHub repository:

                    <br>

                    outputs/analytics/courses_analytics.csv
                </div>
            `;

            $("ceTotal").textContent =
                "Course data unavailable";

        } finally {
            state.loading = false;
        }
    }


    /* ========================================================
       START
    ======================================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            { once: true }
        );
    } else {
        initialise();
    }

})();
