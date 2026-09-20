"""Generate fictional, machine-readable PDFs used by deterministic extraction tests."""

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).parent


def create_document(path: Path, title: str, fields: list[tuple[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    pdf.setTitle(title)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(20 * mm, height - 25 * mm, title)
    pdf.setStrokeColorRGB(0.2, 0.35, 0.55)
    pdf.line(20 * mm, height - 29 * mm, width - 20 * mm, height - 29 * mm)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, height - 38 * mm, "Fictional demo fixture - not a real business document")

    y = height - 55 * mm
    for label, value in fields:
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(20 * mm, y, f"{label}:")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(65 * mm, y, value)
        y -= 10 * mm

    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawString(20 * mm, 18 * mm, "Vendor onboarding extraction fixture")
    pdf.save()


def main() -> None:
    scenarios = {
        "clean_vendor": {
            "pan.pdf": ("PAN Document", [
                ("PAN Holder Name", "Acme Technologies Private Limited"),
                ("PAN", "ABCDE1234F"),
            ]),
            "gst_certificate.pdf": ("GST Registration Certificate", [
                ("Legal Name", "Acme Technologies Private Limited"),
                ("GSTIN", "27ABCDE1234F1Z5"),
                ("Registered Address", "42 Demo Park, Pune, Maharashtra"),
            ]),
            "bank_proof.pdf": ("Bank Account Proof", [
                ("Account Holder Name", "Acme Technologies Pvt Ltd"),
                ("Account Number", "000012345678"),
                ("IFSC", "ABCD0123456"),
                ("Bank Name", "Fictional Bank Limited"),
            ]),
            "incorporation.pdf": ("Certificate of Incorporation", [
                ("Legal Name", "Acme Technologies Private Limited"),
            ]),
        },
        "missing_bank_proof": {
            "pan.pdf": ("PAN Document", [
                ("PAN Holder Name", "Harbor Supplies Private Limited"),
                ("PAN", "PQRST3456U"),
            ]),
            "gst_certificate.pdf": ("GST Registration Certificate", [
                ("Legal Name", "Harbor Supplies Private Limited"),
                ("GSTIN", "27PQRST3456U1Z3"),
                ("Registered Address", "18 Sample Road, Pune, Maharashtra"),
            ]),
            "incorporation.pdf": ("Certificate of Incorporation", [
                ("Legal Name", "Harbor Supplies Private Limited"),
            ]),
        },
        "name_variation": {
            "pan.pdf": ("PAN Document", [
                ("PAN Holder Name", "Brightline Systems Private Limited"),
                ("PAN", "FGHIJ5678K"),
            ]),
            "gst_certificate.pdf": ("GST Registration Certificate", [
                ("Legal Name", "Brightline Systems Private Limited"),
                ("GSTIN", "27FGHIJ5678K1Z2"),
                ("Registered Address", "7 Fixture Lane, Pune, Maharashtra"),
            ]),
            "bank_proof.pdf": ("Bank Account Proof", [
                ("Account Holder Name", "Brightline Systems Pvt Ltd"),
                ("Account Number", "000076543210"),
                ("IFSC", "EFGH0123456"),
                ("Bank Name", "Fictional Bank Limited"),
            ]),
            "incorporation.pdf": ("Certificate of Incorporation", [
                ("Legal Name", "Brightline Systems Private Limited"),
            ]),
        },
        "identity_conflict": {
            "pan.pdf": ("PAN Document", [
                ("PAN Holder Name", "Vertex Components Private Limited"),
                ("PAN", "KLMNO9012P"),
            ]),
            "gst_certificate.pdf": ("GST Registration Certificate", [
                ("Legal Name", "Vertex Components Private Limited"),
                ("GSTIN", "27KLMNO9012P1Z7"),
                ("Registered Address", "88 Test Avenue, Pune, Maharashtra"),
            ]),
            "bank_proof.pdf": ("Bank Account Proof", [
                ("Account Holder Name", "Rival Trading Pvt Ltd"),
                ("Account Number", "000099991111"),
                ("IFSC", "WXYZ0987654"),
                ("Bank Name", "Fictional Bank Limited"),
            ]),
            "incorporation.pdf": ("Certificate of Incorporation", [
                ("Legal Name", "Vertex Components Private Limited"),
            ]),
        },
        "extraction_required": {
            "bank_proof.pdf": ("Scanned Bank Proof Placeholder", [
                ("Document Note", "Image-only source requires OCR or manual extraction"),
            ]),
        },
    }

    for scenario, documents in scenarios.items():
        for filename, (title, fields) in documents.items():
            create_document(ROOT / scenario / filename, title, fields)


if __name__ == "__main__":
    main()
