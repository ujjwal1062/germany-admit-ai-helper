from pathlib import Path
import json
import re

import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Germany Study & Career Analytics",
    page_icon="🇩🇪",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

ANALYTICS_DIR = PROJECT_ROOT / "outputs" / "analytics"

if not ANALYTICS_DIR.exists():
    ANALYTICS_DIR = PROJECT_ROOT / "outputs"


# ============================================================
# GLOBAL STYLING
# ============================================================

st.markdown(
    """
    <style>

    .main {
        background-color: #f7f8fa;
    }

    .block-container {
        padding-top: 1.5rem;
        padding-bottom: 3rem;
        max-width: 1500px;
    }

    .metric-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }

    .section-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
    }

    .small-muted {
        color: #6b7280;
        font-size: 0.85rem;
    }

    </style>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# FILE HELPERS
# ============================================================

def find_csv(filename):
    """
    Find an analytics CSV recursively.
    """

    exact = ANALYTICS_DIR / filename

    if exact.exists():
        return exact

    matches = list(ANALYTICS_DIR.rglob(filename))

    if matches:
        return matches[0]

    return None


@st.cache_data
def load_csv(filename):
    """
    Load an analytics CSV safely.
    """

    path = find_csv(filename)

    if path is None:
        return pd.DataFrame()

    encodings = [
        "utf-8",
        "utf-8-sig",
        "cp1252",
        "latin1",
    ]

    for encoding in encodings:

        try:
            return pd.read_csv(
                path,
                encoding=encoding,
                low_memory=False,
            )

        except UnicodeDecodeError:
            continue

        except Exception:
            break

    return pd.DataFrame()


def clean_columns(df):
    """
    Standardize column names for easier dashboard handling.
    """

    if df.empty:
        return df

    df = df.copy()

    df.columns = [
        str(c).strip()
        for c in df.columns
    ]

    return df


def find_column(df, candidates):
    """
    Find a column using flexible matching.
    """

    if df.empty:
        return None

    normalized = {
        re.sub(r"[^a-z0-9]", "", str(c).lower()): c
        for c in df.columns
    }

    for candidate in candidates:

        key = re.sub(
            r"[^a-z0-9]",
            "",
            candidate.lower()
        )

        if key in normalized:
            return normalized[key]

    # Partial matching
    for candidate in candidates:

        key = re.sub(
            r"[^a-z0-9]",
            "",
            candidate.lower()
        )

        for normalized_key, original in normalized.items():

            if key in normalized_key or normalized_key in key:
                return original

    return None


def numeric_column(df, candidates):
    """
    Find a numeric column and convert it.
    """

    column = find_column(df, candidates)

    if column is None:
        return None

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )

    return column


# ============================================================
# LOAD ANALYTICS DATASETS
# ============================================================

universities = clean_columns(
    load_csv("universities_analytics.csv")
)

courses = clean_columns(
    load_csv("courses_analytics.csv")
)

scholarships = clean_columns(
    load_csv("scholarships_analytics.csv")
)

companies = clean_columns(
    load_csv("companies_analytics.csv")
)

state_dashboard = clean_columns(
    load_csv("state_dashboard.csv")
)

field_summary = clean_columns(
    load_csv("field_summary.csv")
)

industry_summary = clean_columns(
    load_csv("industry_summary.csv")
)

state_industry_summary = clean_columns(
    load_csv("state_industry_summary.csv")
)

state_field_summary = clean_columns(
    load_csv("state_field_summary.csv")
)

university_scholarship_summary = clean_columns(
    load_csv("university_scholarship_summary.csv")
)

quality_summary = clean_columns(
    load_csv("analytics_quality_summary.csv")
)


# ============================================================
# DATASET COUNTS
# ============================================================

UNIVERSITY_COUNT = len(universities)
COURSE_COUNT = len(courses)
SCHOLARSHIP_COUNT = len(scholarships)
COMPANY_COUNT = len(companies)


# ============================================================
# SIDEBAR
# ============================================================

st.sidebar.title("🇩🇪 Germany Analytics")

st.sidebar.caption(
    "Germany university, course, scholarship and career ecosystem"
)

st.sidebar.markdown("---")

page = st.sidebar.radio(
    "Navigate",
    [
        "🏠 Overview",
        "🗺️ State Explorer",
        "🎓 Universities",
        "📚 Courses & Fields",
        "💰 Scholarships",
        "🏢 Companies & Startups",
        "🔎 Data Explorer",
        "ℹ️ Data Quality",
    ],
)

st.sidebar.markdown("---")

st.sidebar.caption(
    f"Analytics directory:\n{ANALYTICS_DIR}"
)


# ============================================================
# HEADER
# ============================================================

st.title("🇩🇪 Germany Study & Career Analytics")

st.markdown(
    """
    Explore Germany's higher-education and career ecosystem across
    **universities, study programs, scholarships, companies, industries,
    states and academic fields**.
    """
)


# ============================================================
# OVERVIEW
# ============================================================

if page == "🏠 Overview":

    st.markdown(
        '<div class="section-title">Germany at a glance</div>',
        unsafe_allow_html=True,
    )

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            "Universities",
            f"{UNIVERSITY_COUNT:,}",
        )

    with col2:
        st.metric(
            "Courses / Programs",
            f"{COURSE_COUNT:,}",
        )

    with col3:
        st.metric(
            "Scholarships",
            f"{SCHOLARSHIP_COUNT:,}",
        )

    with col4:
        st.metric(
            "Companies / Startups",
            f"{COMPANY_COUNT:,}",
        )

    st.markdown("---")

    # --------------------------------------------------------
    # STATE OVERVIEW
    # --------------------------------------------------------

    st.subheader("State-level ecosystem")

    if not state_dashboard.empty:

        st.dataframe(
            state_dashboard,
            use_container_width=True,
            hide_index=True,
        )

    else:

        st.warning(
            "state_dashboard.csv could not be loaded."
        )

    # --------------------------------------------------------
    # FIELD OVERVIEW
    # --------------------------------------------------------

    st.subheader("Academic field distribution")

    if not field_summary.empty:

        st.dataframe(
            field_summary,
            use_container_width=True,
            hide_index=True,
        )

    else:

        st.info(
            "field_summary.csv is not available."
        )


# ============================================================
# STATE EXPLORER
# ============================================================

elif page == "🗺️ State Explorer":

    st.header("🗺️ Germany State Explorer")

    st.write(
        """
        Compare the education and career ecosystem across German states.
        The dashboard uses the analytical tables generated from your
        university, course, scholarship and company datasets.
        """
    )

    if state_dashboard.empty:

        st.error(
            "state_dashboard.csv was not found."
        )

    else:

        df = state_dashboard.copy()

        state_col = find_column(
            df,
            [
                "State",
                "state",
                "Bundesland",
                "state_name",
            ],
        )

        university_col = find_column(
            df,
            [
                "University_Count",
                "Universities",
                "university_count",
                "University",
            ],
        )

        course_col = find_column(
            df,
            [
                "Course_Count",
                "Courses",
                "course_count",
            ],
        )

        scholarship_col = find_column(
            df,
            [
                "Scholarship_Count",
                "Scholarships",
                "scholarship_count",
            ],
        )

        company_col = find_column(
            df,
            [
                "Company_Count",
                "Companies",
                "company_count",
                "Startups",
            ],
        )

        # ----------------------------------------------------
        # FILTER
        # ----------------------------------------------------

        if state_col:

            states = sorted(
                df[state_col]
                .dropna()
                .astype(str)
                .unique()
            )

            selected_states = st.multiselect(
                "Select states",
                states,
                default=states,
            )

            if selected_states:
                filtered = df[
                    df[state_col]
                    .astype(str)
                    .isin(selected_states)
                ].copy()

            else:
                filtered = df.iloc[0:0].copy()

        else:

            filtered = df.copy()

        # ----------------------------------------------------
        # METRICS
        # ----------------------------------------------------

        c1, c2, c3, c4 = st.columns(4)

        with c1:

            value = (
                filtered[university_col].sum()
                if university_col
                else 0
            )

            st.metric(
                "Universities",
                f"{value:,.0f}",
            )

        with c2:

            value = (
                filtered[course_col].sum()
                if course_col
                else 0
            )

            st.metric(
                "Courses",
                f"{value:,.0f}",
            )

        with c3:

            value = (
                filtered[scholarship_col].sum()
                if scholarship_col
                else 0
            )

            st.metric(
                "Scholarships",
                f"{value:,.0f}",
            )

        with c4:

            value = (
                filtered[company_col].sum()
                if company_col
                else 0
            )

            st.metric(
                "Companies",
                f"{value:,.0f}",
            )

        st.markdown("---")

        # ----------------------------------------------------
        # STATE BAR CHART
        # ----------------------------------------------------

        if state_col and university_col:

            st.subheader("Universities by state")

            chart_df = filtered.sort_values(
                university_col,
                ascending=False,
            )

            fig = px.bar(
                chart_df,
                x=state_col,
                y=university_col,
                title="Universities by German state",
            )

            fig.update_layout(
                xaxis_title="State",
                yaxis_title="Universities",
                xaxis_tickangle=-45,
            )

            st.plotly_chart(
                fig,
                use_container_width=True,
            )

        # ----------------------------------------------------
        # MULTI-METRIC COMPARISON
        # ----------------------------------------------------

        st.subheader("State ecosystem comparison")

        available_metrics = []

        if university_col:
            available_metrics.append(
                university_col
            )

        if course_col:
            available_metrics.append(
                course_col
            )

        if scholarship_col:
            available_metrics.append(
                scholarship_col
            )

        if company_col:
            available_metrics.append(
                company_col
            )

        if state_col and available_metrics:

            selected_metric = st.selectbox(
                "Metric",
                available_metrics,
            )

            chart_df = filtered.sort_values(
                selected_metric,
                ascending=False,
            )

            fig = px.bar(
                chart_df,
                x=state_col,
                y=selected_metric,
                title=f"{selected_metric} by state",
            )

            fig.update_layout(
                xaxis_tickangle=-45
            )

            st.plotly_chart(
                fig,
                use_container_width=True,
            )

        st.subheader("State data")

        st.dataframe(
            filtered,
            use_container_width=True,
            hide_index=True,
        )


# ============================================================
# UNIVERSITIES
# ============================================================

elif page == "🎓 Universities":

    st.header("🎓 Universities")

    if universities.empty:

        st.error(
            "universities_analytics.csv was not found."
        )

    else:

        df = universities.copy()

        st.metric(
            "University records",
            f"{len(df):,}",
        )

        st.markdown("---")

        state_col = find_column(
            df,
            [
                "State",
                "state",
                "Bundesland",
                "state_name",
            ],
        )

        city_col = find_column(
            df,
            [
                "City",
                "city",
                "Location_City",
            ],
        )

        name_col = find_column(
            df,
            [
                "University",
                "University_Name",
                "University Name",
                "Name",
            ],
        )

        # ----------------------------------------------------
        # FILTERS
        # ----------------------------------------------------

        col1, col2 = st.columns(2)

        filtered = df.copy()

        with col1:

            if state_col:

                state_options = sorted(
                    filtered[state_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected = st.multiselect(
                    "State",
                    state_options,
                )

                if selected:

                    filtered = filtered[
                        filtered[state_col]
                        .astype(str)
                        .isin(selected)
                    ]

        with col2:

            if city_col:

                city_options = sorted(
                    filtered[city_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected_city = st.multiselect(
                    "City",
                    city_options,
                )

                if selected_city:

                    filtered = filtered[
                        filtered[city_col]
                        .astype(str)
                        .isin(selected_city)
                    ]

        st.write(
            f"Showing **{len(filtered):,}** records."
        )

        # ----------------------------------------------------
        # STATE DISTRIBUTION
        # ----------------------------------------------------

        if state_col:

            counts = (
                filtered[state_col]
                .value_counts()
                .reset_index()
            )

            counts.columns = [
                "State",
                "Universities",
            ]

            fig = px.bar(
                counts,
                x="State",
                y="Universities",
                title="Universities by state",
            )

            fig.update_layout(
                xaxis_tickangle=-45
            )

            st.plotly_chart(
                fig,
                use_container_width=True,
            )

        # ----------------------------------------------------
        # TABLE
        # ----------------------------------------------------

        st.subheader("University records")

        st.dataframe(
            filtered,
            use_container_width=True,
            hide_index=True,
        )


# ============================================================
# COURSES & FIELDS
# ============================================================

elif page == "📚 Courses & Fields":

    st.header("📚 Courses & Academic Fields")

    if courses.empty:

        st.error(
            "courses_analytics.csv was not found."
        )

    else:

        df = courses.copy()

        st.metric(
            "Course records",
            f"{len(df):,}",
        )

        field_col = find_column(
            df,
            [
                "Field",
                "Study_Field",
                "Study Field",
                "Subject",
                "Discipline",
            ],
        )

        degree_col = find_column(
            df,
            [
                "Degree",
                "Degree_Type",
                "Degree Type",
            ],
        )

        state_col = find_column(
            df,
            [
                "State",
                "state",
                "Bundesland",
            ],
        )

        # ----------------------------------------------------
        # FILTERS
        # ----------------------------------------------------

        filtered = df.copy()

        col1, col2, col3 = st.columns(3)

        with col1:

            if field_col:

                fields = sorted(
                    filtered[field_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected = st.multiselect(
                    "Academic field",
                    fields,
                )

                if selected:

                    filtered = filtered[
                        filtered[field_col]
                        .astype(str)
                        .isin(selected)
                    ]

        with col2:

            if degree_col:

                degrees = sorted(
                    filtered[degree_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected = st.multiselect(
                    "Degree",
                    degrees,
                )

                if selected:

                    filtered = filtered[
                        filtered[degree_col]
                        .astype(str)
                        .isin(selected)
                    ]

        with col3:

            if state_col:

                states = sorted(
                    filtered[state_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected = st.multiselect(
                    "State",
                    states,
                )

                if selected:

                    filtered = filtered[
                        filtered[state_col]
                        .astype(str)
                        .isin(selected)
                    ]

        st.write(
            f"Showing **{len(filtered):,}** courses."
        )

        # ----------------------------------------------------
        # FIELD CHART
        # ----------------------------------------------------

        if field_col:

            field_counts = (
                filtered[field_col]
                .value_counts()
                .head(25)
                .reset_index()
            )

            field_counts.columns = [
                "Field",
                "Courses",
            ]

            fig = px.bar(
                field_counts,
                x="Courses",
                y="Field",
                orientation="h",
                title="Top academic fields by course count",
            )

            fig.update_layout(
                yaxis={
                    "categoryorder": "total ascending"
                }
            )

            st.plotly_chart(
                fig,
                use_container_width=True,
            )

        # ----------------------------------------------------
        # FIELD SUMMARY
        # ----------------------------------------------------

        if not field_summary.empty:

            st.subheader("Field summary")

            st.dataframe(
                field_summary,
                use_container_width=True,
                hide_index=True,
            )

        st.subheader("Course data")

        st.dataframe(
            filtered,
            use_container_width=True,
            hide_index=True,
        )


# ============================================================
# SCHOLARSHIPS
# ============================================================

elif page == "💰 Scholarships":

    st.header("💰 Scholarships")

    if scholarships.empty:

        st.error(
            "scholarships_analytics.csv was not found."
        )

    else:

        df = scholarships.copy()

        st.metric(
            "Scholarship records",
            f"{len(df):,}",
        )

        state_col = find_column(
            df,
            [
                "State",
                "state",
                "Bundesland",
            ],
        )

        amount_min_col = find_column(
            df,
            [
                "Amount_Min_EUR",
                "Amount Min EUR",
                "Minimum Amount",
            ],
        )

        amount_max_col = find_column(
            df,
            [
                "Amount_Max_EUR",
                "Amount Max EUR",
                "Maximum Amount",
            ],
        )

        provider_col = find_column(
            df,
            [
                "Provider",
                "Scholarship_Provider",
                "Organization",
            ],
        )

        # ----------------------------------------------------
        # AMOUNT CONVERSION
        # ----------------------------------------------------

        if amount_min_col:

            df[amount_min_col] = pd.to_numeric(
                df[amount_min_col],
                errors="coerce",
            )

        if amount_max_col:

            df[amount_max_col] = pd.to_numeric(
                df[amount_max_col],
                errors="coerce",
            )

        # ----------------------------------------------------
        # METRICS
        # ----------------------------------------------------

        c1, c2, c3 = st.columns(3)

        with c1:

            st.metric(
                "Scholarships",
                f"{len(df):,}",
            )

        with c2:

            if amount_min_col:

                value = df[amount_min_col].median()

                st.metric(
                    "Median minimum amount",
                    (
                        f"€{value:,.0f}"
                        if pd.notna(value)
                        else "N/A"
                    ),
                )

        with c3:

            if amount_max_col:

                value = df[amount_max_col].median()

                st.metric(
                    "Median maximum amount",
                    (
                        f"€{value:,.0f}"
                        if pd.notna(value)
                        else "N/A"
                    ),
                )

        st.markdown("---")

        # ----------------------------------------------------
        # STATE DISTRIBUTION
        # ----------------------------------------------------

        if state_col:

            counts = (
                df[state_col]
                .value_counts()
                .reset_index()
            )

            counts.columns = [
                "State",
                "Scholarships",
            ]

            fig = px.bar(
                counts,
                x="State",
                y="Scholarships",
                title="Scholarships by state",
            )

            fig.update_layout(
                xaxis_tickangle=-45
            )

            st.plotly_chart(
                fig,
                use_container_width=True,
            )

        # ----------------------------------------------------
        # PROVIDERS
        # ----------------------------------------------------

        if provider_col:

            provider_counts = (
                df[provider_col]
                .value_counts()
                .head(20)
                .reset_index()
            )

            provider_counts.columns = [
                "Provider",
                "Scholarships",
            ]

            st.subheader(
                "Scholarship providers"
            )

            st.dataframe(
                provider_counts,
                use_container_width=True,
                hide_index=True,
            )

        # ----------------------------------------------------
        # DATA
        # ----------------------------------------------------

        st.subheader("Scholarship data")

        st.dataframe(
            df,
            use_container_width=True,
            hide_index=True,
        )


# ============================================================
# COMPANIES
# ============================================================

elif page == "🏢 Companies & Startups":

    st.header("🏢 Companies & Startups")

    if companies.empty:

        st.error(
            "companies_analytics.csv was not found."
        )

    else:

        df = companies.copy()

        st.metric(
            "Company records",
            f"{len(df):,}",
        )

        state_col = find_column(
            df,
            [
                "State",
                "state",
                "Bundesland",
            ],
        )

        city_col = find_column(
            df,
            [
                "City",
                "city",
            ],
        )

        industry_col = find_column(
            df,
            [
                "Industry",
                "industry",
                "Sector",
                "Industry_Category",
            ],
        )

        company_type_col = find_column(
            df,
            [
                "Company_Type",
                "Company Type",
                "Type",
            ],
        )

        filtered = df.copy()

        # ----------------------------------------------------
        # FILTERS
        # ----------------------------------------------------

        col1, col2, col3 = st.columns(3)

        with col1:

            if state_col:

                states = sorted(
                    filtered[state_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected = st.multiselect(
                    "State",
                    states,
                )

                if selected:

                    filtered = filtered[
                        filtered[state_col]
                        .astype(str)
                        .isin(selected)
                    ]

        with col2:

            if industry_col:

                industries = sorted(
                    filtered[industry_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected = st.multiselect(
                    "Industry",
                    industries,
                )

                if selected:

                    filtered = filtered[
                        filtered[industry_col]
                        .astype(str)
                        .isin(selected)
                    ]

        with col3:

            if company_type_col:

                types = sorted(
                    filtered[company_type_col]
                    .dropna()
                    .astype(str)
                    .unique()
                )

                selected = st.multiselect(
                    "Company type",
                    types,
                )

                if selected:

                    filtered = filtered[
                        filtered[company_type_col]
                        .astype(str)
                        .isin(selected)
                    ]

        st.write(
            f"Showing **{len(filtered):,}** companies."
        )

        # ----------------------------------------------------
        # INDUSTRY CHART
        # ----------------------------------------------------

        if industry_col:

            industry_counts = (
                filtered[industry_col]
                .value_counts()
                .head(25)
                .reset_index()
            )

            industry_counts.columns = [
                "Industry",
                "Companies",
            ]

            fig = px.bar(
                industry_counts,
                x="Companies",
                y="Industry",
                orientation="h",
                title="Companies by industry",
            )

            fig.update_layout(
                yaxis={
                    "categoryorder": "total ascending"
                }
            )

            st.plotly_chart(
                fig,
                use_container_width=True,
            )

        # ----------------------------------------------------
        # STATE INDUSTRY SUMMARY
        # ----------------------------------------------------

        if not state_industry_summary.empty:

            st.subheader(
                "State × industry ecosystem"
            )

            st.dataframe(
                state_industry_summary,
                use_container_width=True,
                hide_index=True,
            )

        # ----------------------------------------------------
        # DATA
        # ----------------------------------------------------

        st.subheader(
            "Company and startup records"
        )

        st.dataframe(
            filtered,
            use_container_width=True,
            hide_index=True,
        )


# ============================================================
# DATA EXPLORER
# ============================================================

elif page == "🔎 Data Explorer":

    st.header("🔎 Analytics Data Explorer")

    datasets = {
        "Universities": universities,
        "Courses": courses,
        "Scholarships": scholarships,
        "Companies": companies,
        "State Dashboard": state_dashboard,
        "Field Summary": field_summary,
        "Industry Summary": industry_summary,
        "State Industry Summary": state_industry_summary,
        "State Field Summary": state_field_summary,
        "University Scholarship Summary":
            university_scholarship_summary,
        "Quality Summary": quality_summary,
    }

    dataset_name = st.selectbox(
        "Choose dataset",
        list(datasets.keys()),
    )

    selected_df = datasets[dataset_name]

    if selected_df.empty:

        st.warning(
            "This dataset is empty or was not found."
        )

    else:

        st.write(
            f"Rows: **{len(selected_df):,}**"
        )

        st.write(
            f"Columns: **{len(selected_df.columns):,}**"
        )

        st.dataframe(
            selected_df,
            use_container_width=True,
            hide_index=True,
        )

        # ----------------------------------------------------
        # DOWNLOAD
        # ----------------------------------------------------

        csv_data = selected_df.to_csv(
            index=False
        ).encode("utf-8")

        st.download_button(
            label="⬇️ Download CSV",
            data=csv_data,
            file_name=(
                dataset_name
                .lower()
                .replace(" ", "_")
                + ".csv"
            ),
            mime="text/csv",
        )


# ============================================================
# DATA QUALITY
# ============================================================

elif page == "ℹ️ Data Quality":

    st.header("ℹ️ Data Quality")

    st.write(
        """
        This section exposes the quality/coverage information produced
        during the analytics pipeline rather than silently inventing
        missing values.
        """
    )

    if quality_summary.empty:

        st.warning(
            "analytics_quality_summary.csv was not found."
        )

    else:

        st.dataframe(
            quality_summary,
            use_container_width=True,
            hide_index=True,
        )

    st.markdown("---")

    st.subheader("Loaded datasets")

    dataset_status = []

    dataset_map = {
        "Universities": universities,
        "Courses": courses,
        "Scholarships": scholarships,
        "Companies": companies,
        "State Dashboard": state_dashboard,
        "Field Summary": field_summary,
        "Industry Summary": industry_summary,
        "State Industry Summary": state_industry_summary,
        "State Field Summary": state_field_summary,
        "University Scholarship Summary":
            university_scholarship_summary,
    }

    for name, dataframe in dataset_map.items():

        dataset_status.append(
            {
                "Dataset": name,
                "Loaded": not dataframe.empty,
                "Rows": len(dataframe),
                "Columns": len(dataframe.columns),
            }
        )

    status_df = pd.DataFrame(
        dataset_status
    )

    st.dataframe(
        status_df,
        use_container_width=True,
        hide_index=True,
    )


# ============================================================
# FOOTER
# ============================================================

st.markdown("---")

st.caption(
    "Germany Admit AI Helper — Education & Career Analytics"
)