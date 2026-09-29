from pathlib import Path
import json
import re
import pandas as pd
import numpy as np


# ============================================================
# GERMANY ADMIT AI HELPER
# ANALYTICS DATASET BUILDER
#
# Purpose:
#   Convert the raw university, course, scholarship and
#   company datasets into analysis-ready CSV files.
#
# Output:
#   outputs/analytics/
#
# The script is intentionally defensive:
#   - Handles CSV and Excel
#   - Searches columns using aliases
#   - Does not assume exact column names
#   - Preserves original data
#   - Creates separate analytical tables
# ============================================================


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

RAW_DIR = PROJECT_ROOT / "data" / "raw"

OUTPUT_DIR = PROJECT_ROOT / "outputs" / "analytics"

SCHEMA_FILE = PROJECT_ROOT / "outputs" / "dataset_schema.json"


# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# GENERAL HELPERS
# ============================================================

def normalize_column_name(value):
    """
    Convert a column name into a normalized representation.

    Example:

        "University Name" -> "university_name"
        "University_Name" -> "university_name"
        "University Name (Official)" -> "university_name_official"
    """

    value = str(value).strip().lower()

    value = re.sub(
        r"[^a-z0-9]+",
        "_",
        value
    )

    value = re.sub(
        r"_+",
        "_",
        value
    )

    return value.strip("_")


def normalize_dataframe_columns(df):
    """
    Create normalized column names while preserving uniqueness.
    """

    result = df.copy()

    new_columns = []

    used = {}

    for column in result.columns:

        normalized = normalize_column_name(column)

        if not normalized:
            normalized = "unnamed_column"

        if normalized in used:

            used[normalized] += 1

            normalized = (
                f"{normalized}_{used[normalized]}"
            )

        else:

            used[normalized] = 1

        new_columns.append(normalized)

    result.columns = new_columns

    return result


def clean_string(value):
    """
    Standardize text values.
    """

    if pd.isna(value):
        return None

    value = str(value).strip()

    if value.lower() in {
        "",
        "nan",
        "none",
        "null",
        "n/a",
        "na",
        "-"
    }:
        return None

    return value


def clean_dataframe(df):

    df = df.copy()

    for column in df.columns:

        if df[column].dtype == "object":

            df[column] = df[column].apply(
                clean_string
            )

    return df


# ============================================================
# FILE LOADING
# ============================================================

def load_csv(path):

    encodings = [
        "utf-8",
        "utf-8-sig",
        "cp1252",
        "latin1"
    ]

    last_error = None

    for encoding in encodings:

        try:

            return pd.read_csv(
                path,
                encoding=encoding,
                low_memory=False
            )

        except UnicodeDecodeError as error:

            last_error = error

    raise ValueError(
        f"Could not decode CSV: {path}\n"
        f"Last error: {last_error}"
    )


def load_excel(path):

    return pd.read_excel(
        path,
        sheet_name=None
    )


# ============================================================
# DATASET DISCOVERY
# ============================================================

def discover_files():

    files = []

    if not RAW_DIR.exists():

        raise FileNotFoundError(
            f"Raw directory does not exist:\n{RAW_DIR}"
        )

    for path in RAW_DIR.iterdir():

        if path.suffix.lower() in {
            ".csv",
            ".xlsx",
            ".xls"
        }:

            files.append(path)

    return sorted(files)


# ============================================================
# READ ALL DATA
# ============================================================

def read_all_datasets():

    datasets = {}

    files = discover_files()

    print()
    print("=" * 80)
    print("READING RAW DATA")
    print("=" * 80)

    print(
        f"Raw directory: {RAW_DIR}"
    )

    print(
        f"Files discovered: {len(files)}"
    )

    for path in files:

        print(
            f"\nReading: {path.name}"
        )

        try:

            if path.suffix.lower() == ".csv":

                df = load_csv(path)

                df = normalize_dataframe_columns(df)

                df = clean_dataframe(df)

                datasets[
                    f"{path.stem}"
                ] = df

                print(
                    f"  rows={len(df):,} "
                    f"columns={len(df.columns):,}"
                )

            else:

                workbook = load_excel(path)

                for sheet_name, df in workbook.items():

                    df = normalize_dataframe_columns(df)

                    df = clean_dataframe(df)

                    dataset_name = (
                        f"{path.stem}__{sheet_name}"
                    )

                    datasets[
                        dataset_name
                    ] = df

                    print(
                        f"  sheet={sheet_name} "
                        f"rows={len(df):,} "
                        f"columns={len(df.columns):,}"
                    )

        except Exception as error:

            print(
                f"  ERROR: {error}"
            )

    print()
    print(
        f"Datasets successfully loaded: "
        f"{len(datasets)}"
    )

    return datasets


