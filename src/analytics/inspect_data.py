from pathlib import Path
import json
import pandas as pd


# ============================================================
# GERMANY ADMIT AI HELPER
# DATASET SCHEMA EXPORTER
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAW_DIR = PROJECT_ROOT / "data" / "raw"
OUTPUT_DIR = PROJECT_ROOT / "outputs"

SUPPORTED_EXTENSIONS = {
    ".csv",
    ".xlsx",
    ".xls",
}


# ============================================================
# FILE DISCOVERY
# ============================================================

def find_data_files():

    if not RAW_DIR.exists():
        raise FileNotFoundError(
            f"Raw data directory does not exist:\n{RAW_DIR}"
        )

    files = []

    for path in RAW_DIR.iterdir():

        if not path.is_file():
            continue

        if path.name.startswith("~$"):
            continue

        if path.suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(path)

    return sorted(
        files,
        key=lambda p: p.name.lower()
    )


# ============================================================
# CSV LOADER
# ============================================================

def load_csv(path):

    encodings = [
        "utf-8",
        "utf-8-sig",
        "cp1252",
        "latin1",
    ]

    last_error = None

    for encoding in encodings:

        try:

            return pd.read_csv(
                path,
                encoding=encoding,
                low_memory=False,
            )

        except UnicodeDecodeError as error:

            last_error = error

    raise ValueError(
        f"Could not decode CSV: {path.name}\n"
        f"Last error: {last_error}"
    )


# ============================================================
# EXCEL LOADER
# ============================================================

def load_excel(path):

    return pd.read_excel(
        path,
        sheet_name=None,
    )


# ============================================================
# SAFE VALUE
# ============================================================

def safe_value(value):

    if pd.isna(value):
        return None

    return str(value)


# ============================================================
# DATASET CATEGORY
# ============================================================

def detect_category(filename):

    name = filename.lower()

    if (
        "university" in name
        or "universities" in name
    ):
        return "universities"

    if "course" in name:
        return "courses"

    if "scholar" in name:
        return "scholarships"

    if (
        "company" in name
        or "companies" in name
        or "startup" in name
        or "career" in name
    ):
        return "companies_startups_careers"

    return "other"


# ============================================================
# COLUMN PROFILE
# ============================================================

def profile_column(df, column):

    series = df[column]

    missing = int(series.isna().sum())

    non_missing = int(series.notna().sum())

    unique = int(
        series.nunique(
            dropna=True
        )
    )

    sample_values = []

    try:

        values = (
            series.dropna()
            .astype(str)
            .drop_duplicates()
            .head(5)
            .tolist()
        )

        sample_values = values

    except Exception:
        sample_values = []

    return {
        "column": str(column),
        "dtype": str(series.dtype),
        "rows": int(len(df)),
        "non_missing": non_missing,
        "missing": missing,
        "missing_percentage": (
            round(
                missing / len(df) * 100,
                2
            )
            if len(df) > 0
            else 0
        ),
        "unique_values": unique,
        "sample_values": sample_values,
    }


# ============================================================
# DATAFRAME SCHEMA
# ============================================================

def profile_dataframe(df, source_file, sheet_name=None):

    columns = []

    for column in df.columns:

        columns.append(
            profile_column(
                df,
                column
            )
        )

    return {
        "source_file": source_file,
        "sheet": sheet_name,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "duplicate_rows": int(
            df.duplicated().sum()
        ),
        "column_profiles": columns,
    }


# ============================================================
# PROCESS CSV
# ============================================================

def process_csv(path):

    df = load_csv(path)

    return [
        profile_dataframe(
            df=df,
            source_file=path.name,
            sheet_name=None,
        )
    ]


# ============================================================
# PROCESS EXCEL
# ============================================================

def process_excel(path):

    workbook = load_excel(path)

    results = []

    for sheet_name, df in workbook.items():

        results.append(
            profile_dataframe(
                df=df,
                source_file=path.name,
                sheet_name=sheet_name,
            )
        )

    return results


# ============================================================
# BUILD SCHEMA
# ============================================================

