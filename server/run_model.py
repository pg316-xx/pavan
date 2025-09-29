import sys
import os
import json


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: run_model.py <audio_path> <date> [language] [mimetype]"}))
        return 1

    audio_path = sys.argv[1]
    date = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else "hi"
    mimetype = sys.argv[4] if len(sys.argv) > 4 else "audio/wav"

    # Ensure server directory is on path
    server_dir = os.path.dirname(os.path.abspath(__file__))
    if server_dir not in sys.path:
        sys.path.append(server_dir)

    try:
        from zoo_model import zoo_model  # type: ignore
    except Exception as e:
        print(json.dumps({"error": f"Failed to import model: {e}"}), file=sys.stderr)
        return 1

    try:
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        result = zoo_model.process_audio_observation(audio_bytes, date, language, mimetype)
        # Pydantic model has .dict() in v1 and .model_dump() in v2
        data = result.dict() if hasattr(result, "dict") else result.model_dump()  # type: ignore
        print(json.dumps(data, ensure_ascii=False))
        return 0
    except Exception as e:
        print(json.dumps({"error": f"Processing error: {e}"}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())