# ============================================================
# COLUMN SEARCH
# ============================================================

def find_column(df, aliases):

    normalized_aliases = [
        normalize_column_name(alias)
        for alias in aliases
    ]

    columns = list(df.columns)

    # Exact match
    for alias in normalized_aliases:

        if alias in columns:

            return alias

    # Partial match
    for alias in normalized_aliases:

        for column in columns:

            if (
                alias in column
                or column in alias
            ):

                return column

    return None


def extract_column(df, aliases):

    column = find_column(
        df,
        aliases
    )

    if column is None:

        return pd.Series(
            [None] * len(df),
            index=df.index
        )

    return df[column]


# ============================================================
# DATASET CLASSIFICATION
# ============================================================

def classify_dataset(name, df):

    text = (
        name + " " +
        " ".join(df.columns)
    ).lower()

    university_keywords = [
        "university",
        "universities",
        "hochschule",
        "institution",
        "university_name"
    ]

    course_keywords = [
        "course",
        "program",
        "programme",
        "study_program",
        "degree",
        "subject",
        "field_of_study"
    ]

    scholarship_keywords = [
        "scholarship",
        "stipend",
        "funding",
        "scholarship_id",
        "scholarship_name"
    ]

    company_keywords = [
        "company",
        "startup",
        "employer",
        "industry",
        "company_name",
        "startup_name"
    ]

    def contains_any(
        keywords
    ):

        return any(
            keyword in text
            for keyword in keywords
        )

    if contains_any(scholarship_keywords):

        return "scholarships"

    if contains_any(company_keywords):

        return "companies"

    if contains_any(course_keywords):

        return "courses"

    if contains_any(university_keywords):

        return "universities"

    return "other"


# ============================================================
# COMBINE DATASETS BY DOMAIN
# ============================================================

def combine_domain_datasets(
    datasets,
    domain
):

    frames = []

    for name, df in datasets.items():

        classification = classify_dataset(
            name,
            df
        )

        if classification != domain:

            continue

        temp = df.copy()

        temp["_source_dataset"] = name

        frames.append(temp)

    if not frames:

        return pd.DataFrame()

    combined = pd.concat(
        frames,
        ignore_index=True,
        sort=False
    )

    return combined


# ============================================================
# LOCATION STANDARDIZATION
# ============================================================

STATE_ALIASES = {

    "baden württemberg":
        "Baden-Württemberg",

    "baden-wurttemberg":
        "Baden-Württemberg",

    "baden wuerttemberg":
        "Baden-Württemberg",

    "bavaria":
        "Bavaria",

    "bayern":
        "Bavaria",

    "berlin":
        "Berlin",

    "brandenburg":
        "Brandenburg",

    "bremen":
        "Bremen",

    "hamburg":
        "Hamburg",

    "hesse":
        "Hesse",

    "hessen":
        "Hesse",

    "mecklenburg vorpommern":
        "Mecklenburg-Vorpommern",

    "mecklenburg-vorpommern":
        "Mecklenburg-Vorpommern",

    "lower saxony":
        "Lower Saxony",

    "niedersachsen":
        "Lower Saxony",

    "north rhine westphalia":
        "North Rhine-Westphalia",

    "north-rhine westphalia":
        "North Rhine-Westphalia",

    "nordrhein westfalen":
        "North Rhine-Westphalia",

    "rhineland palatinate":
        "Rhineland-Palatinate",

    "rheinland pfalz":
        "Rhineland-Palatinate",

    "saarland":
        "Saarland",

    "saxony":
        "Saxony",

    "sachsen":
        "Saxony",

    "saxony anhalt":
        "Saxony-Anhalt",

    "sachsen anhalt":
        "Saxony-Anhalt",

    "schleswig holstein":
        "Schleswig-Holstein",

    "thuringia":
        "Thuringia",

    "thüringen":
        "Thuringia"
}


