import os
import re
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ============================================================
# APPLICATION CONFIGURATION
# ============================================================

APP_VERSION = "3.2.0"

app = FastAPI(
    title="Mines Equipment AI",
    description="Mining Equipment Stoppage Analysis and AI Assistant",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent

DEFAULT_EXCEL_PATH = (
    BASE_DIR / "mining_equipment_stoppage_dataset-1.xlsx"
)

EXCEL_PATH = Path(
    os.getenv("STOPPAGE_DATA_FILE", str(DEFAULT_EXCEL_PATH))
)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT_SECONDS = max(5, int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "20")))


# ============================================================
# REQUEST MODEL
# ============================================================

class QuestionRequest(BaseModel):
    question: str
    data: Optional[list[dict[str, Any]]] = None


# ============================================================
# DATA NORMALIZATION
# ============================================================

COLUMN_ALIASES = {
    "stoppage_id": [
        "stoppageid", "id", "stoppage_id"
    ],
    "equipment_id": [
        "equipmentid", "equipment_id", "equipment"
    ],
    "equipment_type": [
        "equipmenttype", "equipment_type"
    ],
    "mine_location": [
        "minelocation", "mine_location", "location"
    ],
    "stoppage_date": [
        "stoppagedate", "stoppage_date", "date"
    ],
    "start_time": [
        "starttime", "start_time"
    ],
    "end_time": [
        "endtime", "end_time"
    ],
    "duration_minutes": [
        "durationminutes", "duration_minutes", "duration"
    ],
    "stoppage_category": [
        "stoppagecategory", "stoppage_category", "category"
    ],
    "stoppage_reason": [
        "stoppagereason", "stoppage_reason", "reason"
    ],
    "reported_by": [
        "reportedby", "reported_by"
    ],
    "remarks": [
        "remarks", "remark"
    ],
}