def build_schema():

    files = find_data_files()

    schema = {
        "project": "Germany Admit AI Helper",
        "project_root": str(PROJECT_ROOT),
        "raw_directory": str(RAW_DIR),
        "file_count": len(files),
        "datasets": [],
    }

    for path in files:

        category = detect_category(
            path.name
        )

        try:

            if path.suffix.lower() == ".csv":

                sheets = process_csv(path)

            else:

                sheets = process_excel(path)

            dataset = {
                "file": path.name,
                "category": category,
                "extension": path.suffix.lower(),
                "file_size_bytes": path.stat().st_size,
                "status": "success",
                "sheets": sheets,
            }

        except Exception as error:

            dataset = {
                "file": path.name,
                "category": category,
                "extension": path.suffix.lower(),
                "file_size_bytes": path.stat().st_size,
                "status": "error",
                "error": str(error),
                "sheets": [],
            }

        schema["datasets"].append(
            dataset
        )

    return schema


# ============================================================
# SAVE JSON
# ============================================================

def save_json(schema):

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = (
        OUTPUT_DIR
        / "dataset_schema.json"
    )

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            schema,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return output_path


# ============================================================
# SAVE HUMAN-READABLE TXT
# ============================================================

def save_text_report(schema):

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_path = (
        OUTPUT_DIR
        / "dataset_schema_report.txt"
    )

    lines = []

    lines.append(
        "GERMANY ADMIT AI HELPER"
    )

    lines.append(
        "DATASET SCHEMA REPORT"
    )

    lines.append(
        "=" * 80
    )

    lines.append(
        f"Files discovered: {schema['file_count']}"
    )

    lines.append("")

    for dataset in schema["datasets"]:

        lines.append(
            "=" * 80
        )

        lines.append(
            f"FILE: {dataset['file']}"
        )

        lines.append(
            f"CATEGORY: {dataset['category']}"
        )

        lines.append(
            f"STATUS: {dataset['status']}"
        )

        if dataset["status"] == "error":

            lines.append(
                f"ERROR: {dataset['error']}"
            )

            continue

        for sheet in dataset["sheets"]:

            lines.append("")

            if sheet["sheet"] is not None:

                lines.append(
                    f"SHEET: {sheet['sheet']}"
                )

            lines.append(
                f"ROWS: {sheet['rows']:,}"
            )

            lines.append(
                f"COLUMNS: {sheet['columns']:,}"
            )

            lines.append(
                f"DUPLICATE ROWS: "
                f"{sheet['duplicate_rows']:,}"
            )

            lines.append("")

            for column in sheet[
                "column_profiles"
            ]:

                lines.append(
                    f"  {column['column']}"
                )

                lines.append(
                    f"    dtype: "
                    f"{column['dtype']}"
                )

                lines.append(
                    f"    non-missing: "
                    f"{column['non_missing']:,}"
                )

                lines.append(
                    f"    missing: "
                    f"{column['missing']:,}"
                )

                lines.append(
                    f"    missing %: "
                    f"{column['missing_percentage']}%"
                )

                lines.append(
                    f"    unique: "
                    f"{column['unique_values']:,}"
                )

                if column[
                    "sample_values"
                ]:

                    lines.append(
                        "    examples: "
                        + " | ".join(
                            column[
                                "sample_values"
                            ]
                        )
                    )

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:

        file.write(
            "\n".join(lines)
        )

    return output_path


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 80)
    print(
        "GERMANY ADMIT AI HELPER"
    )
    print(
        "DATASET SCHEMA EXPORT"
    )
    print("=" * 80)

    print()
    print(
        f"Project root:\n{PROJECT_ROOT}"
    )

    print()
    print(
        f"Raw directory:\n{RAW_DIR}"
    )

    if not RAW_DIR.exists():

        raise FileNotFoundError(
            f"\nRaw directory not found:\n{RAW_DIR}"
        )

    print()
    print(
        "Reading datasets..."
    )

    schema = build_schema()

    json_path = save_json(
        schema
    )

    text_path = save_text_report(
        schema
    )

    successful = sum(
        1
        for dataset in schema["datasets"]
        if dataset["status"] == "success"
    )

    failed = sum(
        1
        for dataset in schema["datasets"]
        if dataset["status"] == "error"
    )

    print()
    print("=" * 80)
    print(
        "SCHEMA EXPORT COMPLETE"
    )
    print("=" * 80)

    print()
    print(
        f"Files found:       {len(schema['datasets'])}"
    )

    print(
        f"Successfully read: {successful}"
    )

    print(
        f"Errors:            {failed}"
    )

    print()
    print(
        "Created:"
    )

    print(
        f"  {json_path}"
    )

    print(
        f"  {text_path}"
    )

    print()
    print(
        "The large terminal output is now gone."
    )

    print(
        "The complete schema is stored in outputs."
    )

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()