def standardize_state(series):

    def convert(value):

        value = clean_string(value)

        if value is None:
            return None

        key = normalize_column_name(value)

        return STATE_ALIASES.get(
            key,
            value
        )

    return series.apply(convert)


# ============================================================
# CITY / STATE EXTRACTION
# ============================================================

def add_location_columns(df):

    if df.empty:

        return df

    result = df.copy()

    state = extract_column(
        result,
        [
            "state",
            "federal_state",
            "bundesland",
            "state_name",
            "federal_state_name"
        ]
    )

    city = extract_column(
        result,
        [
            "city",
            "city_name",
            "location_city",
            "town"
        ]
    )

    result["analytics_state"] = (
        standardize_state(state)
    )

    result["analytics_city"] = city.apply(
        clean_string
    )

    return result


# ============================================================
# UNIVERSITY ANALYTICS
# ============================================================

def build_university_analytics(df):

    if df.empty:

        return pd.DataFrame()

    df = add_location_columns(df)

    result = pd.DataFrame()

    result["university_name"] = extract_column(
        df,
        [
            "university_name",
            "university",
            "institution_name",
            "institution",
            "name"
        ]
    )

    result["state"] = df[
        "analytics_state"
    ]

    result["city"] = df[
        "analytics_city"
    ]

    result["type"] = extract_column(
        df,
        [
            "university_type",
            "institution_type",
            "type"
        ]
    )

    result["website"] = extract_column(
        df,
        [
            "website",
            "university_website",
            "official_website",
            "url"
        ]
    )

    result["ranking"] = extract_column(
        df,
        [
            "ranking",
            "qs_ranking",
            "qs_world_ranking",
            "rank"
        ]
    )

    result["international"] = extract_column(
        df,
        [
            "international",
            "international_students"
        ]
    )

    result["source_dataset"] = df[
        "_source_dataset"
    ]

    return result


# ============================================================
# COURSE ANALYTICS
# ============================================================

def build_course_analytics(df):

    if df.empty:

        return pd.DataFrame()

    df = add_location_columns(df)

    result = pd.DataFrame()

    result["course_name"] = extract_column(
        df,
        [
            "course_name",
            "course",
            "program_name",
            "programme_name",
            "study_program",
            "program"
        ]
    )

    result["university_name"] = extract_column(
        df,
        [
            "university_name",
            "university",
            "institution_name"
        ]
    )

    result["degree"] = extract_column(
        df,
        [
            "degree",
            "degree_type",
            "qualification"
        ]
    )

    result["field"] = extract_column(
        df,
        [
            "field",
            "field_of_study",
            "study_field",
            "subject",
            "subject_area",
            "discipline"
        ]
    )

    result["language"] = extract_column(
        df,
        [
            "language",
            "study_language",
            "teaching_language"
        ]
    )

    result["tuition"] = extract_column(
        df,
        [
            "tuition",
            "tuition_fee",
            "tuition_fee_eur",
            "fees"
        ]
    )

    result["state"] = df[
        "analytics_state"
    ]

    result["city"] = df[
        "analytics_city"
    ]

    result["source_dataset"] = df[
        "_source_dataset"
    ]

    return result


# ============================================================
# SCHOLARSHIP ANALYTICS
# ============================================================

