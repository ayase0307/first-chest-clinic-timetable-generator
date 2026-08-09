"""Generate the two offline SVG QR assets used by the timetable poster."""

from __future__ import annotations

import base64
from pathlib import Path

import qrcode
import qrcode.image.svg


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

DESTINATIONS = {
    "googleMaps": (
        "qr-google-maps.svg",
        "https://maps.app.goo.gl/8cGiFoGshrdWkWzz8",
    ),
    "facebook": (
        "qr-facebook.svg",
        "https://www.facebook.com/profile.php?id=61579522585754",
    ),
}


def make_qr(url: str, destination: Path) -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    image.save(destination)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    encoded: dict[str, str] = {}

    for key, (filename, url) in DESTINATIONS.items():
        destination = ASSETS / filename
        make_qr(url, destination)
        payload = base64.b64encode(destination.read_bytes()).decode("ascii")
        encoded[key] = f"data:image/svg+xml;base64,{payload}"

    lines = ["window.QR_ASSETS={"]
    for key, payload in encoded.items():
        lines.append(f'  {key}:"{payload}",')
    lines.append("};")
    (ROOT / "qr-data.js").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