def compact_name(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def normalize_dataframe(data: Any) -> pd.DataFrame:
    if isinstance(data, pd.DataFrame):
        df = data.copy()
    elif isinstance(data, list):
        df = pd.DataFrame(data)
    else:
        df = pd.DataFrame()

    if df.empty:
        return pd.DataFrame(columns=list(COLUMN_ALIASES.keys()))

    original_columns = {
        compact_name(column): column
        for column in df.columns
    }

    normalized = pd.DataFrame(index=df.index)

    for canonical, aliases in COLUMN_ALIASES.items():
        selected_column = None

        for alias in aliases:
            key = compact_name(alias)

            if key in original_columns:
                selected_column = original_columns[key]
                break

        if selected_column is not None:
            normalized[canonical] = df[selected_column]
        else:
            normalized[canonical] = ""

    normalized["equipment_id"] = (
        normalized["equipment_id"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.upper()
    )

    normalized["duration_minutes"] = pd.to_numeric(
        normalized["duration_minutes"],
        errors="coerce",
    )

    normalized.loc[
        normalized["duration_minutes"] < 0,
        "duration_minutes",
    ] = None

    text_columns = [
        "equipment_type",
        "mine_location",
        "stoppage_category",
        "stoppage_reason",
        "reported_by",
        "remarks",
        "stoppage_id",
        "stoppage_date",
        "start_time",
        "end_time",
    ]

    for column in text_columns:
        normalized[column] = (
            normalized[column]
            .fillna("")
            .astype(str)
            .str.strip()
        )

    return normalized


# ============================================================
# DATA LOADING
# ============================================================

def load_excel_data() -> pd.DataFrame:
    excel_file = Path(EXCEL_PATH)

    if not excel_file.exists():
        raise FileNotFoundError(
            f"Excel dataset not found: {excel_file}"
        )

    try:
        raw_df = pd.read_excel(excel_file)
        return normalize_dataframe(raw_df)

    except Exception as exc:
        raise RuntimeError(
            f"Unable to read Excel dataset: {exc}"
        ) from exc


def get_dataframe(
    incoming_data: Optional[list[dict[str, Any]]] = None,
):
    if incoming_data is not None:
        return normalize_dataframe(incoming_data), "spring_boot_data"

    return load_excel_data(), "excel"


def valid_records(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    required_columns = [
        "equipment_id",
        "duration_minutes",
    ]

    if not all(column in df.columns for column in required_columns):
        return pd.DataFrame(columns=list(COLUMN_ALIASES.keys()))

    return df[
        (df["equipment_id"] != "")
        & df["duration_minutes"].notna()
        & (df["duration_minutes"] >= 0)
    ].copy()


# ============================================================
# FORMATTING HELPERS
# ============================================================

def number(value: Any) -> int:
    return int(round(float(value)))


def format_minutes(value: Any) -> str:
    minutes = number(value)

    days = minutes // 1440
    hours = (minutes % 1440) // 60
    mins = minutes % 60

    if days:
        return (
            f"{minutes:,} minutes "
            f"({days} days, {hours} hours, {mins} minutes)"
        )

    if hours:
        return (
            f"{minutes:,} minutes "
            f"({hours} hours, {mins} minutes)"
        )

    return f"{minutes:,} minutes"


def empty_data_message(df: pd.DataFrame) -> str:
    if df.empty:
        return "The dataset contains no records to analyze."

    return "No valid stoppage records are available for this analysis."


# ============================================================
# EQUIPMENT ANALYSIS
# ============================================================

def equipment_ranking(df: pd.DataFrame) -> pd.DataFrame:
    records = valid_records(df)

    if records.empty:
        return pd.DataFrame(
            columns=[
                "equipment_id",
                "stoppages",
                "total_downtime",
            ]
        )

    return (
        records.groupby("equipment_id")
        .agg(
            stoppages=("equipment_id", "size"),
            total_downtime=("duration_minutes", "sum"),
        )
        .reset_index()
        .sort_values(
            ["total_downtime", "equipment_id"],
            ascending=[False, True],
        )
        .reset_index(drop=True)
    )


def find_requested_equipment(
    question: str,
    df: pd.DataFrame,
) -> Optional[str]:
    matches = re.findall(
        r"\b[A-Z]{2,5}\s*-\s*\d{1,3}\b",
        question.upper(),
    )

    if not matches:
        return None

    return re.sub(r"\s+", "", matches[0])


def analyze_equipment(
    equipment_id: str,
    df: pd.DataFrame,
) -> str:
    records = valid_records(df)

    equipment = records[
        records["equipment_id"] == equipment_id
    ]

    if equipment.empty:
        known_ids = sorted(
            records["equipment_id"].unique().tolist()
        )

        return (
            f"No records were found for equipment {equipment_id}.\n"
            f"Available equipment IDs: {', '.join(known_ids)}"
        )

    total = equipment["duration_minutes"].sum()
    average = equipment["duration_minutes"].mean()

    result = [
        f"{equipment_id} downtime summary:",
        f"Stoppages: {len(equipment)}",
        f"Total downtime: {format_minutes(total)}",
        f"Average stoppage duration: {average:.2f} minutes",
    ]

    reasons = equipment.loc[
        equipment["stoppage_reason"] != "",
        "stoppage_reason",
    ].value_counts()

    if not reasons.empty:
        result.append(
            f"Most common stoppage reason: {reasons.index[0]} "
            f"({int(reasons.iloc[0])} occurrences)"
        )

    longest = equipment.loc[
        equipment["duration_minutes"].idxmax()
    ]

    result.append(
        "Longest recorded stoppage: "
        f"{format_minutes(longest['duration_minutes'])}"
    )

    locations = equipment.loc[
        equipment["mine_location"] != "",
        "mine_location",
    ].value_counts()

    if not locations.empty:
        result.append(
            f"Most frequent recorded location: {locations.index[0]}"
        )

    return "\n".join(result)


# ============================================================
# STOPPAGE REASON ANALYSIS
# ============================================================

def analyze_reasons(
    question: str,
    df: pd.DataFrame,
) -> str:
    records = valid_records(df)
    q = question.lower()

    # Filter by equipment when the question specifies an equipment ID.

    equipment_id = find_requested_equipment(question, df)
    if equipment_id:
        records = records[
            records["equipment_id"].astype(str).str.upper()
            == equipment_id.upper()
        ]

        if records.empty:
            return f"No valid stoppage records were found for {equipment_id}."

    if records.empty:
        return empty_data_message(df)

    records_with_reasons = records[
        records["stoppage_reason"] != ""
    ]

    if records_with_reasons.empty:
        return "No stoppage-reason data is available."

    counts = records_with_reasons[
        "stoppage_reason"
    ].value_counts()

    if re.search(r"\ball\b|\bevery\b", q):
        limit = len(counts)
    else:
        match = re.search(r"\btop\s+(\d+)\b", q)
        limit = int(match.group(1)) if match else 5
        limit = max(1, min(limit, 100))

    show_percentage = any(
        term in q
        for term in [
            "percentage",
            "percentages",
            "percent",
            "%",
            "proportion",
        ]
    )

    lines = [
        "Stoppage reasons ranked by occurrence count:",
        f"Valid stoppage records: {len(records)}",
    ]

    for index, (reason, count) in enumerate(
        counts.head(limit).items(),
        start=1,
    ):
        line = (
            f"{index}. {reason}: "
            f"{int(count)} occurrences"
        )

        if show_percentage:
            percentage = count / len(records) * 100
            line += f" ({percentage:.2f}% of valid records)"

        lines.append(line)

    if show_percentage:
        lines.append(
            "Percentages use all valid stoppage records "
            "as the denominator."
        )

    return "\n".join(lines)


# ============================================================
# EQUIPMENT RANKING
# ============================================================

def analyze_lowest_stoppage_count(df: pd.DataFrame) -> str:
    records = valid_records(df)

    if records.empty:
        return empty_data_message(df)

    ranking = (
        records.groupby("equipment_id")
        .agg(stoppages=("equipment_id", "size"))
        .reset_index()
        .sort_values(["stoppages", "equipment_id"], ascending=[True, True])
    )

    lines = ["Equipment ranked by lowest stoppage count:"]
    for position, (_, row) in enumerate(ranking.head(10).iterrows(), start=1):
        lines.append(f"{position}. {row['equipment_id']}: {int(row['stoppages'])} stoppages")

    return "\n".join(lines)


def analyze_highest_stoppage_count(question: str, df: pd.DataFrame) -> str:
    """Rank equipment by the number of valid stoppage records."""
    records = valid_records(df)
    if records.empty:
        return empty_data_message(df)

    ranking = (
        records.groupby("equipment_id")
        .size()
        .rename("stoppages")
        .reset_index()
        .sort_values(
            ["stoppages", "equipment_id"],
            ascending=[False, True],
        )
        .reset_index(drop=True)
    )

    q = question.lower()
    match = re.search(r"\btop\s+(\d+)\b", q)

    if match:
        limit = max(1, min(int(match.group(1)), len(ranking)))
        selected = ranking.head(limit)
        title = f"Equipment ranked by highest stoppage count (top {limit}):"
    elif any(term in q for term in [
        "rank", "ranking", "all equipment", "show all",
        "list all", "every equipment",
    ]):
        selected = ranking
        title = "Equipment ranked by highest stoppage count:"
    else:
        highest = int(ranking.iloc[0]["stoppages"])
        selected = ranking[ranking["stoppages"] == highest]
        title = "Equipment with the most stoppages:"

    lines = [title]
    for position, (_, row) in enumerate(selected.iterrows(), start=1):
        lines.append(
            f"{position}. {row['equipment_id']}: "
            f"{int(row['stoppages'])} stoppages"
        )

    return "\n".join(lines)

def analyze_ranking(
    question: str,
    df: pd.DataFrame,
) -> str:
    ranking = equipment_ranking(df)

    if ranking.empty:
        return "No valid equipment downtime records are available."

    q = question.lower()

    lowest_requested = any(
        phrase in q
        for phrase in [
            "lowest",
            "least downtime",
            "minimum downtime",
            "smallest downtime",
            "least total",
            "minimum total",
        ]
    )

    ranking = ranking.sort_values(
        ["total_downtime", "equipment_id"],
        ascending=[lowest_requested, True],
    ).reset_index(drop=True)

    match = re.search(r"\btop\s+(\d+)\b", q)

    if match:
        limit = max(
            1,
            min(int(match.group(1)), len(ranking)),
        )

    elif any(
        phrase in q
        for phrase in [
            "highest",
            "maximum",
            "most downtime",
            "lowest",
            "least downtime",
            "minimum downtime",
            "smallest downtime",
        ]
    ):
        limit = 1

    else:
        limit = len(ranking)

    if lowest_requested:
        title = "Equipment ranked by lowest total downtime:"
    else:
        title = "Equipment ranked by total downtime:"

    lines = [title]

    for position, (_, row) in enumerate(
        ranking.head(limit).iterrows(),
        start=1,
    ):
        lines.append(
            f"{position}. {row['equipment_id']}: "
            f"{format_minutes(row['total_downtime'])}, "
            f"{int(row['stoppages'])} stoppages"
        )

    if lowest_requested and limit == 1:
        lowest_total = ranking.iloc[0]["total_downtime"]

        tied = ranking[
            ranking["total_downtime"] == lowest_total
        ]

        if len(tied) > 1:
            tied_ids = ", ".join(tied["equipment_id"].tolist())

            lines.append(
                f"Tie detected: {tied_ids} share the lowest "
                f"total downtime of {format_minutes(lowest_total)}."
            )

    return "\n".join(lines)


# ============================================================
# GROUP ANALYSIS HELPERS
# ============================================================

def analyze_group(
    df: pd.DataFrame,
    group_column: str,
    label: str,
    question: str,
) -> str:
    records = valid_records(df)

    if records.empty:
        return empty_data_message(df)

    if group_column not in records.columns:
        return f"{label} data is unavailable."

    grouped_records = records[
        records[group_column].fillna("").astype(str).str.strip() != ""
    ]

    if grouped_records.empty:
        return f"No {label.lower()} values are available."

    summary = (
        grouped_records.groupby(group_column)
        .agg(
            stoppages=("equipment_id", "size"),
            total_downtime=("duration_minutes", "sum"),
            average_downtime=("duration_minutes", "mean"),
        )
        .reset_index()
    )

    q = question.lower()

    lowest = any(
        phrase in q
        for phrase in [
            "lowest",
            "least downtime",
            "minimum downtime",
            "smallest downtime",
        ]
    )

    summary = summary.sort_values(
        ["total_downtime", group_column],
        ascending=[lowest, True],
    ).reset_index(drop=True)

    top_match = re.search(r"\btop\s+(\d+)\b", q)

    if top_match:
        limit = max(
            1,
            min(int(top_match.group(1)), len(summary)),
        )
    elif any(
        phrase in q
        for phrase in [
            "highest",
            "maximum",
            "most downtime",
            "lowest",
            "least downtime",
            "minimum downtime",
            "smallest downtime",
        ]
    ):
        limit = 1
    else:
        limit = len(summary)

    direction = "lowest" if lowest else "highest"

    lines = [
        f"{label} downtime analysis:",
        f"Ranking direction: {direction} total downtime",
    ]

    for index, (_, row) in enumerate(
        summary.head(limit).iterrows(),
        start=1,
    ):
        group_name = row[group_column]

        lines.append(
            f"{index}. {group_name}: "
            f"{format_minutes(row['total_downtime'])}, "
            f"{int(row['stoppages'])} stoppages, "
            f"average {row['average_downtime']:.2f} minutes"
        )

    return "\n".join(lines)


# ============================================================
# MINE LOCATION ANALYSIS
# ============================================================

def analyze_locations(
    question: str,
    df: pd.DataFrame,
) -> str:
    records = valid_records(df)

    if records.empty:
        return empty_data_message(df)

    q = question.casefold().strip()

    locations = sorted(
        str(location).strip()
        for location in records["mine_location"].dropna().unique()
        if str(location).strip()
    )

    # Analyze a specifically named mine location.
    requested_location = next(
        (
            location
            for location in sorted(locations, key=len, reverse=True)
            if location.casefold() in q
        ),
        None,
    )

    if requested_location:
        location_records = records[
            records["mine_location"]
            .fillna("")
            .astype(str)
            .str.strip()
            .str.casefold()
            == requested_location.casefold()
        ]

        total = location_records["duration_minutes"].sum()
        average = location_records["duration_minutes"].mean()

        lines = [
            f"Mine location: {requested_location}",
            f"Stoppage records: {len(location_records)}",
            f"Total downtime: {format_minutes(total)}",
            f"Average stoppage duration: {average:.2f} minutes",
        ]

        if "stoppage_reason" in location_records.columns:
            reasons = (
                location_records["stoppage_reason"]
                .dropna()
                .astype(str)
                .str.strip()
            )
            reasons = reasons[reasons != ""].value_counts()

            if not reasons.empty:
                lines.append(
                    f"Most common stoppage reason: "
                    f"{reasons.index[0]} ({reasons.iloc[0]} occurrences)"
                )

        return "\n".join(lines)

    if any(
        phrase in q
        for phrase in [
            "highest",
            "maximum",
            "most downtime",
            "lowest",
            "least downtime",
            "minimum downtime",
            "top ",
        ]
    ):
        return analyze_group(
            records,
            "mine_location",
            "Mine location",
            question,
        )

    if not locations:
        return "No mine-location values are available."

    return (
        f"Found {len(locations)} mine locations:\n"
        + "\n".join(
            f"{index}. {location}"
            for index, location in enumerate(locations, start=1)
        )
    )


# STOPPAGE CATEGORY ANALYSIS
# ============================================================

def analyze_categories(
    question: str,
    df: pd.DataFrame,
) -> str:
    records = valid_records(df)

    if records.empty:
        return empty_data_message(df)

    q = question.lower()

    if any(
        phrase in q
        for phrase in [
            "downtime",
            "highest",
            "lowest",
            "top ",
            "minimum",
            "maximum",
        ]
    ):
        return analyze_group(
            df,
            "stoppage_category",
            "Stoppage category",
            question,
        )

    categories = records.loc[
        records["stoppage_category"] != "",
        "stoppage_category",
    ].value_counts()

    if categories.empty:
        return "No stoppage-category values are available."

    lines = ["Stoppage categories ranked by occurrence count:"]

    for index, (category, count) in enumerate(
        categories.items(),
        start=1,
    ):
        percentage = count / len(records) * 100

        lines.append(
            f"{index}. {category}: {int(count)} occurrences "
            f"({percentage:.2f}% of valid records)"
        )

    return "\n".join(lines)


# ============================================================
# TOTAL DATASET SUMMARY
# ============================================================

def analyze_summary(df: pd.DataFrame) -> str:
    records = valid_records(df)

    if records.empty:
        return empty_data_message(df)

    total = records["duration_minutes"].sum()
    ranking = equipment_ranking(df)

    lines = [
        "Mining Equipment Stoppage Summary",
        f"Loaded records: {len(df)}",
        f"Valid stoppage records: {len(records)}",
        f"Unique equipment IDs: {records['equipment_id'].nunique()}",
        f"Total downtime: {format_minutes(total)}",
        (
            "Average stoppage duration: "
            f"{records['duration_minutes'].mean():.2f} minutes"
        ),
    ]

    if not ranking.empty:
        highest = ranking.iloc[0]
        lowest = ranking.iloc[-1]

        lines.append(
            f"Highest total downtime: {highest['equipment_id']} "
            f"({format_minutes(highest['total_downtime'])})"
        )

        lines.append(
            f"Lowest total downtime: {lowest['equipment_id']} "
            f"({format_minutes(lowest['total_downtime'])})"
        )

        lowest_total = lowest["total_downtime"]

        tied_lowest = ranking[
            ranking["total_downtime"] == lowest_total
        ]

        if len(tied_lowest) > 1:
            lines.append(
                "Equipment tied for lowest downtime: "
                + ", ".join(tied_lowest["equipment_id"].tolist())
            )

    reasons = records.loc[
        records["stoppage_reason"] != "",
        "stoppage_reason",
    ].value_counts()

    if not reasons.empty:
        top_reason = reasons.index[0]
        count = int(reasons.iloc[0])
        percentage = count / len(records) * 100

        lines.append(
            f"Most common stoppage reason: {top_reason} "
            f"({count} occurrences, {percentage:.2f}%)"
        )

    return "\n".join(lines)


# ============================================================
# AI QUESTION PROCESSING
# ============================================================

def ollama_fallback_answer(question: str, df: pd.DataFrame) -> str:
    """Answer general mining/learning questions with local Ollama while grounding dataset claims."""
    records = valid_records(df)
    if records.empty:
        return (
            "There are no valid dataset records available. I can still explain "
            "general mining concepts, but dataset-specific calculations are unavailable."
        )

    try:
        summary = analyze_summary(df)
        ranking = equipment_ranking(df)
        reasons = records.loc[records["stoppage_reason"] != "", "stoppage_reason"].value_counts().head(10)
        types = records.loc[records["equipment_type"] != "", "equipment_type"].value_counts().head(15)
        locations = records.loc[records["mine_location"] != "", "mine_location"].value_counts().head(15)
        context_lines = [summary, "", "Top equipment by total downtime:"]
        context_lines.extend(
            f"- {row.equipment_id}: {format_minutes(row.total_downtime)}; {int(row.stoppages)} stoppages"
            for row in ranking.head(10).itertuples(index=False)
        )
        context_lines.extend(["", "Most common recorded reasons:"])
        context_lines.extend(f"- {name}: {int(count)}" for name, count in reasons.items())
        context_lines.extend(["", "Equipment-type record counts:"])
        context_lines.extend(f"- {name}: {int(count)}" for name, count in types.items())
        context_lines.extend(["", "Mine-location record counts:"])
        context_lines.extend(f"- {name}: {int(count)}" for name, count in locations.items())
        dataset_context = "\n".join(context_lines)

        prompt = (
            "You are MINE AI, a clear and careful mining-operations assistant.\n"
            "Answer the user's actual question, including general learning, conceptual, "
            "educational, maintenance, reliability, and mining operations questions when possible.\n\n"
            "DATASET CONTEXT (computed by Python; authoritative for this dataset):\n"
            f"{dataset_context}\n\n"
            f"USER QUESTION: {question}\n\n"
            "Rules: Separate general knowledge from findings in this dataset. "
            "Do not invent dataset statistics or claim the dataset contains fields that are not shown. "
            "If asked for a dataset-specific number not present in the context, say it cannot be "
            "determined from available fields. For recommendations, state practical steps and relevant "
            "safety caveats. Never present general guidance as a site-specific fact. "
            "Use a concise, structured answer."
        )
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2},
        }
        request = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
            result = json.loads(response.read().decode("utf-8"))

        answer = str(result.get("response", "")).strip()
        if answer:
            return answer
        return "The local AI model returned an empty answer. Please rephrase the question."

    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", errors="replace")[:250]
        except Exception:
            pass
        print(f"Ollama HTTP error {exc.code}: {detail}")
        return (
            f"The local AI model returned HTTP {exc.code}. Check that Ollama is running "
            f"and that model '{OLLAMA_MODEL}' is installed."
        )
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"Ollama connection error: {exc}")
        return (
            "The question needs the local language model, but Ollama could not be reached at "
            f"{OLLAMA_URL}. Start Ollama and ensure model '{OLLAMA_MODEL}' is installed. "
            "Dataset-backed questions can still be answered by the built-in analysis rules."
        )
    except (ValueError, KeyError, TypeError) as exc:
        print(f"Ollama response error: {exc}")
        return "The local AI model returned an invalid response. Please try again."