def build_scholarship_analytics(df):

    if df.empty:

        return pd.DataFrame()

    df = add_location_columns(df)

    result = pd.DataFrame()

    result["scholarship_name"] = extract_column(
        df,
        [
            "scholarship_name",
            "scholarship",
            "name",
            "title"
        ]
    )

    result["scholarship_id"] = extract_column(
        df,
        [
            "scholarship_id",
            "id"
        ]
    )

    result["provider"] = extract_column(
        df,
        [
            "provider",
            "provider_name",
            "organization",
            "foundation",
            "sponsor"
        ]
    )

    result["amount_min_eur"] = extract_column(
        df,
        [
            "amount_min_eur",
            "minimum_amount",
            "min_amount",
            "amount_min"
        ]
    )

    result["amount_max_eur"] = extract_column(
        df,
        [
            "amount_max_eur",
            "maximum_amount",
            "max_amount",
            "amount_max"
        ]
    )

    result["duration"] = extract_column(
        df,
        [
            "duration",
            "duration_months",
            "funding_duration"
        ]
    )

    result["eligibility"] = extract_column(
        df,
        [
            "eligibility",
            "eligibility_criteria",
            "requirements"
        ]
    )

    result["deadline"] = extract_column(
        df,
        [
            "deadline",
            "application_deadline"
        ]
    )

    result["study_level"] = extract_column(
        df,
        [
            "study_level",
            "degree_level",
            "level"
        ]
    )

    result["field"] = extract_column(
        df,
        [
            "field",
            "field_of_study",
            "study_field",
            "subject"
        ]
    )

    result["state"] = df[
        "analytics_state"
    ]

    result["university_name"] = extract_column(
        df,
        [
            "university_name",
            "university",
            "institution_name"
        ]
    )

    result["source_dataset"] = df[
        "_source_dataset"
    ]

    return result


# ============================================================
# COMPANY ANALYTICS
# ============================================================

def build_company_analytics(df):

    if df.empty:

        return pd.DataFrame()

    df = add_location_columns(df)

    result = pd.DataFrame()

    result["company_name"] = extract_column(
        df,
        [
            "company_name",
            "company",
            "startup_name",
            "startup",
            "employer",
            "organization_name",
            "name"
        ]
    )

    result["state"] = df[
        "analytics_state"
    ]

    result["city"] = df[
        "analytics_city"
    ]

    result["industry"] = extract_column(
        df,
        [
            "industry",
            "industry_sector",
            "sector",
            "business_sector",
            "category"
        ]
    )

    result["subindustry"] = extract_column(
        df,
        [
            "subindustry",
            "sub_industry",
            "industry_subcategory"
        ]
    )

    result["company_type"] = extract_column(
        df,
        [
            "company_type",
            "organization_type",
            "type"
        ]
    )

    result["founded_year"] = extract_column(
        df,
        [
            "founded_year",
            "year_founded",
            "founded"
        ]
    )

    result["employees"] = extract_column(
        df,
        [
            "employees",
            "employee_count",
            "employees_count"
        ]
    )

    result["website"] = extract_column(
        df,
        [
            "website",
            "company_website",
            "official_website",
            "url"
        ]
    )

    result["description"] = extract_column(
        df,
        [
            "description",
            "company_description",
            "about"
        ]
    )

    result["source_dataset"] = df[
        "_source_dataset"
    ]

    return result


# ============================================================
# GENERIC DATA QUALITY SUMMARY
# ============================================================

def build_quality_summary(
    domain,
    df
):

    if df.empty:

        return pd.DataFrame(
            [{
                "domain": domain,
                "rows": 0,
                "columns": 0,
                "duplicate_rows": 0,
                "missing_cells": 0,
                "missing_percentage": 0
            }]
        )

    total_cells = (
        len(df) *
        len(df.columns)
    )

    missing_cells = int(
        df.isna().sum().sum()
    )

    duplicate_rows = int(
        df.duplicated().sum()
    )

    missing_percentage = (
        missing_cells /
        total_cells *
        100
        if total_cells
        else 0
    )

    return pd.DataFrame(
        [{
            "domain": domain,
            "rows": len(df),
            "columns": len(df.columns),
            "duplicate_rows": duplicate_rows,
            "missing_cells": missing_cells,
            "missing_percentage":
                round(
                    missing_percentage,
                    2
                )
        }]
    )


# ============================================================
# STATE SUMMARY
# ============================================================

