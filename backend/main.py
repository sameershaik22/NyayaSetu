from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pathlib import Path
import os

from routers import pdf_router, extract_router, action_router, verify_router, dashboard_router, summarize_router
from database import init_db

app = FastAPI(
    title="NyayaSetu API",
    description="Court Judgment to Verified Action Plans - Government AI System",
    version="1.0.0"
)

# CORS for local React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf_router.router, tags=["PDF Ingestion"])
app.include_router(extract_router.router, tags=["Data Extraction"])
app.include_router(action_router.router, tags=["Action Plan"])
app.include_router(verify_router.router, tags=["Verification"])
app.include_router(dashboard_router.router, tags=["Dashboard"])
app.include_router(summarize_router.router, tags=["Document Summary"])

@app.on_event("startup")
async def startup_event():
    init_db()
    # Create uploads directory
    Path("uploads").mkdir(exist_ok=True)

@app.get("/")
def root():
    return {
        "system": "NyayaSetu",
        "tagline": "From Court Judgments to Verified Action Plans",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