def answer_question(
    question: str,
    df: pd.DataFrame,
) -> str:
    q = question.lower().strip()

    if not q:
        return "Please enter a question about equipment stoppages."

    if df.empty:
        return empty_data_message(df)

    records = valid_records(df)

    # --------------------------------------------------------
    # Direct Bucket Wheel Excavator (BWE) analysis
    # Keep count questions away from the LLM fallback.
    # --------------------------------------------------------

    is_bwe_question = (
        "bwe" in q.split()
        or "bucket wheel excavator" in q
        or "bucket wheel excavators" in q
    )

    if is_bwe_question:
        bwe_records = records[
            records["equipment_type"].astype(str).str.strip().str.casefold()
            == "bucket wheel excavator"
        ]

        if bwe_records.empty:
            return "No Bucket Wheel Excavator records were found."

        # Explicit record-list requests must take priority over count wording.
        list_all_bwe = (
            any(phrase in q for phrase in [
                "show all", "list all", "display all", "show me all",
                "list me all", "give me all", "show every", "list every",
            ])
            and any(word in q for word in [
                "stoppage", "stoppages", "record", "records",
            ])
        )

        if list_all_bwe:
            display_columns = [
                column for column in [
                    "equipment_id",
                    "equipment_type",
                    "mine_location",
                    "duration_minutes",
                    "stoppage_category",
                    "stoppage_reason",
                ]
                if column in bwe_records.columns
            ]

            if not display_columns:
                return "BWE records were found, but no display columns are available."

            output = bwe_records[display_columns].copy()
            output.index = range(1, len(output) + 1)

            return (
                f"All Bucket Wheel Excavator stoppages "
                f"({len(output)} records):\n"
                + output.to_string()
            )

        if any(
            phrase in q
            for phrase in [
                "how many", "number of", "count", "stoppage count",
                "stoppage records", "how much",
            ]
        ):
            equipment_ids = sorted(
                bwe_records["equipment_id"].dropna().astype(str).str.strip().unique().tolist()
            )
            return (
                f"Bucket Wheel Excavator stoppage count: {len(bwe_records)} valid records.\n"
                f"Unique equipment units: {len(equipment_ids)}"
                + (f" ({', '.join(equipment_ids)})." if equipment_ids else ".")
            )

        if any(
            phrase in q
            for phrase in [
                "show",
                "list",
                "analyze",
                "analysis",
                "equipment",
                "details",
                "summary",
            ]
        ):
            return analyze_group(
                bwe_records,
                "equipment_id",
                "Bucket Wheel Excavator",
                question,
            )

    # --------------------------------------------------------
    # Greetings
    # --------------------------------------------------------

    greetings = {
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
    }

    if q in greetings:
        return (
            "Hello! I'm your Mining AI Assistant.\n"
            "I can analyze equipment downtime, stoppage reasons, "
            "equipment types, mine locations, stoppage categories, "
            "and maintenance patterns using your dataset."
        )

    # --------------------------------------------------------
    # Dataset summary
    # --------------------------------------------------------

    if any(
        phrase in q
        for phrase in [
            "mining performance summary",
            "overall summary",
            "dataset summary",
            "give me a summary",
            "summarize the data",
            "summarize dataset",
            "complete summary",
        ]
    ):
        return analyze_summary(df)

    # --------------------------------------------------------
    # Equipment ID listing
    # --------------------------------------------------------

    if (
        any(
            phrase in q
            for phrase in [
                "equipment id",
                "equipment ids",
                "equipment identifier",
            ]
        )
        and any(
            word in q
            for word in [
                "list",
                "all",
                "unique",
                "show",
                "available",
                "which",
            ]
        )
        and not any(
            phrase in q
            for phrase in [
                "highest downtime",
                "highest total downtime",
                "most downtime",
                "maximum downtime",
                "lowest downtime",
                "lowest total downtime",
                "least downtime",
                "minimum downtime",
                "smallest downtime",
                "rank equipment",
                "top equipment",
            ]
        )
    ):
        ids = sorted(records["equipment_id"].unique().tolist())

        return (
            f"Found {len(ids)} unique equipment IDs "
            f"across {len(records)} valid records:\n"
            + "\n".join(
                f"{index}. {equipment_id}"
                for index, equipment_id in enumerate(ids, start=1)
            )
        )

    # --------------------------------------------------------
    # --------------------------------------------------------
    # Equipment-type-specific stoppage counts
    # Deterministic counts from valid dataset records.
    # --------------------------------------------------------

    type_aliases = {
        "Bucket Wheel Excavator": ["bucket wheel excavator", "bucket wheel excavators", "bwe"],
        "Water Sprinkler": ["water sprinkler", "water sprinklers"],
        "Wheel Loader": ["wheel loader", "wheel loaders"],
        "Dump Truck": ["dump truck", "dump trucks"],
        "Drill Machine": ["drill machine", "drill machines"],
        "Conveyor": ["conveyor", "conveyors"],
        "Excavator": ["excavator", "excavators"],
        "Crusher": ["crusher", "crushers"],
        "Dozer": ["dozer", "dozers"],
        "Dragline": ["dragline", "draglines"],
        "Drill": ["drill", "drills"],
        "Grader": ["grader", "graders"],
        "Shovel": ["shovel", "shovels"],
    }

    # Route top-N stoppage-count ranking before generic record counts.
    ranking_question = question.lower()
    if (
        re.search(r"\btop\s+\d+\b", ranking_question)
        and "stoppage" in ranking_question
        and ("count" in ranking_question or "stoppages" in ranking_question)
    ):
        return analyze_highest_stoppage_count(question, df)

    count_question = (
        any(phrase in q for phrase in [
            "how many", "number of", "count of", "count",
            "stoppage count", "record count",
        ])
        and any(word in q for word in [
            "stoppage", "stoppages", "record", "records",
        ])
    )

    if count_question:
        type_count_match = None

        for type_name, aliases in type_aliases.items():
            if any(
                re.search(r"\b" + re.escape(alias) + r"\b", q)
                for alias in aliases
            ):
                type_count_match = type_name
                break

        if type_count_match:
            type_records = records[
                records["equipment_type"].astype(str).str.strip().str.casefold()
                == type_count_match.casefold()
            ]

            return (
                f"{type_count_match} stoppage count: "
                f"{len(type_records)} valid records."
            )

    # --------------------------------------------------------
    # Equipment-ID-specific stoppage counts
    # --------------------------------------------------------

    if count_question:
        requested_id = find_requested_equipment(question, df)

        if requested_id:
            equipment_records = records[
                records["equipment_id"].astype(str).str.strip().str.upper()
                == requested_id.upper()
            ]

            if equipment_records.empty:
                return f"No records were found for equipment {requested_id}."

            return (
                f"Stoppage count for {requested_id}: "
                f"{len(equipment_records)} valid records."
            )

    # --------------------------------------------------------
    # General record counts
    # --------------------------------------------------------

    # --------------------------------------------------------
    # Record counts
    # --------------------------------------------------------

    # Count records, not downtime minutes, for highest-stoppage questions.
    if any(phrase in q for phrase in [
        "most stoppages",
        "most number of stoppages",
        "highest number of stoppages",
        "highest stoppage count",
        "maximum stoppage count",
        "maximum number of stoppages",
        "equipment with most stoppages",
        "equipment with the most stoppages",
        "equipment with highest stoppage count",
        "which equipment has the most stoppages",
        "which equipment has highest stoppage count",
    ]):
        return analyze_highest_stoppage_count(question, df)

    if any(
        phrase in q
        for phrase in [
            "lowest stoppage",
            "fewest stoppages",
            "least stoppages",
            "minimum stoppages",
            "lowest stoppage count",
        ]
    ):
        return analyze_lowest_stoppage_count(df)

    # Deterministic total-stoppage count.
    # Answer directly from valid dataset records instead of the LLM.
    total_count_question = any(
        phrase in q
        for phrase in [
            "how many total stoppages",
            "total number of stoppages",
            "total number of records",
            "total stoppages",
            "total records",
            "how many stoppages are in the dataset",
            "how many stoppages in the dataset",
            "how many records are in the dataset",
            "how many records in the dataset",
        ]
    )

    if total_count_question:
        return (
            f"Total stoppages: {len(records)} valid records. "
            f"Loaded records: {len(df)}."
        )

    record_count_question = any(
        phrase in q
        for phrase in [
            "how many records",
            "how many stoppage records",
            "stoppage records are available",
            "records are available",
            "number of records",
            "total records",
            "record count",
            "mine stoppage count",
            "total stoppage count",
            "stoppage count",
            "number of stoppages",
            "how many stoppages",
            "how many valid",
            "valid stoppage records",
            "valid records",
            "records in dataset",
            "records in the dataset",
        ]
    )

    if record_count_question:
        return (
            f"Loaded records: {len(df)}\n"
            f"Valid stoppage records: {len(records)}\n"
            f"Invalid or incomplete records excluded from analysis: "
            f"{len(df) - len(records)}"
        )

    # --------------------------------------------------------
    # Availability needs verified scheduled/observation operating time.
    if any(phrase in q for phrase in [
        "availability",
        "available percentage",
        "operational availability",
        "availability percentage",
        "availability rate",
    ]):
        return (
            "Equipment availability percentage cannot be calculated "
            "reliably from the currently available fields alone. "
            "The dataset contains stoppage durations, but it does not "
            "provide verified total scheduled operating time or a "
            "suitable observation-time denominator for each equipment "
            "unit. Providing a percentage without that information "
            "would be misleading. Supply the relevant operating-time "
            "data to calculate availability."
        )

    # Recovery time
    # --------------------------------------------------------

    if any(
        phrase in q
        for phrase in [
            "recovery time",
            "time to recover",
            "recover time",
            "recovery duration",
        ]
    ):
        equipment_id = find_requested_equipment(question, df)

        if equipment_id and not (
            records["equipment_id"] == equipment_id
        ).any():
            return (
                f"No records were found for equipment {equipment_id}. "
                "Recovery time cannot be determined."
            )

        return (
            "Recovery time cannot be calculated reliably because "
            "the dataset does not contain a separate verified "
            "recovery-time field. Stoppage duration is available, "
            "but it should not be treated as recovery time."
        )

    # --------------------------------------------------------
    # Equipment-type analysis
    # --------------------------------------------------------

    if any(
        phrase in q
        for phrase in [
            "equipment type",
            "equipment types",
            "by type",
            "equipment category",
            "conveyor equipment",
            "excavator equipment",
            "dump truck equipment",
            "wheel loader equipment",
            "bucket wheel excavator equipment",
            "crusher equipment",
            "dozer equipment",
            "dragline equipment",
            "drill equipment",
            "grader equipment",
            "shovel equipment",
            "water sprinkler equipment",
        ]
    ):
        if any(
            phrase in q
            for phrase in [
                "downtime",
                "highest",
                "lowest",
                "top ",
                "average",
                "ranking",
                "rank",
            ]
        ):
            return analyze_group(
                df,
                "equipment_type",
                "Equipment type",
                question,
            )

        types = records.loc[
            records["equipment_type"] != "",
            "equipment_type",
        ].value_counts()

        if types.empty:
            return "No equipment-type information is available."

        lines = ["Equipment types found in the dataset:"]

        for index, (equipment_type, count) in enumerate(
            types.items(),
            start=1,
        ):
            lines.append(
                f"{index}. {equipment_type}: "
                f"{int(count)} stoppages"
            )

        return "\n".join(lines)

    # --------------------------------------------------------
    # Stoppage-category analysis
    # --------------------------------------------------------

    if any(
        phrase in q
        for phrase in [
            "stoppage category",
            "stoppage categories",
            "categories of stoppage",
            "category analysis",
        ]
    ):
        return analyze_categories(question, df)

    # --------------------------------------------------------
    # --------------------------------------------------------
    # Mine-location analysis
    # --------------------------------------------------------

    known_locations = (
        valid_records(df)["mine_location"]
        .dropna()
        .astype(str)
        .str.strip()
        .tolist()
    )

    mentions_known_location = any(
        location
        and location.casefold() in q
        for location in known_locations
    )

    if mentions_known_location or (
        "location" in q
        and any(
            word in q
            for word in [
                "list",
                "all",
                "which",
                "show",
                "highest",
                "lowest",
                "maximum",
                "minimum",
                "top ",
                "most downtime",
                "least downtime",
                "rank",
            ]
        )
    ):
        return analyze_locations(question, df)

    # Longest individual stoppage
    # --------------------------------------------------------

    if any(
        phrase in q
        for phrase in [
            "longest stoppage",
            "maximum stoppage duration",
            "longest downtime",
            "longest recorded stoppage",
            "longest individual stoppage",
            "single longest",
        ]
    ):
        if records.empty:
            return "No valid stoppage durations are available."

        row = records.loc[
            records["duration_minutes"].idxmax()
        ]

        return (
            f"The longest recorded individual stoppage is "
            f"{format_minutes(row['duration_minutes'])} "
            f"for equipment {row['equipment_id']}."
        )

    # --------------------------------------------------------
    # Average downtime
    # --------------------------------------------------------

    if any(
        phrase in q
        for phrase in [
            "average duration",
            "average stoppage",
            "mean duration",
            "average downtime",
            "mean downtime",
        ]
    ):
        if records.empty:
            return "No valid duration values are available."

        return (
            f"The average recorded stoppage duration is "
            f"{records['duration_minutes'].mean():.2f} minutes, "
            f"based on {len(records)} valid records."
        )

    # --------------------------------------------------------
    # Total downtime
    # --------------------------------------------------------
    requested_equipment = find_requested_equipment(question, df)

    if (
        not requested_equipment
        and any(
            phrase in q
            for phrase in [
                "total downtime",
                "overall downtime",
                "downtime across all",
                "downtime for all",
                "total stoppage duration",
                "sum of downtime",
            ]
        )
        and not any(
            phrase in q
            for phrase in [
                "highest downtime",
                "highest total downtime",
                "most downtime",
                "maximum downtime",
                "lowest downtime",
                "lowest total downtime",
                "least downtime",
                "minimum downtime",
                "smallest downtime",
                "rank equipment",
                "equipment ranking",
                "equipment ranked",
                "top equipment",
                "top 5 equipment",
                "top 10 equipment",
                "downtime ranking",
            ]
        )
    ):
        total = records["duration_minutes"].sum()
        hours = int(total) // 60
        minutes = int(total) % 60
        return (
            f"Total recorded downtime: {int(total):,} minutes "
            f"({hours:,} hours {minutes} minutes) across {len(records)} valid records."
        )

    # Stoppage-reason analysis
    # --------------------------------------------------------

    if any(
        phrase in q
        for phrase in [
            "reason",
            "stoppage cause",
            "causes of stoppage",
            "common causes",
            "common reasons",
        ]
    ):
        return analyze_reasons(question, df)

    # --------------------------------------------------------
    # Equipment ranking
    # --------------------------------------------------------

    ranking_question = any(
        phrase in q
        for phrase in [
            "highest downtime",
            "highest total downtime",
            "most downtime",
            "maximum downtime",
            "lowest downtime",
            "lowest total downtime",
            "least downtime",
            "minimum downtime",
            "smallest downtime",
            "rank equipment",
            "equipment ranking",
            "equipment ranked",
            "top equipment",
            "downtime ranking",
            "highest down time",
            "highest total down time",
            "most down time",
            "maximum down time",
            "lowest down time",
            "lowest total down time",
            "least down time",
            "minimum down time",
            "smallest down time",
            "highest total downtime",
            "lowest total downtime",
            "most total downtime",
            "least total downtime",
            "high downtime",
            "high total downtime",
            "equipment with high downtime",
            "which equipment has high downtime",
            "low downtime",
            "low total downtime",
            "equipment with low downtime", 
        ]
    )

    if ranking_question:
        return analyze_ranking(question, df)

    # --------------------------------------------------------
    # Equipment-specific analysis
    # --------------------------------------------------------

    if q.strip() in {"bwe", "bucket wheel excavator", "bucket wheel excavators"}:
        bwe_records = valid_records(df)
        bwe_records = bwe_records[
            bwe_records["equipment_type"].astype(str).str.strip().str.casefold()
            == "bucket wheel excavator"
        ]

        if bwe_records.empty:
            return "No Bucket Wheel Excavator records were found."

        return analyze_group(
            bwe_records,
            "equipment_id",
            "Bucket Wheel Excavator",
            question,
        )
    equipment_id = find_requested_equipment(question, df)

    # List individual records when the user explicitly asks for all.
    list_all_records = (
        any(
            phrase in q
            for phrase in [
                "show all",
                "list all",
                "display all",
                "show me all",
                "list me all",
                "give me all",
            ]
        )
        and any(
            word in q
            for word in ["stoppage", "stoppages", "record", "records"]
        )
    )

    if equipment_id and list_all_records:
        records = valid_records(df)

        equipment_records = records[
            records["equipment_id"].astype(str).str.strip().str.upper()
            == equipment_id.upper()
        ]

        if equipment_records.empty:
            return f"No valid stoppage records were found for {equipment_id}."

        display_columns = [
            column
            for column in [
                "equipment_id",
                "equipment_type",
                "mine_location",
                "duration_minutes",
                "stoppage_category",
                "stoppage_reason",
            ]
            if column in equipment_records.columns
        ]

        if not display_columns:
            return "Records were found, but no display columns are available."

        output = equipment_records[display_columns].copy()
        output.index = range(1, len(output) + 1)

        return (
            f"All stoppages for {equipment_id} "
            f"({len(output)} records):\n"
            + output.to_string()
        )

    if equipment_id:
        return analyze_equipment(equipment_id, df)

    # --------------------------------------------------------
    # Equipment ranking fallback for broad ranking wording
    # --------------------------------------------------------

    if (
        "equipment" in q
        and any(
            phrase in q
            for phrase in [
                "highest",
                "lowest",
                "least",
                "most",
                "top ",
                "rank",
            ]
        )
        and "type" not in q
    ):
        return analyze_ranking(question, df)

    # --------------------------------------------------------
    # Help / unsupported questions
    # --------------------------------------------------------

    return ollama_fallback_answer(question, df)