def build_state_summary(
    universities,
    courses,
    scholarships,
    companies
):

    states = set()

    for df in [
        universities,
        courses,
        scholarships,
        companies
    ]:

        if (
            not df.empty
            and "state" in df.columns
        ):

            states.update(
                df["state"]
                .dropna()
                .astype(str)
                .tolist()
            )

    rows = []

    for state in sorted(states):

        university_count = 0
        course_count = 0
        scholarship_count = 0
        company_count = 0

        if (
            not universities.empty
            and "state" in universities.columns
        ):

            university_count = int(
                (
                    universities["state"]
                    == state
                ).sum()
            )

        if (
            not courses.empty
            and "state" in courses.columns
        ):

            course_count = int(
                (
                    courses["state"]
                    == state
                ).sum()
            )

        if (
            not scholarships.empty
            and "state" in scholarships.columns
        ):

            scholarship_count = int(
                (
                    scholarships["state"]
                    == state
                ).sum()
            )

        if (
            not companies.empty
            and "state" in companies.columns
        ):

            company_count = int(
                (
                    companies["state"]
                    == state
                ).sum()
            )

        rows.append(
            {
                "state": state,
                "universities": university_count,
                "courses": course_count,
                "scholarships": scholarship_count,
                "companies": company_count
            }
        )

    result = pd.DataFrame(rows)

    if not result.empty:

        result["total_education_records"] = (
            result["universities"] +
            result["courses"] +
            result["scholarships"]
        )

    return result


# ============================================================
# FIELD SUMMARY
# ============================================================

def build_field_summary(courses):

    if courses.empty:

        return pd.DataFrame()

    if "field" not in courses.columns:

        return pd.DataFrame()

    result = (
        courses[
            courses["field"].notna()
        ]
        .groupby(
            "field",
            dropna=True
        )
        .size()
        .reset_index(
            name="course_count"
        )
        .sort_values(
            "course_count",
            ascending=False
        )
    )

    return result


# ============================================================
# INDUSTRY SUMMARY
# ============================================================

def build_industry_summary(companies):

    if companies.empty:

        return pd.DataFrame()

    if "industry" not in companies.columns:

        return pd.DataFrame()

    result = (
        companies[
            companies["industry"].notna()
        ]
        .groupby(
            "industry",
            dropna=True
        )
        .size()
        .reset_index(
            name="company_count"
        )
        .sort_values(
            "company_count",
            ascending=False
        )
    )

    return result


# ============================================================
# STATE + INDUSTRY
# ============================================================

def build_state_industry_summary(companies):

    if companies.empty:

        return pd.DataFrame()

    required = {
        "state",
        "industry"
    }

    if not required.issubset(
        companies.columns
    ):

        return pd.DataFrame()

    result = (
        companies[
            companies["state"].notna()
            &
            companies["industry"].notna()
        ]
        .groupby(
            [
                "state",
                "industry"
            ],
            dropna=True
        )
        .size()
        .reset_index(
            name="company_count"
        )
        .sort_values(
            "company_count",
            ascending=False
        )
    )

    return result


# ============================================================
# STATE + FIELD
# ============================================================

def build_state_field_summary(courses):

    if courses.empty:

        return pd.DataFrame()

    required = {
        "state",
        "field"
    }

    if not required.issubset(
        courses.columns
    ):

        return pd.DataFrame()

    result = (
        courses[
            courses["state"].notna()
            &
            courses["field"].notna()
        ]
        .groupby(
            [
                "state",
                "field"
            ],
            dropna=True
        )
        .size()
        .reset_index(
            name="course_count"
        )
        .sort_values(
            "course_count",
            ascending=False
        )
    )

    return result


# ============================================================
# UNIVERSITY + COURSE SUMMARY
# ============================================================

def build_university_course_summary(
    universities,
    courses
):

    if (
        universities.empty
        or courses.empty
    ):

        return pd.DataFrame()

    if (
        "university_name"
        not in universities.columns
        or
        "university_name"
        not in courses.columns
    ):

        return pd.DataFrame()

    university_counts = (
        courses[
            courses["university_name"]
            .notna()
        ]
        .groupby(
            "university_name"
        )
        .size()
        .reset_index(
            name="course_count"
        )
    )

    result = universities.merge(
        university_counts,
        on="university_name",
        how="left"
    )

    result["course_count"] = (
        result["course_count"]
        .fillna(0)
        .astype(int)
    )

    return result


# ============================================================
# UNIVERSITY + SCHOLARSHIP SUMMARY
# ============================================================

