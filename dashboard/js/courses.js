"use strict";

/* ============================================================
   GERMANY ADMIT AI HELPER
   STUDY PROGRAMME EXPLORER

   Reads the Python-prepared dataset:
   ../outputs/analytics/courses_categorized.csv

   Python prepares the data.
   JavaScript displays and filters it.
============================================================ */

(() => {
    const CSV_URL =
        "../outputs/analytics/courses_categorized.csv";

    const PAGE_SIZE = 20;

    const state = {
        rows: [],
        page: 0,
        timer: null,
        selectedBachelor: null,
        bachelorLabels: new Map()
    };

    const $ = id => document.getElementById(id);

    const val = value =>
        String(value ?? "").trim();

    const norm = value =>
        val(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
            .replace(/\s+/g, " ");

    const esc = value =>
        val(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const missing = value =>
        !val(value) ||
        ["nan", "none", "null", "n/a", "na",
         "not stated", "not provided",
         "not provided in source data"].includes(norm(value));

    const show = value =>
        missing(value)
            ? "Not provided in source data"
            : val(value);


    /* ========================================================
       CSV PARSER
    ======================================================== */

    function parseCSV(source) {
        source = String(source ?? "")
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

                if (row.some(value => val(value))) {
                    rows.push(row);
                }

                row = [];
                continue;
            }

            cell += ch;
        }

        if (cell.length || row.length) {
            row.push(cell);

            if (row.some(value => val(value))) {
                rows.push(row);
            }
        }

        if (!rows.length) return [];

        const headers = rows[0].map(
            value => val(value).replace(/^\uFEFF/, "")
        );

        return rows.slice(1).map(values => {
            const record = {};

            headers.forEach((header, index) => {
                record[header] = val(values[index]);
            });

            return record;
        });
    }


    /* ========================================================
       CSS — SCOPED TO THE COURSE EXPLORER
    ======================================================== */

    function addStyles() {
        if ($("courseExplorerStyles")) return;

        const style = document.createElement("style");

        style.id = "courseExplorerStyles";

        style.textContent = `
            #courseExplorer {
                width: min(1400px, calc(100% - 24px));
                margin: 28px auto;
                padding: 24px;
                box-sizing: border-box;
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 18px;
                box-shadow: 0 10px 30px rgba(15,23,42,.06);
                color: #172033;
            }

            #courseExplorer * {
                box-sizing: border-box;
            }

            #courseExplorer .ce-head {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 14px;
                flex-wrap: wrap;
            }

            #courseExplorer h2 {
                margin: 7px 0;
                font-size: 25px;
                line-height: 1.25;
                color: #0f172a;
            }

            #courseExplorer .ce-subtitle {
                max-width: 850px;
                margin: 0;
                color: #64748b;
                font-size: 14px;
                line-height: 1.65;
            }

            #courseExplorer .ce-eyebrow {
                font-size: 11px;
                font-weight: 800;
                letter-spacing: .12em;
                color: #2563eb;
            }

            #courseExplorer .ce-pill {
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
                margin-top: 20px;
            }

            #courseExplorer .ce-control {
                display: flex;
                flex-direction: column;
                gap: 6px;
                min-width: 0;
            }

            #courseExplorer label {
                font-size: 12px;
                font-weight: 800;
                color: #334155;
            }

            #courseExplorer input,
            #courseExplorer select {
                width: 100%;
                min-width: 0;
                min-height: 44px;
                border: 1px solid #dbe2ea;
                border-radius: 10px;
                padding: 9px 11px;
                background: #fff;
                color: #0f172a;
                font: inherit;
                font-weight: 400;
            }

            #courseExplorer .ce-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                margin: 16px 0;
                color: #64748b;
                font-size: 12px;
            }

            #courseExplorer button {
                padding: 9px 13px;
                border: 1px solid #cbd5e1;
                border-radius: 9px;
                background: #fff;
                color: #0f172a;
                font-weight: 800;
                cursor: pointer;
            }

            #courseExplorer #ceReset {
                border-color: #0f172a;
                background: #0f172a;
                color: #fff;
            }

            #courseExplorer .ce-hint {
                margin: 14px 0;
                padding: 12px 14px;
                border: 1px solid #dbeafe;
                border-radius: 11px;
                background: #f8fbff;
                color: #475569;
                font-size: 12px;
                line-height: 1.65;
            }

            #courseExplorer .ce-results {
                display: grid;
                gap: 12px;
            }

            #courseExplorer .ce-card {
                min-width: 0;
                padding: 16px;
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                background: #fff;
            }

            #courseExplorer .ce-title {
                margin: 0 0 5px;
                font-size: 16px;
                line-height: 1.5;
                color: #0f172a;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-university {
                font-size: 13px;
                color: #475569;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin: 10px 0;
            }

            #courseExplorer .ce-tag {
                padding: 5px 8px;
                border-radius: 8px;
                background: #eff6ff;
                color: #1d4ed8;
                font-size: 11px;
                font-weight: 800;
            }

            #courseExplorer .ce-facts {
                display: grid;
                grid-template-columns: repeat(4, minmax(0,1fr));
                gap: 8px;
                margin-top: 12px;
            }

            #courseExplorer .ce-fact {
                min-width: 0;
                padding: 9px;
                border-radius: 9px;
                background: #f8fafc;
            }

            #courseExplorer .ce-fact small {
                display: block;
                margin-bottom: 4px;
                color: #64748b;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
            }

            #courseExplorer .ce-fact span {
                display: block;
                color: #0f172a;
                font-size: 12px;
                line-height: 1.5;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
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

            #courseExplorer .ce-detail-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 9px;
                margin-top: 12px;
            }

            #courseExplorer .ce-detail {
                min-width: 0;
                padding: 11px;
                border-radius: 9px;
                background: #f8fafc;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-detail h4 {
                margin: 0 0 6px;
                font-size: 12px;
                color: #334155;
            }

            #courseExplorer .ce-detail p {
                margin: 0;
                font-size: 12px;
                line-height: 1.65;
                color: #475569;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-all-source {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 7px;
                margin-top: 12px;
            }

            #courseExplorer .ce-source-item {
                padding: 8px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                min-width: 0;
            }

            #courseExplorer .ce-source-key {
                display: block;
                font-size: 10px;
                font-weight: 800;
                color: #64748b;
                overflow-wrap: anywhere;
                margin-bottom: 4px;
            }

            #courseExplorer .ce-source-value {
                display: block;
                font-size: 11px;
                color: #334155;
                line-height: 1.6;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            #courseExplorer .ce-links {
                display: flex;
                flex-wrap: wrap;
                gap: 9px;
                margin-top: 12px;
            }

            #courseExplorer .ce-links a {
                font-size: 12px;
                font-weight: 800;
                color: #1d4ed8;
                text-decoration: none;
            }

            #courseExplorer .ce-empty {
                padding: 27px 15px;
                border: 1px dashed #cbd5e1;
                border-radius: 12px;
                text-align: center;
                color: #64748b;
                line-height: 1.7;
                font-size: 13px;
            }

            #courseExplorer .ce-pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 18px;
                color: #64748b;
                font-size: 12px;
            }

            #courseExplorer [hidden] {
                display: none !important;
            }

            @media(max-width:850px) {
                #courseExplorer .ce-controls {
                    grid-template-columns: 1fr 1fr;
                }

                #courseExplorer .ce-facts {
                    grid-template-columns: 1fr 1fr;
                }
            }

            @media(max-width:560px) {
                #courseExplorer {
                    width: calc(100% - 16px);
                    padding: 14px;
                    margin: 18px auto;
                }

                #courseExplorer h2 {
                    font-size: 22px;
                }

                #courseExplorer .ce-controls,
                #courseExplorer .ce-detail-grid,
                #courseExplorer .ce-all-source {
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
    ======================================================== */

    function createSection() {
        const previous = $("courseExplorer");

        if (previous) {
            previous.remove();
        }

        addStyles();

        const section = document.createElement("section");

        section.id = "courseExplorer";

        section.innerHTML = `
            <div class="ce-head">
                <div>
                    <span class="ce-eyebrow">
                        STUDY PROGRAMMES
                    </span>

                    <h2>
                        Study Programme Explorer
                    </h2>

                    <p class="ce-subtitle">
                        Browse the prepared programme dataset by
                        qualification, subject, state and language.
                        All available requirements and source information
                        are preserved in each programme record.
                    </p>
                </div>

                <span class="ce-pill" id="ceTotal">
                    Loading courses…
                </span>
            </div>

            <div class="ce-controls">

                <div class="ce-control">
                    <label for="ceLevel">
                        1. Study level
                    </label>

                    <select id="ceLevel">
                        <option value="__all__">All courses</option>
                        <option value="Bachelor's / Undergraduate">
                            Bachelor's / Undergraduate
                        </option>
                        <option value="Master's">Master's</option>
                        <option value="PhD / Doctoral">
                            PhD / Doctoral
                        </option>
                        <option value="Teaching / Lehramt">
                            Teaching / Lehramt
                        </option>
                        <option value="State Examination">
                            State Examination
                        </option>
                        <option value="Vocational Training">
                            Vocational Training
                        </option>
                        <option value="Other / level not stated">
                            Other / level not stated
                        </option>
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
                        Completed Bachelor's programme (optional)
                    </label>

                    <input
                        id="ceBachelor"
                        list="ceBachelorOptions"
                        placeholder="Type a Bachelor's programme"
                    >

                    <datalist id="ceBachelorOptions"></datalist>
                </div>

                <div class="ce-control">
                    <label for="ceSearch">
                        Search programmes
                    </label>

                    <input
                        id="ceSearch"
                        type="search"
                        placeholder="Commerce, AI, biology, university…"
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
                    <label for="ceLanguage">
                        Language of instruction
                    </label>

                    <select id="ceLanguage">
                        <option value="__all__">All languages</option>
                    </select>
                </div>

            </div>

            <div class="ce-hint" id="ceHint">
                All courses are shown by default.
                Select a study level or field to narrow the list.
            </div>

            <div class="ce-actions">
                <span id="ceCount">Loading records…</span>

                <button id="ceReset" type="button">
                    Reset filters
                </button>
            </div>

            <div class="ce-results" id="ceResults"></div>

            <div
                class="ce-pagination"
                id="cePagination"
            ></div>
        `;

        const anchor =
            $("fieldList") ||
            $("stateUniversityList") ||
            $("industryList");

        if (anchor) {
            const parent =
                anchor.closest(".section, section") ||
                anchor.parentElement;

            if (parent && parent.parentNode) {
                parent.parentNode.insertBefore(
                    section,
                    parent.nextSibling
                );
            } else {
                document.body.appendChild(section);
            }
        } else {
            document.body.appendChild(section);
        }
    }


    /* ========================================================
       DATA AND FILTER OPTIONS
    ======================================================== */

    function read(row, key) {
        return val(row[key]);
    }

    function unique(values) {
        const map = new Map();

        values.forEach(value => {
            const display = val(value);

            if (!display) return;

            const key = norm(display);

            if (!map.has(key)) {
                map.set(key, display);
            }
        });

        return [...map.values()].sort(
            (a, b) => a.localeCompare(b)
        );
    }

    function setOptions(
        id,
        values,
        label,
        preserve = true
    ) {
        const select = $(id);

        if (!select) return;

        const previous = select.value;

        select.innerHTML =
            `<option value="__all__">${esc(label)}</option>` +
            values.map(value =>
                `<option value="${esc(value)}">${esc(value)}</option>`
            ).join("");

        if (
            preserve &&
            [...select.options].some(
                option => option.value === previous
            )
        ) {
            select.value = previous;
        } else {
            select.value = "__all__";
        }
    }

    function bachelorLabel(row) {
        return [
            read(row, "programme_name"),
            read(row, "field_category") ||
                read(row, "field_display")
        ].filter(Boolean).join(" — ");
    }

    function updateOptions() {
        const level = $("ceLevel").value;

        const subset = state.rows.filter(row =>
            level === "__all__" ||
            read(row, "degree_category") === level
        );

        const oldField = $("ceField").value;

        const fields = unique(
            subset.map(row =>
                read(row, "field_category") ||
                read(row, "field_display") ||
                "Other / not stated"
            )
        );

        setOptions(
            "ceField",
            fields,
            "All fields",
            false
        );

        if (
            fields.some(
                field => norm(field) === norm(oldField)
            )
        ) {
            $("ceField").value = oldField;
        }

        $("ceBachelorWrap").hidden =
            level !== "Master's";

        const bachelorRows = state.rows.filter(
            row =>
                read(row, "degree_category") ===
                "Bachelor's / Undergraduate"
        );

        state.bachelorLabels.clear();

        const labels = [];

        bachelorRows.forEach(row => {
            const label = bachelorLabel(row);
            const key = norm(label);

            if (
                !label ||
                state.bachelorLabels.has(key)
            ) {
                return;
            }

            state.bachelorLabels.set(key, row);
            labels.push(label);
        });

        labels.sort((a, b) => a.localeCompare(b));

        $("ceBachelorOptions").innerHTML =
            labels.map(label =>
                `<option value="${esc(label)}"></option>`
            ).join("");

        updateHint();
    }

    function updateHint() {
        const level = $("ceLevel").value;

        let message =
            "All courses are shown by default. " +
            "Fields use the categories prepared in Python. " +
            "Unclassified records remain available under " +
            "'Other / level not stated'.";

        if (level === "Master's") {
            message += state.selectedBachelor
                ? " Your selected Bachelor's programme is used to highlight its related field; this does not guarantee admission eligibility."
                : " Selecting your completed Bachelor's programme can help you explore related Master's fields. It is optional.";
        }

        $("ceHint").textContent = message;
    }

    function setupSimpleOptions(id, key, label) {
        const values = unique(
            state.rows.map(row => read(row, key))
        );

        setOptions(id, values, label, false);
    }


    /* ========================================================
       SEARCH
    ======================================================== */

    const SYNONYMS = {
        commerce: [
            "business",
            "economics",
            "management",
            "accounting",
            "finance",
            "marketing",
            "wirtschaft",
            "handel"
        ],

        business: [
            "commerce",
            "economics",
            "management",
            "accounting",
            "finance",
            "marketing",
            "wirtschaft"
        ],

        "business administration": [
            "commerce",
            "business management",
            "economics",
            "bwl",
            "wirtschaft"
        ],

        ai: [
            "artificial intelligence",
            "machine learning",
            "data science",
            "computer science",
            "informatics"
        ],

        "machine learning": [
            "artificial intelligence",
            "data science",
            "computer science",
            "informatics",
            "deep learning"
        ],

        computing: [
            "computer science",
            "informatics",
            "information technology",
            "software engineering"
        ],

        engineering: [
            "mechanical",
            "electrical",
            "civil",
            "aerospace",
            "robotics",
            "mechatronics"
        ],

        medicine: [
            "medical",
            "health sciences",
            "biomedical",
            "public health"
        ]
    };

    function searchable(row) {
        return norm([
            read(row, "course_search_text"),
            read(row, "programme_name"),
            read(row, "degree_type"),
            read(row, "degree_category"),
            read(row, "field_display"),
            read(row, "field_category"),
            read(row, "university_name"),
            read(row, "state"),
            read(row, "city")
        ].join(" "));
    }

    function matches(row) {
        const level = $("ceLevel").value;
        const field = $("ceField").value;
        const stateFilter = $("ceState").value;
        const language = $("ceLanguage").value;
        const query = norm($("ceSearch").value);

        if (
            level !== "__all__" &&
            read(row, "degree_category") !== level
        ) {
            return false;
        }

        if (
            field !== "__all__" &&
            norm(
                read(row, "field_category") ||
                read(row, "field_display")
            ) !== norm(field)
        ) {
            return false;
        }

        if (
            stateFilter !== "__all__" &&
            norm(read(row, "state")) !== norm(stateFilter)
        ) {
            return false;
        }

        if (
            language !== "__all__" &&
            norm(
                read(row, "language_of_instruction")
            ) !== norm(language)
        ) {
            return false;
        }

        if (!query) return true;

        const corpus = searchable(row);

        if (corpus.includes(query)) return true;

        const aliases = SYNONYMS[query] || [];

        if (
            aliases.some(
                term => corpus.includes(norm(term))
            )
        ) {
            return true;
        }

        const words = query.split(" ").filter(Boolean);

        return words.length > 1 &&
            words.every(word => corpus.includes(word));
    }


    /* ========================================================
       COURSE DETAILS
    ======================================================== */

    function safeURL(value) {
        const raw = val(value);

        if (!raw) return "";

        try {
            const url = new URL(raw, location.href);

            return ["https:", "http:"].includes(url.protocol)
                ? url.href
                : "";
        } catch (_) {
            return "";
        }
    }

    function fact(label, value) {
        return `
            <div class="ce-fact">
                <small>${esc(label)}</small>
                <span>${esc(show(value))}</span>
            </div>
        `;
    }

    function sourceDetails(row) {
        const requirementFields = [
            ["Entry requirements", "entry_requirements"],
            ["Language requirements", "language_requirements"],
            ["Application route", "application_route"]
        ];

        const requirementCards =
            requirementFields.map(([label, key]) => `
                <div class="ce-detail">
                    <h4>${esc(label)}</h4>
                    <p>${esc(show(read(row, key)))}</p>
                </div>
            `).join("");

        const links = [
            ["Official programme catalogue",
                "official_programme_catalogue"],

            ["Official application",
                "official_application"],

            ["Official fees",
                "official_fees"],

            ["Official requirements source",
                "official_requirements_source"]
        ].map(([label, key]) => {
            const url = safeURL(read(row, key));

            return url
                ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`
                : "";
        }).filter(Boolean).join("");

        const excluded = new Set([
            "course_search_text",
            "source_row_number"
        ]);

        const otherSourceFields =
            Object.entries(row)
                .filter(([key, value]) =>
                    !excluded.has(key) &&
                    !missing(value)
                )
                .map(([key, value]) => `
                    <div class="ce-source-item">
                        <span class="ce-source-key">
                            ${esc(key)}
                        </span>

                        <span class="ce-source-value">
                            ${esc(value)}
                        </span>
                    </div>
                `).join("");

        return `
            <details>
                <summary>
                    View requirements and all available source information
                </summary>

                <div class="ce-detail-grid">
                    ${requirementCards}
                </div>

                <div class="ce-all-source">
                    ${otherSourceFields}
                </div>

                <div class="ce-links">
                    ${links || "No official links recorded for this programme."}
                </div>
            </details>
        `;
    }

    function renderCard(row) {
        const title =
            read(row, "programme_name") ||
            "Programme title not provided";

        const university =
            read(row, "university_name") ||
            "University not provided";

        const field =
            read(row, "field_category") ||
            read(row, "field_display") ||
            "Other / not stated";

        return `
            <article class="ce-card">

                <h3 class="ce-title">
                    ${esc(title)}
                </h3>

                <div class="ce-university">
                    ${esc(university)}
                    · ${esc(read(row, "city"))}
                    · ${esc(read(row, "state"))}
                </div>

                <div class="ce-tags">
                    <span class="ce-tag">
                        ${esc(
                            read(row, "degree_category") ||
                            "Other / level not stated"
                        )}
                    </span>

                    <span class="ce-tag">
                        ${esc(
                            read(row, "degree_type") ||
                            "Degree type not stated"
                        )}
                    </span>

                    <span class="ce-tag">
                        ${esc(field)}
                    </span>
                </div>

                <div class="ce-facts">
                    ${fact(
                        "Language",
                        read(row, "language_of_instruction")
                    )}

                    ${fact(
                        "Study mode",
                        read(row, "study_mode")
                    )}

                    ${fact(
                        "Intake",
                        read(row, "start_semester")
                    )}

                    ${fact(
                        "Duration",
                        read(row, "standard_duration")
                    )}

                    ${fact(
                        "ECTS",
                        read(row, "ects")
                    )}

                    ${fact(
                        "Tuition fee",
                        read(row, "tuition_fee")
                    )}

                    ${fact(
                        "Semester contribution",
                        read(row, "semester_contribution")
                    )}

                    ${fact(
                        "Application deadline",
                        read(row, "application_deadline")
                    )}
                </div>

                ${sourceDetails(row)}

            </article>
        `;
    }


    /* ========================================================
       FILTER + RENDER
    ======================================================== */

    function render() {
        const filtered = state.rows.filter(matches);

        const pageCount = Math.max(
            1,
            Math.ceil(filtered.length / PAGE_SIZE)
        );

        state.page = Math.min(
            state.page,
            pageCount - 1
        );

        const start = state.page * PAGE_SIZE;

        const shown = filtered.slice(
            start,
            start + PAGE_SIZE
        );

        $("ceTotal").textContent =
            `${state.rows.length.toLocaleString()} programmes loaded`;

        $("ceCount").textContent =
            filtered.length
                ? `Showing ${(start + 1).toLocaleString()}–${Math.min(
                      start + PAGE_SIZE,
                      filtered.length
                  ).toLocaleString()} of ${filtered.length.toLocaleString()} matching programmes`
                : `No matches · ${state.rows.length.toLocaleString()} programmes loaded`;

        $("ceResults").innerHTML =
            shown.length
                ? shown.map(renderCard).join("")
                : `
                    <div class="ce-empty">
                        No programmes match these filters.
                        Try All courses, All fields, or a broader search.
                    </div>
                `;

        $("cePagination").innerHTML =
            filtered.length > PAGE_SIZE
                ? `
                    <button
                        id="cePrev"
                        type="button"
                        ${state.page === 0 ? "disabled" : ""}
                    >
                        Previous
                    </button>

                    <span>
                        Page ${state.page + 1} of ${pageCount}
                    </span>

                    <button
                        id="ceNext"
                        type="button"
                        ${state.page >= pageCount - 1 ? "disabled" : ""}
                    >
                        Next
                    </button>
                `
                : "";

        $("cePrev")?.addEventListener("click", () => {
            state.page = Math.max(0, state.page - 1);
            render();
        });

        $("ceNext")?.addEventListener("click", () => {
            state.page = Math.min(
                pageCount - 1,
                state.page + 1
            );

            render();
        });
    }


    /* ========================================================
       EVENTS
    ======================================================== */

    function wireEvents() {
        $("ceLevel").addEventListener("change", () => {
            state.page = 0;
            state.selectedBachelor = null;
            $("ceBachelor").value = "";

            updateOptions();
            render();
        });

        [
            "ceField",
            "ceState",
            "ceLanguage"
        ].forEach(id => {
            $(id).addEventListener("change", () => {
                state.page = 0;
                render();
            });
        });

        $("ceSearch").addEventListener("input", () => {
            clearTimeout(state.timer);

            state.timer = setTimeout(() => {
                state.page = 0;
                render();
            }, 120);
        });

        $("ceBachelor").addEventListener("change", () => {
            const key = norm($("ceBachelor").value);

            state.selectedBachelor =
                state.bachelorLabels.get(key) || null;

            updateHint();

            if (state.selectedBachelor) {
                const preferred =
                    read(state.selectedBachelor, "field_category");

                const option = [
                    ...$("ceField").options
                ].find(
                    item => norm(item.value) === norm(preferred)
                );

                if (option) {
                    $("ceField").value = option.value;
                }
            }

            state.page = 0;
            render();
        });

        $("ceReset").addEventListener("click", () => {
            $("ceLevel").value = "__all__";
            $("ceSearch").value = "";
            $("ceBachelor").value = "";

            state.selectedBachelor = null;
            state.page = 0;

            updateOptions();

            $("ceState").value = "__all__";
            $("ceLanguage").value = "__all__";
            $("ceField").value = "__all__";

            render();
        });
    }


    /* ========================================================
       INITIALISE
    ======================================================== */

    async function initialise() {
        createSection();

        $("ceResults").innerHTML = `
            <div class="ce-empty">
                Loading prepared course dataset…
            </div>
        `;

        try {
            const response = await fetch(
                CSV_URL + "?v=20261024-python2",
                { cache: "no-store" }
            );

            if (!response.ok) {
                throw new Error(
                    `Could not load categorized CSV (HTTP ${response.status}).`
                );
            }

            const source = await response.text();

            state.rows = parseCSV(source).filter(row =>
                read(row, "programme_name") ||
                read(row, "university_name")
            );

            if (!state.rows.length) {
                throw new Error(
                    "CSV loaded but no programme rows were found. Check its column headers."
                );
            }

            setupSimpleOptions(
                "ceState",
                "state",
                "All states"
            );

            setupSimpleOptions(
                "ceLanguage",
                "language_of_instruction",
                "All languages"
            );

            updateOptions();
            wireEvents();
            render();

            console.info(
                "Course Explorer loaded",
                {
                    rows: state.rows.length,

                    bachelors: state.rows.filter(
                        row => read(row, "degree_category") ===
                            "Bachelor's / Undergraduate"
                    ).length,

                    masters: state.rows.filter(
                        row => read(row, "degree_category") ===
                            "Master's"
                    ).length,

                    doctoral: state.rows.filter(
                        row => read(row, "degree_category") ===
                            "PhD / Doctoral"
                    ).length,

                    teaching: state.rows.filter(
                        row => read(row, "degree_category") ===
                            "Teaching / Lehramt"
                    ).length,

                    other: state.rows.filter(
                        row => read(row, "degree_category") ===
                            "Other / level not stated"
                    ).length
                }
            );

        } catch (error) {
            console.error(
                "Course Explorer failed:",
                error
            );

            $("ceResults").innerHTML = `
                <div class="ce-empty">
                    ${esc(error.message)}

                    <br><br>

                    Run prepare_courses.py and publish
                    outputs/analytics/courses_categorized.csv.
                </div>
            `;

            $("ceTotal").textContent =
                "Course data unavailable";
        }
    }


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