# ============================================================
# DASHBOARD RESPONSE HELPER
# ============================================================

def build_analysis_response(
    df: pd.DataFrame,
    data_source: str,
) -> dict[str, Any]:
    records = valid_records(df)
    ranking = equipment_ranking(df)

    reasons = records.loc[
        records["stoppage_reason"] != "",
        "stoppage_reason",
    ].value_counts().head(5)

    total = (
        number(records["duration_minutes"].sum())
        if not records.empty
        else 0
    )

    average = (
        round(float(records["duration_minutes"].mean()), 2)
        if not records.empty
        else 0
    )

    return {
        "version": APP_VERSION,
        "data_source": data_source,
        "total_records": len(df),
        "valid_records": len(records),
        "unique_equipment": int(
            records["equipment_id"].nunique()
        ) if not records.empty else 0,
        "total_downtime_minutes": total,
        "average_duration_minutes": average,
        "equipment_ranking": [
            {
                "equipment_id": row["equipment_id"],
                "stoppages": int(row["stoppages"]),
                "total_downtime_minutes": number(
                    row["total_downtime"]
                ),
            }
            for _, row in ranking.iterrows()
        ],
        "top_reasons": [
            {
                "reason": reason,
                "occurrences": int(count),
                "percentage": round(
                    int(count) / len(records) * 100,
                    2,
                ) if not records.empty else 0,
            }
            for reason, count in reasons.items()
        ],
    }


# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Mines Equipment Stoppage Analysis AI is running",
        "version": APP_VERSION,
        "endpoints": [
            "/health",
            "/records",
            "/dashboard",
            "/analyze",
            "/ask",
        ],
    }


@app.get("/health")
def health():
    try:
        df = load_excel_data()
        records = valid_records(df)

        return {
            "status": "healthy",
            "service": "Mines Equipment AI",
            "version": APP_VERSION,
            "data_source": "excel",
            "records_loaded": len(df),
            "valid_records": len(records),
            "unique_equipment": int(
                records["equipment_id"].nunique()
            ) if not records.empty else 0,
        }

    except Exception as exc:
        return {
            "status": "error",
            "version": APP_VERSION,
            "message": str(exc),
        }


@app.get("/records")
def get_records():
    """Return all records from the configured Excel dataset."""

    try:
        raw_df = pd.read_excel(EXCEL_PATH)

        records_json = raw_df.to_json(
            orient="records",
            date_format="iso",
        )

        output = json.loads(records_json)

        return {
            "records": output,
            "returned": len(output),
            "total_records": len(raw_df),
            "data_source": "excel",
            "version": APP_VERSION,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@app.get("/dashboard")
def dashboard():
    try:
        df = load_excel_data()

        return build_analysis_response(
            df,
            "excel",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@app.post("/analyze")
def analyze(data: list[dict[str, Any]]):
    try:
        df = normalize_dataframe(data)

        return build_analysis_response(
            df,
            "spring_boot_data",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@app.post("/ask")
def ask_question(request: QuestionRequest):
    try:
        if not request.question or not request.question.strip():
            raise HTTPException(status_code=422, detail="Question must not be empty.")

        df, source = get_dataframe(request.data)

        answer = answer_question(
            request.question.strip(),
            df,
        )

        return {
            "question": request.question,
            "answer": answer,
            "data_source": source,
            "records_analyzed": len(valid_records(df)),
            "version": APP_VERSION,
        }

    except HTTPException:
        raise

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {exc}",
        ) from exc





    