def build_university_scholarship_summary(
    universities,
    scholarships
):

    if (
        universities.empty
        or scholarships.empty
    ):

        return pd.DataFrame()

    if (
        "university_name"
        not in universities.columns
        or
        "university_name"
        not in scholarships.columns
    ):

        return pd.DataFrame()

    scholarship_counts = (
        scholarships[
            scholarships["university_name"]
            .notna()
        ]
        .groupby(
            "university_name"
        )
        .size()
        .reset_index(
            name="scholarship_count"
        )
    )

    result = universities.merge(
        scholarship_counts,
        on="university_name",
        how="left"
    )

    result["scholarship_count"] = (
        result["scholarship_count"]
        .fillna(0)
        .astype(int)
    )

    return result


# ============================================================
# STATE DASHBOARD TABLE
# ============================================================

def build_state_dashboard(
    state_summary
):

    if state_summary.empty:

        return pd.DataFrame()

    result = state_summary.copy()

    numeric_columns = [
        "universities",
        "courses",
        "scholarships",
        "companies"
    ]

    for column in numeric_columns:

        if column not in result.columns:

            result[column] = 0

    result[
        "companies_per_university"
    ] = np.where(
        result["universities"] > 0,
        (
            result["companies"] /
            result["universities"]
        ).round(2),
        np.nan
    )

    result[
        "courses_per_university"
    ] = np.where(
        result["universities"] > 0,
        (
            result["courses"] /
            result["universities"]
        ).round(2),
        np.nan
    )

    result[
        "scholarships_per_university"
    ] = np.where(
        result["universities"] > 0,
        (
            result["scholarships"] /
            result["universities"]
        ).round(2),
        np.nan
    )

    return result


# ============================================================
# WRITE CSV
# ============================================================

def write_csv(
    df,
    filename
):

    if df is None:

        return

    path = OUTPUT_DIR / filename

    df.to_csv(
        path,
        index=False,
        encoding="utf-8-sig"
    )

    print(
        f"Created: {path}"
    )


# ============================================================
# WRITE JSON
# ============================================================

