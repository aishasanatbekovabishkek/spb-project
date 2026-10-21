import json


def calculate(dau):
    reads_per_user = 17
    writes_per_user = 0.9

    reads = dau * reads_per_user
    writes = dau * writes_per_user
    requests = reads + writes

    # Отклики, история статусов, сохранения и напоминания.
    rows_per_user = 0.2 + 0.6 + 0.2 + 0.1
    rows_per_day = round(dau * rows_per_user)
    rows_in_six_years = rows_per_day * 2190

    database_gb = (
        rows_in_six_years
        * 1000
        * 2
        * 1.3
        / 1_000_000_000
    )

    return {
        "users_per_day": dau,
        "reads_per_day": reads,
        "writes_per_day": writes,
        "requests_per_day": requests,
        "average_rps": round(requests / 86_400, 2),
        "peak_rps": round(requests / 86_400 * 10, 2),
        "new_rows_per_day": rows_per_day,
        "rows_in_six_years": rows_in_six_years,
        "estimated_database_gb": round(database_gb, 2),
    }


if __name__ == "__main__":
    results = [
        calculate(10_000),
        calculate(100_000),
    ]
    print(json.dumps(results, indent=2))