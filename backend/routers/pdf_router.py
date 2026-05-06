from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Supported formats
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png"}

# ─── Optional imports ───────────────────────────────────────────────────────

try:
    import fitz  # PyMuPDF
    PYMUPDF_OK = True
except ImportError:
    PYMUPDF_OK = False
    print("[WARNING] PyMuPDF not installed.")

try:
    from docx import Document as DocxDocument
    DOCX_OK = True
except ImportError:
    DOCX_OK = False
    print("[WARNING] python-docx not installed.")

try:
    import pytesseract
    from PIL import Image
    import io
    OCR_OK = True
except ImportError:
    OCR_OK = False
    print("[WARNING] pytesseract / Pillow not installed.")


# ─── Extractors ─────────────────────────────────────────────────────────────

def extract_from_pdf(path: str) -> str:
    if not PYMUPDF_OK:
        return ""
    try:
        doc = fitz.open(path)
        text = "".join(page.get_text() for page in doc)
        doc.close()
        # fallback to OCR for scanned pages
        if len(text.strip()) < 100 and OCR_OK:
            doc = fitz.open(path)
            ocr_parts = []
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_parts.append(pytesseract.image_to_string(img))
            doc.close()
            return "\n".join(ocr_parts).strip() or text
        return text
    except Exception as e:
        print(f"[ERROR] PDF extraction: {e}")
        return ""


def extract_from_docx(path: str) -> str:
    if not DOCX_OK:
        return ""
    try:
        doc = DocxDocument(path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        print(f"[ERROR] DOCX extraction: {e}")
        return ""


def extract_from_txt(path: str) -> str:
    try:
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                with open(path, "r", encoding=enc) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
        return ""
    except Exception as e:
        print(f"[ERROR] TXT read: {e}")
        return ""


def extract_from_image(path: str) -> str:
    if not OCR_OK:
        return ""
    try:
        img = Image.open(path)
        return pytesseract.image_to_string(img)
    except Exception as e:
        print(f"[ERROR] Image OCR: {e}")
        return ""


def extract_text(path: str, ext: str) -> str:
    """Route to the correct extractor based on file extension."""
    ext = ext.lower()
    if ext == ".pdf":
        text = extract_from_pdf(path)
    elif ext == ".docx":
        text = extract_from_docx(path)
    elif ext == ".txt":
        text = extract_from_txt(path)
    elif ext in (".jpg", ".jpeg", ".png"):
        text = extract_from_image(path)
    else:
        text = ""
    return text.strip() if text else ""


def get_demo_text() -> str:
    return """IN THE HIGH COURT OF DELHI
WRIT PETITION (CIVIL) NO. 1234/2024

Ramesh Kumar Sharma                      ...Petitioner
vs.
Union of India & Ors.                    ...Respondents

Date of Order: 15th March 2024
Coram: Hon'ble Justice A.K. Verma

JUDGMENT AND ORDER

The petitioner has filed this writ petition challenging non-compliance with
Right to Information Act, 2005. The respondent CPIO failed to respond within
30 days as mandated under Section 7 of the RTI Act.

DIRECTIONS:
1. The respondent Central Public Information Officer is directed to provide
   the requested information within 15 days from today.
2. The respondent Ministry of Home Affairs is directed to pay compensation
   of Rs. 25,000 to the petitioner for undue delay.
3. A compliance report shall be submitted to this court within 30 days.
4. The respondent shall implement proper RTI compliance mechanisms within 60 days.

TIMELINE: Compliance within 30 days from date of order.

The writ petition is disposed of with the above directions.

Sd/-
Justice A.K. Verma
High Court of Delhi
"""


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/upload-pdf")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a document (PDF, DOCX, TXT, JPG, PNG).
    Extracts text and returns it for the pipeline.
    """
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: PDF, DOCX, TXT, JPG, PNG."
        )

    save_path = UPLOAD_DIR / filename
    try:
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        text = extract_text(str(save_path), ext)

        if not text:
            text = (
                "Manual review required. "
                "The document could not be automatically processed. "
                "Please review the original file manually."
            )
            extraction_method = "failed"
        else:
            method_map = {
                ".pdf": "pymupdf", ".docx": "python-docx",
                ".txt": "direct-read", ".jpg": "ocr",
                ".jpeg": "ocr", ".png": "ocr",
            }
            extraction_method = method_map.get(ext, "unknown")

        return {
            "filename": filename,
            "file_type": ext.lstrip(".").upper(),
            "full_text": text,
            "char_count": len(text),
            "extraction_method": extraction_method,
            "success": extraction_method != "failed",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.get("/demo-judgment")
async def get_demo_judgment():
    """Return a pre-loaded demo judgment for instant demonstration."""
    text = get_demo_text()
    return {
        "filename": "demo_judgment.pdf",
        "file_type": "PDF",
        "full_text": text,
        "char_count": len(text),
        "extraction_method": "demo",
        "success": True,
    }