def write_json(
    data,
    filename
):

    path = OUTPUT_DIR / filename

    with open(
        path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            indent=2,
            ensure_ascii=False,
            default=str
        )

    print(
        f"Created: {path}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 80)
    print("GERMANY ADMIT AI HELPER")
    print("ANALYTICS DATASET BUILDER")
    print("=" * 80)

    print()
    print(
        f"Project root:\n{PROJECT_ROOT}"
    )

    print()
    print(
        f"Raw directory:\n{RAW_DIR}"
    )

    print()
    print(
        f"Analytics output:\n{OUTPUT_DIR}"
    )

    # --------------------------------------------------------
    # Load
    # --------------------------------------------------------

    datasets = read_all_datasets()

    # --------------------------------------------------------
    # Classify
    # --------------------------------------------------------

    classified = {}

    for name, df in datasets.items():

        domain = classify_dataset(
            name,
            df
        )

        classified[
            name
        ] = domain

    print()
    print("=" * 80)
    print("DATASET CLASSIFICATION")
    print("=" * 80)

    for name, domain in classified.items():

        print(
            f"{name:<70} -> {domain}"
        )

    # --------------------------------------------------------
    # Combine domains
    # --------------------------------------------------------

    universities_raw = (
        combine_domain_datasets(
            datasets,
            "universities"
        )
    )

    courses_raw = (
        combine_domain_datasets(
            datasets,
            "courses"
        )
    )

    scholarships_raw = (
        combine_domain_datasets(
            datasets,
            "scholarships"
        )
    )

    companies_raw = (
        combine_domain_datasets(
            datasets,
            "companies"
        )
    )

    print()
    print("=" * 80)
    print("DOMAIN COUNTS")
    print("=" * 80)

    print(
        f"Universities:  {len(universities_raw):,}"
    )

    print(
        f"Courses:       {len(courses_raw):,}"
    )

    print(
        f"Scholarships:  {len(scholarships_raw):,}"
    )

    print(
        f"Companies:     {len(companies_raw):,}"
    )

    # --------------------------------------------------------
    # Build analytical tables
    # --------------------------------------------------------

    universities = (
        build_university_analytics(
            universities_raw
        )
    )

    courses = (
        build_course_analytics(
            courses_raw
        )
    )

    scholarships = (
        build_scholarship_analytics(
            scholarships_raw
        )
    )

    companies = (
        build_company_analytics(
            companies_raw
        )
    )

    # --------------------------------------------------------
    # Summary tables
    # --------------------------------------------------------

    state_summary = build_state_summary(
        universities,
        courses,
        scholarships,
        companies
    )

    state_dashboard = (
        build_state_dashboard(
            state_summary
        )
    )

    field_summary = (
        build_field_summary(
            courses
        )
    )

    industry_summary = (
        build_industry_summary(
            companies
        )
    )

    state_industry_summary = (
        build_state_industry_summary(
            companies
        )
    )

    state_field_summary = (
        build_state_field_summary(
            courses
        )
    )

    university_course_summary = (
        build_university_course_summary(
            universities,
            courses
        )
    )

    university_scholarship_summary = (
        build_university_scholarship_summary(
            universities,
            scholarships
        )
    )

    # --------------------------------------------------------
    # Quality
    # --------------------------------------------------------

    quality_tables = [

        build_quality_summary(
            "universities",
            universities
        ),

        build_quality_summary(
            "courses",
            courses
        ),

        build_quality_summary(
            "scholarships",
            scholarships
        ),

        build_quality_summary(
            "companies",
            companies
        )
    ]

    quality_summary = pd.concat(
        quality_tables,
        ignore_index=True
    )

    # --------------------------------------------------------
    # Write main analytical datasets
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("WRITING ANALYTICS DATASETS")
    print("=" * 80)

    write_csv(
        universities,
        "universities_analytics.csv"
    )

    write_csv(
        courses,
        "courses_analytics.csv"
    )

    write_csv(
        scholarships,
        "scholarships_analytics.csv"
    )

    write_csv(
        companies,
        "companies_analytics.csv"
    )

    # --------------------------------------------------------
    # Write dashboard tables
    # --------------------------------------------------------

    write_csv(
        state_summary,
        "state_summary.csv"
    )

    write_csv(
        state_dashboard,
        "state_dashboard.csv"
    )

    write_csv(
        field_summary,
        "field_summary.csv"
    )

    write_csv(
        industry_summary,
        "industry_summary.csv"
    )

    write_csv(
        state_industry_summary,
        "state_industry_summary.csv"
    )

    write_csv(
        state_field_summary,
        "state_field_summary.csv"
    )

    write_csv(
        university_course_summary,
        "university_course_summary.csv"
    )

    write_csv(
        university_scholarship_summary,
        "university_scholarship_summary.csv"
    )

    write_csv(
        quality_summary,
        "analytics_quality_summary.csv"
    )

    # --------------------------------------------------------
    # Build manifest
    # --------------------------------------------------------

    manifest = {

        "project": (
            "Germany Admit AI Helper"
        ),

        "purpose": (
            "Analysis-ready datasets "
            "for Germany education "
            "and career dashboard"
        ),

        "source_directory": str(
            RAW_DIR
        ),

        "output_directory": str(
            OUTPUT_DIR
        ),

        "datasets_loaded": len(
            datasets
        ),

        "domain_counts": {

            "universities": len(
                universities
            ),

            "courses": len(
                courses
            ),

            "scholarships": len(
                scholarships
            ),

            "companies": len(
                companies
            )
        },

        "outputs": [

            "universities_analytics.csv",

            "courses_analytics.csv",

            "scholarships_analytics.csv",

            "companies_analytics.csv",

            "state_summary.csv",

            "state_dashboard.csv",

            "field_summary.csv",

            "industry_summary.csv",

            "state_industry_summary.csv",

            "state_field_summary.csv",

            "university_course_summary.csv",

            "university_scholarship_summary.csv",

            "analytics_quality_summary.csv"
        ]
    }

    write_json(
        manifest,
        "analytics_manifest.json"
    )

    # --------------------------------------------------------
    # Complete
    # --------------------------------------------------------

    print()
    print("=" * 80)
    print("ANALYTICS BUILD COMPLETE")
    print("=" * 80)

    print()
    print(
        f"Analytics files are stored in:"
    )

    print(
        OUTPUT_DIR
    )

    print()
    print(
        "Next stage:"
    )

    print(
        "Build the interactive Germany "
        "map/dashboard from these analytical tables."
    )

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()